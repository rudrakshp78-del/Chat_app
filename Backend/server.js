const mongoose = require("mongoose");
const http = require("http");
const dns = require("dns");

const path = require("path");

// Load environment variables
require("dotenv").config({ path: "./config.env" });

const { Server } = require("socket.io");
const sgMail = require("@sendgrid/mail");

const app = require("./app");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");

// ================================
// SENDGRID
// ================================

console.log("=== SENDGRID DEBUG ===");
console.log("API key exists:", !!process.env.SENDGRID_API_KEY);
console.log("API key prefix:", process.env.SENDGRID_API_KEY?.slice(0, 3));
console.log("API key length:", process.env.SENDGRID_API_KEY?.length);
console.log("From email:", process.env.SENDGRID_FROM_EMAIL);
console.log("======================");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ================================
// DNS
// ================================

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

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
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
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

            // emit new_message -> to recipient user
            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("new_message", {
                conversation_id: chat._id,
                message: saved_message,
              });
            }

            // emit new_message -> to sender user
            if (from_user?.socket_id) {
              io.to(from_user.socket_id).emit("new_message", {
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

            if (to_user?.socket_id) {
              io.to(to_user.socket_id).emit("new_message", {
                conversation_id: chat._id,
                message: saved_message,
              });
            }

            if (from_user?.socket_id) {
              io.to(from_user.socket_id).emit("new_message", {
                conversation_id: chat._id,
                message: saved_message,
              });
            }
          } catch (err) {
            console.error("file_message error:", err);
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
