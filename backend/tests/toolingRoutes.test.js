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
  findItemByQrCode: jest.fn()
}));

const app = require("../src/app");
const adminRepository = require("../src/repositories/adminRepository");
const toolingRepository = require("../src/repositories/toolingRepository");

beforeEach(() => {
  jest.clearAllMocks();
  adminRepository.findUserByUsername.mockResolvedValue({
    username: "admin",
    permissions: '{"toolingStore":"admin"}'
  });
});

describe("tooling foundation routes", () => {
  test("GET /api/tooling/dashboard returns dashboard summary", async () => {
    toolingRepository.dashboard.mockResolvedValue({
      totalItems: 2,
      lowStockItems: 1,
      pendingRequests: 0,
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
      data: [{ itemId: 1, locationId: 1, quantityOnHand: 12 }],
      pagination: { page: 1, pageSize: 10, total: 1 }
    });

    const response = await request(app)
      .get("/api/tooling/stock")
      .set("x-username", "admin")
      .query({ itemId: 1 })
      .expect(200);

    expect(response.body.data[0].quantityOnHand).toBe(12);
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
    toolingRepository.findItemByQrCode.mockResolvedValue({ id: 1, ...itemPayload });

    const response = await request(app)
      .get("/api/tooling/items/qr/QR-SP-001")
      .set("x-username", "admin")
      .expect(200);

    expect(response.body.itemCode).toBe("SP-001");
    expect(toolingRepository.findItemByQrCode).toHaveBeenCalledWith("QR-SP-001");
  });
});
