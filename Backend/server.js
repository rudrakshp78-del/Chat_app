const mongoose = require("mongoose");
const http = require("http");
const dns = require("dns");

const path = require("path");

// Load environment variables
const fs = require("fs");
const envPath = path.join(__dirname, "config.env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  require("dotenv").config();
}

const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const sgMail = require("@sendgrid/mail");

const app = require("./app");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");
const AudioCall = require("./models/audioCall");
const VideoCall = require("./models/videoCall");
const { fetchDirectConversationsForUser } = require("./controllers/user");
const { sendPushNotificationToUser } = require("./utils/pushNotification");

const { getEmailConfigStatus } = require("./services/mailer");

// ================================
// EMAIL CONFIGURATION DEBUG
// ================================

const mailConfig = getEmailConfigStatus();
console.log("=== EMAIL CONFIG DEBUG ===");
console.log("Resend API:", mailConfig.hasResend ? "CONFIGURED" : "NOT SET");
console.log("Brevo API:", mailConfig.hasBrevo ? "CONFIGURED" : "NOT SET");
console.log("Custom SMTP:", mailConfig.hasCustomSmtp ? "CONFIGURED" : "NOT SET");
console.log("Gmail SMTP:", mailConfig.hasGmail ? "CONFIGURED" : "NOT SET");
console.log("SendGrid API:", mailConfig.hasSendGrid ? "CONFIGURED" : "NOT SET");
console.log("==========================");

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY.trim());
}

// ================================
// DNS
// ================================

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  dns.setDefaultResultOrder("ipv4first");
} catch (err) {
  console.log("DNS config warning:", err.message);
}

// ================================
// PROCESS ERROR HANDLERS
// ================================

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION!");
  console.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION!");
  console.error(err);
  process.exit(1);
});

// ================================
// ENVIRONMENT VARIABLES
// ================================

console.log("DBURI:", process.env.DBURI ? "FOUND" : "MISSING");
console.log("DBPASSWORD:", process.env.DBPASSWORD ? "FOUND" : "MISSING");

if (!process.env.DBURI) {
  throw new Error("DBURI is missing");
}

if (!process.env.DBPASSWORD) {
  throw new Error("DBPASSWORD is missing");
}

// ================================
// MONGODB CONNECTION
// ================================

const DB = process.env.DBURI.replace("<DBPASSWORD>", process.env.DBPASSWORD);

// Don't expose password
console.log("MongoDB URI:", DB.replace(process.env.DBPASSWORD, "********"));

// ================================
// START SERVER
// ================================

