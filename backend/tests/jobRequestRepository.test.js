const assert = require("node:assert/strict");
const test = require("node:test");
const {
  allowedStatuses,
  buildCreateJobPayload,
  buildJobNoPrefix,
  getSchemaStatements,
  sortRows,
  splitProblems,
  summarizePerformanceItems,
  summarizeProblemItems,
  summarizeTopProblems
} = require("../src/repositories/jobRequestRepository");

test("job request schema uses required tb_ tables and history table", () => {
  const schema = getSchemaStatements().join("\n");

  assert.match(schema, /tb_job_request/);
  assert.match(schema, /tb_job_request_history/);
  assert.match(schema, /tb_job_request_spare_part_usage/);
  assert.match(schema, /tbm_job_request_option/);
  assert.match(schema, /tb_job_request_handover/);
});

test("job request statuses include the separated QC inspection process", () => {
  assert.ok(allowedStatuses.includes("WAIT_QC"));
  assert.ok(allowedStatuses.includes("QC_INSPECTION"));
});

test("job request repository sorting keeps priority first then older request", () => {
  const sorted = sortRows([
    { jobNo: "B", priority: "High", requestedAt: "2026-05-12T02:00:00.000Z" },
    { jobNo: "A", priority: "Urgent", requestedAt: "2026-05-12T03:00:00.000Z" },
    { jobNo: "C", priority: "High", requestedAt: "2026-05-12T01:00:00.000Z" }
  ]);

  assert.deepEqual(sorted.map((item) => item.jobNo), ["A", "C", "B"]);
});

test("job request creation payload auto-fills generated fields and keeps multi problems", () => {
  const payload = buildCreateJobPayload({
    area: "Line A",
    machineType: "Conveyor",
    machineNo: "CNV-A-001",
    problems: ["Abnormal noise", "Other problem"],
    priority: "High",
    requestBy: "PRD-014 - Somchai W."
  }, "JOB-20260513-001");

  assert.equal(payload.jobNo, "JOB-20260513-001");
  assert.equal(payload.machineName, "Conveyor CNV-A-001");
  assert.equal(payload.machineCode, "CNV-A");
  assert.equal(payload.productionLine, "Line A");
  assert.equal(payload.problem, "Abnormal noise, Other problem");
  assert.equal(payload.owner, "Maintenance");
});

test("job request number prefix uses UTC date format", () => {
  assert.equal(buildJobNoPrefix(new Date("2026-05-13T18:30:00.000Z")), "JOB-20260513");
});

test("job request dashboard summary separates all active status buckets", () => {
  const summary = summarizeProblemItems([
    { area: "Line A", status: "WAIT_MM" },
    { area: "Line A", status: "MM_REPAIR" },
    { area: "Line A", status: "QC_INSPECTION" },
    { area: "Line B", status: "PROD_CONFIRMING" }
  ], "area");

  const lineA = summary.find((item) => item.name === "Line A");
  const lineB = summary.find((item) => item.name === "Line B");

  assert.equal(lineA.request, 3);
  assert.equal(lineA.waitMm, 1);
  assert.equal(lineA.mmRepair, 1);
  assert.equal(lineA.qcInspection, 1);
  assert.equal(lineB.prodConfirming, 1);
});

test("job request dashboard top problems supports comma-separated multi problems", () => {
  assert.deepEqual(splitProblems("Abnormal noise, Belt shaking, Other problem"), ["Abnormal noise", "Belt shaking", "Other problem"]);
  assert.deepEqual(summarizeTopProblems([
    { problem: "Abnormal noise, Belt shaking" },
    { problem: "Abnormal noise, Oil leakage" }
  ]), [
    { name: "Abnormal noise", count: 2 },
    { name: "Belt shaking", count: 1 },
    { name: "Oil leakage", count: 1 }
  ]);
});

test("job request performance items are calculated from backend records, not frontend mock data", () => {
  const performance = summarizePerformanceItems([
    { machineType: "Conveyor", status: "WAIT_MM" },
    { machineType: "Conveyor", status: "MM_REPAIR" },
    { machineType: "Sealer", status: "COMPLETED" }
  ], "machineType", 1.2, 2.1);

  assert.deepEqual(performance.map((item) => item.name), ["Conveyor", "Sealer"]);
  assert.equal(performance[0].avgHours, 2.4);
  assert.equal(performance[0].maxHours, 4.2);
});
