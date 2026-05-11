const request = require("supertest");

jest.mock("../src/repositories/adminRepository", () => ({
  list: jest.fn(),
  getById: jest.fn(),
  findUserByUsername: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn()
}));

const app = require("../src/app");
const adminRepository = require("../src/repositories/adminRepository");

const resources = [
  {
    resource: "departments",
    payload: { code: "ENG", name: "Engineering", status: "active" }
  },
  {
    resource: "areas",
    payload: { departmentId: 1, code: "A1", name: "Line A", status: "active" }
  },
  {
    resource: "machine-types",
    payload: { areaId: 1, code: "CNV", name: "Conveyor", status: "active" }
  },
  {
    resource: "machine-numbers",
    payload: { machineTypeId: 1, machineNumber: "CNV-001", name: "Conveyor 1", status: "active" }
  },
  {
    resource: "users",
    payload: {
      empId: "OP-001",
      name: "Operator One",
      position: "Production",
      username: "operator01",
      password: "operator01",
      departmentId: 1,
      status: "active",
      role: "user",
      permissions: {
        preventiveMaintenance: "user",
        toolingStore: "none",
        jobRequest: "admin",
        adminMode: "none"
      }
    }
  }
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("admin auth endpoints", () => {
  test("POST /api/admin/login accepts admin credentials", async () => {
    adminRepository.findUserByUsername.mockResolvedValue({
      id: 1,
      empId: "ADM-001",
      name: "System Administrator",
      position: "Maintenance",
      username: "admin",
      password: "admin",
      departmentId: 1,
      role: "admin",
      permissions:
        '{"preventiveMaintenance":"admin","toolingStore":"admin","jobRequest":"admin","adminMode":"admin"}'
    });

    const response = await request(app)
      .post("/api/admin/login")
      .send({ username: "admin", password: "admin" })
      .expect(200);

    expect(response.body.user.username).toBe("admin");
    expect(response.body.user.empId).toBe("ADM-001");
    expect(response.body.user.name).toBe("System Administrator");
    expect(response.body.user.position).toBe("Maintenance");
    expect(response.body.user.role).toBe("admin");
    expect(response.body.user.permissions.adminMode).toBe("admin");
    expect(response.body.token).toBe("admin-local-token");
  });

  test("POST /api/admin/login rejects invalid credentials", async () => {
    adminRepository.findUserByUsername.mockResolvedValue({
      username: "admin",
      password: "admin"
    });

    await request(app)
      .post("/api/admin/login")
      .send({ username: "admin", password: "wrong" })
      .expect(401);
  });

  test("POST /api/admin/login rejects unknown users", async () => {
    adminRepository.findUserByUsername.mockResolvedValue(null);

    await request(app)
      .post("/api/admin/login")
      .send({ username: "missing", password: "admin" })
      .expect(401);
  });
});

describe.each(resources)("admin CRUD endpoints for $resource", ({ resource, payload }) => {
  test(`GET /api/admin/${resource} returns filtered paginated data`, async () => {
    adminRepository.list.mockResolvedValue({
      data: [{ id: 1, ...payload }],
      pagination: { page: 1, pageSize: 10, total: 1 }
    });

    const response = await request(app)
      .get(`/api/admin/${resource}`)
      .query({ search: "line", status: "active", page: 1, pageSize: 10 })
      .expect(200);

    expect(response.body.pagination.total).toBe(1);
    expect(response.body.data[0].id).toBe(1);
    expect(adminRepository.list).toHaveBeenCalledWith(
      resource,
      expect.objectContaining({ search: "line", status: "active", page: "1", pageSize: "10" })
    );
  });

  test(`GET /api/admin/${resource}/:id returns one record`, async () => {
    adminRepository.getById.mockResolvedValue({ id: 1, ...payload });

    const response = await request(app).get(`/api/admin/${resource}/1`).expect(200);

    expect(response.body.id).toBe(1);
    expect(adminRepository.getById).toHaveBeenCalledWith(resource, "1");
  });

  test(`POST /api/admin/${resource} creates a record`, async () => {
    adminRepository.create.mockResolvedValue({ id: 1, ...payload });

    const response = await request(app).post(`/api/admin/${resource}`).send(payload).expect(201);

    expect(response.body.id).toBe(1);
    expect(adminRepository.create).toHaveBeenCalledWith(resource, expect.objectContaining(payload));
  });

  test(`POST /api/admin/${resource} rejects missing required data`, async () => {
    await request(app).post(`/api/admin/${resource}`).send({}).expect(400);
    expect(adminRepository.create).not.toHaveBeenCalled();
  });

  test(`PUT /api/admin/${resource}/:id updates a record`, async () => {
    adminRepository.update.mockResolvedValue({ id: 1, ...payload, status: "inactive" });

    const response = await request(app)
      .put(`/api/admin/${resource}/1`)
      .send({ status: "inactive" })
      .expect(200);

    expect(response.body.status).toBe("inactive");
    expect(adminRepository.update).toHaveBeenCalledWith(resource, "1", { status: "inactive" });
  });

  test(`PUT /api/admin/${resource}/:id returns 404 when the record is missing`, async () => {
    adminRepository.update.mockResolvedValue(null);

    await request(app)
      .put(`/api/admin/${resource}/99`)
      .send({ status: "inactive" })
      .expect(404);
  });

  test(`DELETE /api/admin/${resource}/:id deletes a record`, async () => {
    adminRepository.remove.mockResolvedValue({ id: 1, ...payload });

    const response = await request(app).delete(`/api/admin/${resource}/1`).expect(200);

    expect(response.body.id).toBe(1);
    expect(adminRepository.remove).toHaveBeenCalledWith(resource, "1");
  });

  test(`DELETE /api/admin/${resource}/:id returns 404 when the record is missing`, async () => {
    adminRepository.remove.mockResolvedValue(null);

    await request(app).delete(`/api/admin/${resource}/99`).expect(404);
  });
});

describe("admin resource validation", () => {
  test("GET /api/admin/unknown returns 404", async () => {
    await request(app).get("/api/admin/unknown").expect(404);
  });

  test("POST /api/admin/users rejects unknown feature permission keys", async () => {
    await request(app)
      .post("/api/admin/users")
      .send({
        empId: "OP-002",
        name: "Operator Two",
        position: "Production",
        username: "operator02",
        password: "operator02",
        departmentId: 1,
        permissions: { unknownFeature: "admin" }
      })
      .expect(400);

    expect(adminRepository.create).not.toHaveBeenCalled();
  });

  test("POST /api/admin/users rejects unsupported feature roles", async () => {
    await request(app)
      .post("/api/admin/users")
      .send({
        empId: "OP-003",
        name: "Operator Three",
        position: "QC",
        username: "operator03",
        password: "operator03",
        departmentId: 1,
        permissions: { jobRequest: "owner" }
      })
      .expect(400);

    expect(adminRepository.create).not.toHaveBeenCalled();
  });

  test("PUT /api/admin/users/:id rejects unsupported feature roles", async () => {
    await request(app)
      .put("/api/admin/users/1")
      .send({ permissions: { jobRequest: "owner" } })
      .expect(400);

    expect(adminRepository.update).not.toHaveBeenCalled();
  });
});
