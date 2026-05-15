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

export const mmsDashboardOverviewViews = ["dashboard", "machine-area", "layout-dashboard", "overview"];

export const mmsOverviewFilterStorageKey = "mms:overview:filters";

export const mmsReportsFilterStorageKey = "mms:reports:filters";

export const mmsReportMetricNames = [
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

export function getDefaultMmsOverviewFilters() {
  return {
    area: "All",
    jobStatus: "All",
    machineNo: "All",
    machineType: "All",
    mmsStatus: "All"
  };
}

export function getMmsJobStatus(machine = {}) {
  return machine.activeJobStatus || machine.jobStatus || (machine.jobRequestActive ? "JOB_ACTIVE" : "NONE");
}

export function selectMmsOverviewMachines(machines = [], filters = getDefaultMmsOverviewFilters()) {
  return machines.filter((machine) => {
    const mmsStatus = getMmsEffectiveStatus(machine);
    const jobStatus = getMmsJobStatus(machine);
    const areaMatched = !filters.area || filters.area === "All" || machine.area === filters.area;
    const typeMatched = !filters.machineType || filters.machineType === "All" || machine.machineType === filters.machineType || machine.type === filters.machineType;
    const machineMatched = !filters.machineNo || filters.machineNo === "All" || machine.machineNo === filters.machineNo || machine.name === filters.machineNo;
    const mmsMatched = !filters.mmsStatus || filters.mmsStatus === "All"
      || (filters.mmsStatus === "STOPPED" ? !canMmsMachineProduce(machine) : mmsStatus === filters.mmsStatus);
    const jobMatched = !filters.jobStatus || filters.jobStatus === "All"
      || (filters.jobStatus === "HAS_JOB" ? jobStatus !== "NONE" : jobStatus === filters.jobStatus);

    return areaMatched && typeMatched && machineMatched && mmsMatched && jobMatched;
  });
}

export function buildMmsOverviewSummary(machines = []) {
  const totals = machines.reduce((summary, machine) => {
    const status = getMmsEffectiveStatus(machine);
    const output = Number(machine.outputOk ?? machine.output ?? 0);
    const ng = Number(machine.outputNg ?? machine.ng ?? 0);
    const oee = Number(machine.oee ?? 0);

    summary.total += 1;
    summary.outputOk += Math.max(0, output - (machine.outputOk === undefined ? ng : 0));
    summary.outputNg += ng;
    summary.oeeTotal += Number.isFinite(oee) ? oee : 0;
    if (status === "RUN") summary.running += 1;
    if (status === "ALARM") summary.alarm += 1;
    if (!canMmsMachineProduce(machine)) summary.stopped += 1;
    if (getMmsJobStatus(machine) !== "NONE") summary.activeJobs += 1;
    return summary;
  }, {
    activeJobs: 0,
    alarm: 0,
    oeeTotal: 0,
    outputNg: 0,
    outputOk: 0,
    running: 0,
    stopped: 0,
    total: 0
  });

  const oeeAverage = totals.total ? Number((totals.oeeTotal / totals.total).toFixed(1)) : 0;
  const availability = totals.total ? Number(((totals.running / totals.total) * 100).toFixed(1)) : 0;
  const ngRate = totals.outputOk + totals.outputNg
    ? Number(((totals.outputNg / (totals.outputOk + totals.outputNg)) * 100).toFixed(2))
    : 0;

  return {
    activeJobs: totals.activeJobs,
    alarm: totals.alarm,
    availability,
    ngRate,
    oeeAverage,
    outputNg: totals.outputNg,
    outputOk: totals.outputOk,
    running: totals.running,
    stopped: totals.stopped,
    total: totals.total
  };
}

export function getDefaultMmsReportFilters(defaultPeriod = "monthly") {
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);

  return {
    area: "All",
    date: today,
    graphPeriod: defaultPeriod,
    machineNo: "All",
    machineType: "All",
    month,
    year
  };
}

