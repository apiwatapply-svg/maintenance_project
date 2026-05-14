const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildMmsMachinePayload,
  canProduceOutput,
  getEffectiveStatus,
  getRandomAlarmName,
  getRandomCycleTime,
  mmsAlarmNames,
  mmsMachineStatuses,
  mmsSocketEvents,
  mmsWorkingDay,
  mmsWorkingShifts,
  normalizeMachineStatus
} = require("../src/config/mmsSimulationConfig");
const { mapMachine } = require("../src/repositories/mmsRepository");

test("mms simulation statuses include production and stop states", () => {
  assert.deepEqual(mmsMachineStatuses, [
    "RUN",
    "WAIT_PART",
    "BRAKE_TIME",
    "PLAN_STOP",
    "WARM_UP",
    "MM_REPAIR",
    "MM_PREVENTIVE",
    "QC",
    "CLEANING",
    "ALARM",
    "STOP"
  ]);
});

test("mms simulation output follows GOT status and does not stop only because of job request", () => {
  assert.equal(canProduceOutput({ status: "RUN" }), true);
  assert.equal(canProduceOutput({ status: "RUN", simMachineAlarm: true }), false);
  assert.equal(canProduceOutput({ status: "RUN", jobRequestActive: true }), true);
  assert.equal(canProduceOutput({ status: "WAIT_PART" }), false);
  assert.equal(canProduceOutput({ status: "MM_REPAIR" }), false);
  assert.equal(canProduceOutput({ status: "QC" }), false);
});

test("mms simulation effective status prioritizes alarm and otherwise follows GOT status", () => {
  assert.equal(getEffectiveStatus({ status: "RUN", simMachineAlarm: true, jobRequestActive: true }), "ALARM");
  assert.equal(getEffectiveStatus({ status: "RUN", jobRequestActive: true }), "RUN");
  assert.equal(normalizeMachineStatus("bad-status"), "RUN");
});

test("mms machine payload uses UTC timestamp and output gate", () => {
  const payload = buildMmsMachinePayload(
    { area: "Line A", machineType: "Conveyor", machineNo: "CNV-A-001", machineName: "Main Conveyor" },
    { outputOk: 10, outputNg: 1, cycleTime: 4.2, model: "MODEL-A", plcStatus: "RUN" },
    new Date("2026-05-13T10:00:00.000Z")
  );

  assert.equal(payload.machineNo, "CNV-A-001");
  assert.equal(payload.canProduceOutput, true);
  assert.equal(payload.timestampUtc, "2026-05-13T10:00:00.000Z");
});

test("mms socket events define status output and alarm channels", () => {
  assert.deepEqual(Object.values(mmsSocketEvents), [
    "mms:machine-status-changed",
    "mms:machine-output-changed",
    "mms:machine-alarm-changed"
  ]);
});

test("mms working day follows local 07:00 to 07:00 with three shifts", () => {
  assert.deepEqual(mmsWorkingDay, { startLocal: "07:00", endLocal: "07:00", hours: 24 });
  assert.deepEqual(mmsWorkingShifts, [
    { code: "A", startLocal: "07:00", endLocal: "15:00" },
    { code: "B", startLocal: "15:00", endLocal: "23:00" },
    { code: "C", startLocal: "23:00", endLocal: "07:00" }
  ]);
});

test("mms repository maps active job requests into machine simulation state", () => {
  const machine = mapMachine({
    id: 1,
    machine_no: "CNV-A-001",
    machine_name: "Main Conveyor",
    machine_type_code: "CNV",
    machine_type_name: "Conveyor",
    area_code: "LINE-A",
    area_name: "Line A",
    status: "active",
    active_job_no: "JOB-20260513-001",
    active_job_status: "MM_REPAIR"
  });

  assert.equal(machine.jobRequestActive, true);
  assert.equal(machine.plcStatus, "RUN");
  assert.equal(machine.eventStatus, "MM_REPAIR");
  assert.equal(machine.activeJobNo, "JOB-20260513-001");
});

test("mms default random cycle time stays between 1 and 3 seconds", () => {
  const samples = Array.from({ length: 100 }, () => getRandomCycleTime());

  assert.equal(samples.every((value) => Number.isInteger(value) && value >= 1 && value <= 3), true);
});

test("mms alarm payload carries alarm name only for active alarm", () => {
  const alarmName = getRandomAlarmName();
  assert.equal(mmsAlarmNames.includes(alarmName), true);

  const alarmPayload = buildMmsMachinePayload(
    { machineNo: "CNV-A-001" },
    { plcStatus: "RUN", simMachineAlarm: true, alarmName },
    new Date("2026-05-13T10:00:00.000Z")
  );
  assert.equal(alarmPayload.effectiveStatus, "ALARM");
  assert.equal(alarmPayload.alarmName, alarmName);

  const runPayload = buildMmsMachinePayload(
    { machineNo: "CNV-A-001" },
    { plcStatus: "RUN", alarmName },
    new Date("2026-05-13T10:00:00.000Z")
  );
  assert.equal(runPayload.effectiveStatus, "RUN");
  assert.equal(runPayload.alarmName, null);
});
