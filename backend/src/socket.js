const { Server } = require("socket.io");
const { mmsSocketEvents } = require("./config/mmsSimulationConfig");
const { upsertMmsRealtimePayload } = require("./repositories/mmsRepository");

const sectionRooms = {
  production: "production_room",
  maintenance: "maintenance_room",
  qc: "qc_room"
};

function getFeatureRoom(feature, scope = "all") {
  return `${String(feature || "system").toLowerCase()}:${String(scope || "all").toLowerCase()}`;
}

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST", "PUT"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("job-request:join", ({ section } = {}) => {
      const room = sectionRooms[section];

      if (room) {
        socket.join(room);
      }
    });

    socket.on("job-request:leave", ({ section } = {}) => {
      const room = sectionRooms[section];

      if (room) {
        socket.leave(room);
      }
    });

    socket.on("realtime:join", ({ feature, scope } = {}) => {
      socket.join(getFeatureRoom(feature, scope));
    });

    socket.on("realtime:leave", ({ feature, scope } = {}) => {
      socket.leave(getFeatureRoom(feature, scope));
    });

    Object.values(mmsSocketEvents).forEach((eventName) => {
      socket.on(eventName, async (payload = {}) => {
        const machineNo = payload.machineNo || payload.machine_no || "unknown";
        const areaScope = payload.area || "all";
        const timestampUtc = new Date().toISOString();
        const enrichedPayload = {
          ...payload,
          feature: "mms",
          machineNo,
          timestampUtc
        };

        try {
          await upsertMmsRealtimePayload(enrichedPayload, new Date(timestampUtc));
        } catch (error) {
          socket.emit("mms:persist-error", {
            eventName,
            machineNo,
            message: error.message
          });
          return;
        }

        io.to(getFeatureRoom("mms", "all")).emit(eventName, enrichedPayload);
        io.to(getFeatureRoom("mms", machineNo)).emit(eventName, enrichedPayload);
        io.to(getFeatureRoom("mms", areaScope)).emit(eventName, enrichedPayload);
      });
    });
  });

  return io;
}

function emitJobRequestEvent(io, event, payload) {
  const targets = Array.isArray(payload?.toSections) ? payload.toSections : [payload?.toSection].filter(Boolean);

  targets.forEach((section) => {
    const room = sectionRooms[String(section).toLowerCase()];

    if (room) {
      io.to(room).emit(event, payload);
    }
  });
}

function emitRealtimeEvent(io, { feature, scopes = ["all"], event, payload = {} }) {
  const targetScopes = Array.isArray(scopes) ? scopes : [scopes];

  targetScopes.forEach((scope) => {
    io.to(getFeatureRoom(feature, scope)).emit(event, payload);
  });
}

module.exports = {
  createSocketServer,
  emitJobRequestEvent,
  emitRealtimeEvent,
  getFeatureRoom,
  sectionRooms
};
