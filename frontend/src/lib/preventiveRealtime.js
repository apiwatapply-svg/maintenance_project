import { io } from "socket.io-client";
import { getSocketBaseUrl } from "@/lib/jobRequestRealtime";

export function createPreventiveSocket(onRealtimeEvent) {
  const socket = io(getSocketBaseUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: true
  });

  socket.on("connect", () => {
    socket.emit("realtime:join", { feature: "preventive", scope: "all" });
  });

  socket.on("preventive:changed", (payload) => {
    onRealtimeEvent?.({ eventName: "preventive:changed", payload });
  });

  return socket;
}
