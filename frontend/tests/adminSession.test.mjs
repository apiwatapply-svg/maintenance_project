import test from "node:test";
import assert from "node:assert/strict";

import {
  getAdminLogoutRedirect,
  getAdminSessionRedirect
} from "../src/lib/adminSession.mjs";

test("getAdminSessionRedirect sends logged-in admins away from gateway", () => {
  assert.equal(getAdminSessionRedirect("/", true), "/admin");
});

test("getAdminSessionRedirect sends logged-in admins away from admin login", () => {
  assert.equal(getAdminSessionRedirect("/admin/login", true), "/admin");
});

test("getAdminSessionRedirect sends logged-in admins away from feature login pages", () => {
  assert.equal(getAdminSessionRedirect("/preventive-maintenance/login", true), "/admin");
  assert.equal(getAdminSessionRedirect("/tooling-store/login", true), "/admin");
  assert.equal(getAdminSessionRedirect("/job-request/login", true), "/admin");
});

test("getAdminSessionRedirect allows public pages when no admin session exists", () => {
  assert.equal(getAdminSessionRedirect("/", false), null);
  assert.equal(getAdminSessionRedirect("/admin/login", false), null);
});

test("getAdminSessionRedirect does not redirect other admin pages", () => {
  assert.equal(getAdminSessionRedirect("/admin/users", true), null);
});

test("getAdminLogoutRedirect returns the gateway route", () => {
  assert.equal(getAdminLogoutRedirect(), "/");
});
