const request = require("supertest");

jest.mock("../src/repositories/adminRepository", () => ({
  findUserByUsername: jest.fn()
}));

jest.mock("../src/repositories/toolingRepository", () => ({
  dashboard: jest.fn(),
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  searchItems: jest.fn(),
  findItemByQrCode: jest.fn(),
  validateActiveItemLocation: jest.fn(),
  stockIn: jest.fn(),
  stockOut: jest.fn(),
  createRequest: jest.fn(),
  listRequests: jest.fn(),
  getRequestById: jest.fn(),
  approveRequest: jest.fn(),
  rejectRequest: jest.fn(),
  issueRequest: jest.fn(),
  returnItem: jest.fn(),
  planning: jest.fn(),
  report: jest.fn()
}));

const app = require("../src/app");
const adminRepository = require("../src/repositories/adminRepository");
const toolingRepository = require("../src/repositories/toolingRepository");

beforeEach(() => {
  jest.clearAllMocks();
  adminRepository.findUserByUsername.mockResolvedValue({
    id: 1,
    departmentId: 1,
    username: "admin",
    permissions: '{"toolingStore":"admin"}'
  });
  toolingRepository.validateActiveItemLocation.mockResolvedValue({
    item: { id: 1, minimumStock: 5 },
    location: { id: 1 }
  });
});

describe("tooling phase 4 request and approval routes", () => {
  const requestPayload = {
    remark: "Need spare part for line A",
    items: [{ itemId: 1, locationId: 1, quantity: 2 }]
  };

  test("POST /api/tooling/requests lets tooling users create simple requests", async () => {
    adminRepository.findUserByUsername.mockResolvedValue({
      id: 7,
      departmentId: 2,
      username: "engineer01",
      permissions: '{"toolingStore":"user"}'
    });
    toolingRepository.createRequest.mockResolvedValue({
      id: 10,
      requestNo: "REQ-001",
      status: "pending"
    });

    const response = await request(app)
      .post("/api/tooling/requests")
      .set("x-username", "engineer01")
      .send(requestPayload)
      .expect(201);

    expect(response.body.status).toBe("pending");
    expect(toolingRepository.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterId: 7,
        departmentId: 2,
        items: [expect.objectContaining({ itemId: 1, locationId: 1, requestedQuantity: 2 })]
      })
    );
  });

  test("POST /api/tooling/requests rejects requests without items", async () => {
    await request(app)
      .post("/api/tooling/requests")
      .set("x-username", "admin")
      .send({ items: [] })
      .expect(400);

    expect(toolingRepository.createRequest).not.toHaveBeenCalled();
  });

  test("GET /api/tooling/requests returns filtered requests", async () => {
    toolingRepository.listRequests.mockResolvedValue({
      data: [{ id: 1, requestNo: "REQ-001", status: "pending" }],
      pagination: { page: 1, pageSize: 10, total: 1 }
    });

    const response = await request(app)
      .get("/api/tooling/requests")
      .set("x-username", "admin")
      .query({ status: "pending" })
      .expect(200);

    expect(response.body.data[0].requestNo).toBe("REQ-001");
    expect(toolingRepository.listRequests).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" })
    );
  });

  test("GET /api/tooling/requests/:id returns request detail with items", async () => {
    toolingRepository.getRequestById.mockResolvedValue({
      id: 1,
      requestNo: "REQ-001",
      items: [{ itemId: 1, requestedQuantity: 2 }]
    });

    const response = await request(app)
      .get("/api/tooling/requests/1")
      .set("x-username", "admin")
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(toolingRepository.getRequestById).toHaveBeenCalledWith("1");
  });

  test("PUT /api/tooling/requests/:id/approve requires admin access", async () => {
    adminRepository.findUserByUsername.mockResolvedValue({
      id: 7,
      departmentId: 2,
      username: "engineer01",
      permissions: '{"toolingStore":"user"}'
    });

    await request(app)
      .put("/api/tooling/requests/1/approve")
      .set("x-username", "engineer01")
      .expect(403);
  });

  test("PUT /api/tooling/requests/:id/approve approves a request", async () => {
    toolingRepository.approveRequest.mockResolvedValue({
      id: 1,
      requestNo: "REQ-001",
      status: "approved"
    });

    const response = await request(app)
      .put("/api/tooling/requests/1/approve")
      .set("x-username", "admin")
      .expect(200);

    expect(response.body.status).toBe("approved");
    expect(toolingRepository.approveRequest).toHaveBeenCalledWith("1", 1);
  });

  test("PUT /api/tooling/requests/:id/reject rejects a request", async () => {
    toolingRepository.rejectRequest.mockResolvedValue({
      id: 1,
      requestNo: "REQ-001",
      status: "rejected"
    });

    const response = await request(app)
      .put("/api/tooling/requests/1/reject")
      .set("x-username", "admin")
      .send({ remark: "No stock" })
      .expect(200);

    expect(response.body.status).toBe("rejected");
    expect(toolingRepository.rejectRequest).toHaveBeenCalledWith("1", 1, "No stock");
  });

  test("PUT /api/tooling/requests/:id/issue issues approved request items", async () => {
    toolingRepository.issueRequest.mockResolvedValue({
      id: 1,
      requestNo: "REQ-001",
      status: "issued"
    });

    const response = await request(app)
      .put("/api/tooling/requests/1/issue")
      .set("x-username", "admin")
      .expect(200);

    expect(response.body.status).toBe("issued");
    expect(toolingRepository.issueRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "1",
        issuedBy: 1,
        transactionNoPrefix: expect.stringMatching(/^TREQ-/)
      })
    );
  });
});

