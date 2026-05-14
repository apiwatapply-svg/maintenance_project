import { io } from "socket.io-client";

function getSocketBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
}

export function createMmsSocket(onJobRequestEvent) {
  const socket = io(getSocketBaseUrl(), {
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    socket.emit("realtime:join", { feature: "mms", scope: "all" });
    socket.emit("realtime:join", { feature: "job-request", scope: "all" });
  });

  [
    "job_request_created",
    "job_request_updated",
    "job_accepted",
    "job_wait_qc",
    "job_qc_accepted",
    "job_wait_confirming",
    "job_production_accepted",
    "job_rejected_by_qc",
    "job_rejected_by_production",
    "job_completed",
    "job-updated"
  ].forEach((eventName) => {
    socket.on(eventName, (payload) => onJobRequestEvent?.({ eventName, payload }));
  });

  return socket;
}

