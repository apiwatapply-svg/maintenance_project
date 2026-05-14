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
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { selectOverallMmsMachines } from "@/lib/mmsSimulation";
import styles from "./MmsDashboardShell.module.css";

const navGroups = [
  {
    title: "Overview",
    items: [
      { href: "/mms-dashboard", key: "dashboard", icon: "DB", label: "Dashboard" },
      { href: "/mms-dashboard/machine-area", key: "machine-area", icon: "AR", label: "Machine Area" },
      { href: "/mms-dashboard/layout-dashboard", key: "layout-dashboard", icon: "LY", label: "Layout Dashboard" }
    ]
  },
  {
    title: "Working",
    items: [
      { href: "/mms-dashboard/overall-machine-working", key: "overall-machine-working", icon: "OW", label: "Overall Machine Working" },
      { href: "/mms-dashboard/machine-working", key: "machine-working", icon: "MW", label: "Machine Working" }
    ]
  },
  {
    title: "Reports",
    items: [
      { href: "/mms-dashboard/daily-report", key: "daily-report", icon: "DR", label: "Daily Report" },
      { href: "/mms-dashboard/monthly-report", key: "monthly-report", icon: "MR", label: "Monthly Report" }
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

const machines = [
  "CNV-A-001", "CNV-A-002", "CNV-A-003", "FIL-A-001", "FIL-A-002", "FIL-A-003",
  "RBT-A-001", "RBT-A-002", "LBL-B-001", "LBL-B-002", "MIX-B-001", "MIX-B-002",
  "PKG-B-001", "PKG-B-002", "SEA-P-001", "SEA-P-002", "WGH-P-001", "BLR-U-001"
].map((name, index) => ({
  name,
  machineNo: name,
  area: index < 8 ? "Line A" : index < 14 ? "Line B" : index < 17 ? "Packing" : "Utility",
  machineType: machineTypeByPrefix[name.split("-")[0]] || name.split("-")[0],
  type: machineTypeByPrefix[name.split("-")[0]] || name.split("-")[0],
  status: index === 1 ? "JOB" : index === 9 ? "ALARM" : index === 16 ? "WAIT" : "RUN",
  output: 720 + index * 46,
  ng: index % 5,
  ct: 1 + (index % 3),
  oee: 78 + (index % 14)
}));

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

const dailyRows = [
  ["Line A", "CNV-A", "6,820", "32", "94.2%", "86.4%", "2.2s", "01:42"],
  ["Line B", "LBL-B", "8,360", "21", "96.1%", "91.8%", "1.9s", "00:46"],
  ["Packing", "SEA-P", "4,910", "48", "89.4%", "82.7%", "2.6s", "02:18"],
  ["Utility", "BLR-U", "2,240", "5", "98.0%", "88.6%", "3.0s", "00:24"]
];

const monthlyRows = [
  ["2026-05-01", "83,420", "430", "89.2%", "2.3s", "12:40"],
  ["2026-05-02", "86,120", "388", "90.4%", "2.2s", "10:35"],
  ["2026-05-03", "80,650", "510", "86.8%", "2.5s", "15:10"],
  ["2026-05-04", "88,040", "360", "91.1%", "2.1s", "09:55"],
  ["2026-05-05", "85,300", "402", "89.9%", "2.3s", "11:20"]
];

const monthTrend = Array.from({ length: 14 }, (_, index) => ({
  day: String(index + 1).padStart(2, "0"),
  output: 76000 + index * 760 + (index % 4) * 1200,
  ng: 320 + (index % 5) * 34,
  oee: 84 + (index % 8)
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

export default function MmsDashboardShell({ view = "dashboard" }) {
  const [collapsed, setCollapsed] = useState(false);
  const title = getTitle(view);
  const backHref = view === "dashboard" ? "/" : "/mms-dashboard";

  return (
    <main className={styles.screen}>
      <div className={classNames(styles.layout, collapsed ? styles.layoutCollapsed : "")}>
        <aside className={classNames(styles.sidebar, collapsed ? styles.collapsed : "")}>
          <div className={styles.brand}>
            <span className={styles.logo}>MMS</span>
            <div className={styles.brandText}>
              <h1>MMS Dashboard</h1>
              <p>Machine Monitoring System</p>
            </div>
          </div>
          <button className={styles.collapseButton} type="button" onClick={() => setCollapsed((current) => !current)}>
            {collapsed ? ">" : "Collapse"}
          </button>
          <nav>
            {navGroups.map((group) => (
              <section className={styles.navGroup} key={group.title}>
                <div className={styles.navTitle}>{group.title}</div>
                {group.items.map((item) => (
                  <Link
                    className={classNames(styles.navLink, view === item.key ? styles.active : "")}
                    href={item.href}
                    key={item.key}
                    target={item.target}
                    title={item.label}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navText}>{item.label}</span>
                  </Link>
                ))}
              </section>
            ))}
          </nav>
        </aside>

        <section className={styles.main}>
          <header className={styles.topbar}>
            <div>
              <p className={styles.eyebrow}>Machine Monitoring System</p>
              <h2>{title}</h2>
              <p>{getSubtitle(view)}</p>
            </div>
            <Link className={styles.backButton} href={backHref}>Back</Link>
          </header>

          <section className={styles.content}>
            {view !== "dashboard" && view !== "overall-machine-working" ? <FilterBar view={view} /> : null}
            {renderView(view)}
          </section>
          <div className={styles.footer}>MMS Dashboard | Factory Management System</div>
        </section>
      </div>
    </main>
  );
}

function getTitle(view) {
  const map = {
    dashboard: "Executive Dashboard",
    "daily-report": "Daily Report",
    "layout-dashboard": "Layout Dashboard",
    "machine-area": "Machine Area",
    "machine-working": "Machine Working",
    "monthly-report": "Monthly Report",
    "overall-machine-working": "Overall Machine Working"
  };
  return map[view] || "MMS Dashboard";
}

function getSubtitle(view) {
  const map = {
    dashboard: "Plant output, status, OEE, and machine health overview.",
    "daily-report": "Daily production, NG, OEE, CT, and downtime by area/type.",
    "layout-dashboard": "Factory machine layout with live status color.",
    "machine-area": "Area level machine condition and production view.",
    "machine-working": "Single machine output, CT, OEE, status timeline, and operator view.",
    "monthly-report": "Monthly production trend and machine performance summary.",
    "overall-machine-working": "Multi-machine working view for selected area and type."
  };
  return map[view] || "Machine monitoring system.";
}

function FilterBar({ view }) {
  const isSingleMachine = view === "machine-working";
  const storageKey = `mms:${view}:filters`;
  const defaults = {
    area: isSingleMachine ? "Line A" : "All",
    machineType: isSingleMachine ? "Conveyor" : "All",
    machineNo: isSingleMachine ? "CNV-A-002" : "All",
    date: "2026-05-13"
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
    }
  }, [filters, hydrated, storageKey]);

  const updateFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
  };
  const areaOptions = isSingleMachine ? ["Line A", "Line B", "Packing", "Utility"] : ["All", "Line A", "Line B", "Packing", "Utility"];
  const typeOptions = isSingleMachine ? ["Conveyor", "Filling", "Labeler", "Sealer"] : ["All", "Conveyor", "Filling", "Labeler", "Sealer"];
  const machineOptions = isSingleMachine ? ["CNV-A-002", "CNV-A-001", "SEA-P-002", "LBL-B-001"] : ["All", "CNV-A-001", "SEA-P-002", "LBL-B-001"];

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

function renderView(view) {
  if (view === "machine-area") return <MachineAreaView />;
  if (view === "layout-dashboard") return <LayoutDashboardView />;
  if (view === "overall-machine-working") return <OverallMachineWorkingView />;
  if (view === "machine-working") return <MachineWorkingView />;
  if (view === "daily-report") return <DailyReportView />;
  if (view === "monthly-report") return <MonthlyReportView />;
  return <DashboardView />;
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
        <article className={styles.kpi} key={label} style={{ "--tone": color }}>
          <small>{label}</small>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function DashboardView() {
  return (
    <>
      <section className={styles.oeeHeader}>
        <div>
          <p className={styles.eyebrowDark}>OEE Dashboard</p>
          <h3>Select working area and machine type</h3>
        </div>
        <span>Real-time</span>
      </section>
      <FilterBar />
      <section className={styles.typeStack}>
        {["Conveyor", "Filling", "Robot Arm"].map((type) => (
          <article className={styles.typeSection} key={type}>
            <Link className={styles.typeButton} href="/mms-dashboard/overall-machine-working">
              {type} <span>Open overall view</span>
            </Link>
            <div className={styles.machineMap}>
              {machines.filter((machine) => machine.area === "Line A").slice(0, 6).map((machine) => <MachineTile key={`${type}-${machine.name}`} machine={{ ...machine, type }} />)}
            </div>
          </article>
        ))}
      </section>
      <section className={styles.grid3}>
        <CompactTable title="Top Alarm" rows={[["LBL-B-004", "Sensor fault", "12m"], ["SEA-P-002", "Heater temp", "8m"], ["CNV-A-001", "Job request", "5m"]]} />
        <CompactTable title="Top Output" rows={[["PMP-B-008", "708 pcs", "RUN"], ["CMP-U-007", "1188 pcs", "RUN"], ["CHL-U-007", "1104 pcs", "RUN"]]} />
        <CompactTable title="OEE Risk" rows={[["Packing", "82.7%", "Check"], ["Line A", "86.4%", "Watch"], ["Utility", "88.6%", "OK"]]} />
      </section>
    </>
  );
}

function MachineAreaView() {
  return (
    <>
      <section className={styles.typeStack}>
        {areas.map((area) => (
          <article className={styles.typeSection} key={area.area}>
            <Link className={styles.typeButton} href="/mms-dashboard/overall-machine-working">
              {area.area} <span>{area.oee}% OEE / {area.output.toLocaleString()} pcs</span>
            </Link>
            <div className={styles.machineMap}>
              {machines.filter((machine) => machine.area === area.area).map((machine) => <MachineTile key={machine.name} machine={machine} />)}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function LayoutDashboardView() {
  const groupedByArea = areas.map((area) => ({
    ...area,
    machines: machines.filter((machine) => machine.area === area.area)
  }));

  return (
    <Panel title="Factory Layout" meta="Area / Type / Machine">
      <div className={styles.factoryLayoutGrid}>
        {groupedByArea.map((area, index) => (
          <section className={styles.factoryArea} data-area={index} key={area.area}>
            <div className={styles.factoryAreaTitle}>{area.area}</div>
            <div className={styles.machineMap}>
              {area.machines.map((machine) => <MachineTile key={machine.name} machine={machine} />)}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}

function OverallMachineWorkingView() {
  const storageKey = "mms:overall-machine-working:filters";
  const defaultFilters = {
    area: "Line A",
    date: "2026-05-13",
    machineType: "All",
    machineNos: machines.filter((machine) => machine.area === "Line A").slice(0, 6).map((machine) => machine.machineNo)
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
      const savedTab = localStorage.getItem("mms:overall-machine-working:tab");
      if (savedTab === "status") setActiveTab("status");
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

  const areaOptions = ["All", ...areas.map((item) => item.area)];
  const typeOptions = ["All", ...Array.from(new Set(machines.filter((machine) => filters.area === "All" || machine.area === filters.area).map((machine) => machine.machineType)))];
  const machineOptions = machines.filter((machine) => {
    const areaMatched = filters.area === "All" || machine.area === filters.area;
    const typeMatched = filters.machineType === "All" || machine.machineType === filters.machineType;
    return areaMatched && typeMatched;
  });
  const selectedMachines = selectOverallMmsMachines(machines, filters);

  function updateSelect(key) {
    return (event) => {
      const value = event.target.value;
      setFilters((current) => {
        const next = { ...current, [key]: value };
        const nextOptions = machines.filter((machine) => {
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
  const chartData = getMachineHourlyData(machine);

  return (
    <article className={styles.overallCard}>
      <MachineWorkingHeader compact date={date} machine={machine} />
      {activeTab === "output" ? (
        <div className={styles.overallChartRow}>
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
        </div>
      ) : (
        <div className={styles.overallStatusBlock}>
          <MachineStatusTimeline />
          <ChartBox overall>
            <BarChart data={downtimeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={30} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="percent" name="Downtime %" fill="#64748b" isAnimationActive={false}>
                {downtimeBreakdown.map((entry) => <Cell key={entry.status} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ChartBox>
        </div>
      )}
    </article>
  );
}

function MachineWorkingView() {
  const machine = machines[1];
  const [activeTab, setActiveTab] = useState("output");

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const savedTab = localStorage.getItem("mmsMachineWorkingTab");
    if (requestedTab === "status" || savedTab === "status") {
      setActiveTab("status");
    }
  }, []);

  const changeTab = (tab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") localStorage.setItem("mmsMachineWorkingTab", tab);
  };

  return (
    <>
      <MachineWorkingSummary machine={machine} />
      {activeTab === "output" ? (
        <section className={styles.machineWorkingChartGrid}>
          <Panel title="Output Monitor" meta="Actual / target / accum">
            <ChartBox tall>
              <ComposedChart data={hourly}>
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
              <ComposedChart data={hourly}>
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
              <MachineStatusTimeline />
            </div>
            <div className={styles.statusBreakdownPanel}>
              <h4>Downtime Breakdown (%)</h4>
              <ChartBox compact>
                <BarChart data={downtimeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                  <Tooltip />
                  <Bar dataKey="percent" name="Downtime %" fill="#64748b" isAnimationActive={false}>
                    {downtimeBreakdown.map((entry) => <Cell key={entry.status} fill={entry.fill} />)}
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
    <button className={classNames(styles.chartTabButton, active && styles.chartTabButtonActive)} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function MachineStatusTimeline() {
  const [hovered, setHovered] = useState(null);
  let cursorPercent = 0;

  return (
    <div className={styles.machineStatusTimeline}>
      <div className={styles.shiftScale}>
        {["07:00", "11:00", "15:00", "19:00", "23:00", "03:00", "07:00"].map((time, index) => <span key={`${time}-${index}`}>{time}</span>)}
      </div>
      <div className={styles.statusTrack}>
        {machineStatusSegments.map((segment) => {
          const left = cursorPercent + segment.percent / 2;
          cursorPercent += segment.percent;
          return (
            <div
              className={styles.statusSegment}
              key={`${segment.start}-${segment.label}`}
              onMouseEnter={() => setHovered({ ...segment, left })}
              onMouseLeave={() => setHovered(null)}
              style={{ "--status": statusColors[segment.status], flexGrow: segment.percent }}
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
          <span key={item.status}><i style={{ "--status": statusColors[item.status] }} />{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function getMachineWorkingMetrics(machine) {
  const availability = 92.4;
  const performance = 87.8;
  const quality = 98.6;
  const oee = ((availability * performance * quality) / 10000).toFixed(1);
  const okQty = machine.output;
  const ngQty = machine.ng;
  const totalOutput = okQty + ngQty;
  const mmsStatus = "RUN";

  return {
    achieve: machine.oee,
    availability,
    cycleTime: machine.ct,
    mmsStatus,
    model: machine.model || "MODEL-B",
    ngQty,
    oee,
    okQty,
    performance,
    quality,
    target: 900,
    totalOutput
  };
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

function MachineWorkingSummary({ machine }) {
  return (
    <Panel title="Machine Working" meta="Live / history">
      <MachineWorkingHeader machine={machine} />
    </Panel>
  );
}

function MachineWorkingHeader({ compact = false, date = "2026-05-13", machine }) {
  const metrics = getMachineWorkingMetrics(machine);

  return (
      <div className={classNames(styles.machineSummaryTable, compact && styles.machineSummaryTableCompact)}>
        <div className={classNames(styles.summaryCell, styles.operatorCell, styles.summaryTallCell)}>
          <img alt="Operator OP-014" src={operatorAvatar} />
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

function DailyReportView() {
  return (
    <>
      <Kpis />
      <section className={styles.reportCards}>
        <Panel title="Daily Output Trend" meta="Hourly">
          <ChartBox>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="output" fill="#0ea5e9" isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </Panel>
        <CompactTable title="Daily Summary" rows={dailyRows} headers={["Area", "Type", "OK", "NG", "Achieve", "OEE", "CT", "Down"]} />
      </section>
    </>
  );
}

function MonthlyReportView() {
  return (
    <>
      <section className={styles.grid2}>
        <Panel title="Monthly Output / NG / OEE" meta="May 2026">
          <ChartBox>
            <ComposedChart data={monthTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="output" fill="#0ea5e9" isAnimationActive={false} />
              <Line dataKey="oee" stroke="#10b981" strokeWidth={3} isAnimationActive={false} />
              <Line dataKey="ng" stroke="#ef4444" strokeWidth={2} isAnimationActive={false} />
            </ComposedChart>
          </ChartBox>
        </Panel>
        <CompactTable title="Monthly Table" rows={monthlyRows} headers={["Date", "OK", "NG", "OEE", "CT", "Down"]} />
      </section>
    </>
  );
}

function MachineTile({ machine }) {
  return (
    <article className={styles.machineTile} style={{ "--status": statusColors[machine.status] || statusColors.STOP }}>
      <strong>{machine.name}</strong>
      <small>{machine.area}</small>
      <span className={styles.statusBadge} style={{ "--status": statusColors[machine.status] || statusColors.STOP }}>{machine.status}</span>
    </article>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={styles.statusBadge} style={{ "--status": statusColors[status] || statusColors.STOP }}>
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
                <td>{index + 1}</td><td>{row.name}</td><td>{row.area}</td><td><span className={styles.statusBadge} style={{ "--status": statusColors[row.status] }}>{row.status}</span></td><td>{row.output}</td><td>{row.ng}</td><td>{row.ct}s</td><td>{row.oee}%</td>
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
  return <div className={styles.timeline}>{rows.map(([time, status, duration]) => <div className={styles.timelineRow} key={`${time}-${status}`}><b>{time}</b><div className={styles.timelineBar} style={{ "--status": statusColors[status] }} /><span>{duration}</span></div>)}</div>;
}

function Panel({ title, meta, children }) {
  return <article className={styles.panel}><div className={styles.panelHeader}><h3>{title}</h3><span>{meta}</span></div>{children}</article>;
}

function ChartBox({ children, compact = false, overall = false, tall = false }) {
  const chartRef = useRef(null);
  const [size, setSize] = useState(null);

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
    <div className={classNames(styles.chartBox, compact && styles.chartBoxCompact, overall && styles.chartBoxOverall, tall && styles.chartBoxTall)} ref={chartRef}>
      {size ? cloneElement(children, { height: size.height, width: size.width }) : null}
    </div>
  );
}