describe("tooling phase 5 return routes", () => {
  test("POST /api/tooling/return records a good spare part return", async () => {
    toolingRepository.returnItem.mockResolvedValue({
      id: 8,
      movementType: "return_good",
      itemId: 1,
      locationId: 1,
      quantity: 2,
      balanceAfter: 12
    });

    const response = await request(app)
      .post("/api/tooling/return")
      .set("x-username", "admin")
      .send({ itemId: 1, locationId: 1, quantity: 2, condition: "good" })
      .expect(201);

    expect(response.body.movementType).toBe("return_good");
    expect(toolingRepository.returnItem).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 1,
        locationId: 1,
        quantity: 2,
        condition: "good"
      })
    );
  });

  test("POST /api/tooling/return rejects invalid condition", async () => {
    await request(app)
      .post("/api/tooling/return")
      .set("x-username", "admin")
      .send({ itemId: 1, locationId: 1, quantity: 2, condition: "scrap" })
      .expect(400);

    expect(toolingRepository.returnItem).not.toHaveBeenCalled();
  });

  test("POST /api/tooling/return requires admin access", async () => {
    adminRepository.findUserByUsername.mockResolvedValue({
      id: 7,
      departmentId: 2,
      username: "engineer01",
      permissions: '{"toolingStore":"user"}'
    });

    await request(app)
      .post("/api/tooling/return")
      .set("x-username", "engineer01")
      .send({ itemId: 1, locationId: 1, quantity: 2, condition: "good" })
      .expect(403);
  });
});

describe("tooling phase 6 planning routes", () => {
  test("GET /api/tooling/planning returns rule-based planning rows", async () => {
    toolingRepository.planning.mockResolvedValue({
      data: [{
        itemCode: "SP-001",
        itemName: "Bearing",
        currentStock: 2,
        issuedQuantity: 90,
        leadTimeDays: 7,
        safetyStock: 3,
        maximumStock: 30
      }],
      pagination: { page: 1, pageSize: 10, total: 1 }
    });

    const response = await request(app)
      .get("/api/tooling/planning")
      .set("x-username", "admin")
      .query({ planningStatus: "stockout_risk" })
      .expect(200);

    expect(response.body.data[0].planningStatus).toBe("stockout_risk");
    expect(toolingRepository.planning).toHaveBeenCalledWith(
      expect.objectContaining({ planningStatus: "stockout_risk" })
    );
  });
});

