import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessJobRequestSection,
  getSessionHomePath,
  jobRequestScopeHomePaths
} from "../src/lib/session.js";
import {
  getAvailableJobAction,
  getJobRequestRejectRoute,
  getJobRequestSection,
  getJobRequestSectionsForScope,
  getJobRequestTableColumns,
  jobRequestFieldRules,
  jobRequestHandoverColumns,
  jobRequestMultiSelectFields,
  jobRequestPerformanceStatusKeys,
  jobRequestRealtimeEvents,
  jobRequestSections,
  jobRequestStatuses,
  sortJobRequests
} from "../src/lib/jobRequestConfig.js";

test("job request config defines dashboard, handover, and the three section pages", () => {
  assert.deepEqual(jobRequestSections.map((section) => section.key), ["dashboard", "handover", "production", "maintenance", "qc"]);
  assert.deepEqual(jobRequestSections.map((section) => section.href), [
    "/job-request/dashboard",
    "/job-request/handover",
    "/job-request/production",
    "/job-request/maintenance",
    "/job-request/qc"
  ]);
  assert.equal(getJobRequestSection("production").primaryAction, "New Request");
  assert.equal(getJobRequestSection("handover").primaryAction, "New Handover");
});

test("job request status cards follow the requested labels without frontend counts", () => {
  assert.deepEqual(jobRequestStatuses.map((status) => status.label), [
    "Total Request",
    "Wait MM",
    "MM Repair",
    "Wait QC",
    "QC Inspection",
    "Wait Prod",
    "Prod Confirming",
    "Completed"
  ]);
  assert.equal(jobRequestStatuses.some((status) => Object.hasOwn(status, "value")), false);
});

test("job request login home path follows the user's permission scope", () => {
  assert.equal(getSessionHomePath("job", { user: { adminScope: "production" } }), jobRequestScopeHomePaths.production);
  assert.equal(getSessionHomePath("job", { user: { adminScope: "maintenance" } }), jobRequestScopeHomePaths.maintenance);
  assert.equal(getSessionHomePath("job", { user: { adminScope: "qc" } }), jobRequestScopeHomePaths.qc);
});

test("job request section access is limited to the logged-in scope", () => {
  assert.equal(canAccessJobRequestSection({ user: { adminScope: "production" } }, "dashboard"), true);
  assert.equal(canAccessJobRequestSection({ user: { adminScope: "production" } }, "handover"), true);
  assert.equal(canAccessJobRequestSection({ user: { adminScope: "maintenance" } }, "maintenance"), true);
  assert.equal(canAccessJobRequestSection({ user: { adminScope: "maintenance" } }, "production"), false);
  assert.equal(canAccessJobRequestSection({ user: { adminScope: "all" } }, "qc"), true);
});

test("job request sidebar shows dashboard plus pages allowed by scope", () => {
  assert.deepEqual(getJobRequestSectionsForScope("production").map((section) => section.key), ["dashboard", "handover", "production"]);
  assert.deepEqual(getJobRequestSectionsForScope("qc").map((section) => section.key), ["dashboard", "handover", "qc"]);
  assert.deepEqual(getJobRequestSectionsForScope("all").map((section) => section.key), ["dashboard", "handover", "production", "maintenance", "qc"]);
});

test("job request tables use document-based headers with No and available action", () => {
  assert.deepEqual(getJobRequestTableColumns("production").map((column) => column.label), [
    "No",
    "Job No",
    "Status",
    "Machine Name",
    "Machine Code",
    "Production Line",
    "Area",
    "Priority",
    "Request By",
    "Prod",
    "MM",
    "QC",
    "Available Action"
  ]);
  assert.ok(jobRequestHandoverColumns.some((column) => column.label === "Handover To"));
});

test("job request form rules document auto and searchable fields", () => {
  assert.ok(jobRequestFieldRules.autoRun.includes("jobNo"));
  assert.ok(jobRequestFieldRules.searchableDropdown.includes("area"));
  assert.ok(jobRequestFieldRules.searchableDropdown.includes("machineNo"));
  assert.ok(jobRequestFieldRules.autoFill.includes("machineNo from machineType"));
});

test("job request multi-select fields cover every naturally multi-value step", () => {
  assert.ok(jobRequestMultiSelectFields.includes("problem"));
  assert.ok(jobRequestMultiSelectFields.includes("repairCause"));
  assert.ok(jobRequestMultiSelectFields.includes("repairAction"));
  assert.ok(jobRequestMultiSelectFields.includes("issuedSparePartUsed"));
  assert.ok(jobRequestMultiSelectFields.includes("qcFinding"));
  assert.ok(jobRequestMultiSelectFields.includes("qcRejectReason"));
  assert.ok(jobRequestMultiSelectFields.includes("confirmCheck"));
  assert.ok(jobRequestMultiSelectFields.includes("productionRejectReason"));
  assert.ok(jobRequestMultiSelectFields.includes("handoverPendingItem"));
});

test("job request reject routes cover every reject case", () => {
  assert.deepEqual(getJobRequestRejectRoute("qc"), {
    fromSection: "QC",
    targetSection: "MM",
    targetStatus: "MM_REPAIR",
    progressColumn: "qc"
  });
  assert.deepEqual(getJobRequestRejectRoute("production"), {
    fromSection: "Production",
    targetSection: "QC",
    targetStatus: "WAIT_QC",
    progressColumn: "prod"
  });
});

test("job request table actions follow permission by status from the requirement", () => {
  assert.equal(getAvailableJobAction("production", "WAIT_PROD_CONFIRM"), "Accept");
  assert.equal(getAvailableJobAction("production", "PROD_CONFIRMING"), "Confirm / Reject");
  assert.equal(getAvailableJobAction("maintenance", "MM_REPAIR"), "Repair / Send");
  assert.equal(getAvailableJobAction("qc", "WAIT_QC"), "Accept");
  assert.equal(getAvailableJobAction("qc", "QC_INSPECTION"), "Inspect");
  assert.equal(getAvailableJobAction("qc", "WAIT_MM"), "View");
});

test("job request sorting keeps higher priority first, then older request", () => {
  const sortedJobs = sortJobRequests([
    { jobNo: "A", priority: "High", requestedAt: "2026-05-12T03:00:00.000Z" },
    { jobNo: "B", priority: "Urgent", requestedAt: "2026-05-12T04:00:00.000Z" },
    { jobNo: "C", priority: "High", requestedAt: "2026-05-12T01:00:00.000Z" }
  ]);

  assert.deepEqual(sortedJobs.map((job) => job.jobNo), ["B", "C", "A"]);
});

test("job request realtime events include production confirming and handover targets", () => {
  assert.ok(jobRequestRealtimeEvents.includes("job_wait_confirming"));
  assert.ok(jobRequestRealtimeEvents.includes("job_qc_accepted"));
  assert.ok(jobRequestRealtimeEvents.includes("job_handover_created"));
});

test("job request performance status summary includes all active statuses", () => {
  assert.deepEqual(jobRequestPerformanceStatusKeys.map((status) => status.label), [
    "Wait MM",
    "MM Repair",
    "Wait QC",
    "QC Inspection",
    "Wait Prod",
    "Prod Confirming",
    "Completed"
  ]);
});
