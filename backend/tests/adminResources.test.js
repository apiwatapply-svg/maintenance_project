const assert = require("node:assert/strict");
const test = require("node:test");
const { adminResources, getAdminResource, normalizePagination } = require("../src/config/adminResources");

test("adminResources maps requested resources to tbm tables", () => {
  assert.equal(adminResources.users.table, "tbm_user");
  assert.equal(adminResources.departments.table, "tbm_department");
  assert.equal(adminResources.areas.table, "tbm_area");
  assert.equal(adminResources["machine-types"].table, "tbm_machine_type");
  assert.equal(adminResources["machine-nos"].table, "tbm_machine_no");
  assert.equal(adminResources.employees.table, "tbm_employee");
});

test("getAdminResource returns null for unknown resource", () => {
  assert.equal(getAdminResource("users").idColumn, "id");
  assert.equal(getAdminResource("missing"), null);
});

test("normalizePagination clamps page size and calculates offset", () => {
  assert.deepEqual(normalizePagination({ page: 3, pageSize: 20 }), { page: 3, pageSize: 20, offset: 40 });
  assert.deepEqual(normalizePagination({ page: -1, pageSize: 500 }), { page: 1, pageSize: 100, offset: 0 });
});