describe("tooling phase 7 report routes", () => {
  test("GET /api/tooling/reports/movement returns filtered report data", async () => {
    toolingRepository.report.mockResolvedValue({
      data: [{ movementType: "stock_out", quantity: 3 }],
      pagination: { page: 1, pageSize: 10, total: 1 }
    });

    const response = await request(app)
      .get("/api/tooling/reports/movement")
      .set("x-username", "admin")
      .query({ dateFrom: "2026-05-01", dateTo: "2026-05-11" })
      .expect(200);

    expect(response.body.data[0].movementType).toBe("stock_out");
    expect(toolingRepository.report).toHaveBeenCalledWith(
      "movement",
      expect.objectContaining({ dateFrom: "2026-05-01", dateTo: "2026-05-11" })
    );
  });

  test("GET /api/tooling/reports/unknown rejects unsupported report keys", async () => {
    await request(app)
      .get("/api/tooling/reports/unknown")
      .set("x-username", "admin")
      .expect(404);
  });
});

describe("tooling foundation routes", () => {
  test("GET /api/tooling/dashboard returns dashboard summary", async () => {
    toolingRepository.dashboard.mockResolvedValue({
      totalItems: 2,
      lowStockItems: 1,
      movementToday: 3,
      stockoutRiskItems: 0,
      slowMovementItems: 0,
      overstockItems: 0
    });

    const response = await request(app)
      .get("/api/tooling/dashboard")
      .set("x-username", "admin")
      .expect(200);

    expect(response.body.totalItems).toBe(2);
    expect(toolingRepository.dashboard).toHaveBeenCalledTimes(1);
  });

  test("GET /api/tooling/items returns paginated tooling items", async () => {
    toolingRepository.list.mockResolvedValue({
      data: [{ id: 1, itemCode: "SP-001", itemName: "Bearing" }],
      pagination: { page: 1, pageSize: 10, total: 1 }
    });

    const response = await request(app)
      .get("/api/tooling/items")
      .set("x-username", "admin")
      .query({ search: "Bearing", page: 1, pageSize: 10 })
      .expect(200);

    expect(response.body.data[0].itemCode).toBe("SP-001");
    expect(toolingRepository.list).toHaveBeenCalledWith(
      "items",
      expect.objectContaining({ search: "Bearing", page: "1", pageSize: "10" })
    );
  });

  test("GET /api/tooling/unknown returns 404", async () => {
    await request(app)
      .get("/api/tooling/unknown")
      .set("x-username", "admin")
      .expect(404);
  });

  test("GET /api/tooling/items rejects missing tooling access", async () => {
    adminRepository.findUserByUsername.mockResolvedValue({
      username: "qc01",
      permissions: '{"toolingStore":"none"}'
    });

    await request(app)
      .get("/api/tooling/items")
      .set("x-username", "qc01")
      .expect(403);
  });
});

