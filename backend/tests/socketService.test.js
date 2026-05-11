describe("socket service tooling events", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("emitToolingChange emits tooling:data-changed with timestamp", () => {
    const { initSocket, emitToolingChange } = require("../src/services/socketService");
    const socket = { emit: jest.fn() };
    const io = {
      on: jest.fn((event, callback) => {
        if (event === "connection") {
          callback(socket);
        }
      }),
      emit: jest.fn()
    };

    initSocket(io);
    emitToolingChange({ action: "create", resource: "items", id: 12 });

    expect(io.emit).toHaveBeenCalledWith(
      "tooling:data-changed",
      expect.objectContaining({
        action: "create",
        resource: "items",
        id: 12,
        changedAt: expect.any(String)
      })
    );
  });

  test("initSocket emits tooling connected state on connection", () => {
    const { initSocket } = require("../src/services/socketService");
    const socket = { emit: jest.fn() };
    const io = {
      on: jest.fn((event, callback) => {
        if (event === "connection") {
          callback(socket);
        }
      }),
      emit: jest.fn()
    };

    initSocket(io);

    expect(socket.emit).toHaveBeenCalledWith("tooling:connected", { connected: true });
  });

  test("emitToolingChange can emit named tooling events", () => {
    const { initSocket, emitToolingChange } = require("../src/services/socketService");
    const socket = { emit: jest.fn() };
    const io = {
      on: jest.fn((event, callback) => {
        if (event === "connection") {
          callback(socket);
        }
      }),
      emit: jest.fn()
    };

    initSocket(io);
    emitToolingChange(
      { action: "low_stock", resource: "stock", itemId: 1 },
      "tooling:low-stock"
    );

    expect(io.emit).toHaveBeenCalledWith(
      "tooling:low-stock",
      expect.objectContaining({
        action: "low_stock",
        resource: "stock",
        itemId: 1,
        changedAt: expect.any(String)
      })
    );
  });
});
