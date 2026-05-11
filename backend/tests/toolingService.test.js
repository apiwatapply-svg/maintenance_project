jest.mock("../src/repositories/adminRepository", () => ({
  findUserByUsername: jest.fn()
}));

jest.mock("../src/repositories/toolingRepository", () => ({
  searchItems: jest.fn(),
  findItemByQrCode: jest.fn(),
  stockIn: jest.fn(),
  stockOut: jest.fn()
}));

jest.mock("../src/services/socketService", () => ({
  emitToolingChange: jest.fn()
}));

const adminRepository = require("../src/repositories/adminRepository");
const toolingRepository = require("../src/repositories/toolingRepository");
const { emitToolingChange } = require("../src/services/socketService");

describe("tooling access middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("allows users with toolingStore user access", async () => {
    const { requireToolingAccess } = require("../src/middlewares/requireToolingAccess");
    const req = { headers: { "x-username": "engineer01" } };
    const res = {};
    const next = jest.fn();

    adminRepository.findUserByUsername.mockResolvedValue({
      username: "engineer01",
      permissions: '{"toolingStore":"user"}'
    });

    await requireToolingAccess("user")(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.toolingUser.username).toBe("engineer01");
    expect(req.toolingUser.access).toBe("user");
  });

  test("rejects users without toolingStore access", async () => {
    const { requireToolingAccess } = require("../src/middlewares/requireToolingAccess");
    const req = { headers: { "x-username": "qc01" } };
    const res = {};
    const next = jest.fn();

    adminRepository.findUserByUsername.mockResolvedValue({
      username: "qc01",
      permissions: '{"toolingStore":"none"}'
    });

    await requireToolingAccess("user")(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: "Toolling & Store access denied",
      statusCode: 403
    }));
  });

  test("requires admin access for admin-only operations", async () => {
    const { requireToolingAccess } = require("../src/middlewares/requireToolingAccess");
    const req = { headers: { "x-username": "engineer01" } };
    const res = {};
    const next = jest.fn();

    adminRepository.findUserByUsername.mockResolvedValue({
      username: "engineer01",
      permissions: '{"toolingStore":"user"}'
    });

    await requireToolingAccess("admin")(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: "Toolling & Store admin access required",
      statusCode: 403
    }));
  });
});

describe("tooling service item lookup helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("searchItems maps repository rows to dropdown options", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.searchItems.mockResolvedValue([
      {
        id: 7,
        itemCode: "SP-007",
        itemName: "Oil Seal",
        quantityOnHand: 2,
        minimumStock: 5,
        unit: "pcs"
      }
    ]);

    const result = await toolingService.searchItems("seal");

    expect(result).toEqual([
      {
        value: 7,
        label: "SP-007 - Oil Seal",
        itemCode: "SP-007",
        itemName: "Oil Seal",
        quantityOnHand: 2,
        unit: "pcs",
        isLowStock: true
      }
    ]);
  });

  test("findItemByQrCode returns 404 error when item is missing", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.findItemByQrCode.mockResolvedValue(null);

    await expect(toolingService.findItemByQrCode("missing")).rejects.toMatchObject({
      message: "Item not found",
      statusCode: 404
    });
  });
});

describe("tooling service stock movements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("stockIn creates a stock in movement and emits realtime event", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.stockIn.mockResolvedValue({
      id: 1,
      transactionNo: "TIN-001",
      movementType: "stock_in",
      itemId: 1,
      locationId: 1,
      quantity: 10,
      balanceAfter: 22
    });

    const result = await toolingService.stockIn({ itemId: 1, locationId: 1, quantity: 10 });

    expect(result.movementType).toBe("stock_in");
    expect(toolingRepository.stockIn).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: "stock_in",
        transactionNo: expect.stringMatching(/^TIN-/),
        itemId: 1,
        locationId: 1,
        quantity: 10
      })
    );
    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "stock_in",
        resource: "stock",
        itemId: 1
      })
    );
  });

  test("stockOut creates a stock out movement and emits realtime event", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.stockOut.mockResolvedValue({
      id: 2,
      transactionNo: "TOUT-001",
      movementType: "stock_out",
      itemId: 1,
      locationId: 1,
      quantity: 3,
      balanceAfter: 19
    });

    const result = await toolingService.stockOut({ itemId: 1, locationId: 1, quantity: 3 });

    expect(result.movementType).toBe("stock_out");
    expect(toolingRepository.stockOut).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: "stock_out",
        transactionNo: expect.stringMatching(/^TOUT-/),
        itemId: 1,
        locationId: 1,
        quantity: 3
      })
    );
    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "stock_out",
        resource: "stock",
        itemId: 1
      })
    );
  });

  test("stock movement rejects missing item, location, or positive quantity", async () => {
    const toolingService = require("../src/services/toolingService");

    await expect(toolingService.stockIn({ itemId: 1, quantity: 1 })).rejects.toMatchObject({
      message: "Missing required field(s): locationId",
      statusCode: 400
    });

    await expect(
      toolingService.stockOut({ itemId: 1, locationId: 1, quantity: 0 })
    ).rejects.toMatchObject({
      message: "Quantity must be greater than zero",
      statusCode: 400
    });
  });
});