describe("tooling phase 2 master and stock routes", () => {
  const itemPayload = {
    itemCode: "SP-001",
    itemName: "Bearing 6204",
    itemType: "spare_part",
    unit: "pcs",
    minimumStock: 5,
    maximumStock: 30,
    safetyStock: 3,
    leadTimeDays: 7,
    slowMovementDays: 90,
    deadStockDays: 180,
    minimumOrderQuantity: 10,
    criticalLevel: "important",
    qrCode: "QR-SP-001",
    status: "active"
  };

  test.each([
    ["categories", { categoryCode: "BRG", categoryName: "Bearing", status: "active" }],
    ["locations", { locationCode: "A-01", locationName: "Rack A-01", status: "active" }],
    ["suppliers", { supplierCode: "SUP-001", supplierName: "ABC Supply", status: "active" }],
    ["items", itemPayload]
  ])("POST /api/tooling/%s creates master data for admin users", async (resource, payload) => {
    toolingRepository.create.mockResolvedValue({ id: 1, ...payload });

    const response = await request(app)
      .post(`/api/tooling/${resource}`)
      .set("x-username", "admin")
      .send(payload)
      .expect(201);

    expect(response.body.id).toBe(1);
    expect(toolingRepository.create).toHaveBeenCalledWith(
      resource,
      expect.objectContaining(payload)
    );
  });

  test("POST /api/tooling/items rejects missing required item data", async () => {
    await request(app)
      .post("/api/tooling/items")
      .set("x-username", "admin")
      .send({})
      .expect(400);

    expect(toolingRepository.create).not.toHaveBeenCalled();
  });

  test("POST /api/tooling/items rejects user access", async () => {
    adminRepository.findUserByUsername.mockResolvedValue({
      username: "engineer01",
      permissions: '{"toolingStore":"user"}'
    });

    await request(app)
      .post("/api/tooling/items")
      .set("x-username", "engineer01")
      .send(itemPayload)
      .expect(403);
  });

  test("GET /api/tooling/items/:id returns one item", async () => {
    toolingRepository.getById.mockResolvedValue({ id: 1, ...itemPayload });

    const response = await request(app)
      .get("/api/tooling/items/1")
      .set("x-username", "admin")
      .expect(200);

    expect(response.body.itemCode).toBe("SP-001");
    expect(toolingRepository.getById).toHaveBeenCalledWith("items", "1");
  });

  test("PUT /api/tooling/items/:id updates an item", async () => {
    toolingRepository.update.mockResolvedValue({ id: 1, ...itemPayload, status: "inactive" });

    const response = await request(app)
      .put("/api/tooling/items/1")
      .set("x-username", "admin")
      .send({ status: "inactive" })
      .expect(200);

    expect(response.body.status).toBe("inactive");
    expect(toolingRepository.update).toHaveBeenCalledWith("items", "1", { status: "inactive" });
  });

  test("DELETE /api/tooling/items/:id removes an item", async () => {
    toolingRepository.remove.mockResolvedValue({ id: 1, ...itemPayload });

    const response = await request(app)
      .delete("/api/tooling/items/1")
      .set("x-username", "admin")
      .expect(200);

    expect(response.body.id).toBe(1);
    expect(toolingRepository.remove).toHaveBeenCalledWith("items", "1");
  });

  test("GET /api/tooling/stock returns stock balance rows", async () => {
    toolingRepository.list.mockResolvedValue({
      data: [{
        itemId: 1,
        itemCode: "SP-001",
        itemName: "Bearing 6204",
        locationId: 1,
        locationName: "Rack A-01",
        quantityOnHand: 12
      }],
      pagination: { page: 1, pageSize: 10, total: 1 }
    });

    const response = await request(app)
      .get("/api/tooling/stock")
      .set("x-username", "admin")
      .query({ itemId: 1 })
      .expect(200);

    expect(response.body.data[0].quantityOnHand).toBe(12);
    expect(response.body.data[0].itemName).toBe("Bearing 6204");
    expect(response.body.data[0].locationName).toBe("Rack A-01");
    expect(toolingRepository.list).toHaveBeenCalledWith(
      "stock",
      expect.objectContaining({ itemId: "1" })
    );
  });

  test("GET /api/tooling/items/search returns dropdown options", async () => {
    toolingRepository.searchItems.mockResolvedValue([
      { id: 1, itemCode: "SP-001", itemName: "Bearing 6204", quantityOnHand: 12, unit: "pcs" }
    ]);

    const response = await request(app)
      .get("/api/tooling/items/search")
      .set("x-username", "admin")
      .query({ q: "bearing" })
      .expect(200);

    expect(response.body[0].label).toContain("SP-001");
    expect(response.body[0].value).toBe(1);
    expect(toolingRepository.searchItems).toHaveBeenCalledWith("bearing");
  });

  test("GET /api/tooling/items/qr/:qrCode returns item by QR code", async () => {
    toolingRepository.findItemByQrCode.mockResolvedValue({
      id: 1,
      ...itemPayload,
      quantityOnHand: 12,
      locationName: "Rack A-01"
    });

    const response = await request(app)
      .get("/api/tooling/items/qr/QR-SP-001")
      .set("x-username", "admin")
      .expect(200);

    expect(response.body.itemCode).toBe("SP-001");
    expect(response.body.quantityOnHand).toBe(12);
    expect(response.body.locationName).toBe("Rack A-01");
    expect(toolingRepository.findItemByQrCode).toHaveBeenCalledWith("QR-SP-001");
  });
});

