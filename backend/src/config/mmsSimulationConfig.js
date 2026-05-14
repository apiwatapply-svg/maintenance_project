const mmsMachineStatuses = [
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
];

const mmsSocketEvents = {
  statusChanged: "mms:machine-status-changed",
  outputChanged: "mms:machine-output-changed",
  alarmChanged: "mms:machine-alarm-changed"
};

const mmsWorkingShifts = [
  { code: "A", startLocal: "07:00", endLocal: "15:00" },
  { code: "B", startLocal: "15:00", endLocal: "23:00" },
  { code: "C", startLocal: "23:00", endLocal: "07:00" }
];

const mmsWorkingDay = {
  startLocal: "07:00",
  endLocal: "07:00",
  hours: 24
};

const outputBlockedStatuses = new Set([
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

const mmsAlarmNames = [
  "Emergency stop",
  "Motor overload",
  "Servo alarm",
  "Air pressure low",
  "Safety door open",
  "Sensor abnormal",
  "Inverter fault",
  "Conveyor jam"
];

function normalizeMachineStatus(status) {
  const normalized = String(status || "RUN").toUpperCase();
  return mmsMachineStatuses.includes(normalized) ? normalized : "RUN";
}

function canProduceOutput({ status = "RUN", simMachineAlarm = false } = {}) {
  if (simMachineAlarm) {
    return false;
  }

  return !outputBlockedStatuses.has(normalizeMachineStatus(status));
}

function getEffectiveStatus({ status = "RUN", simMachineAlarm = false } = {}) {
  if (simMachineAlarm) {
    return "ALARM";
  }

  return normalizeMachineStatus(status);
}

function getRandomCycleTime() {
  return Math.floor(Math.random() * 3) + 1;
}

function getRandomAlarmName() {
  return mmsAlarmNames[Math.floor(Math.random() * mmsAlarmNames.length)];
}

function buildMmsMachinePayload(machine, overrides = {}, now = new Date()) {
  const simMachineAlarm = Boolean(overrides.simMachineAlarm ?? machine?.simMachineAlarm);
  const jobRequestActive = Boolean(overrides.jobRequestActive ?? machine?.jobRequestActive);
  const plcStatus = normalizeMachineStatus(overrides.plcStatus || machine?.plcStatus || "RUN");
  const effectiveStatus = getEffectiveStatus({ status: plcStatus, simMachineAlarm });

  return {
    area: machine?.area || "",
    machineType: machine?.machineType || "",
    machineNo: machine?.machineNo || "",
    machineName: machine?.machineName || "",
    plcStatus,
    gotScreen: overrides.gotScreen || "MES_MENU",
    outputOk: Number(overrides.outputOk || 0),
    outputNg: Number(overrides.outputNg || 0),
    cycleTime: Number(overrides.cycleTime || machine?.cycleTime || getRandomCycleTime()),
    model: overrides.model || machine?.model || "MODEL-A",
    simMachineAlarm,
    alarmName: simMachineAlarm ? (overrides.alarmName || machine?.alarmName || getRandomAlarmName()) : null,
    jobRequestActive,
    activeJobNo: overrides.activeJobNo ?? machine?.activeJobNo ?? null,
    activeJobStatus: overrides.activeJobStatus ?? machine?.activeJobStatus ?? null,
    eventStatus: jobRequestActive ? (overrides.activeJobStatus ?? machine?.activeJobStatus ?? "JOB_REQUEST_ACTIVE") : "NONE",
    effectiveStatus,
    canProduceOutput: canProduceOutput({ status: plcStatus, simMachineAlarm }),
    timestampUtc: now.toISOString()
  };
}

module.exports = {
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
};
