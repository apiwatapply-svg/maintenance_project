"use client";

import Link from "next/link";
import { cloneElement, useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  buildMmsGraphReportSeries,
  buildMmsLayoutMachineState,
  buildMmsMachineTypeSummary,
  buildMmsOverviewSummary,
  buildMmsReportColumns,
  buildMmsReportMatrixRows,
  getDefaultMmsOverviewFilters,
  getDefaultMmsReportFilters,
  getMmsDashboardViewKey,
  mmsMachineStatuses,
  mmsOverviewFilterStorageKey,
  mmsReportsFilterStorageKey,
  selectMmsOverviewMachines,
  selectMmsReportMachines,
  selectOverallMmsMachines
} from "@/lib/mmsSimulation";
import api from "@/lib/api";

const navGroups = [
  {
    title: "Overview",
    items: [
      { href: "/mms-dashboard", key: "overview", icon: "OV", label: "Overview" }
    ]
  },
  {
    title: "Working",
    items: [
      { href: "/mms-dashboard/overall-machine-working", key: "overall-machine-working", icon: "OW", label: "Overall Working" },
      { href: "/mms-dashboard/machine-working", key: "machine-working", icon: "MW", label: "Machine Working" }
    ]
  },
  {
    title: "Reports",
    items: [
      { href: "/mms-dashboard/graph-report", key: "graph-report", icon: "GR", label: "Graph Report" },
      { href: "/mms-dashboard/table-report", key: "table-report", icon: "TR", label: "Table Report" }
    ]
  },
  {
    title: "Simulation",
    items: [
      { href: "/mms-dashboard/mms-simulation", key: "mms-simulation", icon: "SM", label: "MMS Simulation", target: "_blank" }
    ]
  }
];

const statusColors = {
  ALARM: "#b91c1c",
  BRAKE: "#c2410c",
  BRAKE_TIME: "#c2410c",
  CLEANING: "#64748b",
  JOB: "#6d5bd0",
  JOB_REQUEST_ACTIVE: "#6d5bd0",
  MM_PREVENTIVE: "#2f8c99",
  MM_REPAIR: "#6d5bd0",
  PLAN: "#9f1239",
  PLAN_STOP: "#9f1239",
  QC: "#b7791f",
  RUN: "#2f9e7e",
  STOP: "#475569",
  WAIT: "#c58a20",
  WAIT_PART: "#c58a20",
  WARM_UP: "#b8a32b"
};

const mmsStatusLegend = [
  { label: "RUN", status: "RUN" },
  { label: "WAIT PART", status: "WAIT_PART" },
  { label: "WARM UP", status: "WARM_UP" },
  { label: "MM REPAIR", status: "MM_REPAIR" },
  { label: "MM PM", status: "MM_PREVENTIVE" },
  { label: "QC", status: "QC" },
  { label: "BRAKE", status: "BRAKE_TIME" },
  { label: "PLAN STOP", status: "PLAN_STOP" },
  { label: "ALARM", status: "ALARM" },
  { label: "CLEANING", status: "CLEANING" },
  { label: "STOP", status: "STOP" }
];

const areas = [
  { area: "Line A", run: 24, alarm: 1, stop: 2, output: 18420, oee: 86 },
  { area: "Line B", run: 28, alarm: 0, stop: 2, output: 21980, oee: 91 },
  { area: "Packing", run: 18, alarm: 1, stop: 1, output: 14760, oee: 82 },
  { area: "Utility", run: 19, alarm: 0, stop: 1, output: 9920, oee: 88 }
];

const machineTypeByPrefix = {
  BLR: "Boiler",
  CHL: "Chiller",
  CMP: "Compressor",
  CNV: "Conveyor",
  FIL: "Filling",
  LBL: "Labeler",
  MIX: "Mixer",
  PKG: "Packing Machine",
  RBT: "Robot Arm",
  SEA: "Sealer",
  WGH: "Weigher"
};

const machineOverrides = {
  "CNV-A-002": {
    activeJobStatus: "WAIT_MM",
    jobNo: "JOB-20260514-011",
    responsible: "Production / PRD-014"
  },
  "FIL-A-003": {
    plcStatus: "MM_REPAIR",
    activeJobStatus: "MM_REPAIR",
    jobNo: "JOB-20260514-009",
    responsible: "MM-006 Narin"
  },
  "LBL-B-002": {
    alarmName: "Sensor abnormal",
    plcStatus: "RUN",
    simMachineAlarm: true,
    responsible: "MM standby"
  },
  "MIX-B-001": {
    plcStatus: "QC",
    activeJobStatus: "WAIT_QC",
    jobNo: "JOB-20260514-008",
    responsible: "QC-003 Narin"
  },
  "SEA-P-002": {
    plcStatus: "WAIT_PART",
    activeJobStatus: "MM_REPAIR",
    jobNo: "JOB-20260514-006",
    responsible: "MM-002 Kanda"
  },
  "WGH-P-001": {
    plcStatus: "WAIT_PART",
    responsible: "Tooling Store"
  }
};

const machines = [
  "CNV-A-001", "CNV-A-002", "CNV-A-003", "FIL-A-001", "FIL-A-002", "FIL-A-003",
  "RBT-A-001", "RBT-A-002", "LBL-B-001", "LBL-B-002", "MIX-B-001", "MIX-B-002",
  "PKG-B-001", "PKG-B-002", "SEA-P-001", "SEA-P-002", "WGH-P-001", "BLR-U-001"
].map((name, index) => {
  const override = machineOverrides[name] || {};
  const plcStatus = override.plcStatus || "RUN";
  const status = override.simMachineAlarm ? "ALARM" : plcStatus === "WAIT_PART" ? "WAIT" : plcStatus;

  return {
    name,
    machineNo: name,
    area: index < 8 ? "Line A" : index < 14 ? "Line B" : index < 17 ? "Packing" : "Utility",
    machineType: machineTypeByPrefix[name.split("-")[0]] || name.split("-")[0],
    type: machineTypeByPrefix[name.split("-")[0]] || name.split("-")[0],
    status,
    plcStatus,
    output: 720 + index * 46,
    ng: index % 5,
    ct: 1 + (index % 3),
    oee: 78 + (index % 14),
    ...override,
    jobRequestActive: Boolean(override.activeJobStatus)
  };
});

const reportMachines = machines.map((machine, index) => {
  const prefix = machine.machineNo.split("-")[0];
  return {
    ...machine,
    machineType: prefix,
    modelName: index % 3 === 0 ? "C4G, 12630" : machine.model || "MODEL-A",
    modelType: "-",
    process: machine.area || "-"
  };
});

const shiftHourLabels = Array.from({ length: 24 }, (_item, index) => {
  const hour = (7 + index) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
});

const hourly = shiftHourLabels.map((hour, index) => ({
  hour,
  target: 520 + index * 8,
  output: 490 + index * 10 + (index % 4) * 22,
  ct: 2.1 + (index % 4) * 0.18,
  ctTarget: 2.4,
  availability: 88 + (index % 6),
  availabilityTarget: 90,
  performance: 84 + (index % 7),
  quality: 96 + (index % 3),
  oee: 82 + (index % 6)
})).map((item, index, rows) => ({
  ...item,
  accum: rows.slice(0, index + 1).reduce((sum, row) => sum + row.output, 0),
  targetAccum: rows.slice(0, index + 1).reduce((sum, row) => sum + row.target, 0)
}));

const machineStatusSegments = [
  { start: "07:00", end: "07:20", label: "WARM UP", status: "WARM_UP", percent: 1.4 },
  { start: "07:20", end: "09:20", label: "RUN", status: "RUN", percent: 8.3 },
  { start: "09:20", end: "10:05", label: "WAIT PART", status: "WAIT_PART", percent: 3.1 },
  { start: "10:05", end: "12:20", label: "RUN", status: "RUN", percent: 9.4 },
  { start: "12:20", end: "12:55", label: "MM REPAIR", status: "MM_REPAIR", percent: 2.4 },
  { start: "12:55", end: "13:25", label: "MM PREVENTIVE", status: "MM_PREVENTIVE", percent: 2.1 },
  { start: "13:25", end: "15:00", label: "BRAKE TIME", status: "BRAKE_TIME", percent: 6.6 },
  { start: "15:00", end: "17:55", label: "RUN", status: "RUN", percent: 12.2 },
  { start: "17:55", end: "18:25", label: "QC", status: "QC", percent: 2.1 },
  { start: "18:25", end: "19:05", label: "ALARM", status: "ALARM", percent: 2.8 },
  { start: "19:05", end: "23:00", label: "RUN", status: "RUN", percent: 16.3 },
  { start: "23:00", end: "23:45", label: "CLEANING", status: "CLEANING", percent: 3.1 },
  { start: "23:45", end: "00:10", label: "PLAN STOP", status: "PLAN_STOP", percent: 1.7 },
  { start: "00:10", end: "00:35", label: "STOP", status: "STOP", percent: 1.7 },
  { start: "00:35", end: "07:00", label: "RUN", status: "RUN", percent: 26.8 }
];

const downtimeBreakdown = [
  { status: "WAIT PART", minute: 45, percent: 10, fill: statusColors.WAIT_PART },
  { status: "WARM UP", minute: 20, percent: 5, fill: statusColors.WARM_UP },
  { status: "MM REPAIR", minute: 35, percent: 10, fill: statusColors.MM_REPAIR },
  { status: "MM PM", minute: 30, percent: 6, fill: statusColors.MM_PREVENTIVE },
  { status: "QC", minute: 30, percent: 6, fill: statusColors.QC },
  { status: "BRAKE TIME", minute: 95, percent: 22, fill: statusColors.BRAKE_TIME },
  { status: "PLAN STOP", minute: 25, percent: 6, fill: statusColors.PLAN_STOP },
  { status: "ALARM", minute: 40, percent: 13, fill: statusColors.ALARM },
  { status: "CLEANING", minute: 45, percent: 12, fill: statusColors.CLEANING },
  { status: "STOP", minute: 25, percent: 10, fill: statusColors.STOP }
];

const operatorAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%230f172a'/%3E%3Ccircle cx='40' cy='28' r='14' fill='%23bfdbfe'/%3E%3Cpath d='M16 72c4-18 16-28 24-28s20 10 24 28' fill='%230ea5e9'/%3E%3Cpath d='M24 22h32v10H24z' fill='%23fbbf24'/%3E%3C/svg%3E";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function statusBadgeStyle(status) {
  const color = statusColors[status] || statusColors.STOP;
  return {
    backgroundColor: `${color}18`,
    borderColor: `${color}55`,
    color
  };
}

function statusCardStyle(status) {
  const color = statusColors[status] || statusColors.STOP;
  return {
    background: `linear-gradient(135deg, ${color}38 0%, ${color}24 52%, #ffffff 100%)`,
    borderColor: `${color}cc`,
    boxShadow: `inset 0 0 0 1px ${color}22, 0 10px 22px ${color}1f`
  };
}

function compactMmsStatus(status) {
  const labels = {
    BRAKE_TIME: "BRAKE",
    CLEANING: "CLEAN",
    MM_PREVENTIVE: "MM PM",
    MM_REPAIR: "MM",
    PLAN_STOP: "PLAN",
    WAIT_PART: "WAIT",
    WARM_UP: "WARM"
  };
  return labels[status] || status;
}

function getBangkokTodayText() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function normalizeBackendMmsMachine(machine = {}, index = 0) {
  const machineNo = machine.machineNo || machine.machine_no || machine.name || "";
  const outputOk = Number(machine.outputOk ?? machine.output_ok ?? machine.output ?? 0);
  const outputNg = Number(machine.outputNg ?? machine.output_ng ?? machine.ng ?? 0);
  const output = Number(machine.output ?? outputOk + outputNg);
  const machineType = machine.machineType || machine.machine_type || machine.type || machine.machineTypeCode || machine.machine_type_code || machineTypeByPrefix[machineNo.split("-")[0]] || "Unknown";
  const plcStatus = machine.plcStatus || machine.plc_status || machine.status || "RUN";

  return {
    ...machine,
    name: machine.name || machineNo,
    machineNo,
    area: machine.area || machine.areaName || "Unassigned",
    machineType,
    type: machine.type || machineType,
    status: machine.simMachineAlarm ? "ALARM" : plcStatus === "WAIT_PART" ? "WAIT" : plcStatus,
    plcStatus,
    output,
    outputOk,
    outputNg,
    ng: outputNg,
    ct: Number(machine.ct ?? machine.cycleTime ?? machine.cycle_time_sec ?? 0) || 1 + (index % 3),
    cycleTime: Number(machine.cycleTime ?? machine.ct ?? machine.cycle_time_sec ?? 0) || 1 + (index % 3),
    oee: Number(machine.oee ?? 0),
    target: Number(machine.target ?? machine.targetOutput ?? output ?? 0),
    targetOutput: Number(machine.targetOutput ?? machine.target ?? output ?? 0),
    responsible: machine.responsible || machine.activeJobNo || (machine.jobRequestActive ? "Job Request" : "Machine master"),
    jobNo: machine.jobNo || machine.activeJobNo || null,
    jobRequestActive: Boolean(machine.jobRequestActive || machine.activeJobNo || machine.activeJobStatus),
    model: machine.model || "MODEL-A"
  };
}

