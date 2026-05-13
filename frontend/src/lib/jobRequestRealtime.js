import { io } from "socket.io-client";
import { jobRequestRealtimeEvents } from "@/lib/jobRequestConfig";

export function getSocketBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
}

export function createJobRequestSocket(section, onRealtimeEvent) {
  const sections = Array.isArray(section) ? section : [section];
  const socket = io(getSocketBaseUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: true
  });

  socket.on("connect", () => {
    sections.forEach((scope) => {
      socket.emit("job-request:join", { section: scope });
      socket.emit("realtime:join", { feature: "job-request", scope });
    });
    socket.emit("realtime:join", { feature: "job-request", scope: "all" });
  });

  jobRequestRealtimeEvents.forEach((eventName) => {
    socket.on(eventName, (payload) => {
      onRealtimeEvent?.({ eventName, payload });
    });
  });

  return socket;
}
