"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AppFooter from "@/components/AppFooter";
import SearchableDropdown from "@/components/SearchableDropdown";
import api from "@/lib/api";
import styles from "./MmsSimulationShell.module.css";
import {
  buildMmsPayload,
  canMmsMachineProduce,
  getMmsEffectiveStatus,
  getRandomMmsAlarmName,
  groupMmsMachinesByZone,
  hydrateMmsMachine,
  mmsBaseControlStatuses,
  mmsMachineStatuses,
  mmsSocketEvents
} from "@/lib/mmsSimulation";
import { createMmsSocket } from "@/lib/mmsRealtime";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const statusTone = {
  RUN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WAIT_PART: "border-amber-200 bg-amber-50 text-amber-700",
  BRAKE_TIME: "border-orange-200 bg-orange-50 text-orange-700",
  PLAN_STOP: "border-slate-200 bg-slate-100 text-slate-700",
  WARM_UP: "border-sky-200 bg-sky-50 text-sky-700",
  MM_REPAIR: "border-blue-200 bg-blue-50 text-blue-700",
  MM_PREVENTIVE: "border-cyan-200 bg-cyan-50 text-cyan-700",
  QC: "border-yellow-200 bg-yellow-50 text-yellow-800",
  CLEANING: "border-slate-200 bg-slate-50 text-slate-700",
  STOP: "border-slate-300 bg-white text-slate-600",
  ALARM: "border-red-200 bg-red-50 text-red-700",
  JOB_REQUEST_ACTIVE: "border-violet-200 bg-violet-50 text-violet-700"
};

const statusPanelTone = {
  RUN: "border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/20",
  WAIT_PART: "border-amber-400 bg-amber-400 text-slate-950 shadow-amber-400/20",
  BRAKE_TIME: "border-orange-500 bg-orange-500 text-white shadow-orange-500/20",
  PLAN_STOP: "border-red-600 bg-red-600 text-white shadow-red-600/20",
  WARM_UP: "border-cyan-300 bg-cyan-100 text-slate-950 shadow-cyan-300/20",
  MM_REPAIR: "border-sky-950 bg-sky-950 text-white shadow-sky-950/20",
  MM_PREVENTIVE: "border-sky-950 bg-sky-950 text-white shadow-sky-950/20",
  QC: "border-yellow-200 bg-yellow-100 text-slate-950 shadow-yellow-200/20",
  CLEANING: "border-slate-300 bg-slate-100 text-slate-950 shadow-slate-300/20",
  STOP: "border-slate-500 bg-slate-700 text-white shadow-slate-700/20",
  ALARM: "border-red-500 bg-red-500 text-white shadow-red-500/20",
  JOB_REQUEST_ACTIVE: "border-violet-500 bg-violet-500 text-white shadow-violet-500/20"
};

const zoneMapTones = [
  {
    body: "bg-cyan-50",
    border: "border-cyan-200",
    header: "bg-cyan-700"
  },
  {
    body: "bg-emerald-50",
    border: "border-emerald-200",
    header: "bg-emerald-700"
  },
  {
    body: "bg-amber-50",
    border: "border-amber-200",
    header: "bg-orange-600"
  },
  {
    body: "bg-indigo-50",
    border: "border-indigo-200",
    header: "bg-indigo-700"
  }
];

const machineDisplayOptions = [
  { key: "outputOk", label: "OK" },
  { key: "outputNg", label: "NG" },
  { key: "cycleTime", label: "CT" },
  { key: "model", label: "MDL" },
  { key: "status", label: "ST" }
];

