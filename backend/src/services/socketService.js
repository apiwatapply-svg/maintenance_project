let ioInstance;

function initSocket(io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    socket.emit("admin:connected", { connected: true });
  });
}

function emitAdminChange(payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit("admin:data-changed", {
    ...payload,
    changedAt: new Date().toISOString()
  });
}

function emitToolingChange(payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit("tooling:data-changed", {
    ...payload,
    changedAt: new Date().toISOString()
  });
}

module.exports = {
  initSocket,
  emitAdminChange,
  emitToolingChange
};
