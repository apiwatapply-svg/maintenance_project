import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMmsPayload,
  buildMmsLayoutMachineState,
  buildMmsGraphReportSeries,
  buildMmsMachineTypeSummary,
  buildMmsOverviewSummary,
  buildMmsReportColumns,
  buildMmsReportMatrixRows,
  canMmsMachineProduce,
  getDefaultMmsOverviewFilters,
  getDefaultMmsReportFilters,
  getMmsEffectiveStatus,
  getRandomMmsAlarmName,
  getRandomMmsCycleTime,
  groupMmsMachinesByZone,
  getMmsDashboardViewKey,
  mmsOverviewFilterStorageKey,
  mmsReportsFilterStorageKey,
  hydrateMmsMachine,
  selectOverallMmsMachines,
  selectMmsOverviewMachines,
  selectMmsReportMachines,
  mmsBaseControlStatuses,
  mmsMachineStatuses,
  mmsPanelStatuses,
  mmsSocketEvents,
  mmsAlarmNames,
  summarizeMmsAreas
} from "../src/lib/mmsSimulation.js";

test("mms simulation separates base status buttons from panel status buttons", () => {
  assert.deepEqual(mmsBaseControlStatuses, ["RUN", "WAIT_PART", "BRAKE_TIME", "PLAN_STOP", "WARM_UP", "STOP"]);
  assert.deepEqual(mmsPanelStatuses, ["MM_REPAIR", "MM_PREVENTIVE", "QC", "CLEANING"]);
  assert.deepEqual(mmsMachineStatuses, ["RUN", "WAIT_PART", "BRAKE_TIME", "PLAN_STOP", "WARM_UP", "STOP", "MM_REPAIR", "MM_PREVENTIVE", "QC", "CLEANING"]);
});

test("mms simulation blocks output by GOT status or alarm, not only by active job request", () => {
  assert.equal(canMmsMachineProduce({ plcStatus: "RUN" }), true);
  assert.equal(canMmsMachineProduce({ plcStatus: "RUN", simMachineAlarm: true }), false);
  assert.equal(canMmsMachineProduce({ plcStatus: "RUN", jobRequestActive: true }), true);
  assert.equal(canMmsMachineProduce({ plcStatus: "MM_REPAIR" }), false);
  assert.equal(canMmsMachineProduce({ plcStatus: "CLEANING" }), false);
  assert.equal(getMmsEffectiveStatus({ plcStatus: "RUN", jobRequestActive: true }), "RUN");
});

test("mms payload includes UTC timestamp and output gate", () => {
  const payload = buildMmsPayload({
    area: "Line A",
    machineType: "Conveyor",
    machineNo: "CNV-A-001",
    machineName: "Main Conveyor",
    plcStatus: "RUN",
    outputOk: 12,
    outputNg: 1,
    cycleTime: 4.2,
    model: "MODEL-A"
  }, new Date("2026-05-13T10:00:00.000Z"));

  assert.equal(payload.timestampUtc, "2026-05-13T10:00:00.000Z");
  assert.equal(payload.canProduceOutput, true);
  assert.equal(payload.gotScreen, "MES_MENU");
});

test("mms area summary counts run alarm and job active states", () => {
  const rows = summarizeMmsAreas([
    { area: "Line A", plcStatus: "RUN" },
    { area: "Line A", plcStatus: "RUN", simMachineAlarm: true },
    { area: "Line A", plcStatus: "RUN", jobRequestActive: true }
  ]);

  assert.deepEqual(rows[0], {
    area: "Line A",
    total: 3,
    running: 2,
    alarm: 1,
    jobActive: 1,
    stopped: 1
  });
});

test("mms machines are grouped by zone area and machine type for layout", () => {
  const zones = groupMmsMachinesByZone([
    { area: "Line A", machineType: "Conveyor", machineNo: "CNV-A-001", plcStatus: "RUN" },
    { area: "Line A", machineType: "Pump", machineNo: "PMP-A-001", plcStatus: "STOP" },
    { area: "Line B", machineType: "Conveyor", machineNo: "CNV-B-001", plcStatus: "RUN", jobRequestActive: true }
  ]);

  assert.equal(zones.length, 2);
  assert.equal(zones[0].zoneNo, "Zone 01");
  assert.equal(zones[0].area, "Line A");
  assert.equal(zones[0].machineCount, 2);
  assert.deepEqual(zones[0].machineTypes.map((group) => group.machineType), ["Conveyor", "Pump"]);
  assert.equal(zones[1].jobActive, 1);
});

