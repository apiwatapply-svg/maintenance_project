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
});