export function selectMmsReportMachines(machines = [], filters = {}) {
  const selectedArea = filters.area ?? filters.className;

  return machines.filter((machine) => {
    const machineArea = machine.area || machine.areaName || machine.className;
    const areaMatched = !selectedArea || selectedArea === "All" || machineArea === selectedArea;
    const typeMatched = !filters.machineType || filters.machineType === "All" || machine.machineType === filters.machineType || machine.type === filters.machineType;
    const machineMatched = !filters.machineNo || filters.machineNo === "All" || machine.machineNo === filters.machineNo || machine.name === filters.machineNo;

    return areaMatched && typeMatched && machineMatched;
  });
}

export function buildMmsReportColumns(period = "monthly", filters = {}) {
  if (period === "daily") {
    return ["07:00", "11:00", "15:00", "19:00", "23:00", "03:00", "07:00"].map((label, index) => ({
      key: `h${index}`,
      label
    }));
  }

  if (period === "yearly") {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label, index) => ({
      key: `m${index + 1}`,
      label
    }));
  }

  const [year, month] = String(filters.month || "2026-05").split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" });

  return Array.from({ length: days }, (_item, index) => ({
    key: `d${index + 1}`,
    label: `${index + 1}-${monthLabel}`
  }));
}

function getMetricValue(metric, columnIndex, machineIndex = 0) {
  const noDataCutoff = 15;
  if (columnIndex >= noDataCutoff) return "-";
  const seed = columnIndex + 1 + machineIndex;
  const values = {
    "OEE": `${Math.max(0, 72 + ((seed * 3) % 18)).toFixed(2)}%`,
    "Output (Target)": 27360,
    "Machine Output": seed % 3 === 0 ? 0 : 4200 + seed * 820,
    "Output": seed % 4 === 0 ? 0 : 3800 + seed * 760,
    "Availability (Target)": "95.00%",
    "Cycle time (Target)": 3,
    "Cycle time": (2.5 + (seed % 6) * 0.1).toFixed(3),
    "Over Reject": seed % 5 === 0 ? 210 : 0,
    "NG Qty": seed % 4 === 0 ? 34 : "-",
    "Availability": `${Math.min(100, 76 + (seed % 20)).toFixed(2)}%`,
    "Performance": `${Math.min(100, 70 + ((seed * 2) % 25)).toFixed(2)}%`,
    "Quality": `${Math.min(100, 90 + (seed % 10)).toFixed(2)}%`
  };

  return values[metric] ?? "-";
}

function normalizeReportLabel(label = "") {
  const text = String(label);
  const day = text.match(/^\d+/)?.[0];
  return day ? day.padStart(2, "0") : text;
}

function findReportPoint(report, column = {}) {
  const series = report?.series || [];
  const label = String(column.label || "");
  const normalizedLabel = normalizeReportLabel(label);

  return series.find((row) => String(row.label) === label || String(row.label) === normalizedLabel) || null;
}

function getBackendMetricValue(metric, column, report) {
  const point = findReportPoint(report, column);
  if (!point) return null;

  const output = Number(point.output || 0);
  const target = Number(point.target || 0);
  const ng = Number(point.ng || 0);
  const ct = Number(point.ct || 0);
  const rejectRate = Number(point.rejectRate || 0);
  const values = {
    "OEE": `${Number(point.oee || 0).toFixed(2)}%`,
    "Output (Target)": target,
    "Machine Output": output,
    "Output": Math.max(0, output - ng),
    "Availability (Target)": "90.00%",
    "Cycle time (Target)": 3,
    "Cycle time": ct.toFixed(3),
    "Over Reject": rejectRate > 1 ? ng : 0,
    "NG Qty": ng || "-",
    "Availability": `${Number(point.availability || 0).toFixed(2)}%`,
    "Performance": `${Number(point.performance || 0).toFixed(2)}%`,
    "Quality": `${Number(point.quality || 0).toFixed(2)}%`
  };

  return values[metric] ?? null;
}

function getMetricNumber(value) {
  const number = Number(String(value).replace("%", "").replaceAll(",", ""));
  return Number.isFinite(number) ? number : null;
}

