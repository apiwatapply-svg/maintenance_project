import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessFeature,
  getSystemConfig,
  getSystemLogoutRedirect,
  getSystemSessionRedirect
} from "../src/lib/systemSession.mjs";

test("getSystemConfig returns route and permission details for each system", () => {
  assert.equal(getSystemConfig("pm").homePath, "/preventive-maintenance");
  assert.equal(getSystemConfig("store").permissionKey, "toolingStore");
  assert.equal(getSystemConfig("job").sessionKey, "jobRequestSession");
});

test("getSystemSessionRedirect sends active feature sessions away from gateway", () => {
  assert.equal(getSystemSessionRedirect("/", { pm: true }), "/preventive-maintenance");
  assert.equal(getSystemSessionRedirect("/", { store: true }), "/tooling-store");
  assert.equal(getSystemSessionRedirect("/", { job: true }), "/job-request");
});

test("getSystemSessionRedirect sends active sessions away from their login page", () => {
  assert.equal(
    getSystemSessionRedirect("/preventive-maintenance/login", { pm: true }),
    "/preventive-maintenance"
  );
  assert.equal(getSystemSessionRedirect("/tooling-store/login", { store: true }), "/tooling-store");
  assert.equal(getSystemSessionRedirect("/job-request/login", { job: true }), "/job-request");
});

test("getSystemSessionRedirect sends active sessions away from every login page", () => {
  assert.equal(getSystemSessionRedirect("/tooling-store/login", { pm: true }), "/preventive-maintenance");
  assert.equal(getSystemSessionRedirect("/admin/login", { job: true }), "/job-request");
});

test("getSystemSessionRedirect allows protected pages and missing sessions", () => {
  assert.equal(getSystemSessionRedirect("/", {}), null);
  assert.equal(getSystemSessionRedirect("/admin/users", { pm: true }), null);
});

test("canAccessFeature allows user and admin roles only", () => {
  assert.equal(canAccessFeature({ permissions: { toolingStore: "user" } }, "toolingStore"), true);
  assert.equal(canAccessFeature({ permissions: { toolingStore: "admin" } }, "toolingStore"), true);
  assert.equal(canAccessFeature({ permissions: { toolingStore: "none" } }, "toolingStore"), false);
  assert.equal(canAccessFeature({ permissions: {} }, "toolingStore"), false);
});

test("getSystemLogoutRedirect returns the gateway route", () => {
  assert.equal(getSystemLogoutRedirect(), "/");
});
