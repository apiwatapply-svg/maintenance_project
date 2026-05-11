jest.mock("../src/repositories/adminRepository", () => ({
  findUserByUsername: jest.fn()
}));

jest.mock("../src/repositories/toolingRepository", () => ({
  searchItems: jest.fn(),
  findItemByQrCode: jest.fn(),
  validateActiveItemLocation: jest.fn(),
  stockIn: jest.fn(),
  stockOut: jest.fn(),
  createRequest: jest.fn(),
  approveRequest: jest.fn(),
  rejectRequest: jest.fn(),
  issueRequest: jest.fn()
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

    toolingRepository.validateActiveItemLocation.mockResolvedValue({
      item: { id: 1, minimumStock: 5 },
      location: { id: 1 }
    });
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

    toolingRepository.validateActiveItemLocation.mockResolvedValue({
      item: { id: 1, minimumStock: 5 },
      location: { id: 1 }
    });
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

  test("stock movement rejects inactive or missing item/location", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.validateActiveItemLocation.mockRejectedValue(
      Object.assign(new Error("Item or location is inactive"), { statusCode: 400 })
    );

    await expect(
      toolingService.stockIn({ itemId: 1, locationId: 1, quantity: 1 })
    ).rejects.toMatchObject({
      message: "Item or location is inactive",
      statusCode: 400
    });
    expect(toolingRepository.stockIn).not.toHaveBeenCalled();
  });

  test("stockOut emits low stock event when balance drops to minimum stock", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.validateActiveItemLocation.mockResolvedValue({
      item: { id: 1, minimumStock: 5 },
      location: { id: 1 }
    });
    toolingRepository.stockOut.mockResolvedValue({
      id: 2,
      movementType: "stock_out",
      itemId: 1,
      locationId: 1,
      quantity: 3,
      balanceAfter: 5
    });

    await toolingService.stockOut({ itemId: 1, locationId: 1, quantity: 3 });

    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "low_stock",
        resource: "stock",
        itemId: 1
      }),
      "tooling:low-stock"
    );
  });

  test("stockIn emits stock recovered when balance rises above minimum stock", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.validateActiveItemLocation.mockResolvedValue({
      item: { id: 1, minimumStock: 5 },
      location: { id: 1 }
    });
    toolingRepository.stockIn.mockResolvedValue({
      id: 1,
      movementType: "stock_in",
      itemId: 1,
      locationId: 1,
      quantity: 10,
      balanceBefore: 2,
      balanceAfter: 12
    });

    await toolingService.stockIn({ itemId: 1, locationId: 1, quantity: 10 });

    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "stock_recovered",
        resource: "stock",
        itemId: 1
      }),
      "tooling:stock-recovered"
    );
  });
});

describe("tooling service request and approval", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createRequest validates a simple user request and emits realtime event", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.createRequest.mockResolvedValue({
      id: 3,
      requestNo: "REQ-003",
      status: "pending"
    });

    const result = await toolingService.createRequest({
      requesterId: 7,
      departmentId: 2,
      items: [{ itemId: 1, locationId: 1, quantity: 2 }]
    });

    expect(result.status).toBe("pending");
    expect(toolingRepository.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestNo: expect.stringMatching(/^REQ-/),
        requesterId: 7,
        departmentId: 2
      })
    );
    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "request_created",
        resource: "requests",
        id: 3
      }),
      "tooling:request-created"
    );
  });

  test("createRequest rejects empty request items", async () => {
    const toolingService = require("../src/services/toolingService");

    await expect(toolingService.createRequest({ requesterId: 7, items: [] })).rejects.toMatchObject({
      message: "Request must contain at least one item",
      statusCode: 400
    });
  });

  test("approveRequest emits approved event", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.approveRequest.mockResolvedValue({
      id: 4,
      status: "approved"
    });

    const result = await toolingService.approveRequest(4, 1);

    expect(result.status).toBe("approved");
    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: "request_approved", id: 4 }),
      "tooling:request-approved"
    );
  });

  test("rejectRequest emits rejected event", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.rejectRequest.mockResolvedValue({
      id: 5,
      status: "rejected"
    });

    const result = await toolingService.rejectRequest(5, 1, "No stock");

    expect(result.status).toBe("rejected");
    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: "request_rejected", id: 5 }),
      "tooling:request-rejected"
    );
  });

  test("issueRequest emits issued and stock changed events", async () => {
    const toolingService = require("../src/services/toolingService");

    toolingRepository.issueRequest.mockResolvedValue({
      id: 6,
      status: "issued",
      movements: [{ itemId: 1, locationId: 1 }]
    });

    const result = await toolingService.issueRequest(6, 1);

    expect(result.status).toBe("issued");
    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: "request_issued", id: 6 }),
      "tooling:request-issued"
    );
    expect(emitToolingChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: "stock_out", resource: "stock", itemId: 1 })
    );
  });
});