function buildReportMachineRows(sourceMachines = []) {
  return sourceMachines.map((machine, index) => {
    const prefix = machine.machineNo.split("-")[0];
    return {
      ...machine,
      machineType: machine.machineType || prefix,
      modelName: index % 3 === 0 ? "C4G, 12630" : machine.model || "MODEL-A",
      modelType: "-",
      process: machine.area || "-"
    };
  });
}

function buildAreaRows(sourceMachines = []) {
  const grouped = sourceMachines.reduce((groups, machine) => {
    const area = machine.area || "Unassigned";
    const current = groups[area] || { area, run: 0, alarm: 0, stop: 0, output: 0, oeeTotal: 0, total: 0 };
    current.total += 1;
    current.output += Number(machine.output || 0);
    current.oeeTotal += Number(machine.oee || 0);
    if (machine.status === "ALARM") current.alarm += 1;
    if (machine.status === "RUN") current.run += 1;
    if (!["RUN", "ALARM"].includes(machine.status)) current.stop += 1;
    groups[area] = current;
    return groups;
  }, {});

  return Object.values(grouped).map((area) => ({
    ...area,
    oee: area.total ? Number((area.oeeTotal / area.total).toFixed(1)) : 0
  }));
}

function buildMmsReportParams(filters = {}) {
  return {
    area: filters.area || "All",
    date: filters.date,
    machineNo: filters.machineNo || "All",
    machineType: filters.machineType || "All",
    month: filters.month,
    period: filters.graphPeriod || "daily",
    year: filters.year
  };
}

function useMmsReport(filters = {}, enabled = true) {
  const [report, setReport] = useState(null);
  const params = buildMmsReportParams(filters);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) {
      setReport(null);
      return undefined;
    }

    let alive = true;
    api.get("/mms/reports/history", { params })
      .then((response) => {
        if (alive) setReport(response.data?.data || null);
      })
      .catch(() => {
        if (alive) setReport(null);
      });

    return () => {
      alive = false;
    };
  }, [enabled, paramsKey]);

  return report;
}

function useMmsReportsByMachine(filters = {}, selectedMachines = []) {
  const [reports, setReports] = useState({});
  const machineNos = selectedMachines.map((machine) => machine.machineNo).filter(Boolean);
  const params = buildMmsReportParams(filters);
  const paramsKey = JSON.stringify({ ...params, machineNos });

  useEffect(() => {
    if (!machineNos.length) {
      setReports({});
      return undefined;
    }

    let alive = true;
    Promise.all(machineNos.map((machineNo) => api.get("/mms/reports/history", { params: { ...params, machineNo } })
      .then((response) => [machineNo, response.data?.data || null])
      .catch(() => [machineNo, null])))
      .then((entries) => {
        if (alive) setReports(Object.fromEntries(entries));
      });

    return () => {
      alive = false;
    };
  }, [paramsKey]);

  return reports;
}

function buildHourlyRowsFromReport(report) {
  const rows = report?.series || [];
  let outputAccum = 0;
  let targetAccum = 0;

  if (!rows.length) return hourly;

  return rows.map((row) => {
    const output = Number(row.output || 0);
    const target = Number(row.target || 0);
    outputAccum += output;
    targetAccum += target;
    return {
      hour: row.label,
      target,
      output,
      ct: Number(row.ct || 0),
      ctTarget: 3,
      availability: Number(row.availability || 0),
      availabilityTarget: 90,
      performance: Number(row.performance || 0),
      quality: Number(row.quality || 0),
      oee: Number(row.oee || 0),
      accum: outputAccum,
      targetAccum
    };
  });
}

function buildStatusSegmentsFromReport(report) {
  const rows = report?.series || [];
  if (!rows.length) return machineStatusSegments;

  return rows.map((row) => {
    const status = Number(row.alarmHours || 0) > 0 ? "ALARM" : Number(row.stopHours || 0) > 0.5 ? "STOP" : "RUN";
    return {
      start: row.label,
      end: row.label,
      label: status,
      status,
      percent: 1
    };
  });
}

function buildDowntimeRowsFromReport(report) {
  const rows = report?.series || [];
  if (!rows.length) return downtimeBreakdown;

  const alarm = rows.reduce((sum, row) => sum + Number(row.alarmHours || 0), 0);
  const stop = rows.reduce((sum, row) => sum + Math.max(0, Number(row.stopHours || 0) - Number(row.alarmHours || 0)), 0);
  const run = rows.reduce((sum, row) => sum + Number(row.runHours || 0), 0);
  const total = Math.max(1, alarm + stop + run);

  return [
    { status: "RUN", minute: Math.round(run * 60), percent: Number(((run / total) * 100).toFixed(1)), fill: statusColors.RUN },
    { status: "ALARM", minute: Math.round(alarm * 60), percent: Number(((alarm / total) * 100).toFixed(1)), fill: statusColors.ALARM },
    { status: "STOP", minute: Math.round(stop * 60), percent: Number(((stop / total) * 100).toFixed(1)), fill: statusColors.STOP }
  ];
}

function statusFillStyle(status) {
  return { backgroundColor: statusColors[status] || statusColors.STOP };
}

