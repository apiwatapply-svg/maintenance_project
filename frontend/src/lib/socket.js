import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (!socket) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
    const socketUrl = apiBaseUrl.replace(/\/api\/?$/, "");

    socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });
  }

  return socket;
}
