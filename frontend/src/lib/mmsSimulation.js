export const mmsBaseControlStatuses = [
  "RUN",
  "WAIT_PART",
  "BRAKE_TIME",
  "PLAN_STOP",
  "WARM_UP",
  "STOP"
];

export const mmsPanelStatuses = [
  "MM_REPAIR",
  "MM_PREVENTIVE",
  "QC",
  "CLEANING"
];

export const mmsMachineStatuses = [...mmsBaseControlStatuses, ...mmsPanelStatuses];

export const mmsSocketEvents = {
  statusChanged: "mms:machine-status-changed",
  outputChanged: "mms:machine-output-changed",
  alarmChanged: "mms:machine-alarm-changed"
};

export const mmsAlarmNames = [
  "Emergency stop",
  "Motor overload",
  "Servo alarm",
  "Air pressure low",
  "Safety door open",
  "Sensor abnormal",
  "Inverter fault",
  "Conveyor jam"
];

const blockedStatuses = new Set(["WAIT_PART", "BRAKE_TIME", "PLAN_STOP", "WARM_UP", "MM_REPAIR", "MM_PREVENTIVE", "QC", "CLEANING", "STOP", "ALARM"]);

export function getRandomMmsCycleTime() {
  return Math.floor(Math.random() * 3) + 1;
}

export function getRandomMmsAlarmName() {
  return mmsAlarmNames[Math.floor(Math.random() * mmsAlarmNames.length)];
}

export function normalizeMmsStatus(status) {
  const normalized = String(status || "RUN").toUpperCase();
  return [...mmsMachineStatuses, "ALARM"].includes(normalized) ? normalized : "RUN";
}

export function getMmsEffectiveStatus({ plcStatus = "RUN", simMachineAlarm = false } = {}) {
  if (simMachineAlarm) {
    return "ALARM";
  }

  return normalizeMmsStatus(plcStatus);
}

export function canMmsMachineProduce({ plcStatus = "RUN", simMachineAlarm = false } = {}) {
  return !blockedStatuses.has(getMmsEffectiveStatus({ plcStatus, simMachineAlarm }));
}

export function buildMmsPayload(machine, now = new Date()) {
  const effectiveStatus = getMmsEffectiveStatus(machine);

  return {
    area: machine.area || "",
    machineType: machine.machineType || "",
    machineNo: machine.machineNo || "",
    machineName: machine.machineName || "",
    plcStatus: normalizeMmsStatus(machine.plcStatus),
    gotScreen: "MES_MENU",
    outputOk: Number(machine.outputOk || 0),
    outputNg: Number(machine.outputNg || 0),
    cycleTime: Number(machine.cycleTime || getRandomMmsCycleTime()),
    model: machine.model || "MODEL-A",
    simMachineAlarm: Boolean(machine.simMachineAlarm),
    alarmName: machine.simMachineAlarm ? machine.alarmName || getRandomMmsAlarmName() : null,
    jobRequestActive: Boolean(machine.jobRequestActive),
    activeJobNo: machine.activeJobNo || null,
    activeJobStatus: machine.activeJobStatus || null,
    eventStatus: machine.jobRequestActive ? machine.activeJobStatus || "JOB_REQUEST_ACTIVE" : "NONE",
    effectiveStatus,
    canProduceOutput: canMmsMachineProduce(machine),
    timestampUtc: now.toISOString()
  };
}

export function hydrateMmsMachine(machine, index = 0) {
  return {
    ...machine,
    plcStatus: normalizeMmsStatus(machine.plcStatus || "RUN"),
    outputOk: Number(machine.outputOk || index * 12),
    outputNg: Number(machine.outputNg || 0),
    cycleTime: Number(machine.cycleTime || getRandomMmsCycleTime()),
    model: machine.model || `MODEL-${String.fromCharCode(65 + (index % 4))}`,
    simMachineAlarm: Boolean(machine.simMachineAlarm),
    alarmName: machine.alarmName || "",
    lastCycleAt: Date.now()
  };
}

export function summarizeMmsAreas(machines = []) {
  return Object.values(machines.reduce((groups, machine) => {
    const area = machine.area || "Unassigned";
    const current = groups[area] || { area, total: 0, running: 0, alarm: 0, jobActive: 0, stopped: 0 };
    const effectiveStatus = getMmsEffectiveStatus(machine);

    current.total += 1;
    if (effectiveStatus === "RUN") current.running += 1;
    if (effectiveStatus === "ALARM") current.alarm += 1;
    if (machine.jobRequestActive) current.jobActive += 1;
    if (!canMmsMachineProduce(machine)) current.stopped += 1;

    groups[area] = current;
    return groups;
  }, {}));
}

export function groupMmsMachinesByZone(machines = []) {
  return Object.values(machines.reduce((zones, machine) => {
    const area = machine.area || "Unassigned";
    const machineType = machine.machineType || "Unassigned Type";
    const zone = zones[area] || {
      area,
      machineCount: 0,
      running: 0,
      alarm: 0,
      jobActive: 0,
      stopped: 0,
      machineTypes: {}
    };
    const typeGroup = zone.machineTypes[machineType] || {
      machineType,
      machines: []
    };
    const effectiveStatus = getMmsEffectiveStatus(machine);

    zone.machineCount += 1;
    if (effectiveStatus === "RUN") zone.running += 1;
    if (effectiveStatus === "ALARM") zone.alarm += 1;
    if (machine.jobRequestActive) zone.jobActive += 1;
    if (!canMmsMachineProduce(machine)) zone.stopped += 1;

    typeGroup.machines.push(machine);
    zone.machineTypes[machineType] = typeGroup;
    zones[area] = zone;
    return zones;
  }, {})).map((zone, index) => ({
    ...zone,
    zoneNo: `Zone ${String(index + 1).padStart(2, "0")}`,
    machineTypes: Object.values(zone.machineTypes)
  }));
}

export function selectOverallMmsMachines(machines = [], filters = {}) {
  const selectedMachineNos = Array.isArray(filters.machineNos) ? filters.machineNos : [];

  return machines.filter((machine) => {
    const areaMatched = !filters.area || filters.area === "All" || machine.area === filters.area;
    const typeMatched = !filters.machineType || filters.machineType === "All" || machine.machineType === filters.machineType;
    const machineMatched = selectedMachineNos.length === 0 || selectedMachineNos.includes(machine.machineNo || machine.name);
    return areaMatched && typeMatched && machineMatched;
  });
}
