import assert from "node:assert/strict";
import test from "node:test";
import {
  adminResourceGroups,
  buildAdminQuery,
  getAdminFilterStorageKey,
  getAdminResource,
  getPageNumbers
} from "../src/lib/adminResources.js";

test("adminResourceGroups keeps requested sidebar groups and pages", () => {
  assert.deepEqual(adminResourceGroups.map((group) => group.label), ["Access", "Master Data", "Employee Data"]);
  assert.deepEqual(
    adminResourceGroups.flatMap((group) => group.items.map((item) => item.key)),
    ["users", "departments", "areas", "machine-types", "machine-nos", "employees"]
  );
});

test("getAdminResource resolves CRUD configs", () => {
  assert.equal(getAdminResource("users").endpoint, "users");
  assert.equal(getAdminResource("employees").title, "Employee Data");
  assert.equal(getAdminResource("missing"), null);
});

test("buildAdminQuery removes blank filters but keeps pagination", () => {
  assert.deepEqual(
    buildAdminQuery({ page: 2, pageSize: 10, search: "", status: "active", department_code: null }),
    { page: 2, pageSize: 10, status: "active" }
  );
});

test("getPageNumbers calculates all pages from total and page size", () => {
  assert.deepEqual(getPageNumbers(1, 0, 10), [1]);
  assert.deepEqual(getPageNumbers(1, 21, 10), [1, 2, 3]);
});

test("getAdminFilterStorageKey scopes localStorage by resource", () => {
  assert.equal(getAdminFilterStorageKey("users"), "adminFilters:users");
});