async function startServer() {
  try {
    try { dns.setServers(["8.8.8.8", "8.8.4.4"]); } catch (e) {}
    console.log("Connecting to MongoDB...");

    await mongoose.connect(DB, {
      serverSelectionTimeoutMS: 25000,
    });

    console.log("✅ MongoDB connection successful!");

    const port = process.env.PORT || 5000;

    const server = http.createServer(app);

    // ================================
    // SOCKET.IO
    // ================================

    const io = new Server(server, {
      maxHttpBufferSize: 25 * 1024 * 1024,
      cors: {
        origin: (origin, callback) => {
          callback(null, true);
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    app.set("io", io);

    server.listen(port, () => {
      console.log(`✅ App running on port ${port}`);
    });

    // ================================
    // SOCKET AUTHENTICATION MIDDLEWARE
    // ================================

    io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
          socket.handshake.query?.token;
        const queryUserId = socket.handshake.query?.user_id;

        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user_id = decoded.userId.toString();
            return next();
          } catch (err) {
            if (err.name === "TokenExpiredError") {
              // Token expired: verify that cryptographic signature is authentic
              try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET, {
                  ignoreExpiration: true,
                });
                const user = await User.findById(decoded.userId).select("+passwordChangedAt");
                if (user && !user.changedPasswordAfter(decoded.iat)) {
                  socket.user_id = decoded.userId.toString();
                  socket.shouldEmitRefreshedToken = true;
                  return next();
                }
              } catch (inner) {}
            }
          }
        }

        if (queryUserId && mongoose.Types.ObjectId.isValid(queryUserId)) {
          socket.user_id = queryUserId.toString();
          return next();
        }

        return next(new Error("Authentication error: Token required"));
      } catch (err) {
        console.error("Socket authentication error:", err);
        return next(new Error("Authentication error"));
      }
    });

    // ================================
    // SOCKET CONNECTION
    // ================================

    io.on("connection", async (socket) => {
      try {
        const user_id = socket.user_id || socket.handshake.query["user_id"];
        const socket_id = socket.id;

        console.log(`User connected: ${socket_id}`);
        console.log(`User ID: ${user_id}`);

        socket.user_id = user_id ? user_id.toString() : null;

        if (socket.shouldEmitRefreshedToken && socket.user_id) {
          const freshToken = jwt.sign(
            { userId: socket.user_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "90d" }
          );
          socket.emit("token_refreshed", { token: freshToken, user_id: socket.user_id });
        }

        socket.on("update_socket_token", (data) => {
          try {
            const t = data?.token;
            if (t) {
              const dec = jwt.verify(t, process.env.JWT_SECRET, { ignoreExpiration: true });
              socket.user_id = dec.userId.toString();
            }
          } catch (e) {}
        });

        let initializedUserId = null;

        const deliverPendingMessages = async (targetUserId) => {
          try {
            if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
              return;
            }
            const targetIdStr = targetUserId.toString();
            const targetObjId = new mongoose.Types.ObjectId(targetIdStr);

            const pendingChats = await OneToOneMessage.find({
              participants: targetObjId,
              messages: {
                $elemMatch: {
                  to: targetObjId,
                  status: "sent",
                },
              },
            })
              .select("_id participants")
              .lean();

            if (!pendingChats.length) return;

            const chatIds = pendingChats.map((c) => c._id);

            await OneToOneMessage.updateMany(
              { _id: { $in: chatIds } },
              { $set: { "messages.$[elem].status": "delivered" } },
              {
                arrayFilters: [
                  { "elem.to": targetObjId, "elem.status": "sent" },
                ],
              }
            );

            for (const chat of pendingChats) {
              (chat.participants || []).forEach((pId) => {
                const pStr = (pId?._id || pId)?.toString();
                if (pStr && pStr !== targetIdStr) {
                  io.to(pStr).emit("messages_delivered", {
                    conversation_id: chat._id,
                    user_id: targetIdStr,
                  });
                }
              });
            }
          } catch (err) {
            console.error("deliverPendingMessages error:", err);
          }
        };

        // Join personal room synchronously so all socket.on listeners below register immediately without awaiting DB
        if (Boolean(user_id)) {
          const uidStr = user_id.toString();
          socket.join(uidStr);
          if (mongoose.Types.ObjectId.isValid(uidStr)) {
            initializedUserId = uidStr;
            User.findByIdAndUpdate(uidStr, {
              socket_id,
              status: "Online",
            })
              .then(() => deliverPendingMessages(uidStr))
              .catch((err) => console.error("Initial status update error:", err));

            fetchDirectConversationsForUser(uidStr)
              .then((convs) => {
                socket.emit("direct_conversations", convs);
              })
              .catch((err) =>
                console.error("Proactive direct_conversations error:", err)
              );
          }
        }

        socket.on("user_connected", async (data) => {
          try {
            const uid = (data?.user_id || socket.handshake.query["user_id"])?.toString();
            if (uid && mongoose.Types.ObjectId.isValid(uid)) {
              socket.user_id = uid;
              socket.join(uid);
              if (initializedUserId === uid) {
                return;
              }
              initializedUserId = uid;
              User.findByIdAndUpdate(uid, {
                socket_id: socket.id,
                status: "Online",
              })
                .then(() => deliverPendingMessages(uid))
                .catch((e) => console.error("user_connected update error:", e));
              console.log(`User connected and joined room: ${uid}`);
            }
          } catch (e) {
            console.error("user_connected error:", e);
          }
        });

        socket.on("heartbeat", (data) => {
          const uid = (data?.user_id || socket.user_id)?.toString();
          if (uid) {
            socket.emit("heartbeat_ack", { time: Date.now() });
          }
        });

        socket.on("save_fcm_token", async (data) => {
          try {
            const uid = (data?.user_id || socket.user_id)?.toString();
            const token = data?.fcm_token;
            if (uid && token && mongoose.Types.ObjectId.isValid(uid)) {
              await User.findByIdAndUpdate(uid, { fcm_token: token });
              console.log(`Saved FCM push token for user: ${uid}`);
            }
          } catch (e) {
            console.error("save_fcm_token error:", e);
          }
        });

        // ========================================
        // FRIEND REQUEST
        // ========================================

        socket.on("friend_request", async (data) => {
          try {
            console.log("Friend request received:", data);

            if (!data?.from || !data?.to || data.from.toString() === data.to.toString()) {
              return;
            }

            const [to, fromUser] = await Promise.all([
              User.findById(data.to).select("socket_id friends blocked_users"),
              User.findById(data.from).select("socket_id firstName lastName avatar friends blocked_users"),
            ]);

            if (!to || !fromUser) {
              console.log("Recipient or sender user not found");
              return;
            }

            // Check if already friends
            if (fromUser.friends && fromUser.friends.some((f) => f.toString() === data.to.toString())) {
              io.to(data.from.toString()).emit("request_sent", {
                message: "You are already friends!",
              });
              return;
            }

            // Prevent duplicate pending requests in either direction
            const existingRequest = await FriendRequest.findOne({
              $or: [
                { sender: data.from, recipient: data.to },
                { sender: data.to, recipient: data.from },
              ],
            });

            if (existingRequest) {
              io.to(data.from.toString()).emit("request_sent", {
                message: "Friend request is already pending",
                request_id: existingRequest._id,
              });
              return;
            }

            // ========================================
            // CREATE FRIEND REQUEST
            // ========================================

            const request = await FriendRequest.create({
              sender: data.from,
              recipient: data.to,
            });

            console.log("Friend request created:", request._id.toString());

            // ========================================
            // NOTIFY RECIPIENT (deduplicated)
            // ========================================

            const requesterName =
              `${fromUser.firstName || ""} ${fromUser.lastName || ""}`.trim() ||
              "Someone";
            const requestPayload = {
              message: `${requesterName} sent you a friend request`,
              request_id: request._id,
              sender: {
                _id: fromUser._id,
                firstName: fromUser.firstName,
                lastName: fromUser.lastName,
                avatar: fromUser.avatar,
              },
            };

            const recipientRoom = data.to.toString();
            const recipientSockets = await io.in(recipientRoom).fetchSockets();
            if (recipientSockets && recipientSockets.length > 0) {
              io.to(recipientRoom).emit("new_friend_request", requestPayload);
            } else if (to.socket_id) {
              io.to(to.socket_id).emit("new_friend_request", requestPayload);
            }

            // Send FCM Push Notification for new friend request
            sendPushNotificationToUser({
              userId: data.to,
              title: "New Friend Request",
              body: `👋 ${requesterName} sent you a friend request`,
              data: {
                type: "friend_request",
                request_id: (request._id || "").toString(),
                sender_id: (data.from || "").toString(),
              },
            }).catch((e) => console.warn("Push error in friend_request:", e.message));

            // ========================================
            // NOTIFY SENDER (deduplicated)
            // ========================================

            const senderRoom = data.from.toString();
            const senderSockets = await io.in(senderRoom).fetchSockets();
            const sentPayload = {
              message: "Request sent successfully!",
              request_id: request._id,
            };
            if (senderSockets && senderSockets.length > 0) {
              io.to(senderRoom).emit("request_sent", sentPayload);
            } else if (fromUser.socket_id) {
              io.to(fromUser.socket_id).emit("request_sent", sentPayload);
            }
          } catch (err) {
            console.error("friend_request error:", err);
          }
        });

        // ========================================
        // ACCEPT FRIEND REQUEST
        // ========================================

        socket.on("accept_request", async (data) => {
          try {
            console.log("Accept request:", data);

            const requestDoc = await FriendRequest.findById(data.request_id);

            if (!requestDoc) {
              console.log("Friend request not found");
              return;
            }

            const sender = await User.findById(requestDoc.sender);
            const receiver = await User.findById(requestDoc.recipient);

            if (!sender || !receiver) {
              console.log("Sender or receiver not found");
              return;
            }

            // ========================================
            // ADD FRIENDS (safe string ObjectId comparison)
            // ========================================

            const recipientIdStr = requestDoc.recipient.toString();
            const senderIdStr = requestDoc.sender.toString();

            if (
              !sender.friends.some((id) => id.toString() === recipientIdStr)
            ) {
              sender.friends.push(requestDoc.recipient);
            }

            if (
              !receiver.friends.some((id) => id.toString() === senderIdStr)
            ) {
              receiver.friends.push(requestDoc.sender);
            }

            await Promise.all([sender.save(), receiver.save()]);

            // ========================================
            // DELETE FRIEND REQUEST
            // ========================================

            await FriendRequest.findByIdAndDelete(data.request_id);

            // ========================================
            // AUTO-CREATE / RESTORE CONVERSATION SO BOTH USERS APPEAR IN CHAT LIST DIRECTLY
            // ========================================

            let conversation = await OneToOneMessage.findOne(
              { participants: { $size: 2, $all: [sender._id, receiver._id] } },
              { messages: { $slice: -25 } }
            ).populate(
              "participants",
              "firstName lastName _id email status avatar about links"
            );

            if (!conversation) {
              const newChat = await OneToOneMessage.create({
                participants: [sender._id, receiver._id],
                messages: [],
              });
              conversation = await OneToOneMessage.findById(
                newChat._id
              ).populate(
                "participants",
                "firstName lastName _id email status avatar about links"
              );
            } else if (
              Array.isArray(conversation.deleted_for) &&
              conversation.deleted_for.length > 0
            ) {
              conversation.deleted_for = [];
              await conversation.save();
            }

            const conversationObj = conversation
              ? conversation.toObject
                ? conversation.toObject()
                : JSON.parse(JSON.stringify(conversation))
              : null;

            const senderName =
              `${sender.firstName || ""} ${sender.lastName || ""}`.trim() ||
              "User";
            const receiverName =
              `${receiver.firstName || ""} ${receiver.lastName || ""}`.trim() ||
              "User";

            const acceptedBy = {
              _id: receiver._id,
              firstName: receiver.firstName,
              lastName: receiver.lastName,
              avatar: receiver.avatar,
            };

            const senderPayload = {
              message: `${receiverName} accepted your friend request!`,
              request_id: data.request_id,
              friend_id: receiver._id,
              accepted_by: acceptedBy,
              conversation: conversationObj,
            };

            const receiverPayload = {
              message: `You and ${senderName} are now connected in chats!`,
              request_id: data.request_id,
              friend_id: sender._id,
              accepted_by: acceptedBy,
              conversation: conversationObj,
            };

            // ========================================
            // NOTIFY BOTH PARTIES (deduplicated)
            // ========================================

            const senderRoomSockets = await io.in(senderIdStr).fetchSockets();
            if (senderRoomSockets && senderRoomSockets.length > 0) {
              io.to(senderIdStr).emit("request_accepted", senderPayload);
            } else if (sender.socket_id) {
              io.to(sender.socket_id).emit("request_accepted", senderPayload);
            }

            const receiverRoomSockets = await io.in(recipientIdStr).fetchSockets();
            if (receiverRoomSockets && receiverRoomSockets.length > 0) {
              io.to(recipientIdStr).emit("request_accepted", receiverPayload);
            } else if (receiver.socket_id) {
              io.to(receiver.socket_id).emit("request_accepted", receiverPayload);
            }

            // Send FCM Push Notification to original requester
            sendPushNotificationToUser({
              userId: sender._id,
              title: "Friend Request Accepted",
              body: `✅ ${receiverName} accepted your friend request! Start chatting now.`,
              data: {
                type: "request_accepted",
                conversation_id: (conversationObj?._id || "").toString(),
                friend_id: recipientIdStr,
              },
            }).catch((e) =>
              console.warn("Push error in accept_request:", e.message)
            );

            console.log(
              "✅ Friend request accepted & conversation ready:",
              conversationObj?._id?.toString()
            );
          } catch (err) {
            console.error("accept_request error:", err);
          }
        });

        // Reject Friend Request
        socket.on("reject_request", async (data) => {
          try {
            const { request_id } = data || {};
            if (!request_id) return;
            const reqDoc = await FriendRequest.findById(request_id);
            if (reqDoc) {
              const { sender, recipient } = reqDoc;
              await FriendRequest.findByIdAndDelete(request_id);
              io.to(sender.toString()).emit("request_rejected", { request_id });
              io.to(recipient.toString()).emit("request_rejected", { request_id });
            }
          } catch (e) {
            console.error("reject_request error:", e);
          }
        });

        // Cancel Friend Request
        socket.on("cancel_request", async (data) => {
          try {
            const { request_id, to, from } = data || {};
            let reqDoc = null;
            if (request_id) {
              reqDoc = await FriendRequest.findById(request_id);
            } else if (to && from) {
              reqDoc = await FriendRequest.findOne({ sender: from, recipient: to });
            }
            if (reqDoc) {
              const { sender, recipient } = reqDoc;
              await FriendRequest.findByIdAndDelete(reqDoc._id);
              io.to(sender.toString()).emit("request_cancelled", { request_id: reqDoc._id });
              io.to(recipient.toString()).emit("request_cancelled", { request_id: reqDoc._id });
            }
          } catch (e) {
            console.error("cancel_request error:", e);
          }
        });

        // Remove Friend
        socket.on("remove_friend", async (data) => {
          try {
            const { user_id: targetUserId, from: currentUserId } = data || {};
            const uid1 = currentUserId || socket.user_id;
            const uid2 = targetUserId;
            if (uid1 && uid2) {
              await Promise.all([
                User.findByIdAndUpdate(uid1, { $pull: { friends: uid2 } }),
                User.findByIdAndUpdate(uid2, { $pull: { friends: uid1 } }),
              ]);
              io.to(uid1.toString()).emit("friend_removed", { friend_id: uid2 });
              io.to(uid2.toString()).emit("friend_removed", { friend_id: uid1 });
            }
          } catch (e) {
            console.error("remove_friend error:", e);
          }
        });

        // Block User
        socket.on("block_user", async (data) => {
          try {
            const { target_user_id } = data || {};
            const myId = socket.user_id;
            if (myId && target_user_id && myId.toString() !== target_user_id.toString()) {
              await User.findByIdAndUpdate(myId, { $addToSet: { blocked_users: target_user_id } });
              socket.emit("user_blocked", { target_user_id });
            }
          } catch (e) {
            console.error("block_user error:", e);
          }
        });

        // Unblock User
        socket.on("unblock_user", async (data) => {
          try {
            const { target_user_id } = data || {};
            const myId = socket.user_id;
            if (myId && target_user_id) {
              await User.findByIdAndUpdate(myId, { $pull: { blocked_users: target_user_id } });
              socket.emit("user_unblocked", { target_user_id });
            }
          } catch (e) {
            console.error("unblock_user error:", e);
          }
        });

        // ========================================
        // DISCONNECT
        // ========================================

        socket.on("disconnect", async () => {
          try {
            console.log(`User disconnected: ${socket.id}`);

            const uid = (socket.user_id || user_id)?.toString();
            if (uid && mongoose.Types.ObjectId.isValid(uid)) {
              const remainingSockets = await io.in(uid).fetchSockets();
              if (remainingSockets && remainingSockets.length > 0) {
                await User.findByIdAndUpdate(uid, {
                  status: "Online",
                  socket_id: remainingSockets[0].id,
                });
              } else {
                await User.findByIdAndUpdate(uid, {
                  status: "Offline",
                  $unset: {
                    socket_id: 1,
                  },
                });
              }
            }
          } catch (err) {
            console.error("disconnect error:", err);
          }
        });

        // ========================================
        // END CONNECTION & CHAT HANDLERS
        // ========================================

        socket.on("get_direct_conversations", async ({ user_id: req_user_id } = {}, callback) => {
          try {
            const currentUserId = (req_user_id || socket.user_id || user_id)?.toString();
            if (!currentUserId) {
              if (typeof callback === "function") callback([]);
              return;
            }

            const filteredConversations = await fetchDirectConversationsForUser(currentUserId);
            console.log("Direct conversations found:", filteredConversations.length);

            if (typeof callback === "function") {
              callback(filteredConversations);
            }
          } catch (err) {
            console.error("get_direct_conversations error:", err);
            if (typeof callback === "function") {
              callback([]);
            }
          }
        });

        socket.on("start_conversation", async (data) => {
          try {
            // data: {to, from}
            const { to, from } = data;

            if (!to || !from) {
              console.log("start_conversation missing 'to' or 'from':", data);
              return;
            }

            // Keep sender's socket_id up-to-date
            await User.findByIdAndUpdate(from, {
              socket_id: socket.id,
              status: "Online",
            });

            // check if there is any existing conversation between these users (slice messages to latest 30 for speed)
            let existing_conversation = await OneToOneMessage.findOne(
              { participants: { $size: 2, $all: [to, from] } },
              { messages: { $slice: -30 } }
            ).populate("participants", "firstName lastName _id email status avatar about links");

            console.log("Existing Conversation:", existing_conversation ? existing_conversation._id : null);

            // if no existing conversation, create one
            if (!existing_conversation) {
              let new_chat = await OneToOneMessage.create({
                participants: [to, from],
                messages: [],
              });

              existing_conversation = await OneToOneMessage.findById(new_chat._id).populate(
                "participants",
                "firstName lastName _id email status avatar about links"
              );

              console.log("Created new chat:", existing_conversation._id);
            }

            const formatForUser = (conv, targetUserId) => {
              const obj = conv.toObject ? conv.toObject() : JSON.parse(JSON.stringify(conv));
              if (obj.messages && Array.isArray(obj.messages)) {
                obj.messages = obj.messages.filter((msg) => {
                  if (msg.deleted_for && Array.isArray(msg.deleted_for)) {
                    return !msg.deleted_for.some(
                      (uid) => (uid?._id || uid)?.toString() === targetUserId?.toString()
                    );
                  }
                  return true;
                });
                if (obj.messages.length > 25) {
                  obj.messages = obj.messages.slice(-25);
                }
              }
              obj.initiated_by = from.toString();
              return obj;
            };

            // emit to current user socket and room
            socket.emit("start_chat", formatForUser(existing_conversation, from));
            socket.emit("open_chat", formatForUser(existing_conversation, from));
            io.to(from.toString()).emit("start_chat", formatForUser(existing_conversation, from));
            io.to(from.toString()).emit("open_chat", formatForUser(existing_conversation, from));

            // if receiver is online, emit to them as well
            io.to(to.toString()).emit("start_chat", formatForUser(existing_conversation, to));
            io.to(to.toString()).emit("open_chat", formatForUser(existing_conversation, to));
            const to_user = await User.findById(to).select("socket_id");
            if (to_user?.socket_id && to_user.socket_id !== socket.id) {
              io.to(to_user.socket_id).emit("start_chat", formatForUser(existing_conversation, to));
              io.to(to_user.socket_id).emit("open_chat", formatForUser(existing_conversation, to));
            }
          } catch (err) {
            console.error("start_conversation error:", err);
          }
        });

        socket.on("get_messages", async (data, callback) => {
          try {
            if (!data?.conversation_id || !mongoose.Types.ObjectId.isValid(data.conversation_id)) {
              if (typeof callback === "function") {
                callback({ messages: [], has_more: false, cursor: null, before_id: null });
              }
              return;
            }

            const currentUserId = (socket.user_id || user_id || data?.user_id)?.toString();
            const matchId = new mongoose.Types.ObjectId(data.conversation_id);
            const userObjId = currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)
              ? new mongoose.Types.ObjectId(currentUserId)
              : null;

            // Clamp limit between 1 and 50 (default: 25)
            const limit = Math.min(Math.max(parseInt(data?.limit, 10) || 25, 1), 50);

            // Parse cursor (before created_at timestamp and/or before_id)
            const before = data?.before;
            const before_id = data?.before_id;
            let beforeDate = null;
            if (before && !isNaN(new Date(before).getTime())) {
              beforeDate = new Date(before);
            }
            let beforeObjId = null;
            if (before_id && mongoose.Types.ObjectId.isValid(before_id)) {
              beforeObjId = new mongoose.Types.ObjectId(before_id);
            } else if (before && mongoose.Types.ObjectId.isValid(before)) {
              beforeObjId = new mongoose.Types.ObjectId(before);
            }

            // Build filter condition for MongoDB aggregation
            const filterConditions = [];
            if (userObjId) {
              filterConditions.push({
                $not: {
                  $in: [userObjId, { $ifNull: ["$$msg.deleted_for", []] }],
                },
              });
            }

            if (beforeDate) {
              if (beforeObjId) {
                filterConditions.push({
                  $or: [
                    { $lt: ["$$msg.created_at", beforeDate] },
                    {
                      $and: [
                        { $eq: ["$$msg.created_at", beforeDate] },
                        { $lt: ["$$msg._id", beforeObjId] },
                      ],
                    },
                  ],
                });
              } else {
                filterConditions.push({ $lt: ["$$msg.created_at", beforeDate] });
              }
            } else if (beforeObjId) {
              filterConditions.push({ $lt: ["$$msg._id", beforeObjId] });
            }

            const cond = filterConditions.length > 1
              ? { $and: filterConditions }
              : (filterConditions[0] || { $literal: true });

            // Efficient aggregation pipeline: filter deleted_for & cursor, count total, and slice last N
            const aggResult = await OneToOneMessage.aggregate([
              { $match: { _id: matchId } },
              {
                $project: {
                  participants: 1,
                  filtered_messages: {
                    $filter: {
                      input: { $ifNull: ["$messages", []] },
                      as: "msg",
                      cond: cond,
                    },
                  },
                },
              },
              {
                $project: {
                  participants: 1,
                  total_count: { $size: "$filtered_messages" },
                  messages: { $slice: ["$filtered_messages", -limit] },
                },
              },
            ]);

            if (!aggResult || aggResult.length === 0) {
              if (typeof callback === "function") {
                callback({ messages: [], has_more: false, cursor: null, before_id: null });
              }
              return;
            }

            const convDoc = aggResult[0];
            const messages = convDoc.messages || [];
            const totalCount = convDoc.total_count || 0;
            const hasMore = totalCount > messages.length;
            const oldestMsg = messages.length > 0 ? messages[0] : null;
            const nextCursor = oldestMsg
              ? (oldestMsg.created_at ? new Date(oldestMsg.created_at).toISOString() : oldestMsg._id?.toString())
              : null;
            const nextBeforeId = oldestMsg?._id ? oldestMsg._id.toString() : null;

            // Background non-blocking atomic update to mark unseen messages for recipient
            if (userObjId) {
              OneToOneMessage.updateOne(
                { _id: matchId },
                {
                  $set: {
                    "messages.$[elem].seen": true,
                    "messages.$[elem].status": "seen",
                    "messages.$[elem].seen_at": new Date(),
                  },
                },
                {
                  arrayFilters: [
                    {
                      "elem.to": userObjId,
                      "elem.seen": { $ne: true },
                    },
                  ],
                }
              )
                .then((updateRes) => {
                  if (updateRes.modifiedCount > 0) {
                    (convDoc.participants || []).forEach((pId) => {
                      const pStr = (pId?._id || pId)?.toString();
                      if (pStr && pStr !== currentUserId) {
                        io.to(pStr).emit("messages_seen", {
                          conversation_id: matchId.toString(),
                          reader_id: currentUserId,
                        });
                      }
                    });
                    io.to(currentUserId).emit("messages_seen", {
                      conversation_id: matchId.toString(),
                      reader_id: currentUserId,
                    });
                  }
                })
                .catch((err) => {
                  console.error("Background mark seen error in get_messages:", err);
                });
            }

            const responsePayload = {
              messages,
              has_more: hasMore,
              cursor: nextCursor,
              before_id: nextBeforeId,
            };

            if (typeof callback === "function") {
              callback(responsePayload);
            }
          } catch (err) {
            console.error("get_messages error:", err);
            if (typeof callback === "function") {
              callback({ messages: [], has_more: false, cursor: null, before_id: null });
            }
          }
        });

        // Dedicated socket listener to mark messages as seen
        socket.on("mark_messages_seen", async (data) => {
          try {
            const { conversation_id } = data || {};
            const currentUserId = (socket.user_id || user_id || data?.user_id)?.toString();
            if (
              !conversation_id ||
              !currentUserId ||
              !mongoose.Types.ObjectId.isValid(conversation_id) ||
              !mongoose.Types.ObjectId.isValid(currentUserId)
            ) {
              return;
            }

            const readerObjId = new mongoose.Types.ObjectId(currentUserId);
            const chat = await OneToOneMessage.findById(conversation_id)
              .select("_id participants")
              .lean();
            if (!chat) return;

            const result = await OneToOneMessage.updateOne(
              { _id: conversation_id },
              {
                $set: {
                  "messages.$[elem].seen": true,
                  "messages.$[elem].status": "seen",
                  "messages.$[elem].seen_at": new Date(),
                },
              },
              {
                arrayFilters: [
                  {
                    "elem.to": readerObjId,
                    "elem.seen": { $ne: true },
                  },
                ],
              }
            );

            if (result.modifiedCount > 0) {
              (chat.participants || []).forEach((pId) => {
                const pStr = (pId?._id || pId)?.toString();
                if (pStr && pStr !== currentUserId) {
                  io.to(pStr).emit("messages_seen", {
                    conversation_id: chat._id,
                    reader_id: currentUserId,
                  });
                }
              });

              // Echo to reader's room so any other open devices/tabs clear unread badge
              io.to(currentUserId).emit("messages_seen", {
                conversation_id: chat._id,
                reader_id: currentUserId,
              });
            }
          } catch (err) {
            console.error("mark_messages_seen error:", err);
          }
        });

        // handle text and link message
        socket.on("text_message", async (data) => {
          try {
            console.log("Received text message:", data);

            // data: {to, from, message, conversation_id, type, reply, temp_id}
            let { to, from, message, conversation_id, type, reply, temp_id } = data;
            from = (from || socket.user_id || user_id)?.toString();

            let chat = null;
            if (conversation_id) {
              chat = await OneToOneMessage.findById(conversation_id);
            }

            if (!to && chat && Array.isArray(chat.participants) && from) {
              const other = chat.participants.find(
                (p) => (p?._id || p)?.toString() !== from
              );
              if (other) to = (other?._id || other)?.toString();
            }

            if (!to || !from) {
              console.log("text_message missing 'to' or 'from':", data);
              return;
            }

            // Fetch to_user and from_user in parallel for maximum speed
            const [to_user, from_user] = await Promise.all([
              User.findById(to).select("firstName lastName avatar socket_id status blocked_users"),
              User.findById(from).select("firstName lastName avatar socket_id status blocked_users"),
            ]);

            // Privacy & Block protection: drop message if blocked
            if (
              to_user?.blocked_users?.some((b) => b.toString() === from.toString()) ||
              from_user?.blocked_users?.some((b) => b.toString() === to.toString())
            ) {
              console.log(`Message dropped: blocked between ${from} and ${to}`);
              return;
            }

            const isRecipientOnline = to_user?.status === "Online" && Boolean(to_user?.socket_id);

            const new_message = {
              to,
              from,
              type: type || (reply ? "Reply" : "Text"),
              text: message,
              reply: reply || "",
              status: isRecipientOnline ? "delivered" : "sent",
              seen: false,
              created_at: Date.now(),
            };

            if (!chat) {
              chat = await OneToOneMessage.findOne({
                participants: { $size: 2, $all: [to, from] },
              });
            }

            if (!chat) {
              chat = await OneToOneMessage.create({
                participants: [to, from],
                messages: [],
              });
            }

            // If the chat was marked deleted for either user, unmark it so the new message appears
            if (chat.deleted_for && Array.isArray(chat.deleted_for)) {
              chat.deleted_for = chat.deleted_for.filter(
                (uid) => uid.toString() !== to.toString() && uid.toString() !== from.toString()
              );
            }

            chat.messages.push(new_message);
            await chat.save({ validateModifiedOnly: true });

            const raw_saved = chat.messages[chat.messages.length - 1];
            const saved_message = raw_saved.toObject ? raw_saved.toObject() : JSON.parse(JSON.stringify(raw_saved));
            if (temp_id) {
              saved_message.temp_id = temp_id;
            }

            const senderInfo = {
              _id: from,
              name: `${from_user?.firstName || ""} ${from_user?.lastName || ""}`.trim() || "User",
              avatar: from_user?.avatar || "",
            };

            const payload = {
              conversation_id: chat._id,
              message: saved_message,
              sender: senderInfo,
            };

            // EMIT ONCE TO SENDER AND RECIPIENT
            socket.emit("new_message", payload);
            socket.to(from.toString()).emit("new_message", payload);
            io.to(to.toString()).emit("new_message", payload);

            // Send FCM Push Notification so device rings and updates badge when app is closed / on home screen
            sendPushNotificationToUser({
              userId: to,
              title: senderInfo.name || "Trackon",
              body: message || "New message received",
              data: {
                conversation_id: (chat?._id || data.conversation_id || "").toString(),
                sender_id: from.toString(),
              },
            }).catch((e) => console.warn("Push error in text_message:", e.message));
            if (from) {
              User.findByIdAndUpdate(from, {
                socket_id: socket.id,
                status: "Online",
              }).catch((e) => console.error("Update sender status error:", e));
            }
          } catch (err) {
            console.error("text_message error:", err);
          }
        });

        socket.on("file_message", async (data) => {
          try {
            console.log("Received file message:", data?.type, data?.fileName);

            // data: {to, from, text, file, url, fileName, song, conversation_id, type, temp_id}
            let { to, from, text, file, url, fileName, song, conversation_id, type, temp_id } = data;
            from = (from || socket.user_id || user_id)?.toString();

            let chat = null;
            if (conversation_id) {
              chat = await OneToOneMessage.findById(conversation_id);
            }

            if (!to && chat && Array.isArray(chat.participants) && from) {
              const other = chat.participants.find(
                (p) => (p?._id || p)?.toString() !== from
              );
              if (other) to = (other?._id || other)?.toString();
            }

            if (!to || !from) {
              console.log("file_message missing 'to' or 'from':", data);
              return;
            }

            // Fetch to_user and from_user in parallel for maximum speed
            const [to_user, from_user] = await Promise.all([
              User.findById(to).select("firstName lastName avatar socket_id status blocked_users"),
              User.findById(from).select("firstName lastName avatar socket_id status blocked_users"),
            ]);

            // Privacy & Block protection: drop message if blocked
            if (
              to_user?.blocked_users?.some((b) => b.toString() === from.toString()) ||
              from_user?.blocked_users?.some((b) => b.toString() === to.toString())
            ) {
              console.log(`Message dropped: blocked between ${from} and ${to}`);
              return;
            }

            const isRecipientOnline = to_user?.status === "Online" && Boolean(to_user?.socket_id);

            const new_message = {
              to,
              from,
              type: type || "Media",
              text: text || "",
              file: file || url || "",
              fileName: fileName || "",
              duration: data.duration || 0,
              song: song || undefined,
              status: isRecipientOnline ? "delivered" : "sent",
              seen: false,
              created_at: Date.now(),
            };

            if (!chat) {
              chat = await OneToOneMessage.findOne({
                participants: { $size: 2, $all: [to, from] },
              });
            }

            if (!chat) {
              chat = await OneToOneMessage.create({
                participants: [to, from],
                messages: [],
              });
            }

            // If the chat was marked deleted for either user, unmark it so the new message appears
            if (chat.deleted_for && Array.isArray(chat.deleted_for)) {
              chat.deleted_for = chat.deleted_for.filter(
                (uid) => uid.toString() !== to.toString() && uid.toString() !== from.toString()
              );
            }

            chat.messages.push(new_message);
            await chat.save({ validateModifiedOnly: true });

            const raw_saved = chat.messages[chat.messages.length - 1];
            const saved_message = raw_saved.toObject ? raw_saved.toObject() : JSON.parse(JSON.stringify(raw_saved));
            if (temp_id) {
              saved_message.temp_id = temp_id;
            }

            const senderInfo = {
              _id: from,
              name: `${from_user?.firstName || ""} ${from_user?.lastName || ""}`.trim() || "User",
              avatar: from_user?.avatar || "",
            };

            const payload = {
              conversation_id: chat._id,
              message: saved_message,
              sender: senderInfo,
            };

            // EMIT ONCE TO SENDER AND RECIPIENT
            socket.emit("new_message", payload);
            socket.to(from.toString()).emit("new_message", payload);
            io.to(to.toString()).emit("new_message", payload);

            // Send FCM Push Notification so device rings and updates badge when app is closed / on home screen
            let fileNotifBody = text || "";
            if (!fileNotifBody) {
              if (type === "Voice" || type === "Audio") fileNotifBody = "🎤 Voice message";
              else if (type === "Media") fileNotifBody = "📷 Photo";
              else if (type === "Document") fileNotifBody = `📁 Document: ${fileName || "File"}`;
              else fileNotifBody = "New attachment received";
            }
            sendPushNotificationToUser({
              userId: to,
              title: senderInfo.name || "Trackon",
              body: fileNotifBody,
              data: {
                conversation_id: (chat?._id || data.conversation_id || "").toString(),
                sender_id: from.toString(),
              },
            }).catch((e) => console.warn("Push error in file_message:", e.message));
            if (from) {
              User.findByIdAndUpdate(from, {
                socket_id: socket.id,
                status: "Online",
              }).catch((e) => console.error("Update sender status error:", e));
            }
          } catch (err) {
            console.error("file_message error:", err);
          }
        });

        // Delete Message (WhatsApp style: Delete for Me vs Delete for Everyone)
        socket.on("delete_message", async (data, callback) => {
          try {
            console.log("Delete message request:", data);
            const { conversation_id, message_id, delete_for = "me" } = data;
            if (!conversation_id || !message_id) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "Missing conversation_id or message_id" });
              }
              return;
            }

            const currentUserId = (socket.user_id || user_id || data.user_id)?.toString();
            if (!currentUserId) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "User not authenticated" });
              }
              return;
            }

            const chat = await OneToOneMessage.findById(conversation_id);
            if (!chat) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "Conversation not found" });
              }
              return;
            }

            const msgIndex = chat.messages.findIndex(
              (m) => m._id.toString() === message_id.toString()
            );
            if (msgIndex === -1) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "Message not found" });
              }
              return;
            }

            const msg = chat.messages[msgIndex];

            if (delete_for === "everyone") {
              // SECURITY CHECK: ONLY THE SENDER CAN DELETE FOR EVERYONE
              const senderId = (msg.from?._id || msg.from)?.toString();
              if (senderId !== currentUserId) {
                console.warn(
                  `Unauthorized delete for everyone attempt by ${currentUserId} on message sent by ${senderId}`
                );
                if (typeof callback === "function") {
                  callback({
                    status: "error",
                    message: "You can only delete your own sent messages for everyone.",
                  });
                }
                return;
              }

              // WhatsApp style: mark message as deleted for everyone
              msg.deleted = true;
              msg.text = "";
              msg.file = "";
              msg.reply = "";
              msg.reaction = "";
              chat.markModified("messages");
              await chat.save();

              // Notify both participants in this chat
              for (const participantId of chat.participants) {
                const pIdStr = (participantId?._id || participantId)?.toString();
                io.to(pIdStr).emit("message_deleted", {
                  conversation_id,
                  message_id,
                  delete_for: "everyone",
                  deleted_by: currentUserId,
                });
                const pUser = await User.findById(participantId).select("socket_id");
                if (pUser?.socket_id) {
                  io.to(pUser.socket_id).emit("message_deleted", {
                    conversation_id,
                    message_id,
                    delete_for: "everyone",
                    deleted_by: currentUserId,
                  });
                }
              }

              // Also ensure emitting directly to caller socket
              socket.emit("message_deleted", {
                conversation_id,
                message_id,
                delete_for: "everyone",
                deleted_by: currentUserId,
              });

              if (typeof callback === "function") {
                callback({ status: "success", delete_for: "everyone" });
              }
            } else {
              // DELETE FOR ME: Can delete any message (incoming or outgoing) for current user only
              if (!msg.deleted_for) {
                msg.deleted_for = [];
              }

              const alreadyDeleted = msg.deleted_for.some(
                (uid) => (uid?._id || uid)?.toString() === currentUserId
              );
              if (!alreadyDeleted) {
                msg.deleted_for.push(currentUserId);
              }

              // If all participants in the conversation have deleted this message for themselves, purge it
              const allParticipantsDeleted =
                chat.participants &&
                chat.participants.length > 0 &&
                chat.participants.every((pId) =>
                  msg.deleted_for.some(
                    (uid) => (uid?._id || uid)?.toString() === (pId?._id || pId)?.toString()
                  )
                );

              if (allParticipantsDeleted) {
                chat.messages.splice(msgIndex, 1);
              }

              chat.markModified("messages");
              await chat.save();

              // CRITICAL: Notify ONLY the requesting user's sockets & room!
              // The other participant's device is NOT notified and remains completely untouched!
              io.to(currentUserId).emit("message_deleted", {
                conversation_id,
                message_id,
                delete_for: "me",
              });

              const currentUserDoc = await User.findById(currentUserId).select("socket_id");
              if (currentUserDoc?.socket_id && currentUserDoc.socket_id !== socket.id) {
                io.to(currentUserDoc.socket_id).emit("message_deleted", {
                  conversation_id,
                  message_id,
                  delete_for: "me",
                });
              }
              socket.emit("message_deleted", {
                conversation_id,
                message_id,
                delete_for: "me",
              });

              if (typeof callback === "function") {
                callback({ status: "success", delete_for: "me" });
              }
            }
          } catch (err) {
            console.error("delete_message error:", err);
            if (typeof callback === "function") {
              callback({ status: "error", message: err.message });
            }
          }
        });

        // ========================================
        // DELETE CHAT (Deletes entire chat for requesting user ONLY)
        // ========================================
        socket.on("delete_chat", async (data, callback) => {
          try {
            console.log("Delete chat request:", data);
            const { conversation_id } = data;
            if (!conversation_id) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "Missing conversation_id" });
              }
              return;
            }

            const currentUserId = (socket.user_id || user_id || data.user_id)?.toString();
            if (!currentUserId) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "User not authenticated" });
              }
              return;
            }

            let chat = null;
            if (mongoose.Types.ObjectId.isValid(conversation_id)) {
              chat = await OneToOneMessage.findById(conversation_id);
            }
            if (!chat && mongoose.Types.ObjectId.isValid(conversation_id) && mongoose.Types.ObjectId.isValid(currentUserId)) {
              chat = await OneToOneMessage.findOne({
                participants: { $size: 2, $all: [conversation_id, currentUserId] },
              });
            }
            if (!chat) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "Conversation not found" });
              }
              return;
            }

            // Mark the chat itself as deleted for the requesting user
            if (!chat.deleted_for) chat.deleted_for = [];
            if (!chat.deleted_for.some((uid) => (uid?._id || uid)?.toString() === currentUserId)) {
              chat.deleted_for.push(currentUserId);
            }

            // Mark ALL existing messages in this conversation as deleted for the requesting user
            if (chat.messages && Array.isArray(chat.messages)) {
              chat.messages.forEach((msg) => {
                if (!msg.deleted_for) msg.deleted_for = [];
                if (!msg.deleted_for.some((uid) => (uid?._id || uid)?.toString() === currentUserId)) {
                  msg.deleted_for.push(currentUserId);
                }
              });
            }

            // If ALL participants have deleted this chat, purge messages
            const allParticipantsDeleted =
              chat.participants &&
              chat.participants.length > 0 &&
              chat.participants.every((pId) =>
                chat.deleted_for.some((uid) => (uid?._id || uid)?.toString() === (pId?._id || pId)?.toString())
              );
            if (allParticipantsDeleted) {
              chat.messages = [];
            }

            chat.markModified("messages");
            chat.markModified("deleted_for");
            await chat.save();

            const convIdStr = chat._id.toString();

            // CRITICAL: Notify ONLY the requesting user's sockets & room!
            io.to(currentUserId).emit("chat_deleted", {
              conversation_id: convIdStr,
            });

            const currentUserDoc = await User.findById(currentUserId).select("socket_id");
            if (currentUserDoc?.socket_id && currentUserDoc.socket_id !== socket.id) {
              io.to(currentUserDoc.socket_id).emit("chat_deleted", {
                conversation_id: convIdStr,
              });
            }
            socket.emit("chat_deleted", {
              conversation_id: convIdStr,
            });

            if (typeof callback === "function") {
              callback({ status: "success" });
            }
          } catch (err) {
            console.error("delete_chat error:", err);
            if (typeof callback === "function") {
              callback({ status: "error", message: err.message });
            }
          }
        });

        // ========================================
        // CLEAR CHAT (Clears messages for requesting user ONLY)
        // ========================================
        socket.on("clear_chat", async (data, callback) => {
          try {
            console.log("Clear chat request:", data);
            const { conversation_id } = data;
            if (!conversation_id) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "Missing conversation_id" });
              }
              return;
            }

            const currentUserId = (socket.user_id || user_id || data.user_id)?.toString();
            if (!currentUserId) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "User not authenticated" });
              }
              return;
            }

            let chat = null;
            if (mongoose.Types.ObjectId.isValid(conversation_id)) {
              chat = await OneToOneMessage.findById(conversation_id);
            }
            if (!chat && mongoose.Types.ObjectId.isValid(conversation_id) && mongoose.Types.ObjectId.isValid(currentUserId)) {
              chat = await OneToOneMessage.findOne({
                participants: { $size: 2, $all: [conversation_id, currentUserId] },
              });
            }
            if (!chat) {
              if (typeof callback === "function") {
                callback({ status: "error", message: "Conversation not found" });
              }
              return;
            }

            // Mark ALL existing messages as deleted for this user
            if (chat.messages && Array.isArray(chat.messages)) {
              chat.messages.forEach((msg) => {
                if (!msg.deleted_for) msg.deleted_for = [];
                if (!msg.deleted_for.some((uid) => (uid?._id || uid)?.toString() === currentUserId)) {
                  msg.deleted_for.push(currentUserId);
                }
              });
            }

            chat.markModified("messages");
            await chat.save();

            const convIdStr = chat._id.toString();

            // Notify ONLY the requesting user's sockets & room!
            io.to(currentUserId).emit("chat_cleared", {
              conversation_id: convIdStr,
            });

            const currentUserDoc = await User.findById(currentUserId).select("socket_id");
            if (currentUserDoc?.socket_id && currentUserDoc.socket_id !== socket.id) {
              io.to(currentUserDoc.socket_id).emit("chat_cleared", {
                conversation_id: convIdStr,
              });
            }
            socket.emit("chat_cleared", {
              conversation_id: convIdStr,
            });

            if (typeof callback === "function") {
              callback({ status: "success" });
            }
          } catch (err) {
            console.error("clear_chat error:", err);
            if (typeof callback === "function") {
              callback({ status: "error", message: err.message });
            }
          }
        });

        // React to Message
        socket.on("react_message", async (data, callback) => {
          try {
            console.log("React message request:", data);
            const { conversation_id, message_id, reaction } = data;
            if (!conversation_id || !message_id) return;

            const chat = await OneToOneMessage.findById(conversation_id);
            if (!chat) return;

            const msg = chat.messages.id(message_id);
            if (!msg) return;

            // If same reaction, toggle off, otherwise set new reaction
            msg.reaction = msg.reaction === reaction ? "" : (reaction || "");
            await chat.save({ validateModifiedOnly: true });

            // Notify both participants via room and socket
            for (const participantId of chat.participants) {
              const pStr = (participantId?._id || participantId)?.toString();
              if (pStr) {
                io.to(pStr).emit("message_reacted", {
                  conversation_id,
                  message_id,
                  reaction: msg.reaction,
                });
                io.to(pStr).emit("message_reaction", {
                  conversation_id,
                  message_id,
                  reaction: msg.reaction,
                });
              }
              const user = await User.findById(participantId).select("socket_id");
              if (user?.socket_id) {
                io.to(user.socket_id).emit("message_reacted", {
                  conversation_id,
                  message_id,
                  reaction: msg.reaction,
                });
              }
            }

            if (typeof callback === "function") {
              callback({ status: "success", reaction: msg.reaction });
            }
          } catch (err) {
            console.error("react_message error:", err);
          }
        });

        // Star Message
        socket.on("star_message", async (data, callback) => {
          try {
            console.log("Star message request:", data);
            const { conversation_id, message_id } = data;
            if (!conversation_id || !message_id) return;

            const chat = await OneToOneMessage.findById(conversation_id);
            if (!chat) return;

            const msg = chat.messages.id(message_id);
            if (!msg) return;

            msg.starred = !msg.starred;
            await chat.save({ validateModifiedOnly: true });

            // Notify both participants via room and socket
            for (const participantId of chat.participants) {
              const pStr = (participantId?._id || participantId)?.toString();
              if (pStr) {
                io.to(pStr).emit("message_starred", {
                  conversation_id,
                  message_id,
                  starred: msg.starred,
                });
              }
              const user = await User.findById(participantId).select("socket_id");
              if (user?.socket_id) {
                io.to(user.socket_id).emit("message_starred", {
                  conversation_id,
                  message_id,
                  starred: msg.starred,
                });
              }
            }

            if (typeof callback === "function") {
              callback({ status: "success", starred: msg.starred });
            }
          } catch (err) {
            console.error("star_message error:", err);
          }
        });

        // Report Message
        socket.on("report_message", async (data, callback) => {
          try {
            console.log("Report message request:", data);
            if (typeof callback === "function") {
              callback({
                status: "success",
                message: "Report submitted successfully. Thank you for making our platform safer.",
              });
            }
          } catch (err) {
            console.error("report_message error:", err);
          }
        });

        // ========================================
        // CALL & WEBRTC EVENT HANDLERS
        // ========================================

        const emitToUser = async (targetUserId, eventName, payload, excludeSocketId = null) => {
          if (!targetUserId) return false;
          const uidStr = (targetUserId?._id || targetUserId).toString();
          if (!mongoose.Types.ObjectId.isValid(uidStr)) return false;

          const targetUser = await User.findById(uidStr).select("socket_id status");
          const roomSockets = await io.in(uidStr).fetchSockets();
          const hasActiveSocket =
            (roomSockets && roomSockets.length > 0) || Boolean(targetUser?.socket_id);

          if (!hasActiveSocket) return false;

          let emitter = io.to(uidStr);
          if (targetUser?.socket_id) {
            emitter = emitter.to(targetUser.socket_id);
          }
          if (excludeSocketId) {
            emitter = emitter.except(excludeSocketId);
          }
          emitter.emit(eventName, payload);
          return true;
        };

        // Join dedicated WebRTC call signaling room
        socket.on("webrtc_join_room", ({ roomID, userID }) => {
          try {
            if (roomID) {
              socket.join(`call_${roomID}`);
            }
            if (userID) {
              socket.join(userID.toString());
            }
          } catch (err) {
            console.error("webrtc_join_room error:", err);
          }
        });

        // Relay WebRTC SDP Offer / Answer / ICE Candidate / Media State
        socket.on("webrtc_signal", async (data) => {
          try {
            const { roomID, to } = data || {};
            if (roomID) {
              socket.to(`call_${roomID}`).emit("webrtc_signal", data);
            }
            if (to) {
              await emitToUser(to, "webrtc_signal", data, socket.id);
            }
          } catch (err) {
            console.error("webrtc_signal error:", err);
          }
        });

        // Relay explicit call ended event
        socket.on("webrtc_call_ended", async (data) => {
          try {
            const { roomID, to } = data || {};
            if (roomID) {
              socket.to(`call_${roomID}`).emit("webrtc_call_ended", data);
            }
            if (to) {
              await emitToUser(to, "webrtc_call_ended", data, socket.id);
            }
          } catch (err) {
            console.error("webrtc_call_ended error:", err);
          }
        });

        // Start Audio Call
        socket.on("start_audio_call", async (data) => {
          try {
            console.log("start_audio_call:", data);
            const { to, from, roomID } = data || {};
            if (!to || !from) return;

            if (roomID) {
              socket.join(`call_${roomID}`);
            }

            const to_user = await User.findById(to).select("firstName lastName avatar socket_id status blocked_users");
            const from_user = await User.findById(from).select("firstName lastName avatar socket_id status blocked_users");

            if (
              to_user?.blocked_users?.some((b) => b.toString() === from.toString()) ||
              from_user?.blocked_users?.some((b) => b.toString() === to.toString())
            ) {
              socket.emit("user_is_busy_audio_call", { ...data });
              return;
            }
            const callerName = `${from_user?.firstName || ""} ${from_user?.lastName || ""}`.trim() || "Trackon";

            io.to(to.toString()).emit("audio_call_notification", {
              call_id: roomID,
              roomID,
              streamID: from.toString(),
              userID: to.toString(),
              userName: `${to_user?.firstName || ""} ${to_user?.lastName || ""}`.trim(),
              from_user,
              to_user,
              caller_name: callerName,
              caller_avatar: from_user?.avatar || "",
              caller_id: from.toString(),
              call_type: "audio",
            });

            const delivered = await emitToUser(
              to,
              "audio_call_notification",
              {
                call_id: roomID,
                roomID,
                streamID: from.toString(),
                userID: to.toString(),
                userName: `${to_user?.firstName || ""} ${to_user?.lastName || ""}`.trim(),
                from_user,
                to_user,
                caller_name: callerName,
                caller_avatar: from_user?.avatar || "",
                caller_id: from.toString(),
                call_type: "audio",
              },
              socket.id
            );

            // Send FCM Push Notification so recipient device wakes & rings even on home screen or when app is closed
            sendPushNotificationToUser({
              userId: to,
              title: "Incoming Audio Call",
              body: `📞 ${callerName} is calling you...`,
              data: {
                type: "incoming_call",
                call_type: "audio",
                roomID: (roomID || "").toString(),
                caller_id: from.toString(),
                caller_name: callerName,
                caller_avatar: from_user?.avatar || "",
              },
              channelId: "trackon_call_channel_v1",
            }).catch((e) => console.warn("Push error in start_audio_call:", e.message));

            if (!delivered) {
              // Recipient socket is not currently connected.
              // Push notification was sent to wake the phone. Wait for 35s ring window instead of instant abort.
              setTimeout(async () => {
                try {
                  const callDoc = await AudioCall.findById(roomID).catch(() => null);
                  if (callDoc && callDoc.verdict !== "Accepted" && callDoc.verdict !== "Denied") {
                    socket.emit("audio_call_missed", { to, from, roomID, call_id: roomID });
                    await AudioCall.findByIdAndUpdate(roomID, { status: "Ended", verdict: "Missed" }).catch(() => {});
                  }
                } catch (e) {}
              }, 35000);
            }
          } catch (err) {
            console.error("start_audio_call error:", err);
          }
        });

        // Start Video Call
        socket.on("start_video_call", async (data) => {
          try {
            console.log("start_video_call:", data);
            const { to, from, roomID } = data || {};
            if (!to || !from) return;

            if (roomID) {
              socket.join(`call_${roomID}`);
            }

            const to_user = await User.findById(to).select("firstName lastName avatar socket_id status blocked_users");
            const from_user = await User.findById(from).select("firstName lastName avatar socket_id status blocked_users");

            if (
              to_user?.blocked_users?.some((b) => b.toString() === from.toString()) ||
              from_user?.blocked_users?.some((b) => b.toString() === to.toString())
            ) {
              socket.emit("user_is_busy_video_call", { ...data });
              return;
            }
            const callerName = `${from_user?.firstName || ""} ${from_user?.lastName || ""}`.trim() || "Trackon";

            const delivered = await emitToUser(
              to,
              "video_call_notification",
              {
                call_id: roomID,
                roomID,
                streamID: from.toString(),
                userID: to.toString(),
                userName: `${to_user?.firstName || ""} ${to_user?.lastName || ""}`.trim(),
                from_user,
                to_user,
                caller_name: callerName,
                caller_avatar: from_user?.avatar || "",
                caller_id: from.toString(),
                call_type: "video",
              },
              socket.id
            );

            // Send FCM Push Notification so recipient device wakes & rings even on home screen or when app is closed
            sendPushNotificationToUser({
              userId: to,
              title: "Incoming Video Call",
              body: `📹 ${callerName} is video calling you...`,
              data: {
                type: "incoming_call",
                call_type: "video",
                roomID: (roomID || "").toString(),
                caller_id: from.toString(),
                caller_name: callerName,
                caller_avatar: from_user?.avatar || "",
              },
              channelId: "trackon_call_channel_v1",
            }).catch((e) => console.warn("Push error in start_video_call:", e.message));

            if (!delivered) {
              // Recipient socket is not currently connected.
              // Push notification was sent to wake the phone. Wait for 35s ring window instead of instant abort.
              setTimeout(async () => {
                try {
                  const callDoc = await VideoCall.findById(roomID).catch(() => null);
                  if (callDoc && callDoc.verdict !== "Accepted" && callDoc.verdict !== "Denied") {
                    socket.emit("video_call_missed", { to, from, roomID, call_id: roomID });
                    await VideoCall.findByIdAndUpdate(roomID, { status: "Ended", verdict: "Missed" }).catch(() => {});
                  }
                } catch (e) {}
              }, 35000);
            }
          } catch (err) {
            console.error("start_video_call error:", err);
          }
        });

        // Audio Call Accepted (also forwards embedded webrtc_signal for backward compatibility)
        socket.on("audio_call_accepted", async (data) => {
          try {
            const roomID = data?.call_id || data?.roomID;
            if (!data?.webrtc_signal && roomID && mongoose.Types.ObjectId.isValid(roomID)) {
              console.log("audio_call_accepted:", roomID);
              await AudioCall.findByIdAndUpdate(roomID, {
                verdict: "Accepted",
                status: "Ongoing",
              });
            }
            const targetId = data?.streamID || data?.to || data?.from_user?._id;
            if (roomID) {
              socket.to(`call_${roomID}`).emit("audio_call_accepted", data);
            }
            if (targetId) {
              await emitToUser(targetId, "audio_call_accepted", data, socket.id);
            }
          } catch (err) {
            console.error("audio_call_accepted error:", err);
          }
        });

        // Video Call Accepted (also forwards embedded webrtc_signal for backward compatibility)
        socket.on("video_call_accepted", async (data) => {
          try {
            const roomID = data?.call_id || data?.roomID;
            if (!data?.webrtc_signal && roomID && mongoose.Types.ObjectId.isValid(roomID)) {
              console.log("video_call_accepted:", roomID);
              await VideoCall.findByIdAndUpdate(roomID, {
                verdict: "Accepted",
                status: "Ongoing",
              });
            }
            const targetId = data?.streamID || data?.to || data?.from_user?._id;
            if (roomID) {
              socket.to(`call_${roomID}`).emit("video_call_accepted", data);
            }
            if (targetId) {
              await emitToUser(targetId, "video_call_accepted", data, socket.id);
            }
          } catch (err) {
            console.error("video_call_accepted error:", err);
          }
        });

        // Audio Call Denied / Ended
        socket.on("audio_call_denied", async (data) => {
          try {
            console.log("audio_call_denied:", data?.roomID || data?.call_id);
            const roomID = data?.call_id || data?.roomID;
            let call = null;
            if (roomID && mongoose.Types.ObjectId.isValid(roomID)) {
              const existing = await AudioCall.findById(roomID);
              call = await AudioCall.findByIdAndUpdate(
                roomID,
                {
                  verdict: existing?.verdict === "Accepted" ? "Accepted" : "Denied",
                  status: "Ended",
                  endedAt: Date.now(),
                },
                { new: true }
              );
            }

            if (roomID) {
              socket.to(`call_${roomID}`).emit("audio_call_denied", data);
            }

            if (call && call.participants) {
              for (const p of call.participants) {
                await emitToUser(p, "audio_call_denied", data, socket.id);
              }
            } else {
              const callerId = data?.streamID || data?.to || data?.from_user?._id || data?.from;
              if (callerId) {
                await emitToUser(callerId, "audio_call_denied", data, socket.id);
              }
            }
          } catch (err) {
            console.error("audio_call_denied error:", err);
          }
        });

        // Video Call Denied / Ended
        socket.on("video_call_denied", async (data) => {
          try {
            console.log("video_call_denied:", data?.roomID || data?.call_id);
            const roomID = data?.call_id || data?.roomID;
            let call = null;
            if (roomID && mongoose.Types.ObjectId.isValid(roomID)) {
              const existing = await VideoCall.findById(roomID);
              call = await VideoCall.findByIdAndUpdate(
                roomID,
                {
                  verdict: existing?.verdict === "Accepted" ? "Accepted" : "Denied",
                  status: "Ended",
                  endedAt: Date.now(),
                },
                { new: true }
              );
            }

            if (roomID) {
              socket.to(`call_${roomID}`).emit("video_call_denied", data);
            }

            if (call && call.participants) {
              for (const p of call.participants) {
                await emitToUser(p, "video_call_denied", data, socket.id);
              }
            } else {
              const callerId = data?.streamID || data?.to || data?.from_user?._id || data?.from;
              if (callerId) {
                await emitToUser(callerId, "video_call_denied", data, socket.id);
              }
            }
          } catch (err) {
            console.error("video_call_denied error:", err);
          }
        });

        // Audio Call Not Picked / Missed
        socket.on("audio_call_not_picked", async (data) => {
          try {
            console.log("audio_call_not_picked:", data);
            const roomID = data?.call_id || data?.roomID;
            if (roomID) {
              socket.to(`call_${roomID}`).emit("audio_call_missed", data);
            }
            if (data?.to) {
              await emitToUser(data.to, "audio_call_missed", data, socket.id);
            }
            if (roomID && mongoose.Types.ObjectId.isValid(roomID)) {
              await AudioCall.findByIdAndUpdate(roomID, {
                verdict: "Missed",
                status: "Ended",
                endedAt: Date.now(),
              });
            }
          } catch (err) {
            console.error("audio_call_not_picked error:", err);
          }
        });

        // Video Call Not Picked / Missed
        socket.on("video_call_not_picked", async (data) => {
          try {
            console.log("video_call_not_picked:", data);
            const roomID = data?.call_id || data?.roomID;
            if (roomID) {
              socket.to(`call_${roomID}`).emit("video_call_missed", data);
            }
            if (data?.to) {
              await emitToUser(data.to, "video_call_missed", data, socket.id);
            }
            if (roomID && mongoose.Types.ObjectId.isValid(roomID)) {
              await VideoCall.findByIdAndUpdate(roomID, {
                verdict: "Missed",
                status: "Ended",
                endedAt: Date.now(),
              });
            }
          } catch (err) {
            console.error("video_call_not_picked error:", err);
          }
        });

        // User Busy
        socket.on("user_is_busy_audio_call", async (data) => {
          try {
            const callDetails = data?.call || data;
            const callerId =
              callDetails?.streamID ||
              callDetails?.from_user?._id ||
              callDetails?.from;
            if (callerId) {
              await emitToUser(
                callerId,
                "audio_call_denied",
                {
                  ...callDetails,
                  busy: true,
                },
                socket.id
              );
            }
          } catch (err) {
            console.error("user_is_busy_audio_call error:", err);
          }
        });

        socket.on("user_is_busy_video_call", async (data) => {
          try {
            const callDetails = data?.call || data;
            const callerId =
              callDetails?.streamID ||
              callDetails?.from_user?._id ||
              callDetails?.from;
            if (callerId) {
              await emitToUser(
                callerId,
                "video_call_denied",
                {
                  ...callDetails,
                  busy: true,
                },
                socket.id
              );
            }
          } catch (err) {
            console.error("user_is_busy_video_call error:", err);
          }
        });

        socket.on("end", async (data) => {
          try {
            // find user by _id and set the status to offline
            if (data?.user_id) {
              await User.findByIdAndUpdate(data.user_id, {
                status: "Offline",
                $unset: {
                  socket_id: 1,
                },
              });
            }

            // broadcast user_disconnected
            console.log("Closing connection");

            socket.disconnect(true);
          } catch (err) {
            console.error("end error:", err);
          }
        });
      } catch (err) {
        console.error("Socket connection error:", err);
      }
    });
  } catch (err) {
    console.error("❌ MONGODB CONNECTION FAILED");

    console.error("Name:", err.name);
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("Syscall:", err.syscall);
    console.error("Hostname:", err.hostname);

    process.exit(1);
  }
}

startServer();
