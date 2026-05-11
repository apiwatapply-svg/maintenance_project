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
});
