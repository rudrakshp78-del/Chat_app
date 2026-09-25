import io from "socket.io-client";
import { BASE_URL } from "./config";

export const socket = io(BASE_URL, {
  autoConnect: false,
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