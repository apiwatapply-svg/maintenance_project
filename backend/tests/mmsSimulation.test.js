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
const { getCurrentMmsWorkDate, getMmsHourSort, getMmsWorkSlot, mapMachine, mapMmsRealtimePayloadToHourlyRow } = require("../src/repositories/mmsRepository");
const { createMmsHourlyBuffer, flushClosedMmsHourlyBuffers, getMmsHourlyBufferKey, mmsSnapshotRequestEvent, queueMmsHourlyPayload } = require("../src/socket");

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
  assert.equal(mmsSnapshotRequestEvent, "mms:snapshot-request");
});

test("mms working day follows local 07:00 to 07:00 with three shifts", () => {
  assert.deepEqual(mmsWorkingDay, { startLocal: "07:00", endLocal: "07:00", hours: 24 });
  assert.deepEqual(mmsWorkingShifts, [
    { code: "A", startLocal: "07:00", endLocal: "15:00" },
    { code: "B", startLocal: "15:00", endLocal: "23:00" },
    { code: "C", startLocal: "23:00", endLocal: "07:00" }
  ]);
});

test("mms repository maps realtime socket payload into current local working slot", () => {
  const slot = getMmsWorkSlot(new Date("2026-05-15T18:30:00.000Z"));
  const row = mapMmsRealtimePayloadToHourlyRow({
    cycleTime: 4,
    machineNo: "CNV-A-001",
    outputNg: 2,
    outputOk: 120,
    plcStatus: "RUN"
  }, slot);

  assert.deepEqual(slot, { hourLabel: "01:00", shiftCode: "C", workDate: "2026-05-15" });
  assert.equal(row.machine_no, "CNV-A-001");
  assert.equal(row.output_ok, 120);
  assert.equal(row.target_output, 900);
  assert.equal(row.status, "RUN");
  assert.equal(row.work_date, "2026-05-15");
});

test("mms socket buffers live telemetry and flushes the closed hour to MSSQL writer", async () => {
  const buffer = createMmsHourlyBuffer();
  const flushed = [];
  const flushFn = async (payload, _now, slot) => {
    flushed.push({ payload, slot });
    return { payload, slot };
  };

  await queueMmsHourlyPayload(
    { machineNo: "PNL-A-001", outputOk: 10, outputNg: 1, plcStatus: "RUN" },
    new Date("2026-05-16T00:30:00.000Z"),
    { buffer, flushFn }
  );
  await queueMmsHourlyPayload(
    { machineNo: "PNL-A-001", outputOk: 15, outputNg: 2, plcStatus: "RUN", model: "MODEL-D" },
    new Date("2026-05-16T00:45:00.000Z"),
    { buffer, flushFn }
  );

  assert.equal(flushed.length, 0);
  assert.equal(buffer.size, 1);

  await queueMmsHourlyPayload(
    { machineNo: "PNL-A-001", outputOk: 20, outputNg: 3, plcStatus: "RUN" },
    new Date("2026-05-16T01:00:00.000Z"),
    { buffer, flushFn }
  );

  assert.equal(flushed.length, 1);
  assert.deepEqual(flushed[0].slot, { hourLabel: "07:00", shiftCode: "A", workDate: "2026-05-16" });
  assert.equal(flushed[0].payload.outputOk, 15);
  assert.equal(flushed[0].payload.outputNg, 2);
  assert.equal(flushed[0].payload.model, "MODEL-D");
  assert.equal(buffer.size, 1);
});

test("mms socket periodic flush writes only closed hourly buffers", async () => {
  const buffer = createMmsHourlyBuffer();
  const flushed = [];
  const flushFn = async (payload, _now, slot) => {
    flushed.push({ payload, slot });
    return { payload, slot };
  };
  const activeSlot = getMmsWorkSlot(new Date("2026-05-16T01:05:00.000Z"));
  const closedSlot = getMmsWorkSlot(new Date("2026-05-16T00:55:00.000Z"));

  buffer.set(getMmsHourlyBufferKey("PNL-A-001", closedSlot), {
    machineNo: "PNL-A-001",
    payload: { machineNo: "PNL-A-001", outputOk: 50 },
    slot: closedSlot,
    updatedAt: new Date("2026-05-16T00:55:00.000Z")
  });
  buffer.set(getMmsHourlyBufferKey("PNL-A-002", activeSlot), {
    machineNo: "PNL-A-002",
    payload: { machineNo: "PNL-A-002", outputOk: 80 },
    slot: activeSlot,
    updatedAt: new Date("2026-05-16T01:05:00.000Z")
  });

  await flushClosedMmsHourlyBuffers(new Date("2026-05-16T01:05:00.000Z"), { buffer, flushFn });

  assert.equal(flushed.length, 1);
  assert.equal(flushed[0].payload.machineNo, "PNL-A-001");
  assert.equal(buffer.size, 1);
  assert.equal(buffer.values().next().value.machineNo, "PNL-A-002");
});

test("mms simulation list uses the 07:00 working day before local morning rollover", () => {
  assert.equal(getCurrentMmsWorkDate(new Date("2026-05-15T22:30:00.000Z")), "2026-05-15");
  assert.equal(getCurrentMmsWorkDate(new Date("2026-05-16T00:30:00.000Z")), "2026-05-16");
  assert.equal(getMmsHourSort("07:00"), 1);
  assert.equal(getMmsHourSort("05:00"), 23);
  assert.equal(getMmsHourSort("06:00"), 24);
});

test("mms repository treats realtime alarm payload as blocked output status", () => {
  const row = mapMmsRealtimePayloadToHourlyRow({
    cycleTime: 5,
    machineNo: "CNV-A-002",
    outputOk: 10,
    simMachineAlarm: true
  }, { hourLabel: "09:00", shiftCode: "A", workDate: "2026-05-16" });

  assert.equal(row.status, "ALARM");
  assert.equal(row.run_seconds, 0);
  assert.equal(row.stop_seconds, 3600);
  assert.equal(row.alarm_seconds, 3600);
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