test("mms socket events expose status output and alarm changes", () => {
  assert.deepEqual(Object.values(mmsSocketEvents), [
    "mms:machine-status-changed",
    "mms:machine-output-changed",
    "mms:machine-alarm-changed"
  ]);
});

test("mms hydrate defaults from backend MSSQL rows without frontend machine mocks", () => {
  const machine = hydrateMmsMachine({ machineNo: "CNV-A-001", jobRequestActive: true }, 2);

  assert.equal(machine.machineNo, "CNV-A-001");
  assert.equal(machine.plcStatus, "RUN");
  assert.equal(machine.model, "MODEL-C");
});

test("mms random cycle time stays between 1 and 3 seconds", () => {
  const samples = Array.from({ length: 100 }, () => getRandomMmsCycleTime());

  assert.equal(samples.every((value) => Number.isInteger(value) && value >= 1 && value <= 3), true);
});

test("mms alarm payload includes a valid alarm name only when alarm is active", () => {
  const alarmName = getRandomMmsAlarmName();
  assert.equal(mmsAlarmNames.includes(alarmName), true);

  const alarmPayload = buildMmsPayload({ machineNo: "CNV-A-001", plcStatus: "RUN", simMachineAlarm: true, alarmName });
  assert.equal(alarmPayload.effectiveStatus, "ALARM");
  assert.equal(alarmPayload.alarmName, alarmName);

  const runPayload = buildMmsPayload({ machineNo: "CNV-A-001", plcStatus: "RUN", alarmName });
  assert.equal(runPayload.effectiveStatus, "RUN");
  assert.equal(runPayload.alarmName, null);
});

test("overall machine working filters by area type and selected machine checkboxes", () => {
  const rows = [
    { area: "Line A", machineType: "Conveyor", machineNo: "CNV-A-001" },
    { area: "Line A", machineType: "Conveyor", machineNo: "CNV-A-002" },
    { area: "Line A", machineType: "Filling", machineNo: "FIL-A-001" },
    { area: "Line B", machineType: "Conveyor", machineNo: "CNV-B-001" }
  ];

  assert.deepEqual(
    selectOverallMmsMachines(rows, { area: "Line A", machineType: "Conveyor", machineNos: ["CNV-A-002"] }).map((row) => row.machineNo),
    ["CNV-A-002"]
  );
  assert.deepEqual(
    selectOverallMmsMachines(rows, { area: "All", machineType: "Conveyor", machineNos: [] }).map((row) => row.machineNo),
    ["CNV-A-001", "CNV-A-002", "CNV-B-001"]
  );
});

test("mms dashboard keeps only overview for legacy dashboard routes", () => {
  assert.equal(getMmsDashboardViewKey("dashboard"), "overview");
  assert.equal(getMmsDashboardViewKey("machine-area"), "overview");
  assert.equal(getMmsDashboardViewKey("layout-dashboard"), "overview");
  assert.equal(getMmsDashboardViewKey("overall-machine-working"), "overall-machine-working");
});

test("mms layout machine state separates MMS status job status and PIC", () => {
  const state = buildMmsLayoutMachineState({
    area: "Line A",
    machineType: "Conveyor",
    machineNo: "CNV-A-002",
    plcStatus: "RUN",
    activeJobStatus: "WAIT_MM",
    responsible: "Production / PRD-014"
  });

  assert.deepEqual(state, {
    area: "Line A",
    machineNo: "CNV-A-002",
    machineType: "Conveyor",
    mmsStatus: "RUN",
    jobStatus: "WAIT_MM",
    responsible: "Production / PRD-014",
    canProduceOutput: true,
    hasJob: true,
    needsAttention: true
  });
});

test("mms overview filter defaults are stable for localStorage persistence", () => {
  assert.equal(mmsOverviewFilterStorageKey, "mms:overview:filters");
  assert.deepEqual(getDefaultMmsOverviewFilters(), {
    area: "All",
    jobStatus: "All",
    machineNo: "All",
    machineType: "All",
    mmsStatus: "All"
  });
});

