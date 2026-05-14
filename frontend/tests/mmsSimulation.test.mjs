import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMmsPayload,
  canMmsMachineProduce,
  getMmsEffectiveStatus,
  getRandomMmsAlarmName,
  getRandomMmsCycleTime,
  groupMmsMachinesByZone,
  hydrateMmsMachine,
  selectOverallMmsMachines,
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