function StatusBadge({ status }) {
  return <span className={classNames("inline-flex rounded-full border px-3 py-1 text-xs font-black", statusTone[status] || statusTone.STOP)}>{status.replaceAll("_", " ")}</span>;
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function numberInputClass() {
  return "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
}

export default function MmsSimulationShell() {
  const [machines, setMachines] = useState([]);
  const [selectedMachineNo, setSelectedMachineNo] = useState(null);
  const [filters, setFilters] = useState({ area: "All", machineType: "All", machineNo: "All" });
  const [machineDisplay, setMachineDisplay] = useState("outputOk");
  const [loadError, setLoadError] = useState("");
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);

  const selectedMachine = machines.find((machine) => machine.machineNo === selectedMachineNo);
  const areas = useMemo(() => ["All", ...new Set(machines.map((machine) => machine.area).filter(Boolean))], [machines]);
  const machineTypes = useMemo(() => ["All", ...new Set(machines.filter((machine) => filters.area === "All" || machine.area === filters.area).map((machine) => machine.machineType).filter(Boolean))], [filters.area, machines]);
  const machineNos = useMemo(() => ["All", ...machines.filter((machine) => (filters.area === "All" || machine.area === filters.area) && (filters.machineType === "All" || machine.machineType === filters.machineType)).map((machine) => machine.machineNo)], [filters.area, filters.machineType, machines]);

  const visibleMachines = useMemo(() => machines.filter((machine) => (
    (filters.area === "All" || machine.area === filters.area)
    && (filters.machineType === "All" || machine.machineType === filters.machineType)
    && (filters.machineNo === "All" || machine.machineNo === filters.machineNo)
  )), [filters, machines]);

  const zoneGroups = useMemo(() => groupMmsMachinesByZone(visibleMachines), [visibleMachines]);
  const totals = useMemo(() => ({
    total: machines.length,
    running: machines.filter((machine) => getMmsEffectiveStatus(machine) === "RUN").length,
    alarm: machines.filter((machine) => getMmsEffectiveStatus(machine) === "ALARM").length,
    jobActive: machines.filter((machine) => machine.jobRequestActive).length,
    outputOk: machines.reduce((sum, machine) => sum + Number(machine.outputOk || 0), 0),
    outputNg: machines.reduce((sum, machine) => sum + Number(machine.outputNg || 0), 0)
  }), [machines]);

  async function loadMachines() {
    try {
      const response = await api.get("/mms/simulation/machines");
      setMachines((response.data?.data || []).map(hydrateMmsMachine));
      setLoadError("");
    } catch (error) {
      setMachines([]);
      setLoadError(error.response?.data?.message || error.message);
    }
  }

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    const socket = createMmsSocket(() => {
      loadMachines();
    });
    socketRef.current = socket;

    return () => {
      socket.emit("realtime:leave", { feature: "mms", scope: "all" });
      socket.emit("realtime:leave", { feature: "job-request", scope: "all" });
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const payloads = [];

      setMachines((current) => current.map((machine) => {
        if (!canMmsMachineProduce(machine)) {
          return machine;
        }

        const cycleTimeMs = Number(machine.cycleTime || 5) * 1000;
        if (now - Number(machine.lastCycleAt || 0) < cycleTimeMs) {
          return machine;
        }

        const updatedMachine = {
          ...machine,
          outputOk: Number(machine.outputOk || 0) + 1,
          lastCycleAt: now
        };
        payloads.push(buildMmsPayload(updatedMachine));
        return updatedMachine;
      }));

      payloads.forEach((payload) => emitMmsEvent(mmsSocketEvents.outputChanged, payload));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function emitMmsEvent(eventName, payload) {
    socketRef.current?.emit(eventName, payload);
    setLastEvent({ eventName, payload, time: new Date().toLocaleTimeString() });
  }

  function updateMachine(machineNo, updater, eventName = mmsSocketEvents.statusChanged, payloadExtra = {}) {
    let updatedPayload = null;

    setMachines((current) => current.map((machine) => {
      if (machine.machineNo !== machineNo) {
        return machine;
      }

      const updatedMachine = {
        ...updater(machine),
        lastCycleAt: Date.now()
      };
      updatedPayload = {
        ...buildMmsPayload(updatedMachine),
        ...payloadExtra
      };
      return updatedMachine;
    }));

    if (updatedPayload) {
      emitMmsEvent(eventName, updatedPayload);
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "area" ? { machineType: "All", machineNo: "All" } : {}),
      ...(key === "machineType" ? { machineNo: "All" } : {})
    }));
  }

  return (
    <main className={classNames("text-slate-950", styles.factoryScreen)}>
      <section className={classNames("mx-auto max-w-[1900px] max-[760px]:p-2", styles.pageShell)}>
        <header className="relative overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-r from-sky-950 via-sky-800 to-cyan-700 px-4 py-2 text-white shadow-sm max-[760px]:flex-col max-[760px]:items-start">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative flex items-center justify-between gap-3 max-[900px]:flex-col max-[900px]:items-start">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Machine Monitoring System</p>
            <h1 className="m-0 text-xl font-black tracking-tight">MMS Simulation</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <SummaryPill label="MC" value={totals.total} tone="slate" />
            <SummaryPill label="Run" value={totals.running} tone="emerald" />
            <SummaryPill label="Alarm" value={totals.alarm} tone="red" />
            <SummaryPill label="Job" value={totals.jobActive} tone="violet" />
            <SummaryPill label="OK" value={totals.outputOk} tone="sky" />
            <SummaryPill label="NG" value={totals.outputNg} tone="amber" />
            <div className="flex h-9 overflow-hidden rounded-xl border border-white/25 bg-slate-950/35 shadow-sm" aria-label="Machine card value">
              {machineDisplayOptions.map((option) => (
                <button
                  className={classNames("border-r border-white/20 px-2.5 text-[11px] font-black transition last:border-r-0", machineDisplay === option.key ? "bg-white text-slate-950" : "text-white hover:bg-white/20")}
                  key={option.key}
                  type="button"
                  onClick={() => setMachineDisplay(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {lastEvent ? <span className="rounded-full bg-emerald-300 px-3 py-1.5 text-xs font-black text-slate-950 ring-1 ring-emerald-100">{lastEvent.eventName} {lastEvent.time}</span> : null}
            <Link className="inline-flex h-9 items-center justify-center rounded-xl border border-white/20 bg-white px-3 text-xs font-black text-slate-950 no-underline shadow-sm transition hover:bg-sky-50" href="/mms-dashboard">
              Back to MMS
            </Link>
          </div>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm max-[900px]:grid-cols-1">
          <Field label="Area">
            <SearchableDropdown accent="sky" options={areas} value={filters.area} onChange={(value) => updateFilter("area", value)} />
          </Field>
          <Field label="Machine Type">
            <SearchableDropdown accent="sky" options={machineTypes} value={filters.machineType} onChange={(value) => updateFilter("machineType", value)} />
          </Field>
          <Field label="Machine No">
            <SearchableDropdown accent="sky" options={machineNos} value={filters.machineNo} onChange={(value) => updateFilter("machineNo", value)} />
          </Field>
        </section>

        {loadError ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
            {loadError}
          </section>
        ) : null}

        <section className={styles.factoryMap}>
          {zoneGroups.map((zone, zoneIndex) => {
            const tone = zoneMapTones[zoneIndex % zoneMapTones.length];

            return (
            <article className={classNames(styles.zonePanel, tone.border, tone.body)} key={zone.area}>
              <div className={classNames("flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 text-white", tone.header)}>
                <div>
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-white/80">{zone.zoneNo}</p>
                  <h2 className="m-0 text-base font-black leading-tight">{zone.area}</h2>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center max-[760px]:w-full max-[760px]:grid-cols-3">
                  <Metric label="MC" value={zone.machineCount} tone="sky" />
                  <Metric label="Run" value={zone.running} tone="emerald" />
                  <Metric label="Alarm" value={zone.alarm} tone="red" />
                  <Metric label="Job" value={zone.jobActive} tone="violet" />
                  <Metric label="Stop" value={zone.stopped} tone="slate" />
                </div>
              </div>

              <div className={styles.machineTypeMap}>
                {zone.machineTypes.map((typeGroup) => (
                  <section className={styles.machineTypeColumn} key={`${zone.area}-${typeGroup.machineType}`}>
                    <div className="mb-1 overflow-hidden rounded-md border border-slate-700 bg-slate-900 text-white shadow-sm">
                      <div className="truncate px-1.5 py-1 text-center text-[10px] font-black leading-tight" title={typeGroup.machineType}>{typeGroup.machineType}</div>
                    </div>

                    <div className={styles.machineTileGrid}>
                      {typeGroup.machines.map((machine) => (
                        <MachineCard key={machine.machineNo} displayMode={machineDisplay} machine={machine} onClick={() => setSelectedMachineNo(machine.machineNo)} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>
            );
          })}
          {!zoneGroups.length ? (
            <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-black text-slate-500">
              No machine data found from MSSQL for this filter.
            </article>
          ) : null}
        </section>

        <AppFooter label="MMS Simulation" />
      </section>

      {selectedMachine ? (
        <MachineModal
          machine={selectedMachine}
          onClose={() => setSelectedMachineNo(null)}
          onEmit={(eventName, payload) => emitMmsEvent(eventName, payload)}
          onUpdate={updateMachine}
        />
      ) : null}
    </main>
  );
}

function SummaryPill({ label, value, tone }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    slate: "border-slate-200 bg-white text-slate-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700"
  };

  return (
    <span className={classNames("inline-flex h-9 min-w-16 items-center justify-between gap-2 rounded-xl border px-2.5 text-xs font-black shadow-sm", tones[tone])}>
      <b className="text-slate-950">{value}</b>
      <small className="uppercase tracking-[0.08em]">{label}</small>
    </span>
  );
}

function LegendChip({ label, tone }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
      <i className={classNames("block h-2.5 w-2.5 rounded-full", tone)} />
      {label}
    </span>
  );
}

function getMachineDisplayValue(machine, effectiveStatus, displayMode) {
  if (displayMode === "cycleTime") {
    return { label: "CT", value: `${machine.cycleTime}s` };
  }
  if (displayMode === "model") {
    return { label: "Model", value: machine.model };
  }
  if (displayMode === "outputNg") {
    return { label: "NG", value: machine.outputNg };
  }
  if (displayMode === "status") {
    return { label: "Status", value: machine.alarmName || effectiveStatus.replaceAll("_", " ") };
  }

  return { label: "OK", value: machine.outputOk };
}

function splitMachineNo(machineNo = "") {
  const value = String(machineNo);
  const lastDashIndex = value.lastIndexOf("-");

  if (lastDashIndex <= 0 || lastDashIndex === value.length - 1) {
    return { prefix: value, suffix: "" };
  }

  return {
    prefix: value.slice(0, lastDashIndex),
    suffix: value.slice(lastDashIndex + 1)
  };
}

function MachineCard({ displayMode, machine, onClick }) {
  const effectiveStatus = getMmsEffectiveStatus(machine);
  const displayValue = getMachineDisplayValue(machine, effectiveStatus, displayMode);
  const machineNoParts = splitMachineNo(machine.machineNo);
  const tones = {
    ALARM: "border-red-300 bg-red-50 text-red-950 hover:bg-red-100",
    BRAKE_TIME: "border-orange-300 bg-orange-50 text-orange-950 hover:bg-orange-100",
    CLEANING: "border-slate-300 bg-slate-100 text-slate-950 hover:bg-slate-200",
    MM_PREVENTIVE: "border-cyan-300 bg-cyan-50 text-cyan-950 hover:bg-cyan-100",
    MM_REPAIR: "border-blue-300 bg-blue-50 text-blue-950 hover:bg-blue-100",
    PLAN_STOP: "border-red-300 bg-red-50 text-red-950 hover:bg-red-100",
    QC: "border-yellow-300 bg-yellow-50 text-yellow-950 hover:bg-yellow-100",
    RUN: "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
    STOP: "border-slate-300 bg-white text-slate-950 hover:bg-slate-50",
    WAIT_PART: "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100",
    WARM_UP: "border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100"
  };
  const barTones = {
    ALARM: "bg-red-500",
    BRAKE_TIME: "bg-orange-500",
    CLEANING: "bg-slate-500",
    MM_PREVENTIVE: "bg-cyan-500",
    MM_REPAIR: "bg-blue-500",
    PLAN_STOP: "bg-red-600",
    QC: "bg-yellow-400",
    RUN: "bg-emerald-500",
    STOP: "bg-slate-500",
    WAIT_PART: "bg-amber-400",
    WARM_UP: "bg-sky-400"
  };

  return (
    <button className={classNames(styles.machineTile, "relative overflow-hidden rounded-lg border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", tones[effectiveStatus] || tones.STOP, machine.jobRequestActive ? "ring-2 ring-violet-300" : "")} type="button" onClick={onClick}>
      <div className={classNames("h-1", machine.jobRequestActive ? "bg-violet-500" : barTones[effectiveStatus] || barTones.STOP)} />
      <div className={styles.machineTileBody}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <h3 className="m-0 grid max-w-full justify-items-start leading-none" title={machine.machineNo}>
              <span className={styles.machineNoPrefix}>{machineNoParts.prefix}</span>
              {machineNoParts.suffix ? <span className={styles.machineNoSuffix}>{machineNoParts.suffix}</span> : null}
            </h3>
          </div>
          <span className={classNames("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white", machine.activeJobNo ? "opacity-0" : "", barTones[effectiveStatus] || barTones.STOP)} title={effectiveStatus.replaceAll("_", " ")} />
        </div>
        <MiniMetric label={displayValue.label} value={displayValue.value} />
      </div>
      {machine.activeJobNo ? <span className="absolute right-1 top-1 rounded bg-violet-600 px-1 text-[6px] font-black leading-[10px] text-white shadow-sm ring-1 ring-white/80">JOB</span> : null}
    </button>
  );
}

function MiniMetric({ label, value }) {
  return (
    <span className={styles.miniMetric} title={`${label}: ${value}`}>
      <b className={styles.miniMetricValue}>{value}</b>
    </span>
  );
}

function Metric({ label, value, tone }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-50 text-violet-700"
  };

  return (
    <span className={classNames("min-w-0 rounded-xl px-2 py-2", tones[tone])}>
      <b className="block truncate text-sm">{value}</b>
      <small className="block truncate text-[10px] uppercase tracking-[0.08em]">{label}</small>
    </span>
  );
}

function MachineModal({ machine, onClose, onEmit, onUpdate }) {
  const effectiveStatus = getMmsEffectiveStatus(machine);
  const hasJobEvent = machine.jobRequestActive;

  function setStatus(status) {
    onUpdate(machine.machineNo, (current) => ({ ...current, plcStatus: status }), mmsSocketEvents.statusChanged);
  }

  function toggleAlarm() {
    const nextAlarmState = !machine.simMachineAlarm;
    const alarmName = nextAlarmState ? getRandomMmsAlarmName() : "";

    onUpdate(
      machine.machineNo,
      (current) => ({
        ...current,
        alarmName,
        simMachineAlarm: nextAlarmState
      }),
      mmsSocketEvents.alarmChanged,
      {
        alarmName: nextAlarmState ? alarmName : null
      }
    );
  }

  function updateNumber(key, value) {
    onUpdate(machine.machineNo, (current) => ({ ...current, [key]: Math.max(Number(value || 0), 0) }), mmsSocketEvents.outputChanged);
  }

  function updateModel(value) {
    onUpdate(machine.machineNo, (current) => ({ ...current, model: value }), mmsSocketEvents.statusChanged);
  }

  function sendNow() {
    onEmit(mmsSocketEvents.statusChanged, buildMmsPayload(machine));
  }

  function triggerPanelStatus(status) {
    if (!mmsMachineStatuses.includes(status)) {
      return;
    }

    onUpdate(machine.machineNo, (current) => ({ ...current, plcStatus: status }), mmsSocketEvents.statusChanged, {
      gotStatusButton: status,
      panelReason: "GOT_MACHINE_STATUS"
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
      <section className="max-h-[94vh] w-[min(980px,100%)] overflow-hidden rounded-[6px] border-4 border-slate-900 bg-[#46b6df] shadow-2xl">
        <header className="border-b-4 border-slate-900 bg-[#46b6df] px-5 py-3">
          <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-slate-950">MES Menu</p>
            <h2 className="m-0 mt-1 text-2xl font-black text-slate-950">PLC / GOT Machine Panel</h2>
            <span className="mt-1 block text-sm font-bold text-slate-800">{machine.machineNo} / {machine.machineType} / {machine.area}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className={classNames("inline-flex h-10 items-center rounded-[4px] border-2 px-4 text-xs font-black shadow-sm", statusPanelTone[effectiveStatus] || statusPanelTone.STOP)}>
              MC Status: {effectiveStatus.replaceAll("_", " ")}{machine.alarmName ? ` / ${machine.alarmName}` : ""}
            </span>
            <button className="h-10 rounded-[4px] border-2 border-slate-900 bg-slate-100 px-4 text-sm font-black text-slate-950 transition hover:bg-white" type="button" onClick={onClose}>Close</button>
          </div>
          </div>
        </header>

        <div className="grid max-h-[calc(94vh-84px)] gap-4 overflow-y-auto bg-[#46b6df] p-4">
          {hasJobEvent ? (
            <section className="rounded-[4px] border-2 border-violet-900 bg-violet-100 p-3 text-sm font-black text-violet-900">
              Event overlay: Active Job Request {machine.activeJobNo} ({machine.activeJobStatus}). Machine output still follows GOT/PLC status.
            </section>
          ) : null}

          <section className="grid grid-cols-3 gap-3 border-2 border-slate-900 bg-[#46b6df] p-3 max-[760px]:grid-cols-1">
            <PanelGroup
              title="Maintenance"
              items={[
                { label: "MM Repair", status: "MM_REPAIR", tone: "repair", onClick: () => triggerPanelStatus("MM_REPAIR") },
                { label: "MM Preventive", status: "MM_PREVENTIVE", tone: "pm", onClick: () => triggerPanelStatus("MM_PREVENTIVE") }
              ]}
            />
            <PanelGroup
              title="QC"
              items={[
                { label: "QC", status: "QC", tone: "qc", onClick: () => triggerPanelStatus("QC") }
              ]}
            />
            <PanelGroup
              title="Production"
              items={[
                { label: "Cleaning", status: "CLEANING", tone: "cleaning", onClick: () => triggerPanelStatus("CLEANING") }
              ]}
            />
          </section>

          <section className="rounded-[4px] border-2 border-slate-900 bg-[#46b6df] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-slate-800">Status Control</p>
                <h3 className="m-0 mt-1 text-xl font-black">Machine status</h3>
              </div>
              <button className={classNames("h-11 rounded-[4px] border-2 border-slate-900 px-4 text-sm font-black shadow-sm transition", machine.simMachineAlarm ? "bg-red-600 text-white hover:bg-red-700" : "bg-yellow-100 text-slate-950 hover:bg-yellow-200")} type="button" onClick={toggleAlarm}>
                sim_machine_alarm {machine.simMachineAlarm ? "ON" : "OFF"}
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 max-[900px]:grid-cols-3 max-[560px]:grid-cols-2">
              {mmsBaseControlStatuses.map((status) => (
                <button
                  className={classNames("min-h-12 rounded-[4px] border-2 px-3 py-2 text-sm font-black shadow-sm transition", machine.plcStatus === status ? statusPanelTone[status] : "border-slate-900 bg-white/85 text-slate-950 hover:bg-white")}
                  key={status}
                  type="button"
                  onClick={() => setStatus(status)}
                >
                  {status.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-4 gap-3 rounded-[4px] border-2 border-slate-900 bg-cyan-100 p-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
            <Field label="Output OK">
              <input className={numberInputClass()} min="0" type="number" value={machine.outputOk} onChange={(event) => updateNumber("outputOk", event.target.value)} />
            </Field>
            <Field label="Output NG">
              <input className={numberInputClass()} min="0" type="number" value={machine.outputNg} onChange={(event) => updateNumber("outputNg", event.target.value)} />
            </Field>
            <Field label="Cycle Time (sec)">
              <input className={numberInputClass()} min="1" step="0.1" type="number" value={machine.cycleTime} onChange={(event) => updateNumber("cycleTime", event.target.value)} />
            </Field>
            <Field label="Model">
              <SearchableDropdown accent="sky" options={["MODEL-A", "MODEL-B", "MODEL-C", "MODEL-D"]} value={machine.model} onChange={updateModel} />
            </Field>
          </section>

          <section className="flex flex-wrap justify-end gap-2 border-t-2 border-slate-900 pt-4">
            <span className={classNames("mr-auto rounded-[4px] border-2 border-slate-900 px-3 py-2 text-sm font-black", canMmsMachineProduce(machine) ? "bg-emerald-300 text-slate-950" : "bg-slate-200 text-slate-700")}>
              Output {canMmsMachineProduce(machine) ? "enabled" : "blocked"}
            </span>
            <button className="h-11 rounded-[4px] border-2 border-slate-900 bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-slate-100" type="button" onClick={sendNow}>Send Socket Now</button>
            <button className="h-11 rounded-[4px] border-2 border-slate-900 bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800" type="button" onClick={onClose}>Close</button>
          </section>
        </div>
      </section>
    </div>
  );
}

function PanelGroup({ title, items }) {
  const buttonTones = {
    cleaning: "bg-slate-100 text-slate-950 hover:bg-white",
    pm: "bg-sky-950 text-white hover:bg-sky-900",
    qc: "bg-yellow-100 text-slate-950 hover:bg-yellow-200",
    repair: "bg-sky-950 text-white hover:bg-sky-900"
  };

  return (
    <article className="rounded-[4px] border-2 border-slate-900 bg-[#46b6df] p-3">
      <p className="m-0 text-sm font-black text-slate-950">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <button className={classNames("inline-flex min-h-10 items-center justify-center rounded-[4px] border-2 border-slate-900 px-3 text-sm font-black shadow-sm transition active:translate-y-px", buttonTones[item.tone] || "bg-cyan-100 text-slate-950 hover:bg-white")} key={item.label} title={`Set machine status: ${item.status}`} type="button" onClick={item.onClick}>
            {item.label}
          </button>
        ))}
      </div>
    </article>
  );
}
