const assert = require("node:assert/strict");
const test = require("node:test");
const { getFeatureRoom, sectionRooms } = require("../src/socket");

test("job request socket rooms match required section rooms", () => {
  assert.deepEqual(sectionRooms, {
    production: "production_room",
    maintenance: "maintenance_room",
    qc: "qc_room"
  });
});

test("generic realtime rooms support future features such as MMS", () => {
  assert.equal(getFeatureRoom("job-request", "maintenance"), "job-request:maintenance");
  assert.equal(getFeatureRoom("mms", "line-a"), "mms:line-a");
  assert.equal(getFeatureRoom("MMS", "ALL"), "mms:all");
});
