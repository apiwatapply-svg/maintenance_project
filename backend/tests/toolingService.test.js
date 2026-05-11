jest.mock("../src/repositories/adminRepository", () => ({
  findUserByUsername: jest.fn()
}));

const adminRepository = require("../src/repositories/adminRepository");

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