describe("tooling phase 3 stock movement routes", () => {
  test("POST /api/tooling/stock-in receives spare parts into stock", async () => {
    toolingRepository.stockIn.mockResolvedValue({
      id: 1,
      transactionNo: "TIN-001",
      movementType: "stock_in",
      itemId: 1,
      locationId: 1,
      quantity: 10,
      balanceAfter: 22
    });

    const response = await request(app)
      .post("/api/tooling/stock-in")
      .set("x-username", "admin")
      .send({ itemId: 1, locationId: 1, quantity: 10, referenceNo: "PO-1001" })
      .expect(201);

    expect(response.body.movementType).toBe("stock_in");
    expect(toolingRepository.stockIn).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 1,
        locationId: 1,
        quantity: 10,
        referenceNo: "PO-1001"
      })
    );
  });

  test("POST /api/tooling/stock-out issues spare parts from stock", async () => {
    toolingRepository.stockOut.mockResolvedValue({
      id: 2,
      transactionNo: "TOUT-001",
      movementType: "stock_out",
      itemId: 1,
      locationId: 1,
      quantity: 3,
      balanceAfter: 19
    });

    const response = await request(app)
      .post("/api/tooling/stock-out")
      .set("x-username", "admin")
      .send({ itemId: 1, locationId: 1, quantity: 3, departmentId: 2 })
      .expect(201);

    expect(response.body.movementType).toBe("stock_out");
    expect(toolingRepository.stockOut).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 1,
        locationId: 1,
        quantity: 3,
        departmentId: 2
      })
    );
  });

  test("POST /api/tooling/stock-out rejects non-admin users", async () => {
    adminRepository.findUserByUsername.mockResolvedValue({
      username: "engineer01",
      permissions: '{"toolingStore":"user"}'
    });

    await request(app)
      .post("/api/tooling/stock-out")
      .set("x-username", "engineer01")
      .send({ itemId: 1, locationId: 1, quantity: 3 })
      .expect(403);
  });

  test("POST /api/tooling/stock-out returns insufficient stock errors", async () => {
    const error = new Error("Insufficient stock");
    error.statusCode = 400;
    toolingRepository.stockOut.mockRejectedValue(error);

    const response = await request(app)
      .post("/api/tooling/stock-out")
      .set("x-username", "admin")
      .send({ itemId: 1, locationId: 1, quantity: 99 })
      .expect(400);

    expect(response.body.message).toBe("Insufficient stock");
  });

  test("POST /api/tooling/stock-in rejects invalid quantity", async () => {
    await request(app)
      .post("/api/tooling/stock-in")
      .set("x-username", "admin")
      .send({ itemId: 1, locationId: 1, quantity: 0 })
      .expect(400);

    expect(toolingRepository.stockIn).not.toHaveBeenCalled();
  });

  test("GET /api/tooling/transactions returns stock movement history", async () => {
    toolingRepository.list.mockResolvedValue({
      data: [{ transactionNo: "TOUT-001", movementType: "stock_out", quantity: 3 }],
      pagination: { page: 1, pageSize: 10, total: 1 }
    });

    const response = await request(app)
      .get("/api/tooling/transactions")
      .set("x-username", "admin")
      .query({ movementType: "stock_out", dateFrom: "2026-05-01", dateTo: "2026-05-11" })
      .expect(200);

    expect(response.body.data[0].transactionNo).toBe("TOUT-001");
    expect(toolingRepository.list).toHaveBeenCalledWith(
      "transactions",
      expect.objectContaining({
        movementType: "stock_out",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-11"
      })
    );
  });
});