function isSummedReportMetric(metric) {
  return metric.includes("Output") || metric.includes("Reject") || metric.includes("Qty");
}

function isPercentReportMetric(metric) {
  return metric.includes("Availability") || metric.includes("Performance") || metric.includes("Quality") || metric === "OEE";
}

function formatReportMetricValue(metric, numbers = []) {
  if (numbers.length === 0) return "-";
  if (isSummedReportMetric(metric)) {
    return numbers.reduce((sum, value) => sum + value, 0).toLocaleString();
  }

  const average = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  return `${average.toFixed(metric.includes("Cycle") ? 3 : 2)}${isPercentReportMetric(metric) ? "%" : ""}`;
}

function calculateReportTotal(metric, cells = []) {
  const numericCells = cells.map(getMetricNumber).filter((value) => value !== null);
  return formatReportMetricValue(metric, numericCells);
}

function buildReportMetricRowsForMachine(machine, machineIndex, columns, report = null) {
  return mmsReportMetricNames.map((metric, metricIndex) => {
    const cells = columns.map((column, columnIndex) => getBackendMetricValue(metric, column, report) ?? getMetricValue(metric, columnIndex, machineIndex));

    return {
      cells,
      area: machine.area || machine.areaName || machine.className || "-",
      isFirstMetric: metricIndex === 0,
      machineNo: machine.machineNo || machine.name || "-",
      metric,
      modelName: machine.modelName || machine.model || "-",
      modelType: machine.modelType || "-",
      process: machine.process || machine.area || machine.areaName || machine.className || "-",
      rowSpan: mmsReportMetricNames.length,
      rowType: machine.machineNo?.endsWith("ALL") ? "summary" : "machine",
      total: calculateReportTotal(metric, cells)
    };
  });
}

function buildMachineTypeTotalRows(machineRowsByMachine = [], columns = [], options = {}) {
  if (!options.machineType || options.machineType === "All" || machineRowsByMachine.length === 0) return [];

  const firstMachine = machineRowsByMachine[0]?.[0] || {};
  return mmsReportMetricNames.map((metric, metricIndex) => {
    const cells = columns.map((_column, columnIndex) => {
      const values = machineRowsByMachine
        .map((rows) => getMetricNumber(rows[metricIndex]?.cells?.[columnIndex]))
        .filter((value) => value !== null);
      return formatReportMetricValue(metric, values);
    });

    return {
      cells,
      area: firstMachine.area || firstMachine.className || "-",
      isFirstMetric: metricIndex === 0,
      machineNo: `${options.machineType}-TOTAL`,
      metric,
      modelName: "TYPE TOTAL",
      modelType: "TOTAL",
      process: firstMachine.process || firstMachine.area || firstMachine.className || "-",
      rowSpan: mmsReportMetricNames.length,
      rowType: "summary",
      total: calculateReportTotal(metric, cells)
    };
  });
}

export function buildMmsReportMatrixRows(machines = [], columns = [], options = {}) {
  const machineRowsByMachine = machines.map((machine, machineIndex) => {
    const machineNo = machine.machineNo || machine.name;
    return buildReportMetricRowsForMachine(machine, machineIndex, columns, options.reportByMachine?.[machineNo]);
  });
  const machineRows = machineRowsByMachine.flat();
  return [
    ...machineRows,
    ...buildMachineTypeTotalRows(machineRowsByMachine, columns, options)
  ];
}

export function buildMmsMachineTypeSummary(machines = []) {
  const totalMachines = machines.length;
  const output = machines.reduce((sum, machine) => sum + Number(machine.output || 0), 0);
  const ok = machines.reduce((sum, machine) => sum + Number(machine.outputOk ?? machine.output ?? 0), 0);
  const ng = machines.reduce((sum, machine) => sum + Number(machine.outputNg ?? machine.ng ?? 0), 0);
  const oeeValues = machines.map((machine) => Number(machine.oee)).filter((value) => Number.isFinite(value));
  const oeeAverage = oeeValues.length > 0 ? oeeValues.reduce((sum, value) => sum + value, 0) / oeeValues.length : 0;
  const activeJobs = machines.filter((machine) => machine.jobRequestActive || machine.activeJobStatus).length;
  const running = machines.filter((machine) => getMmsEffectiveStatus(machine) === "RUN").length;

  return {
    activeJobs,
    ng,
    oeeAverage,
    ok,
    output,
    running,
    totalMachines
  };
}

