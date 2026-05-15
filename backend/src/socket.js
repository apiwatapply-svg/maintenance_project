const { Server } = require("socket.io");
const { mmsSocketEvents } = require("./config/mmsSimulationConfig");
const { getMmsWorkSlot, upsertMmsRealtimePayload } = require("./repositories/mmsRepository");

const sectionRooms = {
  production: "production_room",
  maintenance: "maintenance_room",
  qc: "qc_room"
};

function getFeatureRoom(feature, scope = "all") {
  return `${String(feature || "system").toLowerCase()}:${String(scope || "all").toLowerCase()}`;
}

const defaultMmsHourlyBuffer = new Map();

function createMmsHourlyBuffer() {
  return new Map();
}

function getMmsHourlyBufferKey(machineNo, slot = {}) {
  return `${slot.workDate || ""}|${slot.hourLabel || ""}|${machineNo || ""}`;
}

async function flushMmsHourlyEntry(entry, flushFn = upsertMmsRealtimePayload) {
  if (!entry?.payload || !entry?.slot) return null;
  return flushFn(entry.payload, entry.updatedAt || new Date(), entry.slot);
}

async function queueMmsHourlyPayload(payload = {}, now = new Date(), options = {}) {
  const machineNo = payload.machineNo || payload.machine_no;
  if (!machineNo) return [];

  const buffer = options.buffer || defaultMmsHourlyBuffer;
  const flushFn = options.flushFn || upsertMmsRealtimePayload;
  const slot = getMmsWorkSlot(now);
  const activeKey = getMmsHourlyBufferKey(machineNo, slot);
  const entriesToFlush = [];

  for (const [key, entry] of buffer.entries()) {
    if (entry.machineNo === machineNo && key !== activeKey) {
      entriesToFlush.push(entry);
      buffer.delete(key);
    }
  }

  const existing = buffer.get(activeKey);
  buffer.set(activeKey, {
    firstSeenAt: existing?.firstSeenAt || now,
    machineNo,
    payload: {
      ...(existing?.payload || {}),
      ...payload
    },
    slot,
    updatedAt: now
  });

  return Promise.all(entriesToFlush.map((entry) => flushMmsHourlyEntry(entry, flushFn)));
}

async function flushClosedMmsHourlyBuffers(now = new Date(), options = {}) {
  const buffer = options.buffer || defaultMmsHourlyBuffer;
  const flushFn = options.flushFn || upsertMmsRealtimePayload;
  const activeSlot = getMmsWorkSlot(now);
  const entriesToFlush = [];

  for (const [key, entry] of buffer.entries()) {
    if (getMmsHourlyBufferKey(entry.machineNo, activeSlot) !== key) {
      entriesToFlush.push(entry);
      buffer.delete(key);
    }
  }

  return Promise.all(entriesToFlush.map((entry) => flushMmsHourlyEntry(entry, flushFn)));
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

        io.to(getFeatureRoom("mms", "all")).emit(eventName, enrichedPayload);
        io.to(getFeatureRoom("mms", machineNo)).emit(eventName, enrichedPayload);
        io.to(getFeatureRoom("mms", areaScope)).emit(eventName, enrichedPayload);

        queueMmsHourlyPayload(enrichedPayload, new Date(timestampUtc)).catch((error) => {
          socket.emit("mms:persist-error", {
            eventName,
            machineNo,
            message: error.message
          });
        });
      });
    });
  });

  const flushTimer = setInterval(() => {
    flushClosedMmsHourlyBuffers().catch(() => {});
  }, 60 * 1000);

  if (typeof flushTimer.unref === "function") {
    flushTimer.unref();
  }

  httpServer.on("close", () => {
    clearInterval(flushTimer);
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
  createMmsHourlyBuffer,
  createSocketServer,
  emitJobRequestEvent,
  emitRealtimeEvent,
  flushClosedMmsHourlyBuffers,
  getFeatureRoom,
  getMmsHourlyBufferKey,
  queueMmsHourlyPayload,
  sectionRooms
};