test("mms overview machine filter combines area type machine MMS and job status", () => {
  const rows = [
    { area: "Line A", machineType: "Conveyor", machineNo: "CNV-A-001", plcStatus: "RUN" },
    { area: "Line A", machineType: "Conveyor", machineNo: "CNV-A-002", plcStatus: "RUN", activeJobStatus: "WAIT_MM" },
    { area: "Line A", machineType: "Filling", machineNo: "FIL-A-003", plcStatus: "MM_REPAIR", activeJobStatus: "MM_REPAIR" },
    { area: "Line B", machineType: "Labeler", machineNo: "LBL-B-002", plcStatus: "RUN", simMachineAlarm: true }
  ];

  assert.deepEqual(
    selectMmsOverviewMachines(rows, { ...getDefaultMmsOverviewFilters(), area: "Line A", machineType: "Conveyor" }).map((row) => row.machineNo),
    ["CNV-A-001", "CNV-A-002"]
  );
  assert.deepEqual(
    selectMmsOverviewMachines(rows, { ...getDefaultMmsOverviewFilters(), mmsStatus: "ALARM" }).map((row) => row.machineNo),
    ["LBL-B-002"]
  );
  assert.deepEqual(
    selectMmsOverviewMachines(rows, { ...getDefaultMmsOverviewFilters(), jobStatus: "WAIT_MM" }).map((row) => row.machineNo),
    ["CNV-A-002"]
  );
  assert.deepEqual(
    selectMmsOverviewMachines(rows, { ...getDefaultMmsOverviewFilters(), mmsStatus: "STOPPED" }).map((row) => row.machineNo),
    ["FIL-A-003", "LBL-B-002"]
  );
  assert.deepEqual(
    selectMmsOverviewMachines(rows, { ...getDefaultMmsOverviewFilters(), jobStatus: "HAS_JOB" }).map((row) => row.machineNo),
    ["CNV-A-002", "FIL-A-003"]
  );
  assert.deepEqual(
    selectMmsOverviewMachines(rows, { ...getDefaultMmsOverviewFilters(), machineNo: "FIL-A-003" }).map((row) => row.machineNo),
    ["FIL-A-003"]
  );
});

test("mms overview summary gives control room totals", () => {
  const summary = buildMmsOverviewSummary([
    { machineNo: "A", plcStatus: "RUN", output: 100, ng: 2, oee: 90 },
    { machineNo: "B", plcStatus: "RUN", simMachineAlarm: true, output: 80, ng: 8, oee: 70 },
    { machineNo: "C", plcStatus: "MM_REPAIR", activeJobStatus: "MM_REPAIR", output: 50, ng: 0, oee: 60 }
  ]);

  assert.deepEqual(summary, {
    activeJobs: 1,
    alarm: 1,
    availability: 33.3,
    ngRate: 4.35,
    oeeAverage: 73.3,
    outputNg: 10,
    outputOk: 220,
    running: 1,
    stopped: 2,
    total: 3
  });
});

test("mms report filter defaults support graph and table report tabs", () => {
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assert.equal(mmsReportsFilterStorageKey, "mms:reports:filters");
  assert.deepEqual(getDefaultMmsReportFilters("daily"), {
    area: "All",
    date: today,
    graphPeriod: "daily",
    machineNo: "All",
    machineType: "All",
    month: today.slice(0, 7),
    year: today.slice(0, 4)
  });
  assert.equal(getDefaultMmsReportFilters("monthly").graphPeriod, "monthly");
});