const styles = {
  active: "border-cyan-400/50 bg-cyan-600 text-white shadow-lg shadow-cyan-950/20",
  backButton: "inline-flex h-10 items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-100",
  brand: "mb-6 flex items-center gap-3",
  brandText: "[&_h1]:m-0 [&_h1]:text-lg [&_h1]:font-black [&_h1]:leading-tight [&_p]:m-0 [&_p]:mt-1 [&_p]:text-sm [&_p]:font-bold [&_p]:text-slate-400",
  chartBox: "h-full min-h-0 min-w-0 overflow-hidden",
  chartBoxCompact: "h-[150px] min-h-0 min-w-0 overflow-hidden",
  chartBoxOverall: "h-full min-h-0 min-w-0 overflow-hidden",
  chartBoxTall: "h-[calc(100vh-508px)] min-h-[260px] overflow-hidden",
  chartTabButton: "inline-flex h-8 items-center justify-center rounded-lg border border-blue-600 bg-white px-5 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-50",
  chartTabButtonActive: "inline-flex h-8 items-center justify-center rounded-lg border border-blue-700 bg-blue-700 px-5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700",
  collapseButton: "mb-5 h-11 w-full rounded-xl border border-white/10 bg-white/10 text-sm font-black text-white transition hover:bg-white/15",
  collapsed: "",
  content: "grid gap-3",
  eyebrow: "m-0 text-xs font-black uppercase tracking-[0.22em] text-cyan-100",
  eyebrowDark: "m-0 text-xs font-black uppercase tracking-[0.18em] text-cyan-700",
  factoryArea: "rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm data-[area='0']:bg-cyan-50 data-[area='1']:bg-emerald-50 data-[area='2']:bg-amber-50 data-[area='3']:bg-indigo-50",
  factoryAreaTitle: "mb-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white",
  factoryLayoutGrid: "grid grid-cols-2 gap-3 max-[900px]:grid-cols-1",
  field: "grid gap-1.5 [&_input]:h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-300 [&_input]:bg-white [&_input]:px-3 [&_input]:text-sm [&_input]:font-bold [&_input]:text-slate-950 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-cyan-500 [&_input]:focus:ring-4 [&_input]:focus:ring-cyan-100 [&_label]:text-[11px] [&_label]:font-black [&_label]:uppercase [&_label]:tracking-[0.14em] [&_label]:text-slate-500 [&_select]:h-11 [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:px-3 [&_select]:text-sm [&_select]:font-bold [&_select]:text-slate-950 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-cyan-500 [&_select]:focus:ring-4 [&_select]:focus:ring-cyan-100",
  footer: "mt-3 border-t border-slate-200 py-3 text-center text-xs font-bold text-slate-500",
  grid2: "grid grid-cols-2 gap-3 max-[1000px]:grid-cols-1",
  grid3: "grid grid-cols-3 gap-3 max-[1100px]:grid-cols-1",
  kpi: "rounded-2xl border border-t-4 border-slate-200 bg-white p-4 shadow-sm [&_small]:block [&_small]:text-xs [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.14em] [&_small]:text-slate-500 [&_strong]:mt-2 [&_strong]:block [&_strong]:text-2xl [&_strong]:font-black [&_strong]:text-slate-950",
  kpiGrid: "grid grid-cols-6 gap-3 max-[1200px]:grid-cols-3 max-[700px]:grid-cols-2",
  layout: "grid min-h-screen max-[900px]:grid-cols-1",
  layoutCollapsed: "grid-cols-[80px_minmax(0,1fr)]",
  layoutExpanded: "grid-cols-[280px_minmax(0,1fr)]",
  logo: "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-xs font-black text-white shadow-lg shadow-cyan-600/25",
  machineCheck: "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 [&_input]:h-4 [&_input]:w-4",
  machineDropdown: "relative [&_button]:flex [&_button]:h-11 [&_button]:w-full [&_button]:items-center [&_button]:justify-between [&_button]:rounded-xl [&_button]:border [&_button]:border-slate-300 [&_button]:bg-white [&_button]:px-3 [&_button]:text-left [&_button]:text-sm [&_button]:font-bold [&_button]:text-slate-950",
  machineDropdownMenu: "absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl",
  machineMap: "grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2",
  machineStatusTimeline: "grid gap-2",
  machineSummaryTable: "grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-950 shadow-sm grid-cols-[200px_repeat(6,minmax(86px,1fr))_140px] max-[1200px]:grid-cols-2 [&_.operator-avatar]:h-10 [&_.operator-avatar]:w-10",
  machineSummaryTableCompact: "grid grid-cols-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-[10px] text-slate-950 shadow-sm [&_.operator-avatar]:h-9 [&_.operator-avatar]:w-9 [&_.summary-cell]:min-h-12 [&_.summary-cell]:p-1.5 [&_.summary-cell_b]:text-[8px] [&_.summary-cell_small]:text-[8px] [&_.summary-cell_strong]:text-sm max-[900px]:grid-cols-2",
  machineTile: "rounded-xl border border-l-4 border-slate-200 bg-white p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
  machineWorkingChartGrid: "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 max-[1000px]:grid-cols-1 [&>article]:min-w-0",
  main: "min-w-0 bg-slate-100 bg-[linear-gradient(rgba(15,23,42,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.026)_1px,transparent_1px)] bg-[length:32px_32px] p-4",
  nav: "grid gap-3",
  navGroup: "grid gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-2",
  navGroupCollapsed: "p-1",
  navIcon: "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-cyan-300",
  navLink: "flex min-h-11 w-full items-center rounded-xl border border-transparent py-2.5 text-sm font-black text-slate-300 no-underline transition hover:bg-white/10",
  navLinkCollapsed: "justify-center px-0",
  navLinkExpanded: "gap-3 px-3 text-left",
  navText: "truncate",
  navTitle: "px-2 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400",
  ngText: "text-red-600",
  oeeHeader: "flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [&_h3]:m-0 [&_h3]:text-xl [&_h3]:font-black [&_span]:rounded-full [&_span]:bg-emerald-50 [&_span]:px-3 [&_span]:py-1 [&_span]:text-xs [&_span]:font-black [&_span]:text-emerald-700",
  oeeSummaryCell: "items-center justify-center text-center [&_strong]:text-2xl [&_strong]:text-emerald-700",
  okText: "text-emerald-700",
  operatorCell: "flex items-center gap-3 bg-slate-100 [&_img]:h-14 [&_img]:w-14 [&_img]:rounded-xl [&_img]:ring-2 [&_img]:ring-sky-200 [&_span]:grid [&_span]:min-w-0 [&_span]:gap-0.5 [&_span_b]:truncate [&_span_strong]:truncate",
  overviewCommandBar: "grid grid-cols-[minmax(280px,.95fr)_minmax(0,1.5fr)] gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-white shadow-sm max-[1200px]:grid-cols-1",
  overviewCommandCopy: "grid content-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 [&_h3]:m-0 [&_h3]:text-2xl [&_h3]:font-black [&_p]:m-0 [&_p]:text-sm [&_p]:font-bold [&_p]:text-slate-300",
  overviewCommandHeader: "flex items-start justify-between gap-3",
  overviewCommandKpis: "grid grid-cols-4 gap-2 max-[1200px]:grid-cols-4 max-[760px]:grid-cols-2",
  overviewCommandKpi: "rounded-xl border border-white/10 bg-white/[0.06] p-3 [&_small]:block [&_small]:text-[10px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.12em] [&_small]:text-slate-400 [&_span]:mt-1 [&_span]:block [&_span]:text-[11px] [&_span]:font-bold [&_span]:text-slate-400 [&_strong]:mt-1 [&_strong]:block [&_strong]:text-2xl [&_strong]:font-black",
  overviewCommandMeta: "flex flex-wrap gap-2 [&_span]:inline-flex [&_span]:items-center [&_span]:gap-2 [&_span]:rounded-full [&_span]:border [&_span]:border-white/10 [&_span]:bg-white/[0.06] [&_span]:px-3 [&_span]:py-1.5 [&_span]:text-xs [&_span]:font-black [&_i]:h-2 [&_i]:w-2 [&_i]:rounded-full",
  overviewAreaCard: "min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm",
  overviewAreaGrid: "grid grid-cols-4 gap-3 max-[1400px]:grid-cols-2 max-[760px]:grid-cols-1",
  overviewAreaHeader: "mb-2 grid gap-2 [&_h4]:m-0 [&_h4]:text-sm [&_h4]:font-black [&_p]:m-0 [&_p]:text-[10px] [&_p]:font-bold [&_p]:text-slate-500",
  overviewChartGrid: "grid grid-cols-[1.35fr_0.85fr] gap-3 max-[1100px]:grid-cols-1",
  overviewFactoryHeader: "mb-2 flex flex-wrap items-center justify-between gap-2 [&_h3]:m-0 [&_h3]:text-base [&_h3]:font-black [&_p]:m-0 [&_p]:text-[10px] [&_p]:font-black [&_p]:text-slate-500",
  overviewFactoryLayout: "grid min-h-0 grid-cols-4 items-start gap-2 max-[1600px]:grid-cols-2 max-[900px]:grid-cols-1",
  overviewFactoryPanel: "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm",
  overviewFactoryScaleWrap: "min-h-0 overflow-auto rounded-xl pr-1",
  overviewFilterPanel: "grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm max-[1200px]:grid-cols-3 max-[760px]:grid-cols-1",
  overviewHero: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
  overviewHeroGrid: "grid grid-cols-[1.25fr_0.75fr] gap-3 max-[1100px]:grid-cols-1",
  overviewKpi: "rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm [&_small]:block [&_small]:text-[10px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.12em] [&_small]:text-slate-500 [&_span]:mt-1 [&_span]:block [&_span]:text-xs [&_span]:font-bold [&_span]:text-slate-500 [&_strong]:mt-1 [&_strong]:block [&_strong]:text-2xl [&_strong]:font-black [&_strong]:text-slate-950",
  overviewKpiStrip: "grid grid-cols-6 gap-3 max-[1400px]:grid-cols-3 max-[760px]:grid-cols-2",
  overviewLayout: "grid h-[calc(100vh-16px)] min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-2 overflow-hidden",
  overviewMachineCard: "grid h-[126px] min-w-0 content-between overflow-hidden rounded-xl border-2 p-1.5 shadow-sm",
  overviewMachineGate: "mt-1 flex min-w-0 items-center justify-between gap-1 [&_b]:min-w-0 [&_b]:truncate [&_b]:rounded-md [&_b]:border [&_b]:border-violet-200 [&_b]:bg-violet-50 [&_b]:px-1.5 [&_b]:py-0.5 [&_b]:text-[7px] [&_b]:font-black [&_b]:text-violet-800 [&_span]:shrink-0 [&_span]:rounded-md [&_span]:border [&_span]:px-1.5 [&_span]:py-0.5 [&_span]:text-[7px] [&_span]:font-black",
  overviewMachineGrid: "grid grid-cols-[repeat(auto-fill,minmax(146px,1fr))] auto-rows-[126px] gap-1.5",
  overviewMachineMeta: "mt-1 grid min-w-0 gap-0.5 text-[8px] font-black text-slate-700 [&_b]:shrink-0 [&_b]:text-slate-950 [&_em]:min-w-0 [&_em]:truncate [&_em]:not-italic [&_span]:flex [&_span]:min-w-0 [&_span]:items-center [&_span]:justify-between [&_span]:gap-1",
  overviewMachineMetrics: "mt-1 grid min-w-0 grid-cols-4 gap-0.5 [&_span]:min-w-0 [&_span]:rounded-md [&_span]:border [&_span]:border-white/70 [&_span]:bg-white/80 [&_span]:px-0.5 [&_span]:py-0.5 [&_small]:block [&_small]:truncate [&_small]:text-center [&_small]:text-[6px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.04em] [&_small]:text-slate-500 [&_strong]:block [&_strong]:text-center [&_strong]:text-[8px] [&_strong]:font-black [&_strong]:leading-tight [&_strong]:text-slate-950",
  overviewMachineTitle: "flex min-w-0 items-start justify-between gap-1 [&_div]:min-w-0 [&_h5]:m-0 [&_h5]:truncate [&_h5]:text-[11px] [&_h5]:font-black [&_h5]:leading-tight [&_p]:m-0 [&_p]:truncate [&_p]:text-[7px] [&_p]:font-bold [&_p]:text-slate-600",
  overviewStatusBadge: "inline-flex min-h-5 max-w-[72px] shrink-0 items-center justify-center truncate rounded-full border px-1.5 text-[8px] font-black uppercase tracking-[0.02em]",
  overviewSignalList: "grid gap-2 [&_article]:rounded-xl [&_article]:border [&_article]:border-slate-200 [&_article]:bg-slate-50 [&_article]:p-3 [&_b]:block [&_b]:text-sm [&_b]:font-black [&_small]:block [&_small]:text-xs [&_small]:font-bold [&_small]:text-slate-500",
  overviewStatusBoard: "grid grid-cols-2 gap-2",
  overviewStatusCard: "rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm [&_small]:block [&_small]:text-[10px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.12em] [&_small]:text-slate-500 [&_strong]:mt-1 [&_strong]:block [&_strong]:text-2xl [&_strong]:font-black",
  overviewQuickFilters: "col-span-full flex flex-wrap gap-2 border-t border-slate-200 pt-2 max-[760px]:col-span-1 [&_button]:h-9 [&_button]:rounded-lg [&_button]:border [&_button]:border-slate-300 [&_button]:bg-white [&_button]:px-3 [&_button]:text-xs [&_button]:font-black [&_button]:text-slate-700 [&_button]:shadow-sm [&_button]:transition [&_button:hover]:bg-slate-50",
  overviewQuickFilterActive: "!border-slate-950 !bg-slate-950 !text-white",
  overviewTypeBlock: "rounded-lg border border-slate-200 bg-slate-50 p-1.5 [&_h5]:mb-1 [&_h5]:text-[10px] [&_h5]:font-black [&_h5]:text-slate-700",
  overallCard: "flex h-[calc((100vh-236px)/2)] min-h-[260px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
  overallChartCell: "grid min-h-0 grid-rows-[minmax(0,1fr)_22px]",
  overallChartLegend: "flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 overflow-hidden px-1 text-[8px] font-bold leading-none text-slate-600 [&_i]:inline-block [&_i]:h-2 [&_i]:w-2 [&_i]:rounded-sm [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1",
  overallChartRow: "grid flex-1 grid-cols-2 gap-1.5 p-1.5 max-[800px]:grid-cols-1",
  overallEmpty: "rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-black text-slate-500",
  overallFilterPanel: "grid grid-cols-[1fr_1fr_1.35fr_160px_auto] items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm max-[1200px]:grid-cols-2 max-[700px]:grid-cols-1",
  overallMachineGrid: "grid grid-cols-3 gap-2 max-[1500px]:grid-cols-2 max-[900px]:grid-cols-1",
  overallMiniHeader: "grid h-[76px] overflow-hidden border-b border-slate-200 bg-slate-50 text-slate-950 grid-cols-[96px_minmax(0,1fr)_68px] max-[900px]:h-auto max-[900px]:grid-cols-1",
  overallMiniCenter: "grid min-w-0 grid-rows-[36px_1fr] border-x border-slate-200 bg-white max-[900px]:border-x-0 max-[900px]:border-y",
  overallMiniKpi: "grid min-w-0 content-center border-r border-slate-200 px-1.5 py-1 last:border-r-0 [&_small]:truncate [&_small]:text-[7px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.06em] [&_small]:text-slate-500 [&_strong]:truncate [&_strong]:text-[10px] [&_strong]:font-black",
  overallMiniKpiGrid: "grid min-w-0 grid-cols-[1fr_1fr_1fr_.85fr] border-t border-slate-200",
  overallMiniMeta: "flex min-w-0 flex-wrap items-center gap-1.5 text-[8px] font-bold text-slate-600 [&_b]:font-black [&_b]:text-slate-900 [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1",
  overallMiniMachineBlock: "grid min-w-0 gap-0.5 [&_small]:text-[7px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.08em] [&_small]:text-slate-500 [&_strong]:truncate [&_strong]:text-sm [&_strong]:font-black",
  overallMiniOperator: "flex min-w-0 items-center gap-1.5 bg-slate-100 px-1.5 py-1 [&_img]:h-8 [&_img]:w-8 [&_img]:rounded-lg [&_img]:ring-2 [&_img]:ring-sky-200 [&_span]:grid [&_span]:min-w-0 [&_small]:text-[7px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.08em] [&_small]:text-slate-500 [&_strong]:truncate [&_strong]:text-xs [&_strong]:font-black [&_b]:truncate [&_b]:text-[8px] [&_b]:font-bold [&_b]:text-slate-600",
  overallMiniOee: "grid content-center justify-items-center bg-white px-2 py-1 text-center [&_small]:text-[7px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.08em] [&_small]:text-slate-500 [&_strong]:text-base [&_strong]:font-black [&_strong]:text-emerald-700 [&_b]:text-[7px] [&_b]:font-bold [&_b]:text-slate-600",
  overallMiniStatusPill: "inline-flex h-5 items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 text-[10px] font-black text-emerald-700",
  overallMiniTopLine: "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-1",
  overallStatusBlock: "grid flex-1 grid-rows-[72px_minmax(0,1fr)] gap-1.5 p-1.5",
  overallTabSwitch: "flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1",
  panel: "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm",
  panelActionButton: "inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-800 shadow-sm transition hover:bg-slate-50",
  panelActionButtonPrimary: "inline-flex h-8 items-center justify-center rounded-lg border border-slate-900 bg-slate-950 px-3 text-xs font-black text-white shadow-sm transition hover:bg-slate-800",
  panelActions: "flex flex-wrap items-center justify-end gap-2",
  panelControlHeader: "mb-3 flex flex-wrap items-center justify-between gap-3 [&_h3]:m-0 [&_h3]:text-lg [&_h3]:font-black [&_p]:m-0 [&_p]:text-xs [&_p]:font-black [&_p]:text-slate-500",
  panelHeader: "mb-2 flex items-center justify-between gap-3 [&_h3]:m-0 [&_h3]:text-base [&_h3]:font-black [&_span]:text-xs [&_span]:font-black [&_span]:text-slate-500",
  reportFilterPanel: "grid grid-cols-[1fr_1fr_1fr_120px_160px_auto] items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm max-[1300px]:grid-cols-3 max-[760px]:grid-cols-1",
  reportGrid2: "grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-2 max-[1100px]:grid-cols-1",
  reportDateBodyPanel: "min-w-0 overflow-x-auto overflow-y-hidden",
  reportDateHeaderPanel: "min-w-0 overflow-hidden bg-slate-800",
  reportDateTable: "min-w-[1550px] border-separate border-spacing-0 text-[11px] text-slate-950 [&_td]:h-9 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-300 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-center [&_td]:align-middle [&_td]:font-bold",
  reportDateTableHeader: "min-w-[1550px] border-separate border-spacing-0 text-[11px] text-white [&_th]:h-10 [&_th]:border-b [&_th]:border-r [&_th]:border-slate-600 [&_th]:bg-slate-800 [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-center [&_th]:align-middle [&_th]:text-[10px] [&_th]:font-black [&_th]:leading-tight [&_th]:text-white",
  reportDividerRow: "[&_td]:border-t-4 [&_td]:border-t-slate-700",
  reportFixedPanel: "w-[628px] shrink-0 overflow-hidden border-r-2 border-slate-700 bg-white",
  reportFixedTable: "w-full table-fixed border-separate border-spacing-0 text-[11px] text-slate-950 [&_td]:h-9 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-300 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-center [&_td]:align-middle [&_td]:font-bold [&_tr>*:first-child]:border-l",
  reportFixedTableHeader: "w-full table-fixed border-separate border-spacing-0 text-[11px] text-white [&_th]:h-10 [&_th]:border-b [&_th]:border-r [&_th]:border-slate-600 [&_th]:bg-slate-800 [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-center [&_th]:align-middle [&_th]:text-[10px] [&_th]:font-black [&_th]:leading-tight [&_th]:text-white [&_tr>*:first-child]:border-l",
  reportMatrixBody: "min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain",
  reportMatrixHeader: "sticky top-0 z-30 flex min-w-0 border-b-2 border-slate-700 bg-slate-800",
  reportMatrixPanel: "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-slate-500 bg-white shadow-sm",
  reportMatrixSplit: "flex min-w-0",
  reportMetricCell: "border-l-2 border-l-slate-500 bg-slate-50 text-left font-black",
  reportMergedCell: "border-b-2 border-l border-slate-500 bg-slate-50 text-center font-black text-slate-950",
  reportSummaryCell: "bg-amber-50 text-amber-900",
  reportSummaryPanel: "grid grid-cols-6 gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 shadow-sm max-[1300px]:grid-cols-3 max-[760px]:grid-cols-2 [&_small]:block [&_small]:text-[10px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.12em] [&_small]:text-cyan-800 [&_strong]:mt-1 [&_strong]:block [&_strong]:text-xl [&_strong]:font-black [&_strong]:text-slate-950",
  reportTotalCell: "border-l-2 border-l-slate-500 bg-amber-100 font-black text-amber-950",
  reportPrimaryButton: "inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700",
  reportTabHeader: "flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm [&_h3]:m-0 [&_h3]:text-lg [&_h3]:font-black [&_p]:m-0 [&_p]:text-xs [&_p]:font-bold [&_p]:text-slate-500",
  reportTableBody: "grid h-full min-h-0 grid-rows-[minmax(0,1fr)] gap-2",
  reportTableBodyWithSummary: "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2",
  reportTableMatrixSlot: "min-h-0",
  reportViewportLayout: "grid h-[calc(100vh-130px)] min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden",
  reportCards: "grid grid-cols-[1.2fr_.8fr] gap-3 max-[1100px]:grid-cols-1",
  screen: "min-h-screen text-slate-950",
  shiftScale: "grid grid-cols-7 px-2 text-center text-[9px] font-black text-slate-500",
  sidebar: "sticky top-0 h-screen overflow-x-hidden overflow-y-auto border-r border-slate-800 bg-slate-950 p-5 text-white transition-all max-[900px]:relative max-[900px]:h-auto",
  sidebarCollapsed: "p-4",
  statusBadge: "inline-flex min-h-6 items-center justify-center rounded-full border px-2.5 text-[11px] font-black uppercase tracking-[0.04em]",
  statusBreakdownPanel: "rounded-xl border border-slate-200 bg-white p-3 [&_h4]:mb-2 [&_h4]:text-sm [&_h4]:font-black",
  statusLegend: "flex flex-wrap justify-center gap-1 text-[9px] font-black text-slate-600 [&_i]:inline-block [&_i]:h-2 [&_i]:w-2 [&_i]:rounded-full [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1 [&_span]:rounded-full [&_span]:border [&_span]:border-slate-200 [&_span]:bg-white [&_span]:px-1.5 [&_span]:py-0.5",
  statusMonitorGrid: "grid gap-2",
  statusSegment: "h-6 min-w-3 border-r border-white/70 transition hover:brightness-105",
  statusTimelinePanel: "rounded-xl border border-slate-200 bg-white p-2",
  statusTooltip: "pointer-events-none absolute top-14 z-10 grid -translate-x-1/2 gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-xl",
  statusTrack: "relative flex overflow-visible rounded-xl border border-slate-200 bg-white p-0.5",
  summaryCell: "summary-cell grid min-h-14 content-center border-b border-r border-slate-200 p-2 [&_b]:text-[10px] [&_b]:font-bold [&_b]:text-slate-500 [&_small]:text-[9px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.12em] [&_small]:text-slate-500 [&_strong]:text-base [&_strong]:font-black",
  summaryMetric: "summary-cell grid min-h-14 content-center border-b border-r border-slate-200 p-2 [&_b]:text-[10px] [&_b]:font-bold [&_b]:text-slate-500 [&_small]:text-[9px] [&_small]:font-black [&_small]:uppercase [&_small]:tracking-[0.12em] [&_small]:text-slate-500 [&_strong]:text-base [&_strong]:font-black",
  summaryTallCell: "row-span-2",
  table: "w-full border-collapse text-sm [&_td]:border-b [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:font-bold [&_td]:text-slate-700 [&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.12em] [&_th]:text-slate-500",
  tableWrap: "overflow-auto rounded-xl border border-slate-200",
  timeline: "grid gap-2",
  timelineBar: "h-2 rounded-full",
  timelineRow: "grid grid-cols-[56px_1fr_56px] items-center gap-3 text-sm font-bold",
  toolbar: "grid grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm max-[900px]:grid-cols-2 max-[600px]:grid-cols-1",
  topbar: "mb-3 flex items-center justify-between gap-4 rounded-2xl border border-cyan-700/30 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-800 p-4 text-white shadow-sm [&_h2]:m-0 [&_h2]:text-2xl [&_h2]:font-black [&_p:last-child]:m-0 [&_p:last-child]:text-sm [&_p:last-child]:font-bold [&_p:last-child]:text-cyan-50 max-[700px]:flex-col max-[700px]:items-start",
  typeButton: "mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-base font-black text-white no-underline shadow-sm transition hover:bg-slate-800 [&_span]:text-xs [&_span]:font-bold [&_span]:text-cyan-100",
  typeSection: "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm",
  typeStack: "grid gap-1.5"
};

