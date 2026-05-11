const request = require("supertest");

jest.mock("../src/repositories/adminRepository", () => ({
  findUserByUsername: jest.fn()
}));

jest.mock("../src/repositories/toolingRepository", () => ({
  dashboard: jest.fn(),
  list: jest.fn()
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
