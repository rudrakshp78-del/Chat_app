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

const { Server } = require("socket.io");
const sgMail = require("@sendgrid/mail");

const app = require("./app");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");
const AudioCall = require("./models/audioCall");
const VideoCall = require("./models/videoCall");

// ================================
// SENDGRID
// ================================

console.log("=== SENDGRID DEBUG ===");
console.log("API key exists:", !!process.env.SENDGRID_API_KEY);
console.log("API key prefix:", process.env.SENDGRID_API_KEY?.slice(0, 3));
console.log("API key length:", process.env.SENDGRID_API_KEY?.length);
console.log("From email:", process.env.SENDGRID_FROM_EMAIL);
console.log("======================");

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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
    console.log("Connecting to MongoDB...");

    await mongoose.connect(DB, {
      serverSelectionTimeoutMS: 10000,
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
    // SOCKET CONNECTION
    // ================================

    io.on("connection", async (socket) => {
      try {
        const user_id = socket.handshake.query["user_id"];
        const socket_id = socket.id;

        console.log(`User connected: ${socket_id}`);
        console.log(`User ID: ${user_id}`);

        socket.user_id = user_id ? user_id.toString() : null;

        const deliverPendingMessages = async (targetUserId) => {
          try {
            if (!targetUserId) return;
            const targetIdStr = targetUserId.toString();
            const pendingChats = await OneToOneMessage.find({
              participants: targetIdStr,
              "messages.to": targetIdStr,
              "messages.status": "sent",
            });

            for (const chat of pendingChats) {
              let updated = false;
              chat.messages.forEach((msg) => {
                if (
                  (msg.to?._id || msg.to)?.toString() === targetIdStr &&
                  msg.status === "sent"
                ) {
                  msg.status = "delivered";
                  updated = true;
                }
              });

              if (updated) {
                await chat.save({ validateModifiedOnly: true });
                chat.participants.forEach((pId) => {
                  const pStr = (pId?._id || pId)?.toString();
                  if (pStr !== targetIdStr) {
                    io.to(pStr).emit("messages_delivered", {
                      conversation_id: chat._id,
                      user_id: targetIdStr,
                    });
                  }
                });
              }
            }
          } catch (err) {
            console.error("deliverPendingMessages error:", err);
          }
        };

        // Save socket ID to user & join personal room
        if (Boolean(user_id)) {
          socket.join(user_id.toString());
          await User.findByIdAndUpdate(user_id, {
            socket_id,
            status: "Online",
          });
          deliverPendingMessages(user_id);
        }

        socket.on("user_connected", async (data) => {
          try {
            const uid = (data?.user_id || socket.handshake.query["user_id"])?.toString();
            if (uid) {
              socket.user_id = uid;
              socket.join(uid);
              await User.findByIdAndUpdate(uid, {
                socket_id: socket.id,
                status: "Online",
              });
              deliverPendingMessages(uid);
              console.log(`User connected and joined room: ${uid}`);
            }
          } catch (e) {
            console.error("user_connected error:", e);
          }
        });

        // ========================================
        // FRIEND REQUEST
        // ========================================

        socket.on("friend_request", async (data) => {
          try {
            console.log("Friend request received:", data);

            // data = {
            //   to: recipient user ID,
            //   from: sender user ID
            // }

            const to = await User.findById(data.to).select("socket_id");

            const fromUser = await User.findById(data.from).select("socket_id");

            if (!to) {
              console.log("Recipient user not found");
              return;
            }

            if (!fromUser) {
              console.log("Sender user not found");
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
            // NOTIFY RECIPIENT
            // ========================================

            if (to.socket_id) {
              io.to(to.socket_id).emit("new_friend_request", {
                message: "New friend request received",
                request_id: request._id,
              });
            }

            // ========================================
            // NOTIFY SENDER
            // ========================================

            if (fromUser.socket_id) {
              io.to(fromUser.socket_id).emit("request_sent", {
                message: "Request sent successfully!",
                request_id: request._id,
              });
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

            console.log("Friend request:", requestDoc);

            const sender = await User.findById(requestDoc.sender);

            const receiver = await User.findById(requestDoc.recipient);

            if (!sender || !receiver) {
              console.log("Sender or receiver not found");
              return;
            }

            // ========================================
            // ADD FRIENDS
            // ========================================

            if (!sender.friends.includes(requestDoc.recipient)) {
              sender.friends.push(requestDoc.recipient);
            }

            if (!receiver.friends.includes(requestDoc.sender)) {
              receiver.friends.push(requestDoc.sender);
            }

            await sender.save();
            await receiver.save();

            // ========================================
            // DELETE FRIEND REQUEST
            // ========================================

            await FriendRequest.findByIdAndDelete(data.request_id);

            // ========================================
            // NOTIFY SENDER
            // ========================================

            if (sender.socket_id) {
              io.to(sender.socket_id).emit("request_accepted", {
                message: "Friend request accepted",
              });
            }

            // ========================================
            // NOTIFY RECEIVER
            // ========================================

            if (receiver.socket_id) {
              io.to(receiver.socket_id).emit("request_accepted", {
                message: "Friend request accepted",
              });
            }

            console.log("✅ Friend request accepted");
          } catch (err) {
            console.error("accept_request error:", err);
          }
        });

        // ========================================
        // DISCONNECT
        // ========================================

        socket.on("disconnect", async () => {
          try {
            console.log(`User disconnected: ${socket.id}`);

            if (user_id) {
              await User.findByIdAndUpdate(user_id, {
                status: "Offline",
                $unset: {
                  socket_id: 1,
                },
              });
            }
          } catch (err) {
            console.error("disconnect error:", err);
          }
        });

        // ========================================
        // END CONNECTION & CHAT HANDLERS
        // ========================================

        socket.on("get_direct_conversations", async ({ user_id: req_user_id }, callback) => {
          try {
            const currentUserId = (socket.user_id || user_id || req_user_id)?.toString();
            if (!currentUserId) {
              if (typeof callback === "function") callback([]);
              return;
            }

            const existing_conversations = await OneToOneMessage.find({
              participants: { $all: [currentUserId] },
            }).populate("participants", "firstName lastName _id email status avatar about links");

            console.log("Direct conversations found:", existing_conversations.length);

            // Filter out messages that were deleted for this user
            const filteredConversations = existing_conversations
              .map((conv) => {
                const convObj = conv.toObject ? conv.toObject() : JSON.parse(JSON.stringify(conv));
                if (convObj.messages && Array.isArray(convObj.messages)) {
                  convObj.messages = convObj.messages.filter((msg) => {
                    if (msg.deleted_for && Array.isArray(msg.deleted_for)) {
                      return !msg.deleted_for.some(
                        (uid) => (uid?._id || uid)?.toString() === currentUserId
                      );
                    }
                    return true;
                  });
                }
                return convObj;
              })
              .filter((conv) => {
                // If user deleted this chat and there are no messages left for this user, do not show in sidebar
                const isChatDeletedForUser =
                  conv.deleted_for &&
                  Array.isArray(conv.deleted_for) &&
                  conv.deleted_for.some(
                    (uid) => (uid?._id || uid)?.toString() === currentUserId
                  );
                if (isChatDeletedForUser && (!conv.messages || conv.messages.length === 0)) {
                  return false;
                }
                return true;
              });

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

            // check if there is any existing conversation between these users 
            let existing_conversation = await OneToOneMessage.findOne({
              participants: { $size: 2, $all: [to, from] },
            }).populate("participants", "firstName lastName _id email status avatar about links");

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
              }
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
            if (!data?.conversation_id) {
              if (typeof callback === "function") callback([]);
              return;
            }

            const currentUserId = (socket.user_id || user_id || data?.user_id)?.toString();
            const chat = await OneToOneMessage.findById(data.conversation_id);

            if (chat && currentUserId) {
              let hasUnseen = false;
              chat.messages.forEach((msg) => {
                const msgToStr = (msg.to?._id || msg.to)?.toString();
                if (
                  msgToStr === currentUserId &&
                  !msg.seen &&
                  msg.status !== "seen"
                ) {
                  msg.seen = true;
                  msg.status = "seen";
                  msg.seen_at = new Date();
                  hasUnseen = true;
                }
              });

              if (hasUnseen) {
                await chat.save({ validateModifiedOnly: true });

                // Notify other participants in real-time
                chat.participants.forEach((pId) => {
                  const pStr = (pId?._id || pId)?.toString();
                  if (pStr !== currentUserId) {
                    io.to(pStr).emit("messages_seen", {
                      conversation_id: chat._id,
                      reader_id: currentUserId,
                    });
                  }
                });
              }
            }

            const messages = (chat?.messages || []).filter((msg) => {
              if (currentUserId && msg.deleted_for && Array.isArray(msg.deleted_for)) {
                return !msg.deleted_for.some(
                  (uid) => (uid?._id || uid)?.toString() === currentUserId
                );
              }
              return true;
            });

            if (typeof callback === "function") {
              callback(messages);
            }
          } catch (err) {
            console.error("get_messages error:", err);
            if (typeof callback === "function") {
              callback([]);
            }
          }
        });

        // Dedicated socket listener to mark messages as seen
        socket.on("mark_messages_seen", async (data) => {
          try {
            const { conversation_id } = data || {};
            const currentUserId = (socket.user_id || user_id || data?.user_id)?.toString();
            if (!conversation_id || !currentUserId) return;

            const chat = await OneToOneMessage.findById(conversation_id);
            if (!chat) return;

            let hasUnseen = false;
            chat.messages.forEach((msg) => {
              const msgToStr = (msg.to?._id || msg.to)?.toString();
              if (
                msgToStr === currentUserId &&
                !msg.seen &&
                msg.status !== "seen"
              ) {
                msg.seen = true;
                msg.status = "seen";
                msg.seen_at = new Date();
                hasUnseen = true;
              }
            });

            if (hasUnseen) {
              await chat.save({ validateModifiedOnly: true });

              chat.participants.forEach((pId) => {
                const pStr = (pId?._id || pId)?.toString();
                if (pStr !== currentUserId) {
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

            // data: {to, from, message, conversation_id, type, reply} 
            let { to, from, message, conversation_id, type, reply } = data;
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

            const to_user = await User.findById(to).select("socket_id status");
            const from_user = await User.findById(from).select("socket_id");

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

            const saved_message = chat.messages[chat.messages.length - 1];

            // Keep sender's socket_id up-to-date
            if (from) {
              await User.findByIdAndUpdate(from, {
                socket_id: socket.id,
                status: "Online",
              });
            }

            // emit new_message -> directly to sender's active socket
            socket.emit("new_message", {
              conversation_id: chat._id,
              message: saved_message,
            });

            // emit new_message -> to sender's room
            io.to(from.toString()).emit("new_message", {
              conversation_id: chat._id,
              message: saved_message,
            });

            // emit new_message -> to recipient user room
            io.to(to.toString()).emit("new_message", {
              conversation_id: chat._id,
              message: saved_message,
            });

            // emit new_message -> to sender's other sockets (if any)
            if (from_user?.socket_id && from_user.socket_id !== socket.id) {
              io.to(from_user.socket_id).emit("new_message", {
                conversation_id: chat._id,
                message: saved_message,
              });
            }

            // emit new_message -> to recipient user socket_id (if any)
            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("new_message", {
                conversation_id: chat._id,
                message: saved_message,
              });
            }
          } catch (err) {
            console.error("text_message error:", err);
          }
        });

        socket.on("file_message", async (data) => {
          try {
            console.log("Received file message:", data?.type, data?.fileName);

            // data: {to, from, text, file, url, fileName, song, conversation_id, type}
            let { to, from, text, file, url, fileName, song, conversation_id, type } = data;
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

            const to_user = await User.findById(to).select("socket_id status");
            const from_user = await User.findById(from).select("socket_id");

            const isRecipientOnline = to_user?.status === "Online" && Boolean(to_user?.socket_id);

            const normalizedType =
              type === "Doc" || type === "Document"
                ? "Document"
                : type || "Media";

            const new_message = {
              to,
              from,
              type: normalizedType,
              text: text || "",
              file: url || (typeof file === "string" ? file : file?.name || ""),
              fileName: fileName || (typeof file === "object" ? file?.name : ""),
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

            const saved_message = chat.messages[chat.messages.length - 1];

            // Keep sender's socket_id up-to-date
            if (from) {
              await User.findByIdAndUpdate(from, {
                socket_id: socket.id,
                status: "Online",
              });
            }

            // emit new_message -> directly to sender's active socket
            socket.emit("new_message", {
              conversation_id: chat._id,
              message: saved_message,
            });

            // emit new_message -> to sender's room
            io.to(from.toString()).emit("new_message", {
              conversation_id: chat._id,
              message: saved_message,
            });

            // emit new_message -> to recipient user room
            io.to(to.toString()).emit("new_message", {
              conversation_id: chat._id,
              message: saved_message,
            });

            // emit new_message -> to sender's other sockets (if any)
            if (from_user?.socket_id && from_user.socket_id !== socket.id) {
              io.to(from_user.socket_id).emit("new_message", {
                conversation_id: chat._id,
                message: saved_message,
              });
            }

            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("new_message", {
                conversation_id: chat._id,
                message: saved_message,
              });
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

            // Notify both participants
            for (const participantId of chat.participants) {
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

            // Notify both participants
            for (const participantId of chat.participants) {
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
        // CALL EVENT HANDLERS
        // ========================================

        // Start Audio Call
        socket.on("start_audio_call", async (data) => {
          try {
            console.log("start_audio_call:", data);
            const { to, from, roomID } = data;
            const to_user = await User.findById(to);
            const from_user = await User.findById(from);

            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("audio_call_notification", {
                roomID,
                streamID: from,
                userID: to,
                userName: `${to_user.firstName} ${to_user.lastName}`.trim(),
                from_user,
                to_user,
              });
            } else {
              // recipient is offline
              socket.emit("audio_call_missed", { to, from, roomID });
            }
          } catch (err) {
            console.error("start_audio_call error:", err);
          }
        });

        // Start Video Call
        socket.on("start_video_call", async (data) => {
          try {
            console.log("start_video_call:", data);
            const { to, from, roomID } = data;
            const to_user = await User.findById(to);
            const from_user = await User.findById(from);

            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("video_call_notification", {
                roomID,
                streamID: from,
                userID: to,
                userName: `${to_user.firstName} ${to_user.lastName}`.trim(),
                from_user,
                to_user,
              });
            } else {
              // recipient is offline
              socket.emit("video_call_missed", { to, from, roomID });
            }
          } catch (err) {
            console.error("start_video_call error:", err);
          }
        });

        // Audio Call Accepted
        socket.on("audio_call_accepted", async (data) => {
          try {
            console.log("audio_call_accepted:", data);
            if (data?.call_id || data?.roomID) {
              await AudioCall.findByIdAndUpdate(data.call_id || data.roomID, {
                verdict: "Accepted",
                status: "Ongoing",
              });
            }
            const callerId = data?.streamID || data?.from_user?._id;
            const from_user = await User.findById(callerId);
            if (from_user?.socket_id) {
              io.to(from_user.socket_id).emit("audio_call_accepted", data);
            }
          } catch (err) {
            console.error("audio_call_accepted error:", err);
          }
        });

        // Video Call Accepted
        socket.on("video_call_accepted", async (data) => {
          try {
            console.log("video_call_accepted:", data);
            if (data?.call_id || data?.roomID) {
              await VideoCall.findByIdAndUpdate(data.call_id || data.roomID, {
                verdict: "Accepted",
                status: "Ongoing",
              });
            }
            const callerId = data?.streamID || data?.from_user?._id;
            const from_user = await User.findById(callerId);
            if (from_user?.socket_id) {
              io.to(from_user.socket_id).emit("video_call_accepted", data);
            }
          } catch (err) {
            console.error("video_call_accepted error:", err);
          }
        });

        // Audio Call Denied
        socket.on("audio_call_denied", async (data) => {
          try {
            console.log("audio_call_denied:", data);
            let call = null;
            if (data?.call_id || data?.roomID) {
              call = await AudioCall.findByIdAndUpdate(
                data.call_id || data.roomID,
                {
                  verdict: "Denied",
                  status: "Ended",
                  endedAt: Date.now(),
                },
                { new: true }
              );
            }

            if (call && call.participants) {
              for (const p of call.participants) {
                const u = await User.findById(p);
                if (u?.socket_id && u.socket_id !== socket.id) {
                  io.to(u.socket_id).emit("audio_call_denied", data);
                }
              }
            } else {
              const callerId = data?.streamID || data?.from_user?._id || data?.to || data?.from;
              if (callerId) {
                const targetUser = await User.findById(callerId);
                if (targetUser?.socket_id && targetUser.socket_id !== socket.id) {
                  io.to(targetUser.socket_id).emit("audio_call_denied", data);
                }
              }
            }
          } catch (err) {
            console.error("audio_call_denied error:", err);
          }
        });

        // Video Call Denied
        socket.on("video_call_denied", async (data) => {
          try {
            console.log("video_call_denied:", data);
            let call = null;
            if (data?.call_id || data?.roomID) {
              call = await VideoCall.findByIdAndUpdate(
                data.call_id || data.roomID,
                {
                  verdict: "Denied",
                  status: "Ended",
                  endedAt: Date.now(),
                },
                { new: true }
              );
            }

            if (call && call.participants) {
              for (const p of call.participants) {
                const u = await User.findById(p);
                if (u?.socket_id && u.socket_id !== socket.id) {
                  io.to(u.socket_id).emit("video_call_denied", data);
                }
              }
            } else {
              const callerId = data?.streamID || data?.from_user?._id || data?.to || data?.from;
              if (callerId) {
                const targetUser = await User.findById(callerId);
                if (targetUser?.socket_id && targetUser.socket_id !== socket.id) {
                  io.to(targetUser.socket_id).emit("video_call_denied", data);
                }
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
            const to_user = await User.findById(data.to);
            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("audio_call_missed", data);
            }
            if (data?.call_id || data?.roomID) {
              await AudioCall.findByIdAndUpdate(data.call_id || data.roomID, {
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
            const to_user = await User.findById(data.to);
            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("video_call_missed", data);
            }
            if (data?.call_id || data?.roomID) {
              await VideoCall.findByIdAndUpdate(data.call_id || data.roomID, {
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
            const callerId = data?.streamID || data?.from_user?._id;
            const from_user = await User.findById(callerId);
            if (from_user?.socket_id) {
              io.to(from_user.socket_id).emit("audio_call_denied", {
                ...data,
                busy: true,
              });
            }
          } catch (err) {
            console.error("user_is_busy_audio_call error:", err);
          }
        });

        socket.on("user_is_busy_video_call", async (data) => {
          try {
            const callerId = data?.streamID || data?.from_user?._id;
            const from_user = await User.findById(callerId);
            if (from_user?.socket_id) {
              io.to(from_user.socket_id).emit("video_call_denied", {
                ...data,
                busy: true,
              });
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
