jest.mock("../src/repositories/adminRepository", () => ({
  findUserByUsername: jest.fn()
}));

jest.mock("../src/repositories/toolingRepository", () => ({
  searchItems: jest.fn(),
  findItemByQrCode: jest.fn()
}));

const adminRepository = require("../src/repositories/adminRepository");
const toolingRepository = require("../src/repositories/toolingRepository");

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