function buildBackendGraphReportSeries(series = []) {
  let outputAccum = 0;
  let targetAccum = 0;
  const output = series.map((row) => {
    const outputActual = Number(row.output || 0);
    const outputTarget = Number(row.target || 0);
    outputAccum += outputActual;
    targetAccum += outputTarget;
    return {
      label: row.label,
      outputAccum,
      outputActual,
      outputTarget,
      outputTargetAccum: targetAccum
    };
  });
  const ctAvailability = series.map((row) => ({
    availabilityActual: Number(row.availability || 0),
    availabilityTarget: 90,
    cycleTimeActual: Number(row.ct || 0),
    cycleTimeTarget: 3,
    label: row.label
  }));
  const oee = series.map((row) => ({
    availability: Number(row.availability || 0),
    label: row.label,
    oee: Number(row.oee || 0),
    performance: Number(row.performance || 0),
    quality: Number(row.quality || 0)
  }));
  const ngReject = series.map((row) => ({
    label: row.label,
    ngQty: Number(row.ng || 0),
    overReject: Number(row.rejectRate || 0) > 1 ? Number(row.ng || 0) : 0
  }));

  return {
    ctAvailability,
    ngReject,
    oee,
    output
  };
}

export function buildMmsGraphReportSeries(period = "monthly", filters = {}, backendSeries = null) {
  if (Array.isArray(backendSeries) && backendSeries.length > 0) {
    return buildBackendGraphReportSeries(backendSeries);
  }

  const columns = buildMmsReportColumns(period, filters);
  let accum = 0;
  let targetAccum = 0;
  const output = columns.map((column, index) => {
    const outputActual = 820 + (index % 6) * 55 + index * 9;
    const outputTarget = 900 + index * 12;
    accum += outputActual;
    targetAccum += outputTarget;
    return {
      label: column.label,
      outputAccum: accum,
      outputActual,
      outputTarget,
      outputTargetAccum: targetAccum
    };
  });
  const ctAvailability = columns.map((column, index) => ({
    availabilityActual: 88 + (index % 6),
    availabilityTarget: 95,
    cycleTimeActual: 2.1 + (index % 5) * 0.12,
    cycleTimeTarget: 3,
    label: column.label
  }));
  const oee = columns.map((column, index) => ({
    availability: 88 + (index % 8),
    label: column.label,
    oee: 78 + (index % 12),
    performance: 82 + (index % 10),
    quality: 94 + (index % 6)
  }));
  const ngReject = columns.map((column, index) => ({
    label: column.label,
    ngQty: index % 4 === 0 ? 12 + index : 4 + (index % 5),
    overReject: index % 6 === 0 ? 8 + index : 0
  }));

  return {
    ctAvailability,
    ngReject,
    oee,
    output
  };
}

export function getMmsDashboardViewKey(view = "overview") {
  return mmsDashboardOverviewViews.includes(view) ? "overview" : view;
}

export function buildMmsLayoutMachineState(machine = {}) {
  const mmsStatus = getMmsEffectiveStatus(machine);
  const jobStatus = getMmsJobStatus(machine);
  const responsible = machine.responsible || machine.pic || machine.owner || "-";

  return {
    machineNo: machine.machineNo || machine.name || "-",
    machineType: machine.machineType || machine.type || "-",
    area: machine.area || "-",
    mmsStatus,
    jobStatus,
    responsible,
    canProduceOutput: canMmsMachineProduce(machine),
    hasJob: jobStatus !== "NONE",
    needsAttention: mmsStatus !== "RUN" || jobStatus !== "NONE"
  };
}
