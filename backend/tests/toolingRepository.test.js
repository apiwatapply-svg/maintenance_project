jest.mock("../src/config/database", () => ({
  sql: {
    DateTime2: "DateTime2",
    Int: "Int",
    NVarChar: "NVarChar"
  },
  getPool: jest.fn()
}));

const { getPool } = require("../src/config/database");

function createMockRequest() {
  return {
    inputs: {},
    queries: [],
    input: jest.fn(function input(key, _type, value) {
      this.inputs[key] = value;
      return this;
    }),
    query: jest.fn(function query(sqlText) {
      this.queries.push(sqlText);
      if (sqlText.includes("COUNT(1) AS total")) {
        return Promise.resolve({ recordset: [{ total: 0 }] });
      }
      return Promise.resolve({ recordset: [] });
    })
  };
}

describe("tooling repository reports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("issue grouped reports apply date filters to data and count queries", async () => {
    const createdRequests = [createMockRequest(), createMockRequest()];
    const requestQueue = [...createdRequests];

    getPool.mockResolvedValue({
      request: jest.fn(() => requestQueue.shift())
    });

    const toolingRepository = require("../src/repositories/toolingRepository");

    await toolingRepository.report("issue-by-department", {
      dateFrom: "2026-05-01",
      dateTo: "2026-05-11"
    });

    const allRequests = createdRequests;
    const allSql = allRequests.flatMap((request) => request.queries).join("\n");

    expect(allSql).toContain("transactionDate >= @dateFrom");
    expect(allSql).toContain("transactionDate <= @dateTo");
    allRequests.forEach((request) => {
      expect(request.input).toHaveBeenCalledWith("dateFrom", "DateTime2", expect.any(Date));
      expect(request.input).toHaveBeenCalledWith("dateTo", "DateTime2", expect.any(Date));
    });
  });

  test("low-stock report filters items by current stock against minimum stock", async () => {
    const createdRequests = [createMockRequest(), createMockRequest()];
    const requestQueue = [...createdRequests];

    getPool.mockResolvedValue({
      request: jest.fn(() => requestQueue.shift())
    });

    const toolingRepository = require("../src/repositories/toolingRepository");

    await toolingRepository.report("low-stock", { page: 1, pageSize: 10 });

    const allSql = createdRequests.flatMap((request) => request.queries).join("\n");

    expect(allSql).toContain("COALESCE(stock.currentStock, 0) <= item.minimumStock");
    expect(allSql).toContain("item.imageUrl");
    expect(allSql).not.toContain("planningStatus");
  });

  test("planning rows include item images for planning UI", async () => {
    const createdRequests = [createMockRequest(), createMockRequest()];
    const requestQueue = [...createdRequests];

    getPool.mockResolvedValue({
      request: jest.fn(() => requestQueue.shift())
    });

    const toolingRepository = require("../src/repositories/toolingRepository");

    await toolingRepository.planning({ page: 1, pageSize: 10 });

    const allSql = createdRequests.flatMap((request) => request.queries).join("\n");

    expect(allSql).toContain("item.imageUrl");
  });

  test("item search matches QR code, item code, and item name", async () => {
    const request = createMockRequest();

    getPool.mockResolvedValue({
      request: jest.fn(() => request)
    });

    const toolingRepository = require("../src/repositories/toolingRepository");

    await toolingRepository.searchItems("QR-SP-BRG-6204");

    const sqlText = request.queries.join("\n");

    expect(sqlText).toContain("item.qrCode LIKE @search");
    expect(sqlText).toContain("item.itemCode LIKE @search");
    expect(sqlText).toContain("item.itemName LIKE @search");
  });

  test("movement report includes item image data for report UI", async () => {
    const createdRequests = [createMockRequest(), createMockRequest()];
    const requestQueue = [...createdRequests];

    getPool.mockResolvedValue({
      request: jest.fn(() => requestQueue.shift())
    });

    const toolingRepository = require("../src/repositories/toolingRepository");

    await toolingRepository.report("movement", { page: 1, pageSize: 10 });

    const allSql = createdRequests.flatMap((request) => request.queries).join("\n");

    expect(allSql).toContain("item.imageUrl");
  });

  test("dashboard loads movement chart rows for the requested year and month", async () => {
    const summaryRequest = createMockRequest();
    summaryRequest.query.mockImplementation(function query(sqlText) {
      this.queries.push(sqlText);
      return Promise.resolve({
        recordset: [{
          totalItems: 0,
          lowStockItems: 0,
          movementToday: 0,
          stockoutRiskItems: 0,
          slowMovementItems: 0,
          overstockItems: 0
        }]
      });
    });
    const movementRequest = createMockRequest();
    const requestQueue = [summaryRequest, movementRequest];

    getPool.mockResolvedValue({
      request: jest.fn(() => requestQueue.shift())
    });

    const toolingRepository = require("../src/repositories/toolingRepository");

    await toolingRepository.dashboard({ yearMonth: "2026-05" });

    const movementSql = movementRequest.queries.join("\n");

    expect(movementRequest.input).toHaveBeenCalledWith("year", "Int", 2026);
    expect(movementRequest.input).toHaveBeenCalledWith("month", "Int", 5);
    expect(movementSql).toContain("DATEFROMPARTS(@year, @month, 1)");
    expect(movementSql).toContain("transactionRow.movementType IN ('stock_in', 'stock_out')");
    expect(movementSql).toContain("item.imageUrl");
  });

  test("getReturnableQuantity subtracts prior returns from issued stock", async () => {
    const request = createMockRequest();
    request.query.mockImplementation(function query(sqlText) {
      this.queries.push(sqlText);
      return Promise.resolve({ recordset: [{ returnableQuantity: 3 }] });
    });

    getPool.mockResolvedValue({
      request: jest.fn(() => request)
    });

    const toolingRepository = require("../src/repositories/toolingRepository");
    const result = await toolingRepository.getReturnableQuantity(1, 2);

    const sqlText = request.queries.join("\n");

    expect(result.returnableQuantity).toEqual(3);
    expect(request.input).toHaveBeenCalledWith("itemId", "Int", 1);
    expect(request.input).toHaveBeenCalledWith("locationId", "Int", 2);
    expect(sqlText).toContain("movementType = 'stock_out'");
    expect(sqlText).toContain("movementType IN ('return_good', 'return_damaged', 'return_lost')");
  });
});
