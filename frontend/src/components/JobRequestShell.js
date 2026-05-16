"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppFooter from "@/components/AppFooter";
import api from "@/lib/api";
import { startJobRequestAlertSound, stopAllJobRequestAlertSounds } from "@/lib/jobRequestAlertSound";
import { createJobRequestSocket } from "@/lib/jobRequestRealtime";
import { buildConfirmAlert, buildSuccessAlert } from "@/lib/swalHelpers";
import {
  getJobRequestSection,
  getJobRequestSectionsForScope,
  getJobRequestTableColumns,
  getAvailableJobAction,
  jobRequestHandoverColumns,
  jobRequestPerformanceStatusKeys,
  jobRequestSections,
  jobRequestStatuses,
  sortJobRequests
} from "@/lib/jobRequestConfig";
import { canAccessJobRequestSection, clearSession, getSessionConfig, getSessionHomePath, getStoredSession } from "@/lib/session";

const statusTone = {
  WAIT_MM: "bg-amber-100 text-amber-800",
  MM_REPAIR: "bg-blue-100 text-blue-800",
  WAIT_QC: "bg-violet-100 text-violet-800",
  QC_INSPECTION: "bg-fuchsia-100 text-fuchsia-800",
  WAIT_PROD_CONFIRM: "bg-cyan-100 text-cyan-800",
  PROD_CONFIRMING: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-100 text-slate-600"
};

const emptyJobRequestOptions = {
  empId: [],
  area: [],
  machineType: [],
  machineNo: [],
  problem: [],
  problemOther: [],
  priority: [],
  maintenancePic: [],
  repairCause: [],
  repairAction: [],
  qcResult: [],
  qcFinding: [],
  qcRejectReason: [],
  confirmResult: [],
  confirmCheck: [],
  productionRejectReason: [],
  handoverPendingItem: []
};

const dashboardFilterOptions = {
  month: [new Date().toISOString().slice(0, 7)],
  department: ["All", "Production", "Maintenance", "QC"],
  status: ["All", "WAIT_MM", "MM_REPAIR", "WAIT_QC", "QC_INSPECTION", "WAIT_PROD_CONFIRM", "PROD_CONFIRMING", "COMPLETED"],
  priority: ["All", "Urgent", "High", "Medium", "Low"]
};

const realtimeNotificationCopy = {
  new_job_request: {
    title: "New Production Request",
    text: "Production sent a new repair request to Maintenance."
  },
  job_accepted: {
    title: "Maintenance Accepted",
    text: "Maintenance accepted the job and started repair."
  },
  job_wait_qc: {
    title: "Waiting QC Inspection",
    text: "Maintenance sent the job to QC for inspection."
  },
  job_qc_accepted: {
    title: "QC Inspection Started",
    text: "QC accepted the job and started inspection."
  },
  job_wait_confirming: {
    title: "Waiting Production Confirm",
    text: "The job was sent to Production for machine confirmation."
  },
  job_production_accepted: {
    title: "Production Confirm Started",
    text: "Production accepted the job and started machine confirmation."
  },
  job_rejected_by_qc: {
    title: "QC Rejected",
    text: "QC rejected the job back to Maintenance."
  },
  job_rejected_by_production: {
    title: "Production Rejected",
    text: "Production rejected the job for follow-up."
  },
  job_completed: {
    title: "Job Completed",
    text: "The job request has been completed."
  },
  job_handover_created: {
    title: "Job Handover",
    text: "A shift handover was created for this job."
  },
  job_request_updated: {
    title: "Job Updated",
    text: "The job request has been updated."
  },
  "job-updated": {
    title: "Job Updated",
    text: "The job request has been updated."
  }
};

