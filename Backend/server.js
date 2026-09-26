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
      cors: {
        origin: (origin, callback) => {
          callback(null, true);
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

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

        // Save socket ID to user
        if (Boolean(user_id)) {
          await User.findByIdAndUpdate(user_id, {
            socket_id,
            status: "Online",
          });
        }

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

        socket.on("get_direct_conversations", async ({ user_id }, callback) => {
          try {
            if (!user_id) {
              if (typeof callback === "function") callback([]);
              return;
            }

            const existing_conversations = await OneToOneMessage.find({
              participants: { $all: [user_id] },
            }).populate("participants", "firstName lastName _id email status");

            console.log("Direct conversations found:", existing_conversations.length);

            if (typeof callback === "function") {
              callback(existing_conversations);
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
            }).populate("participants", "firstName lastName _id email status");

            console.log("Existing Conversation:", existing_conversation ? existing_conversation._id : null);

            // if no existing conversation, create one
            if (!existing_conversation) {
              let new_chat = await OneToOneMessage.create({
                participants: [to, from],
                messages: [],
              });

              existing_conversation = await OneToOneMessage.findById(new_chat._id).populate(
                "participants",
                "firstName lastName _id email status"
              );

              console.log("Created new chat:", existing_conversation._id);
            }

            // emit to current user socket
            socket.emit("start_chat", existing_conversation);
            socket.emit("open_chat", existing_conversation);

            // if receiver is online, emit to them as well
            const to_user = await User.findById(to).select("socket_id");
            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("start_chat", existing_conversation);
              io.to(to_user.socket_id).emit("open_chat", existing_conversation);
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

            const chat = await OneToOneMessage.findById(data.conversation_id).select("messages");

            if (typeof callback === "function") {
              callback(chat?.messages || []);
            }
          } catch (err) {
            console.error("get_messages error:", err);
            if (typeof callback === "function") {
              callback([]);
            }
          }
        });

        // handle text and link message
        socket.on("text_message", async (data) => {
          try {
            console.log("Received text message:", data);

            // data: {to, from, message, conversation_id, type} 
            const { to, from, message, conversation_id, type } = data;

            if (!to || !from) {
              console.log("text_message missing 'to' or 'from':", data);
              return;
            }

            const to_user = await User.findById(to).select("socket_id");
            const from_user = await User.findById(from).select("socket_id");

            const new_message = {
              to,
              from,
              type: type || "Text",
              text: message,
              created_at: Date.now(),
            };

            let chat = null;
            if (conversation_id) {
              chat = await OneToOneMessage.findById(conversation_id);
            }

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

            // emit new_message -> to sender's other sockets (if any)
            if (from_user?.socket_id && from_user.socket_id !== socket.id) {
              io.to(from_user.socket_id).emit("new_message", {
                conversation_id: chat._id,
                message: saved_message,
              });
            }

            // emit new_message -> to recipient user
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
            console.log("Received file message:", data);

            // data: {to, from, text, file, url, conversation_id, type}
            const { to, from, text, file, url, conversation_id, type } = data;

            if (!to || !from) {
              console.log("file_message missing 'to' or 'from':", data);
              return;
            }

            const to_user = await User.findById(to).select("socket_id");
            const from_user = await User.findById(from).select("socket_id");

            const new_message = {
              to,
              from,
              type: type || "Media",
              text: text || "",
              file: url || (typeof file === "string" ? file : file?.name || ""),
              created_at: Date.now(),
            };

            let chat = null;
            if (conversation_id) {
              chat = await OneToOneMessage.findById(conversation_id);
            }

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
