import io from "socket.io-client";
import { BASE_URL } from "./config";

const getSavedToken = () => {
  return typeof window !== "undefined"
    ? window.localStorage.getItem("token") || window.localStorage.getItem("accessToken")
    : null;
};

const initialUserId =
  typeof window !== "undefined" ? window.localStorage.getItem("user_id") : null;
const initialToken = getSavedToken();

export const socket = io(BASE_URL, {
  autoConnect: false,
  transports: ["polling", "websocket"],
  upgrade: true,
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
  query: initialUserId ? { user_id: initialUserId } : {},
  auth: initialToken ? { token: initialToken } : {},
});

export const connectSocket = (user_id) => {
  if (!user_id) {
    console.log("❌ No user_id available");
    return;
  }

  const token = getSavedToken();

  socket.io.opts.query = {
    user_id,
  };
  socket.io.opts.auth = {
    token,
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
