const assert = require("node:assert/strict");
const test = require("node:test");
const { canAccessFeature } = require("../src/controllers/authController");

test("feature access matches seeded admin scopes", () => {
  const superAdmin = { role: "super_admin", adminScope: "all" };
  const maintenanceAdmin = { role: "admin", adminScope: "maintenance" };
  const productionAdmin = { role: "admin", adminScope: "production" };
  const qcAdmin = { role: "admin", adminScope: "qc" };
  const toolingAdmin = { role: "admin", adminScope: "tooling_store" };

  assert.equal(canAccessFeature(superAdmin, "admin"), true);
  assert.equal(canAccessFeature(superAdmin, "pm"), true);
  assert.equal(canAccessFeature(superAdmin, "store"), true);
  assert.equal(canAccessFeature(superAdmin, "job"), true);

  assert.equal(canAccessFeature(maintenanceAdmin, "pm"), true);
  assert.equal(canAccessFeature(maintenanceAdmin, "job"), true);
  assert.equal(canAccessFeature(maintenanceAdmin, "store"), false);

  assert.equal(canAccessFeature(productionAdmin, "job"), true);
  assert.equal(canAccessFeature(qcAdmin, "job"), true);
  assert.equal(canAccessFeature(toolingAdmin, "store"), true);
  assert.equal(canAccessFeature(toolingAdmin, "job"), false);
  assert.equal(canAccessFeature({ role: "admin", adminScope: "all" }, "admin"), false);
});
