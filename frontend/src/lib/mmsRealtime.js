import { io } from "socket.io-client";
import { jobRequestRealtimeEvents } from "./jobRequestConfig.js";
import { mmsSocketEvents } from "./mmsSimulation.js";

function getSocketBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
}

export const mmsSnapshotRequestEvent = "mms:snapshot-request";

export function isMmsRealtimeEvent(eventName) {
  return Object.values(mmsSocketEvents).includes(eventName);
}

export function createMmsSocket(onJobRequestEvent) {
  const socket = io(getSocketBaseUrl(), {
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    socket.emit("realtime:join", { feature: "mms", scope: "all" });
    socket.emit("realtime:join", { feature: "job-request", scope: "all" });
    socket.emit(mmsSnapshotRequestEvent, { requestedAt: new Date().toISOString() });
  });

  mmsRealtimeJobRequestEvents.forEach((eventName) => {
    socket.on(eventName, (payload) => onJobRequestEvent?.({ eventName, payload, source: "job-request" }));
  });

  Object.values(mmsSocketEvents).forEach((eventName) => {
    socket.on(eventName, (payload) => onJobRequestEvent?.({ eventName, payload, source: "mms" }));
  });

  return socket;
}

export const mmsRealtimeJobRequestEvents = [
  ...new Set([
    ...jobRequestRealtimeEvents,
    "job_request_created",
    "job_request_updated"
  ])
];