test("mms report columns support daily monthly and yearly periods", () => {
  assert.deepEqual(buildMmsReportColumns("daily", { date: "2026-05-13" }).map((column) => column.label), ["07:00", "11:00", "15:00", "19:00", "23:00", "03:00", "07:00"]);
  assert.equal(buildMmsReportColumns("monthly", { month: "2026-05" }).length, 31);
  assert.deepEqual(buildMmsReportColumns("yearly", { year: "2026" }).map((column) => column.label), ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
});

test("mms report machine filter narrows area type and machine number", () => {
  const rows = [
    { area: "Line A", machineType: "ABR", machineNo: "ABR-001" },
    { area: "Line A", machineType: "CNV", machineNo: "CNV-001" },
    { area: "Packing", machineType: "ABR", machineNo: "ABR-900" }
  ];

  assert.deepEqual(
    selectMmsReportMachines(rows, { area: "Line A", machineType: "ABR", machineNo: "All" }).map((row) => row.machineNo),
    ["ABR-001"]
  );
  assert.deepEqual(
    selectMmsReportMachines(rows, { area: "All", machineType: "All", machineNo: "ABR-900" }).map((row) => row.machineNo),
    ["ABR-900"]
  );
});

test("mms report machine filter migrates old className filters to area matching", () => {
  const rows = [
    { area: "Line A", machineType: "CNV", machineNo: "CNV-A-001" },
    { area: "Line B", machineType: "CNV", machineNo: "CNV-B-001" }
  ];

  assert.deepEqual(
    selectMmsReportMachines(rows, { className: "Line A", machineType: "All", machineNo: "All" }).map((row) => row.machineNo),
    ["CNV-A-001"]
  );
});

test("mms report matrix rows include required metric rows and total cells", () => {
  const columns = buildMmsReportColumns("monthly", { month: "2026-05" });
  const rows = buildMmsReportMatrixRows([
    { area: "Line A", machineType: "ABR", machineNo: "ABR-005", modelType: "-", modelName: "-", process: "Line A" }
  ], columns);

  assert.deepEqual(rows.map((row) => row.metric), [
    "OEE",
    "Output (Target)",
    "Machine Output",
    "Output",
    "Availability (Target)",
    "Cycle time (Target)",
    "Cycle time",
    "Over Reject",
    "NG Qty",
    "Availability",
    "Performance",
    "Quality",
    "OEE"
  ]);
  assert.equal(rows.every((row) => Object.hasOwn(row, "total")), true);
  assert.equal(rows[0].isFirstMetric, true);
  assert.equal(rows[0].rowSpan, 13);
  assert.equal(rows.slice(1).every((row) => row.machineNo === "ABR-005" && row.isFirstMetric === false), true);
});

test("mms report matrix rows append machine type total rows when type filter is selected", () => {
  const columns = buildMmsReportColumns("monthly", { month: "2026-05" }).slice(0, 2);
  const rows = buildMmsReportMatrixRows([
    { area: "Packing", machineType: "PKG", machineNo: "PKG-B-001", modelType: "PKG", modelName: "MODEL-A", process: "Packing" },
    { area: "Packing", machineType: "PKG", machineNo: "PKG-B-002", modelType: "PKG", modelName: "MODEL-A", process: "Packing" }
  ], columns, { machineType: "PKG" });
  const totalRows = rows.filter((row) => row.machineNo === "PKG-TOTAL");

  assert.equal(totalRows.length, 13);
  assert.equal(totalRows[0].rowType, "summary");
  assert.equal(totalRows[0].isFirstMetric, true);
  assert.equal(totalRows[0].modelType, "TOTAL");
  assert.equal(totalRows.find((row) => row.metric === "Output (Target)").cells[0], "54,720");
  assert.match(totalRows.find((row) => row.metric === "OEE").cells[0], /%$/);
});

test("mms machine type summary aggregates selected machines for report header", () => {
  const summary = buildMmsMachineTypeSummary([
    { machineNo: "CNV-A-001", output: 120, outputOk: 118, outputNg: 2, oee: 80, plcStatus: "RUN" },
    { machineNo: "CNV-A-002", output: 100, outputOk: 99, outputNg: 1, oee: 90, plcStatus: "MM_REPAIR", activeJobStatus: "MM_REPAIR" }
  ]);

  assert.deepEqual(summary, {
    activeJobs: 1,
    ng: 3,
    oeeAverage: 85,
    ok: 217,
    output: 220,
    running: 1,
    totalMachines: 2
  });
});

test("mms graph report series exposes output CT OEE and NG datasets", () => {
  const series = buildMmsGraphReportSeries("yearly", { year: "2026" });

  assert.equal(series.output.length, 12);
  assert.equal(series.output[0].hasOwnProperty("outputActual"), true);
  assert.equal(series.ctAvailability[0].hasOwnProperty("cycleTimeActual"), true);
  assert.equal(series.oee[0].hasOwnProperty("quality"), true);
  assert.equal(series.ngReject[0].hasOwnProperty("ngQty"), true);
});

test("mms report helpers can render backend MSSQL report series", () => {
  const backendSeries = [
    { availability: 90, ct: 2.5, label: "01", ng: 2, oee: 84.2, output: 100, performance: 92, quality: 98, rejectRate: 2, target: 110 },
    { availability: 88, ct: 2.7, label: "02", ng: 0, oee: 80.1, output: 95, performance: 89, quality: 99, rejectRate: 0, target: 108 }
  ];
  const graph = buildMmsGraphReportSeries("monthly", { month: "2026-05" }, backendSeries);
  const columns = buildMmsReportColumns("monthly", { month: "2026-05" }).slice(0, 2);
  const rows = buildMmsReportMatrixRows([
    { area: "Line A", machineNo: "CNV-A-001", machineType: "Conveyor" }
  ], columns, {
    reportByMachine: {
      "CNV-A-001": { series: backendSeries }
    }
  });

  assert.equal(graph.output[0].outputActual, 100);
  assert.equal(graph.output[1].outputAccum, 195);
  assert.equal(rows.find((row) => row.metric === "Machine Output").cells[0], 100);
  assert.equal(rows.find((row) => row.metric === "NG Qty").cells[0], 2);
});
