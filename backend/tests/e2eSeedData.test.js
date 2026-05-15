const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildE2eSeedData,
  calculateCalibrationStatus,
  calculateMmsMetrics,
  calculateStockStatus
} = require("../scripts/e2e_seed_data");
const backendPackage = require("../package.json");

test("e2e seed data covers every operational module with deterministic current-day rows", () => {
  const seed = buildE2eSeedData(new Date("2026-05-15T02:00:00.000Z"));

  assert.equal(seed.todayText, "2026-05-15");
  assert.equal(seed.admin.users.length >= 5, true);
  assert.equal(seed.admin.employees.length >= 9, true);
  assert.equal(seed.admin.machines.length, 100);
  assert.equal(seed.tooling.stockBalance.length >= 4, true);
  assert.equal(seed.jobRequest.jobs.length >= 5, true);
  assert.equal(seed.preventive.plans.length >= 5, true);
  assert.equal(seed.mmsHourly.length, seed.admin.machines.length * 24);
});

test("e2e seed stock and calibration statuses are calculated from quantities and dates", () => {
  const seed = buildE2eSeedData(new Date("2026-05-15T02:00:00.000Z"));
  const tape = seed.tooling.stockBalance.find((row) => row.item_code === "ST-TAPE-001");
  const caliper = seed.tooling.calibration.find((row) => row.tool_code === "TL-CV-002");

  assert.equal(tape.current_stock, 4);
  assert.equal(tape.status, calculateStockStatus(tape.current_stock, tape.minimum_stock, tape.maximum_stock));
  assert.equal(caliper.status, calculateCalibrationStatus(caliper.next_calibration_date, seed.todayText));
});

test("e2e mms hourly rows carry internally consistent OEE inputs", () => {
  const seed = buildE2eSeedData(new Date("2026-05-15T02:00:00.000Z"));
  const runRow = seed.mmsHourly.find((row) => row.status === "RUN");
  const metrics = calculateMmsMetrics(runRow);

  assert.equal(runRow.output_ok + runRow.output_ng <= runRow.target_output, true);
  assert.equal(runRow.run_seconds <= runRow.planned_seconds, true);
  assert.equal(metrics.availability > 0, true);
  assert.equal(metrics.quality > 98, true);
  assert.equal(metrics.oee > 0, true);
});

test("backend exposes a full e2e seed command", () => {
  assert.equal(backendPackage.scripts["seed:e2e"], "node scripts/seed_e2e_data.js");
});