export default function JobRequestShell({ sectionKey = "production" }) {
  const router = useRouter();
  const config = getSessionConfig("job");
  const [session, setSession] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [jobRequests, setJobRequests] = useState([]);
  const [jobRequestOptions, setJobRequestOptions] = useState(emptyJobRequestOptions);
  const [reloadToken, setReloadToken] = useState(0);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState(null);
  const lastNotificationRef = useRef({ key: "", time: 0 });
  const pendingAlertRef = useRef({ key: "", time: 0 });
  const activeSection = getJobRequestSection(sectionKey);
  const allJobs = useMemo(() => jobRequests, [jobRequests]);
  const visibleJobs = useMemo(() => jobRequests, [jobRequests]);
  const visibleSections = useMemo(() => getJobRequestSectionsForScope(session?.user?.adminScope), [session?.user?.adminScope]);
  const title = activeSection?.title || jobRequestSections[0].title;
  const subtitle = activeSection?.subtitle || jobRequestSections[0].subtitle;

  useEffect(() => {
    return () => {
      stopAllJobRequestAlertSounds();
      closeJobRequestAlertDialogs();
    };
  }, []);

  useEffect(() => {
    const storedSession = getStoredSession("job");

    if (!storedSession) {
      router.replace(config.loginPath);
      return;
    }

    if (!canAccessJobRequestSection(storedSession, sectionKey)) {
      router.replace(getSessionHomePath("job", storedSession));
      return;
    }

    setSession(storedSession);
    setIsChecking(false);
  }, [config.loginPath, router, sectionKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadJobRequests() {
      try {
        const response = await api.get("/job-requests");
        if (isMounted) {
          setJobRequests(response.data?.data || []);
        }
      } catch {
        if (isMounted) {
          setJobRequests([]);
        }
      }
    }

    async function loadJobRequestOptions() {
      try {
        const response = await api.get("/job-requests/options");
        if (isMounted) {
          setJobRequestOptions({ ...emptyJobRequestOptions, ...(response.data?.data || {}) });
        }
      } catch {
        if (isMounted) {
          setJobRequestOptions(emptyJobRequestOptions);
        }
      }
    }

    if (!isChecking) {
      loadJobRequests();
      loadJobRequestOptions();
    }

    return () => {
      isMounted = false;
    };
  }, [isChecking, lastRealtimeEvent, reloadToken]);

  async function handleLogout() {
    const Swal = (await import("sweetalert2")).default;
    const confirm = await Swal.fire(buildConfirmAlert("Logout?", "You will return to the main page.", { confirmButtonText: "Logout" }));

    if (!confirm.isConfirmed) {
      return;
    }

    clearSession("job");
    router.replace("/");
  }

  useEffect(() => {
    if (!session?.user?.adminScope) {
      return undefined;
    }

    const sections = session.user.adminScope === "all" ? ["production", "maintenance", "qc"] : session.user.adminScope;
    let isActive = true;
    const socket = createJobRequestSocket(sections, async (event) => {
      if (!isActive) {
        return;
      }

      setLastRealtimeEvent(event);
      if (sectionKey === "handover") {
        return;
      }

      const result = await notifyJobRequestEvent(event, lastNotificationRef, sectionKey);
      if (!isActive) {
        return;
      }

      if (result?.action === "open" && result.job && sectionKey !== "dashboard") {
        setActiveJob(sectionKey === "handover" ? { ...result.job, __viewOnly: true } : result.job);
        setIsModalOpen(true);
      }
    });

    return () => {
      isActive = false;
      stopAllJobRequestAlertSounds();
      (Array.isArray(sections) ? sections : [sections]).forEach((section) => {
        socket.emit("job-request:leave", { section });
        socket.emit("realtime:leave", { feature: "job-request", scope: section });
      });
      socket.emit("realtime:leave", { feature: "job-request", scope: "all" });
      socket.disconnect();
    };
  }, [session?.user?.adminScope]);

  useEffect(() => {
    if (isChecking || isModalOpen || !jobRequests.length || sectionKey === "dashboard" || sectionKey === "handover") {
      return;
    }

    const pendingJob = getPendingAlertJobForSection(sectionKey, jobRequests);

    if (!pendingJob) {
      return;
    }

    const notificationKey = `pending:${sectionKey}:${pendingJob.jobNo}:${pendingJob.status}:${pendingJob.updatedAt || ""}`;
    if (pendingAlertRef.current.key === notificationKey) {
      return;
    }

    pendingAlertRef.current = { key: notificationKey, time: Date.now() };

    let isActive = true;
    notifyPendingJobAlert(pendingJob, sectionKey).then((result) => {
      if (!isActive) {
        return;
      }

      if (result?.action === "open") {
        setActiveJob(sectionKey === "handover" ? { ...pendingJob, __viewOnly: true } : pendingJob);
        setIsModalOpen(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, [isChecking, isModalOpen, jobRequests, sectionKey]);

  if (isChecking) {
    return null;
  }

  return (
    <main className={`grid min-h-screen bg-slate-100 text-slate-950 max-[900px]:grid-cols-1 ${isSidebarCollapsed ? "grid-cols-[76px_minmax(0,1fr)]" : "grid-cols-[268px_minmax(0,1fr)]"}`}>
      <aside className={`sticky top-0 h-screen overflow-x-hidden border-r border-slate-800 bg-slate-950 text-white transition-all max-[900px]:relative max-[900px]:h-auto ${isSidebarCollapsed ? "p-3" : "p-4"}`}>
        <div className={`mb-6 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-600/25">JR</span>
          <div className={isSidebarCollapsed ? "hidden" : ""}>
            <h1 className="m-0 text-lg font-black leading-tight">Job Request</h1>
            <p className="m-0 mt-1 text-sm font-bold text-slate-400">Repair Control</p>
          </div>
        </div>

        <button
          className="mb-5 h-10 w-full rounded-xl border border-white/10 bg-white/10 text-sm font-black text-white transition hover:bg-white/15"
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? ">" : "Collapse"}
        </button>

        <nav className="grid gap-1.5" aria-label="Job Request navigation">
          {visibleSections.map((section) => (
            <Link
              className={`flex items-center rounded-xl border py-2 text-sm font-black no-underline transition ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-2.5"} ${section.key === sectionKey ? "border-sky-400/50 bg-sky-600 text-white shadow-lg shadow-sky-950/20" : "border-transparent text-slate-300 hover:bg-white/10"}`}
              href={section.href}
              key={section.key}
              title={section.shortTitle}
            >
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs ${section.key === sectionKey ? "bg-white/15 text-white" : "bg-slate-900 text-sky-300"}`}>{section.icon}</span>
              <span className={isSidebarCollapsed ? "hidden" : ""}>{section.shortTitle}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col p-5 max-[760px]:p-3">
        <header className="mb-4 flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm max-[760px]:flex-col max-[760px]:items-start">
          <div>
            <p className="m-0 text-[11px] font-black uppercase tracking-[0.14em] text-sky-700">Realtime Repair Control</p>
            <h2 className="m-0 mt-0.5 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
            <span className="mt-0.5 block text-sm font-bold text-slate-500">{subtitle}</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {lastRealtimeEvent ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">{lastRealtimeEvent.eventName}</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200">Realtime Ready</span>
            )}
            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-black text-sky-700 ring-1 ring-sky-100">{session?.user?.empName || session?.user?.username}</span>
            <button className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800" type="button" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <StatusCards jobs={allJobs} />

        {sectionKey === "dashboard" ? (
          <DashboardWorkspace options={jobRequestOptions} />
        ) : sectionKey === "handover" ? (
          <HandoverWorkspace jobs={visibleJobs} options={jobRequestOptions} onOpenModal={(job) => { setActiveJob(job); setIsModalOpen(true); }} />
        ) : (
          <SectionWorkspace options={jobRequestOptions} section={activeSection || jobRequestSections[0]} jobs={visibleJobs} onOpenModal={(job = null) => { setActiveJob(job); setIsModalOpen(true); }} />
        )}

        <AppFooter label="Job Request" />
      </section>

      {isModalOpen && sectionKey !== "dashboard" ? <ActionModal jobs={visibleJobs} options={jobRequestOptions} section={activeSection || jobRequestSections[0]} job={activeJob} onActionComplete={() => setReloadToken((current) => current + 1)} onClose={() => setIsModalOpen(false)} /> : null}
    </main>
  );
}

function DashboardWorkspace({ options }) {
  const [problemPath, setProblemPath] = useState([{ layerKey: "area", label: "Area" }]);
  const [dashboardData, setDashboardData] = useState(null);
  const [filters, setFilters] = useState({
    month: dashboardFilterOptions.month[0],
    department: "All",
    status: "All",
    priority: "All"
  });
  const activeProblem = problemPath[problemPath.length - 1];
  const baseLayer = dashboardData?.problem || { title: "Area Problem Analyze", items: [], topProblems: [] };
  const layer = activeProblem.customLayer || baseLayer;
  const layerKey = activeProblem.layerKey;
  const maxRequest = Math.max(1, ...layer.items.map((item) => item.request));
  const pieColors = ["#0284c7", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

  useEffect(() => {
    try {
      const storedFilters = JSON.parse(localStorage.getItem("jobRequestDashboardFilters")) || {};
      setFilters((current) => ({ ...current, ...storedFilters }));
      const storedLayer = localStorage.getItem("jobRequestDashboardLayer") || "area";
      setProblemPath([{ layerKey: storedLayer, label: getProblemLayerLabel(storedLayer) }]);
    } catch {
      localStorage.removeItem("jobRequestDashboardFilters");
      localStorage.removeItem("jobRequestDashboardLayer");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const response = await api.get("/job-requests/dashboard", { params: filters });
        if (isMounted) {
          setDashboardData(response.data?.data || null);
          setProblemPath([{ layerKey: "area", label: "Area" }]);
        }
      } catch {
        if (isMounted) {
          setDashboardData(null);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    localStorage.setItem("jobRequestDashboardFilters", JSON.stringify(nextFilters));
  }

  function updateProblemLayer(nextLayer) {
    setProblemPath([{ layerKey: nextLayer, label: getProblemLayerLabel(nextLayer) }]);
    localStorage.setItem("jobRequestDashboardLayer", nextLayer);
  }

  function handleProblemBarClick(item) {
    const drilldown = dashboardData?.drilldown?.[layerKey]?.[item?.name];

    if (!drilldown) {
      return;
    }

    setProblemPath((current) => [
      ...current,
      {
        layerKey: drilldown.layer,
        label: item.name,
        customLayer: {
          title: drilldown.title,
          label: getProblemLayerLabel(drilldown.layer),
          nextLayer: null,
          items: drilldown.items,
          topProblems: drilldown.topProblems
        }
      }
    ]);
    localStorage.setItem("jobRequestDashboardLayer", drilldown.layer);
  }

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
        <SearchField label="Year / Month" options={dashboardFilterOptions.month} value={filters.month} onChange={(value) => updateFilter("month", value)} />
        <SearchField label="Department" options={dashboardFilterOptions.department} value={filters.department} onChange={(value) => updateFilter("department", value)} />
        <SearchField label="Status" options={dashboardFilterOptions.status} value={filters.status} onChange={(value) => updateFilter("status", value)} />
        <SearchField label="Priority" options={["All", ...options.priority]} value={filters.priority} onChange={(value) => updateFilter("priority", value)} />
      </div>

      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2 max-[620px]:grid-cols-1">
        {(dashboardData?.signals || []).map((signal, index) => (
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={signal.label}>
            <div className={`h-1.5 ${["bg-sky-600", "bg-amber-500", "bg-violet-600", "bg-rose-500"][index % 4]}`} />
            <div className="p-4">
              <p className="m-0 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{signal.label}</p>
              <strong className="mt-2 block truncate text-2xl font-black text-slate-950">{signal.value}</strong>
              <span className="mt-1 block text-sm font-bold text-slate-500">{signal.detail}</span>
            </div>
          </article>
        ))}
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-sky-700">Problem Analyze</p>
            <h3 className="m-0 mt-1 text-2xl font-black">{layer.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {problemPath.map((item, index) => (
                <button
                  className={`rounded-full px-3 py-1 text-xs font-black ${index === problemPath.length - 1 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}
                  key={`${item.layerKey}-${item.label}-${index}`}
                  type="button"
                  onClick={() => setProblemPath((current) => current.slice(0, index + 1))}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LayerButton active={layerKey === "department"} label="Department" onClick={() => updateProblemLayer("department")} />
            <LayerButton active={layerKey === "area"} label="Area" onClick={() => updateProblemLayer("area")} />
            <LayerButton active={layerKey === "machine"} label="Machine" onClick={() => updateProblemLayer("machine")} />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] gap-4 max-[1100px]:grid-cols-1">
          <div className="h-[380px] min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={layer.items} layout="vertical" margin={{ left: 28, right: 20, top: 12, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#dbe3ee" />
                <XAxis type="number" domain={[0, Math.ceil(maxRequest / 5) * 5]} />
                <YAxis dataKey="name" type="category" width={92} tick={{ fontSize: 12, fontWeight: 800 }} />
                <Tooltip content={<DashboardTooltip />} />
                <Legend />
                <Bar dataKey="waitMm" name="Wait MM" stackId="jobs" fill="#f59e0b" radius={[0, 8, 8, 0]} onClick={handleProblemBarClick} />
                <Bar dataKey="mmRepair" name="MM Repair" stackId="jobs" fill="#2563eb" radius={[0, 8, 8, 0]} onClick={handleProblemBarClick} />
                <Bar dataKey="waitQc" name="Wait QC" stackId="jobs" fill="#8b5cf6" radius={[0, 8, 8, 0]} onClick={handleProblemBarClick} />
                <Bar dataKey="qcInspection" name="QC Inspect" stackId="jobs" fill="#d946ef" radius={[0, 8, 8, 0]} onClick={handleProblemBarClick} />
                <Bar dataKey="waitProd" name="Wait Prod" stackId="jobs" fill="#06b6d4" radius={[0, 8, 8, 0]} onClick={handleProblemBarClick} />
                <Bar dataKey="prodConfirming" name="Prod Confirm" stackId="jobs" fill="#4f46e5" radius={[0, 8, 8, 0]} onClick={handleProblemBarClick} />
                <Bar dataKey="completed" name="Completed" stackId="jobs" fill="#10b981" radius={[0, 8, 8, 0]} onClick={handleProblemBarClick} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid content-start gap-4">
            <ProblemDonutChart colors={pieColors} data={layer.topProblems} />
            <TopProblemList problems={layer.topProblems} />
          </div>
        </div>
      </article>

      <PerformanceAnalyze performance={dashboardData?.performance} />
    </section>
  );
}

function LayerButton({ active, label, onClick }) {
  return (
    <button className={`h-10 rounded-xl px-4 text-sm font-black transition ${active ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function getProblemLayerLabel(layerKey) {
  if (layerKey === "machineType") {
    return "Machine Type";
  }

  if (layerKey === "machine") {
    return "Machine";
  }

  if (layerKey === "machineNo") {
    return "Machine No";
  }

  return layerKey.charAt(0).toUpperCase() + layerKey.slice(1);
}

function TopProblemList({ problems }) {
  const total = problems.reduce((sum, problem) => sum + problem.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="m-0 text-base font-black text-slate-950">Problem Top 5</h4>
      <div className="mt-3 grid gap-3">
        {problems.length ? problems.map((problem, index) => (
          <div key={problem.name}>
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-black text-slate-800">{index + 1}. {problem.name}</span>
              <span className="text-sm font-black text-slate-500">{problem.count}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full bg-sky-600 ${getWidthClass(total ? Math.round((problem.count / total) * 100) : 0)}`} />
            </div>
          </div>
        )) : (
          <p className="m-0 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-500">No problem data.</p>
        )}
      </div>
    </div>
  );
}

function ProblemDonutChart({ colors, data }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (!total) {
    return (
      <div className="grid h-[220px] place-items-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-500">No problem data</span>
      </div>
    );
  }

  return (
    <div className="h-[220px] min-h-[220px] min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="count"
            isAnimationActive={false}
            nameKey="name"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={3}
          >
            {data.map((item, index) => (
              <Cell fill={colors[index % colors.length]} key={item.name} />
            ))}
          </Pie>
          <Tooltip content={<DashboardTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function PerformanceAnalyze({ performance }) {
  const [metric, setMetric] = useState("avgHours");
  const [performancePath, setPerformancePath] = useState([{ layerKey: "area", label: "Area" }]);
  const activePerformance = performancePath[performancePath.length - 1];
  const baseLayer = {
    title: `${getProblemLayerLabel(activePerformance.layerKey)} Performance`,
    items: performance?.[activePerformance.layerKey] || []
  };
  const layer = activePerformance.customLayer || baseLayer;
  const layerKey = activePerformance.layerKey;
  const maxValue = Math.max(1, ...layer.items.map((item) => item[metric] || 0));
  const selectedItem = layer.items.reduce((current, item) => ((item[metric] || 0) > (current[metric] || 0) ? item : current), layer.items[0] || { name: "-", avgHours: 0, maxHours: 0 });
  const metricLabel = metric === "avgHours" ? "Average" : "Maximum";
  const metricUnit = metric === "avgHours" ? "hr avg" : "hr max";

  function updatePerformanceLayer(nextLayer) {
    setPerformancePath([{ layerKey: nextLayer, label: getProblemLayerLabel(nextLayer) }]);
  }

  function drillToNextLayer(item) {
    const nextLayer = layerKey === "area" ? "machineType" : layerKey === "machineType" ? "machineNo" : null;
    const drilldown = nextLayer ? (
      performance?.drilldown?.[layerKey]?.[item?.name] || {
        layer: nextLayer,
        title: `${item?.name || ""} ${getProblemLayerLabel(nextLayer)} Performance`,
        items: []
      }
    ) : null;

    if (drilldown) {
      setPerformancePath((current) => [
        ...current,
        {
          layerKey: drilldown.layer,
          label: item.name,
          customLayer: {
            title: drilldown.title,
            label: getProblemLayerLabel(drilldown.layer),
            nextLayer: null,
            items: drilldown.items
          }
        }
      ]);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Performance Analyze</p>
          <h3 className="m-0 mt-1 text-2xl font-black">{layer.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {performancePath.map((item, index) => (
              <button
                className={`rounded-full px-3 py-1 text-xs font-black ${index === performancePath.length - 1 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}
                key={`${item.layerKey}-${item.label}-${index}`}
                type="button"
                onClick={() => setPerformancePath((current) => current.slice(0, index + 1))}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <LayerButton active={metric === "avgHours"} label="Average" onClick={() => setMetric("avgHours")} />
          <LayerButton active={metric === "maxHours"} label="Maximum" onClick={() => setMetric("maxHours")} />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <LayerButton active={layerKey === "area"} label="Area" onClick={() => updatePerformanceLayer("area")} />
        <LayerButton active={layerKey === "machineType"} label="Machine Type" onClick={() => updatePerformanceLayer("machineType")} />
        <LayerButton active={layerKey === "machineNo"} label="Machine No" onClick={() => updatePerformanceLayer("machineNo")} />
      </div>
      <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(320px,0.3fr)] gap-4 max-[1100px]:grid-cols-1">
        <div className="h-[360px] min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={layer.items} layout="vertical" margin={{ left: 34, right: 24, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#dbe3ee" />
              <XAxis type="number" domain={[0, Math.ceil(maxValue / 5) * 5]} />
              <YAxis dataKey="name" type="category" width={104} tick={{ fontSize: 12, fontWeight: 800 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Bar dataKey={metric} name={metricLabel} fill="#f59e0b" radius={[0, 8, 8, 0]} onClick={drillToNextLayer} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-3">
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
            <p className="m-0 text-[11px] font-black uppercase tracking-[0.12em]">Highest {metricLabel}</p>
            <strong className="mt-2 block text-xl font-black text-slate-950">{selectedItem.name}</strong>
            <span className="mt-1 block text-sm font-bold">{selectedItem[metric]} {metricUnit}</span>
          </article>
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="m-0 text-lg font-black">Status Summary</h4>
            {jobRequestPerformanceStatusKeys.map((status) => (
              <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${status.tone}`} key={status.key}>
                <span className="text-sm font-black">{status.label}</span>
                <strong className="text-sm font-black">{selectedItem[status.key] || 0}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function getWidthClass(percent) {
  if (percent >= 90) return "w-full";
  if (percent >= 80) return "w-5/6";
  if (percent >= 65) return "w-2/3";
  if (percent >= 50) return "w-1/2";
  if (percent >= 35) return "w-1/3";
  if (percent >= 25) return "w-1/4";
  if (percent >= 15) return "w-1/5";
  return "w-1/12";
}

function DashboardTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl">
      <p className="m-0 font-black text-slate-950">{label || payload[0]?.name}</p>
      <div className="mt-2 grid gap-1">
        {payload.map((item) => (
          <span className="font-bold text-slate-600" key={`${item.name}-${item.value}`}>
            {item.name}: {item.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusCards({ jobs = [] }) {
  const counts = {
    total: jobs.length,
    waitMm: jobs.filter((job) => job.status === "WAIT_MM").length,
    mmRepair: jobs.filter((job) => job.status === "MM_REPAIR").length,
    waitQc: jobs.filter((job) => job.status === "WAIT_QC").length,
    qcInspection: jobs.filter((job) => job.status === "QC_INSPECTION").length,
    waitProd: jobs.filter((job) => job.status === "WAIT_PROD_CONFIRM").length,
    prodConfirming: jobs.filter((job) => job.status === "PROD_CONFIRMING").length,
    completed: jobs.filter((job) => job.status === "COMPLETED").length
  };

  return (
    <section className="mb-4 grid grid-cols-8 gap-2.5 max-[1500px]:grid-cols-4 max-[760px]:grid-cols-2">
      {jobRequestStatuses.map((status) => (
        <article className={`overflow-hidden rounded-xl border p-3 shadow-sm ${status.tone}`} key={status.key}>
          <p className="m-0 truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{status.label}</p>
          <strong className="mt-2 block text-2xl font-black leading-none">{counts[status.key] ?? 0}</strong>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
            <div className={`h-full w-2/3 rounded-full ${status.bar}`} />
          </div>
        </article>
      ))}
    </section>
  );
}

function SectionWorkspace({ jobs, onOpenModal, options, section }) {
  const storageKey = `jobRequestFilters:${section.key}`;
  const [filters, setFilters] = useState({ area: "All", machineType: "All", machineNo: "All", priority: "All" });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey)) || {};
      setFilters((current) => ({ ...current, ...stored }));
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    localStorage.setItem(storageKey, JSON.stringify(nextFilters));
  }

  const filteredJobs = jobs.filter((job) => (
    (filters.area === "All" || job.area === filters.area)
    && (filters.machineType === "All" || job.machineType === filters.machineType)
    && (filters.machineNo === "All" || job.machineNo === filters.machineNo)
    && (filters.priority === "All" || job.priority === filters.priority)
  ));

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-[760px]:flex-col max-[760px]:items-stretch">
        <div className="grid flex-1 grid-cols-4 gap-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
          <SearchField label="Area" options={["All", ...options.area]} value={filters.area} onChange={(value) => updateFilter("area", value)} />
          <SearchField label="Machine Type" options={["All", ...options.machineType]} value={filters.machineType} onChange={(value) => updateFilter("machineType", value)} />
          <SearchField label="Machine No" options={["All", ...options.machineNo]} value={filters.machineNo} onChange={(value) => updateFilter("machineNo", value)} />
          <SearchField label="Priority" options={["All", ...options.priority]} value={filters.priority} onChange={(value) => updateFilter("priority", value)} />
        </div>
        {section.primaryAction ? (
          <button className={`h-11 shrink-0 rounded-xl px-5 text-sm font-black text-white shadow-sm ${section.accent}`} type="button" onClick={() => onOpenModal(null)}>{section.primaryAction}</button>
        ) : null}
      </div>

      <JobTable jobs={filteredJobs} onOpenModal={onOpenModal} sectionKey={section.key} />
    </section>
  );
}

function JobTable({ jobs, onOpenModal, sectionKey }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const columns = getJobRequestTableColumns(sectionKey);
  const totalPages = Math.max(1, Math.ceil(jobs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const rows = jobs.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [sectionKey, pageSize]);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h3 className="m-0 text-lg font-black text-slate-950">Job List</h3>
        <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-black text-slate-700">{jobs.length ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, jobs.length)} of {jobs.length}</span>
      </div>
      <div className="mx-4 overflow-auto rounded-xl border border-slate-300">
        <table className="w-full min-w-[1500px] border-collapse">
          <thead>
            <tr className="sticky top-0 z-10 bg-slate-100">
              {columns.map((column) => (
                <th className={`border border-slate-300 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.08em] text-slate-700 ${column.key === "action" ? "sticky right-0 z-20 bg-slate-100 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]" : ""}`} key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((job, rowIndex) => (
              <tr className="odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/60" key={job.jobNo}>
                {columns.map((column) => (
                  <td className={`border border-slate-300 px-2 py-3 text-xs font-bold text-slate-900 ${["machineName", "machineCode", "productionLine", "requestBy"].includes(column.key) ? "text-left" : "text-center"} ${column.key === "action" ? "sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]" : ""}`} key={`${job.jobNo}-${column.key}`}>
                    <JobTableCell columnKey={column.key} job={job} no={startIndex + rowIndex + 1} onOpenModal={onOpenModal} sectionKey={sectionKey} />
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="border border-slate-300 px-3 py-8 text-center text-sm font-black text-slate-500" colSpan={columns.length}>No records found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 max-[760px]:grid-cols-1">
        <span className="text-sm font-bold text-slate-500">Page {safePage} of {totalPages}</span>
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-black ${pageNumber === safePage ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 max-[760px]:justify-center">
          {[5, 10, 20].map((size) => (
            <button
              className={`h-10 rounded-xl border px-3 text-sm font-black ${size === pageSize ? "border-sky-600 bg-sky-50 text-sky-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              key={size}
              type="button"
              onClick={() => setPageSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function JobTableCell({ columnKey, job, no, onOpenModal, sectionKey }) {
  if (columnKey === "no") {
    return no;
  }

  if (columnKey === "status") {
    return <span className={`inline-flex max-w-full justify-center truncate whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${statusTone[job.status]}`}>{formatStatusLabel(job.status)}</span>;
  }

  if (columnKey === "priority") {
    return <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{job.priority}</span>;
  }

  if (["prodProgress", "mmProgress", "qcProgress"].includes(columnKey)) {
    const progressKey = columnKey.replace("Progress", "");
    return <ProgressBadge value={job.progress?.[progressKey] || "-"} />;
  }

  if (columnKey === "action") {
    return <button className="min-h-9 min-w-24 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800" type="button" onClick={() => onOpenModal?.(job)}>{getAvailableJobAction(sectionKey, job.status)}</button>;
  }

  return <span className="block max-w-44 truncate" title={job[columnKey] || "-"}>{job[columnKey] || "-"}</span>;
}

function formatStatusLabel(status) {
  return String(status || "-").replaceAll("_", " ");
}

function ProgressBadge({ value }) {
  const tone = (() => {
    if (value === "-") return "bg-slate-100 text-slate-500";
    if (value === "Done") return "bg-emerald-100 text-emerald-700";
    if (value.startsWith("Reject")) return "bg-red-100 text-red-700";
    if (value.includes("MM")) return "bg-blue-100 text-blue-700";
    if (value.includes("QC")) return "bg-violet-100 text-violet-700";
    if (value.includes("PROD")) return "bg-cyan-100 text-cyan-700";
    if (value.includes("WAIT")) return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  })();

  return <span className={`inline-flex max-w-full justify-center truncate whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${tone}`}>{formatStatusLabel(value)}</span>;
}

function HandoverWorkspace({ jobs, onOpenModal, options }) {
  const [handoverRows, setHandoverRows] = useState([]);
  const activeJobs = jobs.filter((job) => !["COMPLETED", "CANCELLED"].includes(job.status));

  useEffect(() => {
    let isMounted = true;

    async function loadHandovers() {
      try {
        const response = await api.get("/job-requests/handovers");
        if (isMounted) {
          setHandoverRows(response.data?.data || []);
        }
      } catch {
        if (isMounted) {
          setHandoverRows([]);
        }
      }
    }

    loadHandovers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-[760px]:flex-col max-[760px]:items-stretch">
        <div className="grid flex-1 grid-cols-4 gap-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
          <SearchField label="Job No" options={handoverRows.length ? handoverRows.map((row) => row.jobNo) : ["All"]} />
          <SearchField label="Status" options={["All", "WAIT_MM", "MM_REPAIR", "WAIT_QC", "QC_INSPECTION", "WAIT_PROD_CONFIRM", "PROD_CONFIRMING"]} />
          <SearchField label="Handover To" options={[...options.maintenancePic, ...options.empId]} />
          <SearchField label="Shift" options={["All", "Day Shift", "Night Shift"]} />
        </div>
        <button className="h-11 shrink-0 rounded-xl bg-teal-700 px-5 text-sm font-black text-white shadow-sm" type="button" onClick={() => onOpenModal(null)} disabled={!activeJobs.length}>New Handover</button>
      </div>
      <HandoverTable onOpenModal={onOpenModal} rows={handoverRows} />
    </section>
  );
}

function HandoverTable({ onOpenModal, rows }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h3 className="m-0 text-lg font-black text-slate-950">Handover List</h3>
        <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-black text-slate-700">{rows.length ? 1 : 0}-{rows.length} of {rows.length}</span>
      </div>
      <div className="mx-4 overflow-auto rounded-xl border border-slate-300">
        <table className="w-full min-w-[1400px] border-collapse">
          <thead>
            <tr className="sticky top-0 z-10 bg-slate-100">
              {jobRequestHandoverColumns.map((column) => (
                <th className={`border border-slate-300 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.08em] text-slate-700 ${column.key === "action" ? "sticky right-0 z-20 bg-slate-100 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]" : ""}`} key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className="odd:bg-white even:bg-slate-50/70 hover:bg-teal-50/60" key={row.id}>
                {jobRequestHandoverColumns.map((column) => (
                  <td className={`border border-slate-300 px-3 py-3 text-sm font-bold text-slate-900 ${["reason", "currentOwner", "handoverFrom", "handoverTo"].includes(column.key) ? "text-left" : "text-center"} ${column.key === "action" ? "sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]" : ""}`} key={`${row.id}-${column.key}`}>
                    <HandoverTableCell columnKey={column.key} no={index + 1} onOpenModal={onOpenModal} row={row} />
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="border border-slate-300 px-3 py-8 text-center text-sm font-black text-slate-500" colSpan={jobRequestHandoverColumns.length}>No records found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center p-4">
        <button className="h-10 min-w-10 rounded-xl border border-slate-950 bg-slate-950 px-3 text-sm font-black text-white" type="button">1</button>
      </div>
    </article>
  );
}

function HandoverTableCell({ columnKey, no, onOpenModal, row }) {
  if (columnKey === "no") {
    return no;
  }

  if (columnKey === "status") {
    return <span className={`inline-flex max-w-full justify-center truncate whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${statusTone[row.status]}`}>{formatStatusLabel(row.status)}</span>;
  }

  if (columnKey === "action") {
    return <button className="min-h-9 rounded-xl bg-teal-700 px-4 py-2 text-xs font-black text-white transition hover:bg-teal-800" type="button" onClick={() => onOpenModal?.(row)}>Handover</button>;
  }

  return <span className="block max-w-56 truncate" title={row[columnKey] || "-"}>{row[columnKey] || "-"}</span>;
}

function SearchField({ label, onChange, options, value: controlledValue }) {
  const [internalValue, setInternalValue] = useState(options[0] || "");
  const value = controlledValue ?? internalValue;

  function handleChange(nextValue) {
    setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  return (
    <label className="grid min-w-0 gap-1">
      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <SearchableDropdown options={options} value={value} onChange={handleChange} />
    </label>
  );
}

function SearchableDropdown({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const safeOptions = options.length ? options : ["No options"];
  const visibleOptions = safeOptions.filter((option) => option.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative min-w-0">
      <div className="flex h-10 items-center rounded-xl border border-slate-300 bg-white shadow-sm transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
        <input className="w-0 min-w-0 flex-1 rounded-l-xl bg-transparent px-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400" value={isOpen ? query : value} onBlur={() => setTimeout(() => setIsOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }} onFocus={() => { setQuery(""); setIsOpen(true); }} />
        <button className="h-full w-10 shrink-0 rounded-r-xl border-l border-slate-200 text-xs font-black text-slate-500 transition hover:bg-slate-50" type="button" onClick={() => setIsOpen((current) => !current)}>v</button>
      </div>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {visibleOptions.map((option) => (
            <button className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm font-bold transition hover:bg-sky-50 ${option === value ? "bg-sky-100 text-sky-900" : "text-slate-800"}`} key={option} type="button" title={option} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option); setQuery(""); setIsOpen(false); }}>
              {option}
            </button>
          ))}
          {!visibleOptions.length ? <div className="px-3 py-2 text-sm font-bold text-slate-500">No matching options</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function MultiSearchField({ description = "", label, onChange, optional = false, options }) {
  const [selectedItems, setSelectedItems] = useState(optional ? [] : options.slice(0, 1));
  const [otherValue, setOtherValue] = useState("");

  function updateSelectedItems(nextItems) {
    setSelectedItems(nextItems);
    onChange?.(nextItems);
  }

  function toggleItem(option) {
    updateSelectedItems(
      selectedItems.includes(option)
        ? selectedItems.filter((item) => item !== option)
        : [...selectedItems, option]
    );
  }

  const needsOther = selectedItems.some((item) => item.toLowerCase().includes("other"));

  return (
    <div className="grid min-w-0 gap-2">
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
        {description ? <p className="m-0 mt-1 text-xs font-bold text-slate-500">{description}</p> : null}
      </div>
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-2">
        <div className="mb-2">
          <SearchableDropdown
            options={options}
            value="Search and add"
            onChange={(value) => {
              if (!selectedItems.includes(value)) {
                updateSelectedItems([...selectedItems, value]);
              }
            }}
          />
        </div>
        {options.length ? (
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
            <button
              className={`max-w-full truncate rounded-full border px-3 py-1.5 text-xs font-black transition ${selectedItems.includes(option) ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"}`}
              key={option}
              title={option}
              type="button"
              onClick={() => toggleItem(option)}
            >
              {option}
            </button>
            ))}
          </div>
        ) : (
          <p className="m-0 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500">No issued spare part from Tooling for this job.</p>
        )}
        {needsOther ? (
          <input
            className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-sky-400"
            placeholder="Specify other detail"
            value={otherValue}
            onChange={(event) => setOtherValue(event.target.value)}
          />
        ) : null}
      </div>
    </div>
  );
}

async function submitJobAction(job, payload, onClose, onActionComplete) {
  if (!job?.jobNo) {
    onClose?.();
    return;
  }

  const Swal = (await import("sweetalert2")).default;
  const confirm = await Swal.fire(buildConfirmAlert(
    `${getConfirmVerb(payload.actionName)}?`,
    `Job ${job.jobNo} will move to ${payload.toStatus || "the next step"}.`,
    { confirmButtonText: getConfirmVerb(payload.actionName) }
  ));

  if (!confirm.isConfirmed) {
    return;
  }

  try {
    await api.post(`/job-requests/${job.jobNo}/actions`, payload);
    await Swal.fire(buildSuccessAlert("Saved", "Job request has been updated."));
    onActionComplete?.();
  } catch {
    await Swal.fire({ icon: "error", title: "Save failed", text: "Unable to update job request." });
  } finally {
    onClose?.();
  }
}

function getConfirmVerb(actionName = "SAVE") {
  if (actionName.includes("REJECT")) return "Reject";
  if (actionName.includes("ACCEPT")) return "Accept";
  if (actionName.includes("COMPLETE") || actionName.includes("CONFIRM")) return "Confirm";
  if (actionName.includes("HANDOVER")) return "Send handover";
  if (actionName.includes("SEND")) return "Send";
  return "Save";
}

function ActionModal({ job, jobs = [], onActionComplete, onClose, options, section }) {
  if (job?.__viewOnly) {
    return <ViewJobModal job={job} onClose={onClose} section={section} />;
  }

  if (section.key === "handover") {
    return <HandoverModal job={job} jobs={jobs} onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
  }
  if (section.key === "maintenance") {
    if (!["WAIT_MM", "MM_REPAIR"].includes(job?.status)) {
      return <ViewJobModal job={job} onClose={onClose} section={section} />;
    }
    return <MaintenanceModal job={job} onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
  }
  if (section.key === "qc") {
    if (!["WAIT_QC", "QC_INSPECTION"].includes(job?.status)) {
      return <ViewJobModal job={job} onClose={onClose} section={section} />;
    }
    return <QcModal job={job} onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
  }
  return <ProductionModal job={job} onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
}

function withOtherOption(options = [], label = "Other") {
  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const hasOther = safeOptions.some((option) => option.toLowerCase().includes("other"));
  return hasOther ? safeOptions : [...safeOptions, label];
}

function ProductionModal({ job, onActionComplete, onClose, options, section }) {
  if (job?.status === "WAIT_PROD_CONFIRM") {
    return <ProductionAcceptModal job={job} onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
  }

  if (job?.status === "PROD_CONFIRMING") {
    return <ProductionConfirmModal job={job} onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
  }

  if (job) {
    return <ViewJobModal job={job} onClose={onClose} section={section} />;
  }

  return <ProductionCreateModal onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
}

function ProductionCreateModal({ onActionComplete, onClose, options, section }) {
  const [empId, setEmpId] = useState(options.empId[0] || "");
  const [area, setArea] = useState(options.area[0] || "");
  const [machineType, setMachineType] = useState(options.machineType[0] || "");
  const [machineNo, setMachineNo] = useState(options.machineNo[0] || "");
  const [problems, setProblems] = useState(options.problem[0] ? [options.problem[0]] : []);
  const [priority, setPriority] = useState(options.priority[1] || options.priority[0] || "");
  const [description, setDescription] = useState("");

  async function handleCreate() {
    const Swal = (await import("sweetalert2")).default;
    const confirm = await Swal.fire(buildConfirmAlert(
      "Submit job request?",
      "This will send the request to Maintenance.",
      { confirmButtonText: "Submit" }
    ));

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      await api.post("/job-requests", {
        area,
        description,
        machineNo,
        machineType,
        priority,
        problems,
        requestBy: empId
      });
      await Swal.fire(buildSuccessAlert("Created", "Job request has been sent to Maintenance."));
      onActionComplete?.();
      onClose?.();
    } catch {
      await Swal.fire({ icon: "error", title: "Create failed", text: "Unable to create job request." });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[94vh] w-[min(960px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <p className="m-0 text-[11px] font-black uppercase tracking-[0.12em] text-sky-700">{section.shortTitle}</p>
            <h3 className="m-0 mt-0.5 text-2xl font-black text-slate-950">Create Job Request</h3>
          </div>
          <button className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          <div className="col-span-3 max-[900px]:col-span-6 max-[640px]:col-span-12"><ReadOnlyInput label="Job No" value="Auto generated" /></div>
          <div className="col-span-5 max-[900px]:col-span-6 max-[640px]:col-span-12"><SearchField label="Emp ID" options={options.empId} value={empId} onChange={setEmpId} /></div>
          <div className="col-span-2 max-[900px]:col-span-6 max-[640px]:col-span-12"><SearchField label="Priority" options={options.priority} value={priority} onChange={setPriority} /></div>
          <div className="col-span-2 max-[900px]:col-span-6 max-[640px]:col-span-12"><ReadOnlyInput label="Status" value="WAIT_MM" /></div>
          <div className="col-span-4 max-[900px]:col-span-6 max-[640px]:col-span-12"><SearchField label="Area" options={options.area} value={area} onChange={setArea} /></div>
          <div className="col-span-4 max-[900px]:col-span-6 max-[640px]:col-span-12"><SearchField label="Machine Type" options={options.machineType} value={machineType} onChange={setMachineType} /></div>
          <div className="col-span-4 max-[900px]:col-span-12"><SearchField label="Machine No" options={options.machineNo} value={machineNo} onChange={setMachineNo} /></div>
          <div className="col-span-12">
            <MultiSearchField label="Problems" options={withOtherOption(options.problem.concat(options.problemOther), "Other problem")} onChange={setProblems} />
          </div>
          <label className="col-span-7 grid gap-1 max-[900px]:col-span-12">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Description</span>
            <textarea className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="Short problem detail" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="col-span-5 max-[900px]:col-span-12"><UploadBox /></div>
        </div>
        <div className="sticky bottom-0 z-20 flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <button className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50" type="button" onClick={onClose}>Cancel</button>
          <button className={`h-10 rounded-xl px-5 text-sm font-black text-white shadow-sm ${section.accent}`} type="button" onClick={handleCreate}>Save</button>
        </div>
      </form>
    </div>
  );
}

function ProductionAcceptModal({ job, onActionComplete, onClose, options, section }) {
  function handleSubmit() {
    submitJobAction(job, {
      actionName: "PRODUCTION_ACCEPT",
      actionBy: "Production",
      eventName: "job_wait_confirming",
      owner: "Production",
      prodProgress: "PROD_CONFIRMING",
      toStatus: "PROD_CONFIRMING"
    }, onClose, onActionComplete);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[94vh] w-[min(760px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader section={section} title="Accept Production Confirm" onClose={onClose} />
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Job No" value={job?.jobNo || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Current Status" value={job?.status || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Production PIC" options={options.empId} /></div>
          <div className="col-span-12"><ReadOnlyInput label="Machine" value={job ? `${job.machineName} / ${job.machineNo}` : "-"} /></div>
          <label className="col-span-12 grid gap-1">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Accept Note</span>
            <textarea className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="Production accepts this job and will confirm machine condition." />
          </label>
          <HistoryTimeline jobNo={job?.jobNo} />
        </div>
        <ModalFooter onSubmit={handleSubmit} section={section} onClose={onClose} submitLabel="Start Check" />
      </form>
    </div>
  );
}

function ProductionConfirmModal({ job, onActionComplete, onClose, options, section }) {
  const [confirmResult, setConfirmResult] = useState(options.confirmResult[0] || "");
  const isRejecting = confirmResult.toLowerCase().includes("reject");

  function handleSubmit() {
    const payload = isRejecting
      ? { actionName: "PRODUCTION_REJECT", actionBy: "Production", eventName: "job_rejected_by_production", owner: "QC", prodProgress: "Reject (QC[1])", qcProgress: "WAIT_QC", toStatus: "WAIT_QC" }
      : { actionName: "PRODUCTION_CONFIRM", actionBy: "Production", eventName: "job_completed", owner: "Completed", prodProgress: "Done", toStatus: "COMPLETED" };

    submitJobAction(job, payload, onClose, onActionComplete);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[94vh] w-[min(920px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader section={section} title="Production Confirm" onClose={onClose} />
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          <div className="col-span-3 max-[760px]:col-span-12"><ReadOnlyInput label="Job No" value={job?.jobNo || "-"} /></div>
          <div className="col-span-3 max-[760px]:col-span-12"><ReadOnlyInput label="Current Status" value={job?.status || "-"} /></div>
          <div className="col-span-6 max-[760px]:col-span-12"><ReadOnlyInput label="Machine" value={job ? `${job.machineName} / ${job.machineNo}` : "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Confirm Result" options={options.confirmResult} value={confirmResult} onChange={setConfirmResult} /></div>
          <div className="col-span-8 max-[760px]:col-span-12">
            {isRejecting ? <MultiSearchField label="Reject Reasons" options={withOtherOption(options.productionRejectReason, "Other production reject reason")} /> : <MultiSearchField label="Confirm Checks" options={withOtherOption(options.confirmCheck, "Other confirm check")} />}
          </div>
          <label className="col-span-12 grid gap-1">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{isRejecting ? "Reject Detail" : "Confirm Detail"}</span>
            <textarea className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="Record machine check result." />
          </label>
          <div className="col-span-5 max-[760px]:col-span-12"><UploadBox /></div>
          <HistoryTimeline jobNo={job?.jobNo} />
        </div>
        <ModalFooter onSubmit={handleSubmit} section={section} onClose={onClose} submitLabel="Save Confirm" />
      </form>
    </div>
  );
}

function ViewJobModal({ job, onClose, section }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <div className="max-h-[94vh] w-[min(820px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader section={section} title="Job Detail" onClose={onClose} />
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          <div className="col-span-3 max-[760px]:col-span-12"><ReadOnlyInput label="Job No" value={job?.jobNo || "-"} /></div>
          <div className="col-span-3 max-[760px]:col-span-12"><ReadOnlyInput label="Status" value={job?.status || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Machine" value={job ? `${job.machineName} / ${job.machineNo}` : "-"} /></div>
          <div className="col-span-2 max-[760px]:col-span-12"><ReadOnlyInput label="Priority" value={job?.priority || "-"} /></div>
          <div className="col-span-6 max-[760px]:col-span-12"><ReadOnlyInput label="Problem Description" value={job?.problem || "-"} /></div>
          <div className="col-span-6 max-[760px]:col-span-12"><ReadOnlyInput label="Repair Detail" value={job?.repairDetail || "-"} /></div>
          <HistoryTimeline jobNo={job?.jobNo} />
        </div>
        <div className="sticky bottom-0 z-20 flex justify-end border-t border-slate-200 bg-white px-5 py-3">
          <button className="h-10 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function HandoverModal({ job, jobs = [], onActionComplete, onClose, options, section }) {
  const handoverJobs = jobs.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status));
  const jobOptions = handoverJobs.map((item) => item.jobNo);
  const [selectedJobNo, setSelectedJobNo] = useState(job?.jobNo || jobOptions[0] || "");
  const selectedJob = job?.jobNo ? job : handoverJobs.find((item) => item.jobNo === selectedJobNo);

  function handleSubmit() {
    submitJobAction(selectedJob, {
      actionName: "HANDOVER_JOB",
      actionBy: selectedJob?.owner || "Current Owner",
      eventName: "job_handover_created",
      owner: "Next shift owner",
      toStatus: selectedJob?.status || "MM_REPAIR"
    }, onClose, onActionComplete);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[94vh] w-[min(820px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader section={section} title="Handover Job" onClose={onClose} />
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          {job?.jobNo ? (
            <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Job No" value={job.jobNo} /></div>
          ) : (
            <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Job No" options={jobOptions.length ? jobOptions : ["-"]} value={selectedJobNo || "-"} onChange={setSelectedJobNo} /></div>
          )}
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Current Status" value={selectedJob?.status || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Current Owner" value={selectedJob?.currentOwner || selectedJob?.owner || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Handover To" options={[...options.maintenancePic, ...options.empId]} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Shift" options={["Day Shift", "Night Shift"]} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Reason" options={withOtherOption(["End of shift, repair not finished", "Production confirm continues next shift", "QC inspection continues next shift"], "Other handover reason")} /></div>
          <div className="col-span-12"><MultiSearchField label="Pending Items" options={withOtherOption(options.handoverPendingItem, "Other pending item")} /></div>
          <label className="col-span-7 grid gap-1 max-[900px]:col-span-12">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Handover Note</span>
            <textarea className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="What has been done and what the next person must continue." />
          </label>
          <HistoryTimeline jobNo={selectedJob?.jobNo} />
        </div>
        <ModalFooter onSubmit={handleSubmit} section={section} onClose={onClose} submitLabel="Save Handover" />
      </form>
    </div>
  );
}

function MaintenanceModal({ job, onActionComplete, onClose, options, section }) {
  const [issuedSparePartOptions, setIssuedSparePartOptions] = useState([]);
  const [nextStep, setNextStep] = useState("Send to QC");

  useEffect(() => {
    let isMounted = true;

    async function loadIssuedSpareParts() {
      try {
        const response = await api.get(`/job-requests/${job?.jobNo}/issued-spare-parts`);
        const options = (response.data?.data || []).map((item) => `${item.issueNo} / ${item.itemCode} / ${item.itemName} / ${item.quantity} ${item.unitCode}`);
        if (isMounted) {
          setIssuedSparePartOptions(options);
        }
      } catch {
        if (isMounted) {
          setIssuedSparePartOptions([]);
        }
      }
    }

    if (job?.jobNo) {
      loadIssuedSpareParts();
    }

    return () => {
      isMounted = false;
    };
  }, [job?.jobNo]);

  if (job?.status === "WAIT_MM") {
    return <MaintenanceAcceptModal job={job} onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
  }

  function handleSubmit() {
    const route = {
      "Send to QC": { eventName: "job_wait_qc", owner: "QC", prodProgress: job?.progress?.prod || "Done", mmProgress: "Done", qcProgress: "WAIT_QC", toStatus: "WAIT_QC", actionName: "SEND_TO_QC" },
      "Send to Production Confirm": { eventName: "job_wait_confirming", owner: "Production", prodProgress: "WAIT_PROD_CONFIRM", mmProgress: "Done", qcProgress: job?.progress?.qc || "-", toStatus: "WAIT_PROD_CONFIRM", actionName: "SEND_TO_PRODUCTION" },
      "Complete Job": { eventName: "job_completed", owner: "Completed", prodProgress: "Done", mmProgress: "Done", qcProgress: job?.progress?.qc || "-", toStatus: "COMPLETED", actionName: "MAINTENANCE_COMPLETE" }
    }[nextStep];

    submitJobAction(job, {
      actionName: route.actionName,
      actionBy: "Maintenance",
      eventName: route.eventName,
      owner: route.owner,
      prodProgress: route.prodProgress,
      mmProgress: route.mmProgress,
      qcProgress: route.qcProgress,
      toStatus: route.toStatus
    }, onClose, onActionComplete);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[94vh] w-[min(960px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader section={section} title="Repair Result" onClose={onClose} />
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          <div className="col-span-3 max-[760px]:col-span-12"><ReadOnlyInput label="Job No" value={job?.jobNo || "-"} /></div>
          <div className="col-span-3 max-[760px]:col-span-12"><ReadOnlyInput label="Current Status" value={job?.status || "-"} /></div>
          <div className="col-span-3 max-[760px]:col-span-12"><SearchField label="Maintenance PIC" options={options.maintenancePic} /></div>
          <div className="col-span-3 max-[760px]:col-span-12"><SearchField label="Next Step" options={["Send to QC", "Send to Production Confirm", "Complete Job"]} value={nextStep} onChange={setNextStep} /></div>
          <div className="col-span-6 max-[900px]:col-span-12"><MultiSearchField label="Causes of Problem" options={withOtherOption(options.repairCause, "Other cause")} /></div>
          <div className="col-span-6 max-[900px]:col-span-12"><MultiSearchField label="Corrective Actions" options={withOtherOption(options.repairAction, "Other corrective action")} /></div>
          <div className="col-span-12">
            <MultiSearchField
              description="Optional. Select only spare parts already issued from Tooling Store for this job."
              label="Issued Spare Parts Used"
              optional
              options={issuedSparePartOptions}
            />
          </div>
          <label className="col-span-7 grid gap-1 max-[900px]:col-span-12">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Repair Detail</span>
            <textarea className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" defaultValue={job?.repairDetail || ""} />
          </label>
          <div className="col-span-5 max-[900px]:col-span-12"><UploadBox /></div>
          <HistoryTimeline jobNo={job?.jobNo} />
        </div>
        <ModalFooter onSubmit={handleSubmit} section={section} onClose={onClose} submitLabel="Save Repair" />
      </form>
    </div>
  );
}

function MaintenanceAcceptModal({ job, onActionComplete, onClose, options, section }) {
  function handleSubmit() {
    submitJobAction(job, {
      actionName: "ACCEPT_JOB",
      actionBy: "Maintenance",
      eventName: "job_accepted",
      owner: "Maintenance",
      mmProgress: "MM_REPAIR",
      toStatus: "MM_REPAIR"
    }, onClose, onActionComplete);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[94vh] w-[min(760px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader section={section} title="Accept Job" onClose={onClose} />
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Job No" value={job?.jobNo || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Current Status" value={job?.status || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Maintenance PIC" options={options.maintenancePic} /></div>
          <div className="col-span-12"><ReadOnlyInput label="Machine" value={job ? `${job.machineName} / ${job.machineNo}` : "-"} /></div>
          <div className="col-span-6 max-[760px]:col-span-12"><ReadOnlyInput label="Accept By" value="Current login user" /></div>
          <div className="col-span-6 max-[760px]:col-span-12"><ReadOnlyInput label="Accept At" value="Auto timestamp" /></div>
          <HistoryTimeline jobNo={job?.jobNo} />
        </div>
        <ModalFooter onSubmit={handleSubmit} section={section} onClose={onClose} submitLabel="Accept Job" />
      </form>
    </div>
  );
}

function QcModal({ job, onActionComplete, onClose, options, section }) {
  const [qcResult, setQcResult] = useState(options.qcResult[0] || "");
  const isRejecting = qcResult.toLowerCase().includes("reject");

  if (job?.status === "WAIT_QC") {
    return <QcAcceptModal job={job} onActionComplete={onActionComplete} onClose={onClose} options={options} section={section} />;
  }

  function handleSubmit() {
    const payload = isRejecting
      ? { actionName: "QC_REJECT", actionBy: "QC", eventName: "job_rejected_by_qc", owner: "Maintenance", mmProgress: "MM_REPAIR", qcProgress: "Reject (MM[1])", toStatus: "MM_REPAIR" }
      : { actionName: "QC_PASS", actionBy: "QC", eventName: "job_wait_confirming", owner: "Production", qcProgress: "Done", prodProgress: "WAIT_PROD_CONFIRM", toStatus: "WAIT_PROD_CONFIRM" };

    submitJobAction(job, payload, onClose, onActionComplete);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[94vh] w-[min(960px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader section={section} title="QC Inspection" onClose={onClose} />
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          <div className="col-span-3 max-[760px]:col-span-12"><ReadOnlyInput label="Job No" value={job?.jobNo || "-"} /></div>
          <div className="col-span-5 max-[760px]:col-span-12"><ReadOnlyInput label="Machine" value={job ? `${job.machineNo} / ${job.machineType}` : "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Inspector" options={options.empId.filter((item) => item.startsWith("QC-"))} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="QC Result" options={options.qcResult} value={qcResult} onChange={setQcResult} /></div>
          <div className="col-span-8 max-[760px]:col-span-12">
            {isRejecting ? <MultiSearchField label="Reject Reasons" options={withOtherOption(options.qcRejectReason, "Other QC reject reason")} /> : <MultiSearchField label="QC Findings" options={withOtherOption(options.qcFinding, "Other finding")} />}
          </div>
          <label className="col-span-12 grid gap-1">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{isRejecting ? "Reject Detail" : "Inspection Detail"}</span>
            <textarea className="min-h-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="Record inspection result" />
          </label>
          <div className="col-span-5 max-[760px]:col-span-12"><UploadBox /></div>
          <HistoryTimeline jobNo={job?.jobNo} />
        </div>
        <ModalFooter onSubmit={handleSubmit} section={section} onClose={onClose} submitLabel="Save Inspection" />
      </form>
    </div>
  );
}

function QcAcceptModal({ job, onActionComplete, onClose, options, section }) {
  function handleSubmit() {
    submitJobAction(job, {
      actionName: "QC_ACCEPT",
      actionBy: "QC",
      eventName: "job_qc_accepted",
      owner: "QC",
      qcProgress: "QC_INSPECTION",
      toStatus: "QC_INSPECTION"
    }, onClose, onActionComplete);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[94vh] w-[min(760px,100%)] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader section={section} title="Accept QC Inspection" onClose={onClose} />
        <div className="grid grid-cols-12 items-start gap-3 p-5">
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Job No" value={job?.jobNo || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><ReadOnlyInput label="Current Status" value={job?.status || "-"} /></div>
          <div className="col-span-4 max-[760px]:col-span-12"><SearchField label="Inspector" options={options.empId.filter((item) => item.startsWith("QC-"))} /></div>
          <div className="col-span-12"><ReadOnlyInput label="Machine" value={job ? `${job.machineNo} / ${job.machineType}` : "-"} /></div>
          <HistoryTimeline jobNo={job?.jobNo} />
        </div>
        <ModalFooter onSubmit={handleSubmit} section={section} onClose={onClose} submitLabel="Accept Inspection" />
      </form>
    </div>
  );
}

function HistoryTimeline({ jobNo }) {
  const [histories, setHistories] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const response = await api.get(`/job-requests/${jobNo}/history`);
        if (isMounted) {
          setHistories(response.data?.data || []);
        }
      } catch {
        if (isMounted) {
          setHistories([]);
        }
      }
    }

    if (jobNo) {
      loadHistory();
    }

    return () => {
      isMounted = false;
    };
  }, [jobNo]);

  return (
    <section className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="m-0 text-base font-black text-slate-950">Request / Repair History</h4>
      <div className="mt-3 grid max-h-72 gap-3 overflow-auto pr-1">
        {histories.length ? histories.map((history) => (
          <HistoryTimelineItem history={history} key={`${history.jobNo}-${history.time}-${history.action}`} onPreviewImage={setPreviewImage} />
        )) : (
          <p className="m-0 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm font-bold text-slate-500">No history recorded yet.</p>
        )}
      </div>
      {previewImage ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-5" onClick={() => setPreviewImage(null)}>
          <div className="grid max-h-[92vh] w-[min(920px,100%)] overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="m-0 text-[11px] font-black uppercase tracking-[0.12em] text-sky-700">History Attachment</p>
                <h5 className="m-0 mt-0.5 text-lg font-black text-slate-950">{previewImage.label}</h5>
              </div>
              <button className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50" type="button" onClick={() => setPreviewImage(null)}>Close</button>
            </div>
            <div className="grid max-h-[76vh] place-items-center overflow-auto bg-slate-950 p-3">
              <img alt={previewImage.label} className="max-h-[72vh] max-w-full rounded-xl object-contain" src={previewImage.url} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HistoryTimelineItem({ history, onPreviewImage }) {
  const attachments = getHistoryAttachments(history);

  return (
    <article className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
      <span className="pt-2 text-sm font-black text-slate-500">{formatHistoryTime(history.time)}</span>
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-sm font-black text-slate-950">{formatStatusLabel(history.action)}</strong>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{history.by}</span>
        </div>
        <p className="m-0 mt-1 text-sm font-bold text-slate-600">{formatStatusLabel(history.from)} to {formatStatusLabel(history.to)}</p>
        <p className="m-0 mt-2 text-sm font-bold text-slate-800">{history.remark}</p>
        {attachments.length ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Images sent in this step</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">{attachments.length} file{attachments.length > 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {attachments.map((url, index) => {
                const label = `${formatStatusLabel(history.action)} image ${index + 1}`;
                return (
                  <button
                    className="group grid min-w-0 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 text-left text-xs font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => onPreviewImage({ label, url })}
                  >
                    <span className="grid h-20 w-full place-items-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                      <img alt={label} className="h-full w-full object-cover transition group-hover:scale-105" src={url} />
                    </span>
                    <span className="truncate px-1">Step image {index + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function getHistoryAttachments(history = {}) {
  const value = history.attachments || history.attachmentUrls || history.imageUrls || history.imageUrl || history.attachmentUrl;

  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPendingAlertJobForSection(sectionKey, jobs = []) {
  if (!["production", "maintenance", "qc"].includes(sectionKey)) {
    return null;
  }

  const actionableJobs = jobs.filter((job) => {
    if (sectionKey === "production") {
      return job.status === "WAIT_PROD_CONFIRM";
    }

    if (sectionKey === "maintenance") {
      return job.status === "WAIT_MM" || (job.status === "MM_REPAIR" && String(job.qcProgress || job.prodProgress || "").toLowerCase().includes("reject"));
    }

    if (sectionKey === "qc") {
      return job.status === "WAIT_QC";
    }

    return false;
  });

  return sortJobRequests(actionableJobs)[0] || null;
}

async function notifyPendingJobAlert(job, sectionKey) {
  const stopSound = startJobRequestAlertSound(sectionKey);

  const actionText = sectionKey === "handover" ? "View Job" : getAvailableJobAction(sectionKey, job.status);
  const Swal = (await import("sweetalert2")).default;
  const result = await Swal.fire({
    icon: String(job.qcProgress || job.prodProgress || "").toLowerCase().includes("reject") ? "warning" : "info",
    title: getPendingAlertTitle(sectionKey, job),
    html: `
      <div class="grid gap-1 text-left text-sm text-slate-700">
        <strong class="text-base text-slate-950">${job.jobNo}</strong>
        <span>Status: ${formatStatusLabel(job.status)}</span>
        <span>Machine: ${job.machineName || "-"} / ${job.machineNo || "-"}</span>
        <span>Priority: ${job.priority || "-"}</span>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: actionText,
    cancelButtonText: "Close",
    allowOutsideClick: false,
    allowEscapeKey: false,
    willClose: stopSound
  });

  return result.isConfirmed ? { action: "open", job } : { action: "close" };
}

function getPendingAlertTitle(sectionKey, job) {
  if (sectionKey === "maintenance" && job.status === "WAIT_MM") {
    return "Maintenance has a new request";
  }

  if (sectionKey === "maintenance") {
    return "Maintenance has a returned job";
  }

  if (sectionKey === "qc") {
    return "QC has a job waiting";
  }

  if (sectionKey === "production") {
    return "Production confirmation required";
  }

  return "Job needs attention";
}

async function notifyJobRequestEvent(event, lastNotificationRef, sectionKey) {
  const eventName = event?.eventName || "job_request_updated";
  const payload = event?.payload || {};
  const job = payload.job || {};
  const jobNo = payload.jobNo || job.jobNo || "-";
  const status = payload.status || job.status || "-";
  const notificationKey = `${eventName}:${jobNo}:${status}`;
  const now = Date.now();

  if (lastNotificationRef?.current?.key === notificationKey && now - lastNotificationRef.current.time < 1800) {
    return;
  }

  if (lastNotificationRef?.current) {
    lastNotificationRef.current = { key: notificationKey, time: now };
  }

  const stopSound = startJobRequestAlertSound(sectionKey || getSectionFromStatus(status));

  const copy = realtimeNotificationCopy[eventName] || realtimeNotificationCopy.job_request_updated;
  const Swal = (await import("sweetalert2")).default;
  const actionText = sectionKey === "handover" ? "View Job" : sectionKey && sectionKey !== "dashboard" ? getAvailableJobAction(sectionKey, status) : "View";
  const result = await Swal.fire({
    icon: eventName.includes("reject") ? "warning" : "info",
    title: copy.title,
    html: `
      <div class="grid gap-1 text-left text-sm text-slate-700">
        <strong class="text-base text-slate-950">${jobNo}</strong>
        <span>Status: ${formatStatusLabel(status)}</span>
        <span>${copy.text}</span>
      </div>
    `,
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonText: actionText,
    cancelButtonText: "Close",
    allowOutsideClick: false,
    allowEscapeKey: false,
    willClose: stopSound
  });

  return result.isConfirmed ? { action: "open", job } : { action: "close" };
}

function getSectionFromStatus(status) {
  if (status === "WAIT_MM" || status === "MM_REPAIR") {
    return "maintenance";
  }

  if (status === "WAIT_QC" || status === "QC_INSPECTION") {
    return "qc";
  }

  if (status === "WAIT_PROD_CONFIRM" || status === "PROD_CONFIRMING") {
    return "production";
  }

  return "production";
}

async function closeJobRequestAlertDialogs() {
  try {
    const Swal = (await import("sweetalert2")).default;
    if (Swal.isVisible()) {
      Swal.close();
    }
  } catch {
    // Route cleanup should never block navigation.
  }
}

function formatHistoryTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ModalHeader({ onClose, section, title }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
      <div>
        <p className="m-0 text-[11px] font-black uppercase tracking-[0.12em] text-sky-700">{section.shortTitle}</p>
        <h3 className="m-0 mt-0.5 text-2xl font-black text-slate-950">{title}</h3>
      </div>
      <button className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50" type="button" onClick={onClose}>Close</button>
    </div>
  );
}

function ModalFooter({ onClose, onSubmit, section, submitLabel }) {
  return (
    <div className="sticky bottom-0 z-20 flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3">
      <button className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50" type="button" onClick={onClose}>Cancel</button>
      <button className={`h-10 rounded-xl px-5 text-sm font-black text-white shadow-sm ${section.accent}`} type="button" onClick={onSubmit || onClose}>{submitLabel}</button>
    </div>
  );
}

function UploadBox() {
  return (
    <label className="col-span-full grid min-w-0 gap-1">
      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Attach Image / Camera</span>
      <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-black text-slate-500 transition hover:bg-slate-100">Choose file or open camera</div>
    </label>
  );
}

function ReadOnlyInput({ label, value }) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input className="h-10 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-600 outline-none" readOnly title={formatStatusLabel(value)} value={formatStatusLabel(value)} />
    </label>
  );
}