export default function MmsDashboardShell({ view = "overview" }) {
  const [collapsed, setCollapsed] = useState(false);
  const [backendMachines, setBackendMachines] = useState([]);
  const activeView = getMmsDashboardViewKey(view);
  const title = getTitle(activeView);
  const backHref = activeView === "overview" ? "/" : "/mms-dashboard";
  const dashboardMachines = backendMachines.length ? backendMachines : machines;
  const dashboardAreas = backendMachines.length ? buildAreaRows(dashboardMachines) : areas;

  useEffect(() => {
    const saved = localStorage.getItem("mms:sidebar:collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    let alive = true;
    api.get("/mms/simulation/machines")
      .then((response) => {
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        if (alive) setBackendMachines(rows.map(normalizeBackendMmsMachine));
      })
      .catch(() => {
        if (alive) setBackendMachines([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("mms:sidebar:collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <main className={styles.screen}>
      <div className={classNames(styles.layout, collapsed ? styles.layoutCollapsed : styles.layoutExpanded)}>
        <aside className={classNames(styles.sidebar, collapsed ? styles.sidebarCollapsed : "")}>
          <div className={classNames(styles.brand, collapsed ? "justify-center" : "")}>
            <span className={styles.logo}>MMS</span>
            <div className={classNames(styles.brandText, collapsed ? "hidden" : "")}>
              <h1>MMS Dashboard</h1>
              <p>Machine Monitoring System</p>
            </div>
          </div>
          <button className={styles.collapseButton} type="button" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? ">" : "Collapse"}
          </button>
          <nav className={styles.nav} aria-label="MMS Dashboard navigation">
            {navGroups.map((group) => (
              <section className={classNames(styles.navGroup, collapsed ? styles.navGroupCollapsed : "")} key={group.title}>
                <div className={classNames(styles.navTitle, collapsed ? "sr-only" : "")}>{group.title}</div>
                {group.items.map((item) => (
                  <Link
                    className={classNames(styles.navLink, collapsed ? styles.navLinkCollapsed : styles.navLinkExpanded, activeView === item.key ? styles.active : "")}
                    href={item.href}
                    key={item.key}
                    target={item.target}
                    title={item.label}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={classNames(styles.navText, collapsed ? "hidden" : "")}>{item.label}</span>
                  </Link>
                ))}
              </section>
            ))}
          </nav>
        </aside>

        <section className={styles.main}>
          {activeView !== "overview" ? (
            <header className={styles.topbar}>
              <div>
                <p className={styles.eyebrow}>Machine Monitoring System</p>
                <h2>{title}</h2>
                <p>{getSubtitle(activeView)}</p>
              </div>
              <Link className={styles.backButton} href={backHref}>Back</Link>
            </header>
          ) : null}

          <section className={styles.content}>
             {shouldShowGlobalFilter(activeView) ? <FilterBar machines={dashboardMachines} view={activeView} /> : null}
             {renderView(activeView, { areas: dashboardAreas, machines: dashboardMachines })}
          </section>
          {!["overview", "table-report", "machine-working", "graph-report", "overall-machine-working"].includes(activeView) ? <div className={styles.footer}>MMS Dashboard | Factory Management System</div> : null}
        </section>
      </div>
    </main>
  );
}

function getTitle(view) {
  const map = {
    overview: "Overview",
    dashboard: "Overview",
    "graph-report": "Graph Report",
    "machine-working": "Machine Working",
    "overall-machine-working": "Overall Working",
    "table-report": "Table Report"
  };
  return map[view] || "MMS Dashboard";
}

function shouldShowGlobalFilter(view) {
  return !["overview", "overall-machine-working", "graph-report", "table-report"].includes(view);
}

function getSubtitle(view) {
  const map = {
    overview: "Plant output, status, OEE, and machine health overview.",
    dashboard: "Plant output, status, OEE, and machine health overview.",
    "graph-report": "Graph report for output, OEE, quality, CT, and availability.",
    "machine-working": "Single machine output, CT, OEE, status timeline, and operator view.",
    "overall-machine-working": "Multi-machine working view for selected area and type.",
    "table-report": "Matrix table report for output, OEE, quality, CT, and availability."
  };
  return map[view] || "Machine monitoring system.";
}

function FilterBar({ machines: filterMachines = [], view }) {
  const isSingleMachine = view === "machine-working";
  const sourceMachines = filterMachines.length ? filterMachines : machines;
  const storageKey = `mms:${view}:filters`;
  const defaults = {
    area: isSingleMachine ? sourceMachines[0]?.area || "Line A" : "All",
    machineType: isSingleMachine ? sourceMachines[0]?.machineType || "Conveyor" : "All",
    machineNo: isSingleMachine ? sourceMachines[0]?.machineNo || "CNV-A-002" : "All",
    date: getBangkokTodayText()
  };
  const [filters, setFilters] = useState(defaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
      if (isSingleMachine) {
        setFilters({
          ...saved,
          area: saved.area === "All" ? defaults.area : saved.area,
          machineType: saved.machineType === "All" ? defaults.machineType : saved.machineType,
          machineNo: saved.machineNo === "All" ? defaults.machineNo : saved.machineNo
        });
      } else {
        setFilters(saved);
      }
    } catch {
      setFilters(defaults);
    } finally {
      setHydrated(true);
    }
  }, [storageKey, isSingleMachine]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(storageKey, JSON.stringify(filters));
      window.dispatchEvent(new CustomEvent("mms:global-filter-changed", { detail: { filters, view } }));
    }
  }, [filters, hydrated, storageKey]);

  const updateFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
  };
  const areaOptions = isSingleMachine ? uniqueValues(sourceMachines.map((machine) => machine.area)) : ["All", ...uniqueValues(sourceMachines.map((machine) => machine.area))];
  const typeOptions = isSingleMachine
    ? uniqueValues(sourceMachines.filter((machine) => !filters.area || machine.area === filters.area).map((machine) => machine.machineType))
    : ["All", ...uniqueValues(sourceMachines.filter((machine) => filters.area === "All" || machine.area === filters.area).map((machine) => machine.machineType))];
  const machineOptions = isSingleMachine
    ? uniqueValues(sourceMachines
      .filter((machine) => !filters.area || machine.area === filters.area)
      .filter((machine) => !filters.machineType || machine.machineType === filters.machineType)
      .map((machine) => machine.machineNo))
    : ["All", ...uniqueValues(sourceMachines
      .filter((machine) => filters.area === "All" || machine.area === filters.area)
      .filter((machine) => filters.machineType === "All" || machine.machineType === filters.machineType)
      .map((machine) => machine.machineNo))];

  return (
    <section className={styles.toolbar}>
      <div className={styles.field}>
        <label>Area</label>
        <select value={filters.area} onChange={updateFilter("area")}>{areaOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>Machine Type</label>
        <select value={filters.machineType} onChange={updateFilter("machineType")}>{typeOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>Machine No</label>
        <select value={filters.machineNo} onChange={updateFilter("machineNo")}>{machineOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>Date</label>
        <input value={filters.date} onChange={updateFilter("date")} type="date" />
      </div>
    </section>
  );
}

function renderView(view, data = {}) {
  if (view === "overview") return <DashboardView areas={data.areas} machines={data.machines} />;
  if (view === "overall-machine-working") return <OverallMachineWorkingView areas={data.areas} machines={data.machines} />;
  if (view === "machine-working") return <MachineWorkingView machines={data.machines} />;
  if (view === "graph-report") return <GraphReportView defaultPeriod="monthly" machines={data.machines} />;
  if (view === "table-report") return <TableReportView defaultPeriod="monthly" machines={data.machines} />;
  return <DashboardView areas={data.areas} machines={data.machines} />;
}

function Kpis() {
  const cards = [
    ["Total MC", "100", "#0ea5e9"],
    ["Running", "89", "#10b981"],
    ["Alarm", "2", "#ef4444"],
    ["Stop", "7", "#64748b"],
    ["Output OK", "65,100", "#2563eb"],
    ["OEE Avg", "88.4%", "#7c3aed"]
  ];
  return (
    <section className={styles.kpiGrid}>
      {cards.map(([label, value, color]) => (
        <article className={styles.kpi} key={label} style={{ borderTopColor: color }}>
          <small>{label}</small>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function DashboardView({ areas: viewAreas = areas, machines: viewMachines = machines }) {
  const [overviewFilters, setOverviewFilters] = useState(getDefaultMmsOverviewFilters());
  const [layoutScale, setLayoutScale] = useState(0.85);
  const [hydrated, setHydrated] = useState(false);
  const factoryLayoutRef = useRef(null);
  const layoutStates = viewMachines.map((machine) => ({ ...machine, layoutState: buildMmsLayoutMachineState(machine) }));
  const filteredLayoutStates = selectMmsOverviewMachines(layoutStates, overviewFilters);
  const overviewSummary = buildMmsOverviewSummary(layoutStates);
  const filteredSummary = buildMmsOverviewSummary(filteredLayoutStates);
  const areaLayout = viewAreas.map((area) => ({
    ...area,
    machines: filteredLayoutStates.filter((machine) => machine.area === area.area)
  })).filter((area) => area.machines.length > 0);

  useEffect(() => {
    try {
      setOverviewFilters({
        ...getDefaultMmsOverviewFilters(),
        ...JSON.parse(localStorage.getItem(mmsOverviewFilterStorageKey) || "{}")
      });
    } catch {
      setOverviewFilters(getDefaultMmsOverviewFilters());
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(mmsOverviewFilterStorageKey, JSON.stringify(overviewFilters));
    }
  }, [hydrated, overviewFilters]);

  const adjustLayoutScale = (step) => {
    setLayoutScale((current) => Math.min(1.3, Math.max(0.7, Number((current + step).toFixed(1)))));
  };

  const toggleFactoryFullscreen = async () => {
    const node = factoryLayoutRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await node.requestFullscreen();
    }
  };

  return (
    <section className={styles.overviewLayout}>
      <OverviewCommandBar filteredSummary={filteredSummary} summary={overviewSummary} />
      <OverviewFilterBar filters={overviewFilters} machines={layoutStates} onChange={setOverviewFilters} />

      <article className={styles.overviewFactoryPanel} ref={factoryLayoutRef}>
        <div className={styles.overviewFactoryHeader}>
          <div>
            <h3>Factory Layout Status</h3>
            <p>MMS + Job Request + PIC + Output / OK / NG / OEE</p>
          </div>
          <div className={styles.panelActions}>
            <button className={styles.panelActionButton} type="button" onClick={() => adjustLayoutScale(-0.1)}>−</button>
            <span className={styles.statusBadge}>{Math.round(layoutScale * 100)}%</span>
            <button className={styles.panelActionButton} type="button" onClick={() => adjustLayoutScale(0.1)}>+</button>
            <button className={styles.panelActionButtonPrimary} type="button" onClick={toggleFactoryFullscreen}>Full screen</button>
          </div>
        </div>
        {areaLayout.length === 0 ? (
          <div className={styles.overallEmpty}>No machines match the selected filters.</div>
        ) : (
          <div className={styles.overviewFactoryScaleWrap}>
            <div className={styles.overviewFactoryLayout} style={{ zoom: layoutScale }}>
              {areaLayout.map((area) => (
                <article className={styles.overviewAreaCard} key={area.area}>
                  <div className={styles.overviewAreaHeader}>
                    <div>
                      <h4>{area.area}</h4>
                      <p>{area.machines.length} machines / {area.machines.filter((machine) => machine.layoutState.mmsStatus === "RUN").length} MMS running</p>
                    </div>
                  </div>
                  <div className={styles.typeStack}>
                    {groupMachinesByType(area.machines).map((group) => (
                      <section className={styles.overviewTypeBlock} key={`${area.area}-${group.machineType}`}>
                        <h5>{group.machineType}</h5>
                        <div className={styles.overviewMachineGrid}>
                          {group.machines.map((machine) => <OverviewMachineCard key={machine.machineNo} machine={machine} />)}
                        </div>
                      </section>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

function OverviewCommandBar({ filteredSummary, summary }) {
  const cards = [
    { color: "#22c55e", label: "Running", note: `${summary.availability}% availability`, value: `${summary.running}/${summary.total}` },
    { color: "#ef4444", label: "Alarm", note: "Needs response", value: summary.alarm },
    { color: "#64748b", label: "Stopped", note: "Output blocked", value: summary.stopped },
    { color: "#8b5cf6", label: "Active Job", note: "Repair / QC context", value: summary.activeJobs },
    { color: "#38bdf8", label: "Output OK", note: "Current working day", value: summary.outputOk.toLocaleString() },
    { color: "#f97316", label: "NG Rate", note: `${summary.outputNg.toLocaleString()} NG`, value: `${summary.ngRate}%` },
    { color: "#14b8a6", label: "OEE Avg", note: "All monitored machines", value: `${summary.oeeAverage}%` },
    { color: "#eab308", label: "Filtered", note: "Machines on board", value: filteredSummary.total }
  ];

  return (
    <section className={styles.overviewCommandBar}>
      <div className={styles.overviewCommandCopy}>
        <div className={styles.overviewCommandHeader}>
          <div>
            <h3>MMS Dashboard Overview</h3>
            <p>Factory control room status board for the 07:00-07:00 working day.</p>
          </div>
        </div>
        <div className={styles.overviewCommandMeta}>
          <span><i style={{ backgroundColor: "#22c55e" }} />Live</span>
          <span><i style={{ backgroundColor: "#38bdf8" }} />Shift Monitor</span>
          <span><i style={{ backgroundColor: "#f97316" }} />Job Overlay</span>
        </div>
      </div>
      <div className={styles.overviewCommandKpis}>
        {cards.map((card) => (
          <article className={styles.overviewCommandKpi} key={card.label} style={{ borderTop: `4px solid ${card.color}` }}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <span>{card.note}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function OverviewFilterBar({ filters, machines, onChange }) {
  const areaOptions = ["All", ...uniqueValues(machines.map((machine) => machine.area))];
  const typeOptions = ["All", ...uniqueValues(machines
    .filter((machine) => filters.area === "All" || machine.area === filters.area)
    .map((machine) => machine.machineType || machine.type))];
  const machineOptions = ["All", ...uniqueValues(machines
    .filter((machine) => filters.area === "All" || machine.area === filters.area)
    .filter((machine) => filters.machineType === "All" || machine.machineType === filters.machineType || machine.type === filters.machineType)
    .map((machine) => machine.machineNo || machine.name))];
  const mmsOptions = ["All", "ALARM", "STOPPED", ...mmsMachineStatuses];
  const jobOptions = ["All", "HAS_JOB", ...uniqueValues(machines.map((machine) => machine.layoutState?.jobStatus || "NONE"))];
  const quickFilters = [
    { label: "All", patch: getDefaultMmsOverviewFilters() },
    { label: "Alarm", patch: { ...getDefaultMmsOverviewFilters(), mmsStatus: "ALARM" } },
    { label: "Stopped", patch: { ...getDefaultMmsOverviewFilters(), mmsStatus: "STOPPED" } },
    { label: "Active Job", patch: { ...getDefaultMmsOverviewFilters(), jobStatus: "HAS_JOB" } },
    { label: "Running", patch: { ...getDefaultMmsOverviewFilters(), mmsStatus: "RUN" } }
  ];

  function updateFilter(key) {
    return (event) => {
      const value = event.target.value;
      onChange((current) => {
        const next = { ...current, [key]: value };
        if (key === "area") {
          next.machineType = "All";
          next.machineNo = "All";
        }
        if (key === "machineType") {
          next.machineNo = "All";
        }
        return next;
      });
    };
  }

  function applyQuickFilter(patch) {
    onChange((current) => ({
      ...current,
      ...patch
    }));
  }

  function isQuickFilterActive(patch) {
    return Object.entries(patch).every(([key, value]) => filters[key] === value);
  }

  return (
    <section className={styles.overviewFilterPanel}>
      <div className={styles.field}>
        <label>Area</label>
        <select value={filters.area} onChange={updateFilter("area")}>{areaOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>Machine Type</label>
        <select value={filters.machineType} onChange={updateFilter("machineType")}>{typeOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>Machine No</label>
        <select value={filters.machineNo} onChange={updateFilter("machineNo")}>{machineOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>MMS Status</label>
        <select value={filters.mmsStatus} onChange={updateFilter("mmsStatus")}>{mmsOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>Job Status</label>
        <select value={filters.jobStatus} onChange={updateFilter("jobStatus")}>{jobOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.overviewQuickFilters}>
        {quickFilters.map((item) => (
          <button
            className={isQuickFilterActive(item.patch) ? styles.overviewQuickFilterActive : ""}
            key={item.label}
            onClick={() => applyQuickFilter(item.patch)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function groupMachinesByType(rows = []) {
  return Object.values(rows.reduce((groups, machine) => {
    const key = machine.machineType || "Other";
    groups[key] = groups[key] || { machineType: key, machines: [] };
    groups[key].machines.push(machine);
    return groups;
  }, {}));
}

function OverviewMachineCard({ machine }) {
  const state = machine.layoutState || buildMmsLayoutMachineState(machine);
  const okOutput = Math.max(0, Number(machine.output || 0) - Number(machine.ng || 0));
  const outputGateLabel = state.canProduceOutput ? "Output ON" : "Output Block";
  const jobOverlayLabel = state.hasJob ? `Job ${compactMmsStatus(state.jobStatus)}` : "No Job";

  return (
    <article className={styles.overviewMachineCard} data-testid="mms-overview-machine-card" style={statusCardStyle(state.mmsStatus)}>
      <div className={styles.overviewMachineTitle}>
        <div>
          <h5>{state.machineNo}</h5>
          <p>{machine.model || "MODEL-A"}</p>
        </div>
        <span className={styles.overviewStatusBadge} style={statusBadgeStyle(state.mmsStatus)} title={state.mmsStatus}>{compactMmsStatus(state.mmsStatus)}</span>
      </div>
      <div className={styles.overviewMachineMeta}>
        <span><b>Job</b><em>{state.jobStatus}</em></span>
        <span><b>PIC</b><em>{state.responsible}</em></span>
      </div>
      <div className={styles.overviewMachineGate}>
        <span style={statusBadgeStyle(state.canProduceOutput ? "RUN" : "STOP")}>{outputGateLabel}</span>
        <b>{jobOverlayLabel}</b>
      </div>
      <div className={styles.overviewMachineMetrics}>
        <span><small>Out</small><strong>{Number(machine.output || 0).toLocaleString()}</strong></span>
        <span><small>OK</small><strong>{okOutput.toLocaleString()}</strong></span>
        <span><small>NG</small><strong>{Number(machine.ng || 0).toLocaleString()}</strong></span>
        <span><small>OEE</small><strong>{machine.oee}%</strong></span>
      </div>
    </article>
  );
}

function OverviewKpi({ color, label, note, value }) {
  return (
    <article className={styles.overviewKpi} style={{ borderTopColor: color, borderTopWidth: 4 }}>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function GraphReportView({ defaultPeriod = "monthly", forcePeriod = false, machines: sourceMachines = machines }) {
  const [filters, setFilters] = useReportFilters(defaultPeriod, forcePeriod);
  const currentReportMachines = buildReportMachineRows(sourceMachines.length ? sourceMachines : machines);
  const selectedMachines = selectMmsReportMachines(currentReportMachines, filters);
  const report = useMmsReport(filters);
  const series = buildMmsGraphReportSeries(filters.graphPeriod, filters, report?.series);

  return (
    <section className={styles.reportViewportLayout}>
      <ReportFilterBar filters={filters} machines={currentReportMachines} onChange={setFilters} showPeriod />
      <section className={styles.reportGrid2}>
        <Panel title="Output Monitor" meta={`${selectedMachines.length} machines`}>
          <ChartBox>
            <ComposedChart data={series.output}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="outputActual" name="Output Actual" fill="#10b981" isAnimationActive={false} />
              <Line yAxisId="left" dataKey="outputTarget" name="Output Target" stroke="#365314" strokeDasharray="5 5" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="right" dataKey="outputAccum" name="Output Accum" stroke="#dc2626" strokeWidth={3} isAnimationActive={false} />
              <Line yAxisId="right" dataKey="outputTargetAccum" name="Target Accum" stroke="#f472b6" strokeDasharray="5 5" strokeWidth={2} isAnimationActive={false} />
            </ComposedChart>
          </ChartBox>
        </Panel>
        <Panel title="CT & Availability Monitor" meta={filters.graphPeriod.toUpperCase()}>
          <ChartBox>
            <ComposedChart data={series.ctAvailability}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cycleTimeActual" name="Cycle Time Actual" fill="#60a5fa" isAnimationActive={false} />
              <Line yAxisId="left" dataKey="cycleTimeTarget" name="Cycle Time Target" stroke="#1e3a8a" strokeDasharray="5 5" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="right" dataKey="availabilityActual" name="Availability Actual" stroke="#15803d" strokeWidth={3} isAnimationActive={false} />
              <Line yAxisId="right" dataKey="availabilityTarget" name="Availability Target" stroke="#f97316" strokeDasharray="5 5" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ChartBox>
        </Panel>
        <Panel title="OEE Performance Trend" meta="A / P / Q">
          <ChartBox>
            <ComposedChart data={series.oee}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[60, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={85} stroke="#f97316" strokeDasharray="6 6" label={{ value: "Target 85%", fill: "#c2410c", fontSize: 11 }} />
              <Bar dataKey="oee" name="OEE" fill="#0f766e" isAnimationActive={false} />
              <Line dataKey="availability" name="A Availability" stroke="#16a34a" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line dataKey="performance" name="P Performance" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line dataKey="quality" name="Q Quality" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ChartBox>
        </Panel>
        <Panel title="NG / Reject Trend" meta="Quality">
          <ChartBox>
            <BarChart data={series.ngReject}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ngQty" name="NG Qty" fill="#ef4444" isAnimationActive={false} />
              <Bar dataKey="overReject" name="Over Reject" fill="#f97316" isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </Panel>
      </section>
    </section>
  );
}

function TableReportView({ defaultPeriod = "monthly", machines: sourceMachines = machines }) {
  const [filters, setFilters] = useReportFilters(defaultPeriod);
  const currentReportMachines = buildReportMachineRows(sourceMachines.length ? sourceMachines : machines);
  const selectedMachines = selectMmsReportMachines(currentReportMachines, filters).slice(0, 6);
  const columns = buildMmsReportColumns(filters.graphPeriod, filters);
  const reportByMachine = useMmsReportsByMachine(filters, selectedMachines);
  const rows = buildMmsReportMatrixRows(selectedMachines, columns, { machineType: filters.machineType, reportByMachine });
  const summary = buildMmsMachineTypeSummary(selectedMachines);

  const hasMachineTypeSummary = filters.machineType !== "All";

  return (
    <section className={styles.reportViewportLayout}>
      <ReportFilterBar filters={filters} machines={currentReportMachines} onChange={setFilters} showPeriod />
      <div className={hasMachineTypeSummary ? styles.reportTableBodyWithSummary : styles.reportTableBody}>
        {hasMachineTypeSummary ? <MachineTypeSummary machineType={filters.machineType} summary={summary} /> : null}
        <div className={styles.reportTableMatrixSlot}>
          <ReportMatrixTable columns={columns} rows={rows} />
        </div>
      </div>
    </section>
  );
}

function MachineTypeSummary({ machineType, summary }) {
  return (
    <section className={styles.reportSummaryPanel}>
      <div>
        <small>Machine Type</small>
        <strong>{machineType}</strong>
      </div>
      <div>
        <small>Machines</small>
        <strong>{summary.totalMachines}</strong>
      </div>
      <div>
        <small>Running</small>
        <strong>{summary.running}</strong>
      </div>
      <div>
        <small>Active Jobs</small>
        <strong>{summary.activeJobs}</strong>
      </div>
      <div>
        <small>Output / NG</small>
        <strong>{summary.output.toLocaleString()} / {summary.ng.toLocaleString()}</strong>
      </div>
      <div>
        <small>OEE Avg</small>
        <strong>{summary.oeeAverage.toFixed(1)}%</strong>
      </div>
    </section>
  );
}

function useReportFilters(defaultPeriod, forcePeriod = false) {
  const defaults = getDefaultMmsReportFilters(defaultPeriod);
  const [filters, setFilters] = useState(defaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(mmsReportsFilterStorageKey) || "{}");
      const migrated = {
        ...saved,
        area: saved.area ?? saved.className ?? defaults.area
      };
      delete migrated.className;
      setFilters({
        ...defaults,
        ...migrated,
        graphPeriod: forcePeriod ? defaultPeriod : migrated.graphPeriod || defaultPeriod
      });
    } catch {
      setFilters(defaults);
    } finally {
      setHydrated(true);
    }
  }, [defaultPeriod, forcePeriod]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(mmsReportsFilterStorageKey, JSON.stringify(filters));
    }
  }, [filters, hydrated]);

  return [filters, setFilters];
}

function ReportFilterBar({ filters, machines, onChange, showPeriod = false }) {
  const selectedArea = filters.area || "All";
  const areaOptions = ["All", ...uniqueValues(machines.map((machine) => machine.area || machine.areaName))];
  const typeOptions = ["All", ...uniqueValues(machines
    .filter((machine) => selectedArea === "All" || machine.area === selectedArea || machine.areaName === selectedArea)
    .map((machine) => machine.machineType))];
  const machineOptions = ["All", ...uniqueValues(machines
    .filter((machine) => selectedArea === "All" || machine.area === selectedArea || machine.areaName === selectedArea)
    .filter((machine) => filters.machineType === "All" || machine.machineType === filters.machineType)
    .map((machine) => machine.machineNo))];
  const dateField = filters.graphPeriod === "daily" ? "date" : filters.graphPeriod === "yearly" ? "year" : "month";
  const dateType = filters.graphPeriod === "daily" ? "date" : filters.graphPeriod === "yearly" ? "number" : "month";

  const update = (key) => (event) => {
    const value = event.target.value;
    onChange((current) => {
      const next = { ...current, [key]: value };
      if (key === "area") {
        next.machineType = "All";
        next.machineNo = "All";
      }
      if (key === "machineType") next.machineNo = "All";
      return next;
    });
  };

  return (
    <section className={styles.reportFilterPanel}>
      <div className={styles.field}>
        <label>Area</label>
        <select value={selectedArea} onChange={update("area")}>{areaOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>Machine Type</label>
        <select value={filters.machineType} onChange={update("machineType")}>{typeOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      <div className={styles.field}>
        <label>Machine No</label>
        <select value={filters.machineNo} onChange={update("machineNo")}>{machineOptions.map((option) => <option key={option}>{option}</option>)}</select>
      </div>
      {showPeriod ? (
        <div className={styles.field}>
          <label>Period</label>
          <select value={filters.graphPeriod} onChange={update("graphPeriod")}>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      ) : null}
      <div className={styles.field}>
        <label>{dateField}</label>
        <input type={dateType} value={filters[dateField]} onChange={update(dateField)} />
      </div>
      <button className={styles.reportPrimaryButton} type="button">Export Excel</button>
    </section>
  );
}

function ReportMatrixTable({ columns, rows }) {
  const dateHeaderRef = useRef(null);
  const dateBodyRef = useRef(null);

  const syncDateHeaderScroll = () => {
    if (!dateHeaderRef.current || !dateBodyRef.current) return;
    dateHeaderRef.current.scrollLeft = dateBodyRef.current.scrollLeft;
  };

  return (
    <div className={styles.reportMatrixPanel}>
      <div className={styles.reportMatrixHeader}>
        <div className={styles.reportFixedPanel}>
          <table className={styles.reportFixedTableHeader}>
            <colgroup>
              <col className="w-[84px]" />
              <col className="w-[74px]" />
              <col className="w-[104px]" />
              <col className="w-[92px]" />
              <col className="w-[164px]" />
              <col className="w-[108px]" />
            </colgroup>
            <thead>
              <tr>
                <th>MC No</th>
                <th>Model</th>
                <th>Model Name</th>
                <th>Area</th>
                <th className="border-l-2 border-l-slate-600">Metric</th>
                <th className="border-l-2 border-l-slate-600 bg-amber-200 text-amber-950">Total</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className={styles.reportDateHeaderPanel} ref={dateHeaderRef}>
          <table className={styles.reportDateTableHeader}>
            <colgroup>
              {columns.map((column) => <col className="w-[66px]" key={column.key} />)}
            </colgroup>
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              </tr>
            </thead>
          </table>
        </div>
      </div>
      <div className={styles.reportMatrixBody}>
        <div className={styles.reportMatrixSplit}>
          <div className={styles.reportFixedPanel}>
            <table className={styles.reportFixedTable}>
              <colgroup>
                <col className="w-[84px]" />
                <col className="w-[74px]" />
                <col className="w-[104px]" />
                <col className="w-[92px]" />
                <col className="w-[164px]" />
                <col className="w-[108px]" />
              </colgroup>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`fixed-${row.machineNo || "row"}-${row.metric}-${rowIndex}`}
                  className={classNames(row.rowType === "summary" ? "bg-amber-50" : "bg-white", row.isFirstMetric ? styles.reportDividerRow : "")}
                >
                  {row.isFirstMetric ? (
                    <>
                      <td className={classNames(styles.reportMergedCell, row.rowType === "summary" ? styles.reportSummaryCell : "")} rowSpan={row.rowSpan}>{row.machineNo}</td>
                      <td className={classNames(styles.reportMergedCell, row.rowType === "summary" ? styles.reportSummaryCell : "")} rowSpan={row.rowSpan}>{row.modelType}</td>
                      <td className={classNames(styles.reportMergedCell, row.rowType === "summary" ? styles.reportSummaryCell : "")} rowSpan={row.rowSpan}>{row.modelName}</td>
                      <td className={classNames(styles.reportMergedCell, row.rowType === "summary" ? styles.reportSummaryCell : "")} rowSpan={row.rowSpan}>{row.process}</td>
                    </>
                  ) : null}
                  <td className={classNames(styles.reportMetricCell, row.rowType === "summary" ? styles.reportSummaryCell : "")}>{row.metric}</td>
                  <td className={styles.reportTotalCell}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.reportDateBodyPanel} onScroll={syncDateHeaderScroll} ref={dateBodyRef}>
          <table className={styles.reportDateTable}>
            <colgroup>
              {columns.map((column) => <col className="w-[66px]" key={column.key} />)}
            </colgroup>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`date-${row.machineNo || "row"}-${row.metric}-${rowIndex}`}
                  className={classNames(row.rowType === "summary" ? "bg-amber-50" : "bg-white", row.isFirstMetric ? styles.reportDividerRow : "")}
                >
                  {row.cells.map((cell, cellIndex) => (
                    <td
                      className={cell === "-" ? "bg-rose-50 text-slate-500" : row.rowType === "summary" ? styles.reportSummaryCell : "bg-white"}
                      key={`${rowIndex}-${cellIndex}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

function OverallMachineWorkingView({ areas: sourceAreas = areas, machines: sourceMachines = machines }) {
  const storageKey = "mms:overall-machine-working:filters";
  const activeMachines = sourceMachines.length ? sourceMachines : machines;
  const activeAreas = sourceAreas.length ? sourceAreas : areas;
  const firstArea = activeAreas[0]?.area || activeMachines[0]?.area || "Line A";
  const defaultFilters = {
    area: firstArea,
    date: getBangkokTodayText(),
    machineType: "All",
    machineNos: activeMachines.filter((machine) => machine.area === firstArea).slice(0, 4).map((machine) => machine.machineNo)
  };
  const [filters, setFilters] = useState(defaultFilters);
  const [hydrated, setHydrated] = useState(false);
  const [machineMenuOpen, setMachineMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("output");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      setFilters({
        ...defaultFilters,
        ...saved,
        machineNos: Array.isArray(saved.machineNos) ? saved.machineNos : defaultFilters.machineNos
      });
      const requestedTab = new URLSearchParams(window.location.search).get("tab");
      const savedTab = localStorage.getItem("mms:overall-machine-working:tab");
      if (requestedTab === "status" || savedTab === "status") setActiveTab("status");
    } catch {
      setFilters(defaultFilters);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    }
  }, [filters, hydrated]);

  const areaOptions = ["All", ...activeAreas.map((item) => item.area)];
  const typeOptions = ["All", ...Array.from(new Set(activeMachines.filter((machine) => filters.area === "All" || machine.area === filters.area).map((machine) => machine.machineType)))];
  const machineOptions = activeMachines.filter((machine) => {
    const areaMatched = filters.area === "All" || machine.area === filters.area;
    const typeMatched = filters.machineType === "All" || machine.machineType === filters.machineType;
    return areaMatched && typeMatched;
  });
  const selectedMachines = selectOverallMmsMachines(activeMachines, filters);

  function updateSelect(key) {
    return (event) => {
      const value = event.target.value;
      setFilters((current) => {
        const next = { ...current, [key]: value };
        const nextOptions = activeMachines.filter((machine) => {
          const areaMatched = key === "area" ? value === "All" || machine.area === value : next.area === "All" || machine.area === next.area;
          const typeMatched = key === "machineType" ? value === "All" || machine.machineType === value : next.machineType === "All" || machine.machineType === next.machineType;
          return areaMatched && typeMatched;
        });
        return {
          ...next,
          machineNos: next.machineNos.filter((machineNo) => nextOptions.some((machine) => machine.machineNo === machineNo))
        };
      });
    };
  }

  function updateDate(event) {
    setFilters((current) => ({ ...current, date: event.target.value || current.date }));
  }

  function toggleMachine(machineNo) {
    setFilters((current) => ({
      ...current,
      machineNos: current.machineNos.includes(machineNo)
        ? current.machineNos.filter((item) => item !== machineNo)
        : [...current.machineNos, machineNo]
    }));
  }

  function toggleAllMachines() {
    const allNos = machineOptions.map((machine) => machine.machineNo);
    const allSelected = allNos.length > 0 && allNos.every((machineNo) => filters.machineNos.includes(machineNo));
    setFilters((current) => ({ ...current, machineNos: allSelected ? [] : allNos }));
  }

  function changeTab(tab) {
    setActiveTab(tab);
    if (typeof window !== "undefined") localStorage.setItem("mms:overall-machine-working:tab", tab);
  }

  const allMachinesSelected = machineOptions.length > 0 && machineOptions.every((machine) => filters.machineNos.includes(machine.machineNo));
  const machineSelectionLabel = allMachinesSelected
    ? "All machines"
    : filters.machineNos.length
      ? `${filters.machineNos.length} selected`
      : "Select machine";

  return (
    <>
      <section className={styles.overallFilterPanel}>
        <div className={styles.field}>
          <label>Area</label>
          <select value={filters.area} onChange={updateSelect("area")}>{areaOptions.map((option) => <option key={option}>{option}</option>)}</select>
        </div>
        <div className={styles.field}>
          <label>Machine Type</label>
          <select value={filters.machineType} onChange={updateSelect("machineType")}>{typeOptions.map((option) => <option key={option}>{option}</option>)}</select>
        </div>
        <div className={styles.field}>
          <label>Machine No</label>
          <div className={styles.machineDropdown}>
            <button onClick={() => setMachineMenuOpen((open) => !open)} type="button">
              <span>{machineSelectionLabel}</span>
              <b>{machineMenuOpen ? "▲" : "▼"}</b>
            </button>
            {machineMenuOpen ? (
              <div className={styles.machineDropdownMenu}>
                <label className={styles.machineCheck}>
                  <input checked={allMachinesSelected} onChange={toggleAllMachines} type="checkbox" />
                  <span>All machines</span>
                </label>
                {machineOptions.map((machine) => (
                  <label className={styles.machineCheck} key={machine.machineNo}>
                    <input checked={filters.machineNos.includes(machine.machineNo)} onChange={() => toggleMachine(machine.machineNo)} type="checkbox" />
                    <span>{machine.machineNo}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.field}>
          <label>Date</label>
          <input onChange={updateDate} type="date" value={filters.date} />
        </div>
        <div className={styles.overallTabSwitch}>
          <TabButton active={activeTab === "output"} onClick={() => changeTab("output")}>Output</TabButton>
          <TabButton active={activeTab === "status"} onClick={() => changeTab("status")}>Status</TabButton>
        </div>
      </section>
      <section className={styles.overallMachineGrid}>
        {selectedMachines.length ? selectedMachines.map((machine) => (
          <OverallMachineCard activeTab={activeTab} date={filters.date} key={machine.machineNo} machine={machine} />
        )) : (
          <article className={styles.overallEmpty}>Select at least one machine number.</article>
        )}
      </section>
    </>
  );
}

function OverallMachineCard({ activeTab, date, machine }) {
  const report = useMmsReport({
    area: machine.area,
    date,
    graphPeriod: "daily",
    machineNo: machine.machineNo,
    machineType: machine.machineType
  }, Boolean(machine?.machineNo));
  const chartData = buildHourlyRowsFromReport(report);
  const statusSegments = buildStatusSegmentsFromReport(report);
  const downtimeRows = buildDowntimeRowsFromReport(report);

  return (
    <article className={styles.overallCard}>
      <OverallMachineHeader date={date} machine={machine} />
      {activeTab === "output" ? (
        <div className={styles.overallChartRow}>
          <div className={styles.overallChartCell}>
            <ChartBox overall>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" interval={3} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="qty" width={34} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="accum" orientation="right" width={42} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar yAxisId="qty" dataKey="output" name="Output Actual" fill="#00b050" isAnimationActive={false} />
                <Line yAxisId="qty" dataKey="target" name="Output Target" stroke="#385723" strokeWidth={3} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                <Line yAxisId="accum" dataKey="accum" name="Output Accum" stroke="#c00000" strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="accum" dataKey="targetAccum" name="Output Target Accum" stroke="#f062b0" strokeWidth={3} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ChartBox>
            <ChartLegend items={[
              ["Output Actual", "#00b050"],
              ["Output Target", "#385723"],
              ["Output Accum", "#c00000"],
              ["Target Accum", "#f062b0"]
            ]} />
          </div>
          <div className={styles.overallChartCell}>
            <ChartBox overall>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" interval={3} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="ct" width={32} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="percent" orientation="right" width={34} domain={[0, 120]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar yAxisId="ct" dataKey="ct" name="Cycle Time Actual" fill="#5b9bd5" isAnimationActive={false} />
                <Line yAxisId="ct" dataKey="ctTarget" name="Cycle Time Target" stroke="#203864" strokeWidth={3} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                <Line yAxisId="percent" dataKey="availability" name="Availability Actual" stroke="#02630f" strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="percent" dataKey="availabilityTarget" name="Availability Target" stroke="#ff6600" strokeWidth={3} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ChartBox>
            <ChartLegend items={[
              ["CT Actual", "#5b9bd5"],
              ["CT Target", "#203864"],
              ["Avail Actual", "#02630f"],
              ["Avail Target", "#ff6600"]
            ]} />
          </div>
        </div>
      ) : (
        <div className={styles.overallStatusBlock}>
          <MachineStatusTimeline segments={statusSegments} />
          <ChartBox overall>
            <BarChart data={downtimeRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} />
              <YAxis width={30} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="percent" name="Downtime %" fill="#64748b" isAnimationActive={false}>
                {downtimeRows.map((entry) => <Cell key={entry.status} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ChartBox>
        </div>
      )}
    </article>
  );
}

function MachineWorkingView({ machines: sourceMachines = machines }) {
  const activeMachines = sourceMachines.length ? sourceMachines : machines;
  const [activeTab, setActiveTab] = useState("output");
  const [filters, setFilters] = useState(() => ({
    area: activeMachines[0]?.area || "Line A",
    date: getBangkokTodayText(),
    machineNo: activeMachines[0]?.machineNo || "CNV-A-002",
    machineType: activeMachines[0]?.machineType || "Conveyor"
  }));
  const machine = activeMachines.find((row) => row.machineNo === filters.machineNo)
    || activeMachines.find((row) => row.area === filters.area && row.machineType === filters.machineType)
    || activeMachines[0]
    || machines[1];
  const date = filters.date || getBangkokTodayText();
  const report = useMmsReport({
    area: machine.area,
    date,
    graphPeriod: "daily",
    machineNo: machine.machineNo,
    machineType: machine.machineType
  }, Boolean(machine?.machineNo));
  const chartData = buildHourlyRowsFromReport(report);
  const statusSegments = buildStatusSegmentsFromReport(report);
  const downtimeRows = buildDowntimeRowsFromReport(report);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const savedTab = localStorage.getItem("mmsMachineWorkingTab");
    if (requestedTab === "status" || savedTab === "status") {
      setActiveTab("status");
    }
  }, []);

  useEffect(() => {
    function readFilters() {
      try {
        const saved = JSON.parse(localStorage.getItem("mms:machine-working:filters") || "{}");
        setFilters((current) => ({
          ...current,
          ...saved
        }));
      } catch {
        setFilters((current) => current);
      }
    }

    function handleFilterEvent(event) {
      if (event.detail?.view === "machine-working") {
        setFilters((current) => ({ ...current, ...event.detail.filters }));
      }
    }

    readFilters();
    window.addEventListener("mms:global-filter-changed", handleFilterEvent);
    return () => window.removeEventListener("mms:global-filter-changed", handleFilterEvent);
  }, []);

  const changeTab = (tab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") localStorage.setItem("mmsMachineWorkingTab", tab);
  };

  return (
    <>
      <MachineWorkingSummary date={date} machine={machine} />
      {activeTab === "output" ? (
        <section className={styles.machineWorkingChartGrid}>
          <Panel title="Output Monitor" meta="Actual / target / accum">
            <ChartBox tall>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis yAxisId="qty" />
                <YAxis yAxisId="accum" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="qty" dataKey="output" name="Output Actual" fill="#00b050" isAnimationActive={false} />
                <Line yAxisId="qty" dataKey="target" name="Output Target" stroke="#385723" strokeWidth={4} strokeDasharray="7 7" dot={false} isAnimationActive={false} />
                <Line yAxisId="accum" dataKey="accum" name="Output Accum" stroke="#c00000" strokeWidth={3} isAnimationActive={false} />
                <Line yAxisId="accum" dataKey="targetAccum" name="Output Target Accum" stroke="#f062b0" strokeWidth={4} strokeDasharray="7 7" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ChartBox>
          </Panel>
          <Panel
            title="CT & Avail Monitor"
            meta={<TabButton active={false} onClick={() => changeTab("status")}>Status</TabButton>}
          >
            <ChartBox tall>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis yAxisId="ct" />
                <YAxis yAxisId="percent" orientation="right" domain={[0, 120]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="ct" dataKey="ct" name="Cycle Time Actual" fill="#5b9bd5" isAnimationActive={false} />
                <Line yAxisId="ct" dataKey="ctTarget" name="Cycle Time Target" stroke="#203864" strokeWidth={4} strokeDasharray="7 7" dot={false} isAnimationActive={false} />
                <Line yAxisId="percent" dataKey="availability" name="Availability Actual" stroke="#02630f" strokeWidth={3} isAnimationActive={false} />
                <Line yAxisId="percent" dataKey="availabilityTarget" name="Availability Target" stroke="#ff6600" strokeWidth={4} strokeDasharray="7 7" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ChartBox>
          </Panel>
        </section>
      ) : (
        <Panel
          title="Machine Status Timeline"
          meta={<TabButton active={false} onClick={() => changeTab("output")}>Output</TabButton>}
        >
          <section className={styles.statusMonitorGrid}>
            <div className={styles.statusTimelinePanel}>
              <MachineStatusTimeline segments={statusSegments} />
            </div>
            <div className={styles.statusBreakdownPanel}>
              <h4>Downtime Breakdown (%)</h4>
              <ChartBox compact>
                <BarChart data={downtimeRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                  <Tooltip />
                  <Bar dataKey="percent" name="Downtime %" fill="#64748b" isAnimationActive={false}>
                    {downtimeRows.map((entry) => <Cell key={entry.status} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ChartBox>
            </div>
          </section>
        </Panel>
      )}
    </>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      className={active ? styles.chartTabButtonActive : styles.chartTabButton}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ChartLegend({ items }) {
  return (
    <div className={styles.overallChartLegend}>
      {items.map(([label, color]) => (
        <span key={label}>
          <i style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function MachineStatusTimeline({ segments = machineStatusSegments }) {
  const [hovered, setHovered] = useState(null);
  let cursorPercent = 0;

  return (
    <div className={styles.machineStatusTimeline}>
      <div className={styles.shiftScale}>
        {["07:00", "11:00", "15:00", "19:00", "23:00", "03:00", "07:00"].map((time, index) => <span key={`${time}-${index}`}>{time}</span>)}
      </div>
      <div className={styles.statusTrack}>
        {segments.map((segment) => {
          const left = cursorPercent + segment.percent / 2;
          cursorPercent += segment.percent;
          return (
            <div
              className={styles.statusSegment}
              key={`${segment.start}-${segment.label}`}
              onMouseEnter={() => setHovered({ ...segment, left })}
              onMouseLeave={() => setHovered(null)}
              style={{ ...statusFillStyle(segment.status), flexGrow: segment.percent }}
              title={`${segment.label} ${segment.start} - ${segment.end}`}
            >
              <span aria-hidden="true" />
            </div>
          );
        })}
        {hovered ? (
          <div className={styles.statusTooltip} style={{ left: `${Math.min(92, Math.max(8, hovered.left))}%` }}>
            <b>{hovered.label}</b>
            <span>Time: {hovered.start} - {hovered.end}</span>
            <span>{hovered.percent.toFixed(1)}% of shift</span>
          </div>
        ) : null}
      </div>
      <div className={styles.statusLegend}>
        {mmsStatusLegend.map((item) => (
          <span key={item.status}><i style={statusFillStyle(item.status)} />{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function getMachineWorkingMetrics(machine) {
  const okQty = Number(machine.outputOk ?? Math.max(0, Number(machine.output || 0) - Number(machine.ng || 0)));
  const ngQty = Number(machine.outputNg ?? machine.ng ?? 0);
  const totalOutput = okQty + ngQty;
  const target = Number(machine.targetOutput ?? machine.target ?? totalOutput ?? 0);
  const availability = Number(machine.availability ?? 0);
  const performance = Number(machine.performance ?? (target > 0 ? (totalOutput / target) * 100 : 0));
  const quality = Number(machine.quality ?? (totalOutput > 0 ? (okQty / totalOutput) * 100 : 0));
  const oee = Number(machine.oee ?? ((availability * performance * quality) / 10000));
  const mmsStatus = machine.simMachineAlarm ? "ALARM" : machine.plcStatus || machine.status || "RUN";

  return {
    achieve: target > 0 ? Number(((totalOutput / target) * 100).toFixed(1)) : 0,
    availability: Number(availability.toFixed(1)),
    cycleTime: machine.ct || machine.cycleTime,
    mmsStatus,
    model: machine.model || "MODEL-B",
    ngQty,
    oee: Number(oee.toFixed(1)),
    okQty,
    performance: Number(performance.toFixed(1)),
    quality: Number(quality.toFixed(1)),
    target,
    totalOutput
  };
}

function OverallMachineHeader({ date = "2026-05-13", machine }) {
  const metrics = getMachineWorkingMetrics(machine);
  const kpis = [
    ["Date", formatCardDate(date), ""],
    ["Output", `${metrics.totalOutput}/${metrics.target}`, ""],
    ["OK / NG", `${metrics.okQty}/${metrics.ngQty}`, ""],
    ["Cycle Time", `${metrics.cycleTime}s`, ""]
  ];

  return (
    <div className={styles.overallMiniHeader}>
      <div className={styles.overallMiniOperator}>
        <img alt="Operator OP-014" src={operatorAvatar} />
        <span>
          <small>Operator</small>
          <strong>OP-014</strong>
          <b>Somchai W.</b>
        </span>
      </div>
      <div className={styles.overallMiniCenter}>
        <div className={styles.overallMiniTopLine}>
          <span className={styles.overallMiniMachineBlock}>
            <small>Machine</small>
            <strong>{machine.name || machine.machineNo}</strong>
          </span>
          <div className={styles.overallMiniMeta}>
            <span>Status <b className={styles.overallMiniStatusPill}>{metrics.mmsStatus}</b></span>
          </div>
        </div>
        <div className={styles.overallMiniKpiGrid}>
          {kpis.map(([label, value, detail]) => (
            <MiniKpi detail={detail} key={label} label={label} value={value} />
          ))}
        </div>
      </div>
      <div className={styles.overallMiniOee}>
        <small>OEE</small>
        <strong>{metrics.oee}%</strong>
        <b>{metrics.availability}/{metrics.performance}/{metrics.quality}</b>
      </div>
    </div>
  );
}

function MiniKpi({ detail, label, value }) {
  return (
    <div className={styles.overallMiniKpi}>
      <small>{label}</small>
      <strong>{detail ? `${value} ${detail}` : value}</strong>
    </div>
  );
}

function formatCardDate(value) {
  const [year, month, day] = String(value || "").split("-");
  return month && day ? `${month}/${day}` : value;
}

function getMachineHourlyData(machine) {
  const ratio = Math.max(0.55, Math.min(1.35, (machine.output || 720) / 766));
  return hourly.map((row, index, rows) => {
    const output = Math.round(row.output * ratio);
    const target = Math.round(row.target * ratio);
    return {
      ...row,
      output,
      target,
      accum: rows.slice(0, index + 1).reduce((sum, item) => sum + Math.round(item.output * ratio), 0),
      targetAccum: rows.slice(0, index + 1).reduce((sum, item) => sum + Math.round(item.target * ratio), 0)
    };
  });
}

function MachineWorkingSummary({ date, machine }) {
  return (
    <Panel title="Machine Working" meta="Live / history">
      <MachineWorkingHeader date={date} machine={machine} />
    </Panel>
  );
}

function MachineWorkingHeader({ compact = false, date = "2026-05-13", machine }) {
  const metrics = getMachineWorkingMetrics(machine);

  return (
      <div className={compact ? styles.machineSummaryTableCompact : styles.machineSummaryTable}>
        <div className={classNames(styles.summaryCell, styles.operatorCell, styles.summaryTallCell)}>
          <img alt="Operator OP-014" className="operator-avatar" src={operatorAvatar} />
          <span>
            <small>Operator</small>
            <strong>OP-014</strong>
            <b>Somchai W.</b>
          </span>
        </div>
        <div className={styles.summaryCell}>
          <small>Machine</small>
          <strong>{machine.name || machine.machineNo}</strong>
          <b>{metrics.model}</b>
        </div>
        <div className={styles.summaryCell}>
          <small>MMS Status</small>
          <StatusBadge status={metrics.mmsStatus} />
          <b>From PLC/GOT</b>
        </div>
        <div className={styles.summaryCell}>
          <small>Date / Time</small>
          <strong>{date}</strong>
          <b>07:00 - 07:00</b>
        </div>
        <div className={styles.summaryMetric}><small>Output / Target</small><strong>{metrics.totalOutput} / {metrics.target}</strong><b>pcs / shift</b></div>
        <div className={styles.summaryMetric}><small>OK</small><strong className={styles.okText}>{metrics.okQty}</strong><b>pcs</b></div>
        <div className={styles.summaryMetric}><small>NG</small><strong className={styles.ngText}>{metrics.ngQty}</strong><b>pcs</b></div>
        <div className={classNames(styles.summaryMetric, styles.summaryTallCell, styles.oeeSummaryCell)}><small>OEE</small><strong>{metrics.oee}%</strong><b>A x P x Q</b></div>
        <div className={styles.summaryMetric}><small>Cycle Time</small><strong>{metrics.cycleTime}s</strong><b>Target 3s</b></div>
        <div className={styles.summaryMetric}><small>Achieve</small><strong>{metrics.achieve}%</strong><b>Output / target</b></div>
        <div className={styles.summaryMetric}><small>A Availability</small><strong>{metrics.availability}%</strong><b>Target 90%</b></div>
        <div className={styles.summaryMetric}><small>P Performance</small><strong>{metrics.performance}%</strong><b>Target 90%</b></div>
        <div className={styles.summaryMetric}><small>Q Quality</small><strong>{metrics.quality}%</strong><b>Target 98%</b></div>
        <div className={styles.summaryMetric}><small>Total Output</small><strong>{metrics.totalOutput}</strong><b>OK + NG</b></div>
      </div>
  );
}

function MachineTile({ machine }) {
  return (
    <article className={styles.machineTile} style={{ borderLeftColor: statusColors[machine.status] || statusColors.STOP }}>
      <strong>{machine.name}</strong>
      <small>{machine.area}</small>
      <span className={styles.statusBadge} style={statusBadgeStyle(machine.status)}>{machine.status}</span>
    </article>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={styles.statusBadge} style={statusBadgeStyle(status)}>
      {status}
    </span>
  );
}

function MachineTable({ rows }) {
  return (
    <Panel title="Machine Records" meta={`${rows.length} machines`}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>No</th><th>Machine</th><th>Area</th><th>Status</th><th>Output</th><th>NG</th><th>CT</th><th>OEE</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.name}>
                <td>{index + 1}</td><td>{row.name}</td><td>{row.area}</td><td><span className={styles.statusBadge} style={statusBadgeStyle(row.status)}>{row.status}</span></td><td>{row.output}</td><td>{row.ng}</td><td>{row.ct}s</td><td>{row.oee}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CompactTable({ title, rows, headers = ["Machine", "Detail", "Value"] }) {
  return (
    <Panel title={title} meta="Preview">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function Timeline() {
  const rows = [
    ["08:00", "RUN", "02:30"],
    ["10:30", "WAIT", "00:20"],
    ["10:50", "RUN", "01:40"],
    ["12:30", "BRAKE", "00:45"],
    ["13:15", "JOB", "00:35"],
    ["13:50", "RUN", "02:10"]
  ];
  return <div className={styles.timeline}>{rows.map(([time, status, duration]) => <div className={styles.timelineRow} key={`${time}-${status}`}><b>{time}</b><div className={styles.timelineBar} style={statusFillStyle(status)} /><span>{duration}</span></div>)}</div>;
}

function Panel({ title, meta, children }) {
  return <article className={styles.panel}><div className={styles.panelHeader}><h3>{title}</h3><span>{meta}</span></div>{children}</article>;
}

function ChartBox({ children, compact = false, overall = false, tall = false }) {
  const chartRef = useRef(null);
  const [size, setSize] = useState(null);
  const fallbackSize = {
    height: overall ? 170 : compact ? 150 : tall ? 392 : 235,
    width: 720
  };

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return undefined;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          height: Math.floor(rect.height),
          width: Math.floor(rect.width)
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={classNames(overall ? styles.chartBoxOverall : compact ? styles.chartBoxCompact : tall ? styles.chartBoxTall : styles.chartBox)} ref={chartRef}>
      {cloneElement(children, { height: size?.height || fallbackSize.height, width: size?.width || fallbackSize.width })}
    </div>
  );
}
