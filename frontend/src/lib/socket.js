import { io } from "socket.io-client";
import { getApiBaseUrl } from "./apiBaseUrl";

let socket;

export function getSocket() {
  if (!socket) {
    const apiBaseUrl = getApiBaseUrl();
    const socketUrl = apiBaseUrl.replace(/\/api\/?$/, "");

    socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });
  }

  return socket;
}
