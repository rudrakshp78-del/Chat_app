import io from "socket.io-client";
import { BASE_URL } from "./config";

const initialUserId =
  typeof window !== "undefined" ? window.localStorage.getItem("user_id") : null;
const initialToken =
  typeof window !== "undefined" ? window.localStorage.getItem("token") : null;

export const socket = io(BASE_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
  query: initialUserId ? { user_id: initialUserId } : {},
});

export const connectSocket = (user_id) => {
  if (!user_id) {
    console.log("❌ No user_id available");
    return;
  }

  socket.io.opts.query = {
    user_id,
  };

  if (!socket.connected) {
    socket.connect();
  }

  console.log("✅ Socket connecting for user:", user_id);
};

// Pre-connect immediately on app boot if user is already logged in
if (initialUserId && initialToken) {
  connectSocket(initialUserId);
}