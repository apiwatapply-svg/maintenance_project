"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import Swal from "sweetalert2";
import AppFooter from "@/components/AppFooter";
import SearchableDropdown from "@/components/SearchableDropdown";
import api from "@/lib/api";
import { pmStatuses } from "@/lib/preventiveConfig";
import { createPreventiveSocket } from "@/lib/preventiveRealtime";
import { clearSession, getSessionConfig, getStoredSession } from "@/lib/session";
import { buildConfirmAlert, buildSuccessAlert } from "@/lib/swalHelpers";

const PreventiveDataContext = createContext(null);

const fallbackPreventiveData = {
  areas: [],
  dashboardTrend: [],
  employees: [],
  history: [],
  mappings: [],
  inspections: [],
  machineTypes: [],
  machines: [],
  plans: [],
  statusPie: [],
  types: []
};

function usePreventiveData() {
  return useContext(PreventiveDataContext) || fallbackPreventiveData;
}

const navigation = [
  { key: "dashboard", label: "Dashboard", href: "/preventive-maintenance", icon: "DB" },
  { key: "plans", label: "PM Plan", href: "/preventive-maintenance/plans", icon: "PL" },
  { key: "setup", label: "PM Setup", href: "/preventive-maintenance/setup", icon: "ST" },
  { key: "inspection", label: "Inspection", href: "/preventive-maintenance/inspection", icon: "IN" },
  { key: "reports", label: "History / Report", href: "/preventive-maintenance/reports", icon: "RP" }
];

const pageTitles = {
  dashboard: { title: "Preventive Dashboard", subtitle: "PM status, risks, and current factory readiness" },
  plans: { title: "PM Plan", subtitle: "List, calendar, and machine layout views" },
  setup: { title: "PM Setup", subtitle: "Build PM type, checklist details, and machine mapping" },
  setupChecklist: { title: "PM Type Checklist", subtitle: "Manage PM topics and input criteria for a selected PM type" },
  inspection: { title: "Inspection", subtitle: "Execute PM checklist with minimal typing" },
  reports: { title: "History / Report", subtitle: "PM history, result filters, and export-ready layout" }
};

const inputTypes = ["OK / NG", "Number", "Dropdown", "Text", "Image"];
const pieLegendDots = {
  Completed: "bg-emerald-500",
  "Due Today": "bg-amber-500",
  Overdue: "bg-red-500",
  NG: "bg-violet-700"
};

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function statusBadge(status) {
  const item = pmStatuses[status] || pmStatuses.planned;
  return <span className={classNames("inline-flex rounded-full px-3 py-1 text-xs font-black ring-1", item.tone)}>{item.label}</span>;
}

function statusLabel(status) {
  return pmStatuses[status]?.label || status;
}

function ShellButton({ children, className = "", variant = "primary", ...props }) {
  const variants = {
    primary: "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700",
    dark: "bg-slate-950 text-white shadow-slate-950/20 hover:bg-slate-800",
    soft: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    warning: "bg-amber-500 text-slate-950 shadow-amber-500/20 hover:bg-amber-400"
  };

  return (
    <button className={classNames("inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black shadow-sm transition", variants[variant], className)} type="button" {...props}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" {...props} />;
}

function DropdownInput({ defaultValue = "", onChange, options, placeholder = "Select", value }) {
  return <SearchableDropdown accent="emerald" defaultValue={defaultValue} onChange={onChange} options={options} placeholder={placeholder} value={value} />;
}

function StatCard({ label, value, tone = "emerald", detail }) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/70 text-amber-700",
    rose: "border-rose-200 bg-rose-50/70 text-rose-700",
    sky: "border-sky-200 bg-sky-50/70 text-sky-700",
    slate: "border-slate-200 bg-white text-slate-700",
    violet: "border-violet-200 bg-violet-50/70 text-violet-700"
  };

  return (
    <article className={classNames("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <strong className="mt-2 block text-3xl font-black text-slate-950">{value}</strong>
      {detail ? <span className="mt-1 block text-xs font-bold text-slate-500">{detail}</span> : null}
    </article>
  );
}

function Modal({ title, eyebrow, children, footer, onClose, size = "max-w-5xl" }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <section className={classNames("max-h-[92vh] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl", size)}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
            <h2 className="m-0 mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          </div>
          <ShellButton variant="soft" onClick={onClose}>Close</ShellButton>
        </header>
        <div className="max-h-[calc(92vh-148px)] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
}

function DataTable({ columns, rows, empty = "No records found." }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th className="border-b border-slate-200 px-4 py-3 text-center" key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50" key={row.id || index}>
                  {columns.map((column) => (
                    <td className={classNames("px-4 py-3 font-semibold text-slate-800", column.center ? "text-center" : "")} key={column.key}>
                      {column.render ? column.render(row, index) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center font-bold text-slate-500" colSpan={columns.length}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-slate-200 px-4 py-3">
        {[1, 2, 3].map((page) => (
          <button className={classNames("h-9 min-w-9 rounded-xl px-3 text-sm font-black", page === 1 ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-700")} key={page} type="button">
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PreventiveMaintenanceShell({ pageKey = "dashboard" }) {
  const router = useRouter();
  const pathname = usePathname();
  const config = getSessionConfig("pm");
  const [session, setSession] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [preventiveData, setPreventiveData] = useState(fallbackPreventiveData);
  const title = pageTitles[pageKey] || pageTitles.dashboard;

  async function loadPreventiveData({ quiet = false } = {}) {
    try {
      const response = await api.get("/preventive/bootstrap");
      setPreventiveData({
        areas: response.data.areas || [],
        dashboardTrend: response.data.dashboardTrend || [],
        employees: response.data.employees || [],
        history: response.data.history || [],
        mappings: response.data.mappings || [],
        inspections: response.data.inspections || [],
        machineTypes: response.data.machineTypes || [],
        machines: response.data.machines || [],
        plans: response.data.plans || [],
        statusPie: response.data.statusPie || [],
        types: response.data.types || []
      });
    } catch (error) {
      if (!quiet) {
        await Swal.fire({
          icon: "warning",
          title: "Cannot connect preventive backend",
          text: error.response?.data?.message || error.message,
          timer: 1800,
          showConfirmButton: false
        });
      }
    }
  }

  useEffect(() => {
    const storedSession = getStoredSession("pm");

    if (!storedSession) {
      router.replace(config.loginPath);
      return;
    }

    setSession(storedSession);
    setIsChecking(false);
    loadPreventiveData({ quiet: true });
  }, [config.loginPath, router]);

  useEffect(() => {
    if (isChecking) {
      return undefined;
    }

    const socket = createPreventiveSocket(() => {
      loadPreventiveData({ quiet: true });
    });

    return () => socket.disconnect();
  }, [isChecking]);

  async function handleLogout() {
    const confirm = await Swal.fire(buildConfirmAlert("Logout?", "You will return to the main page.", { confirmButtonText: "Logout" }));

    if (!confirm.isConfirmed) {
      return;
    }

    clearSession("pm");
    router.replace("/");
  }

  function openActionModal(action, row) {
    setSelectedRecord(row || null);

    if (action === "map") {
      setModal("mapping");
      return;
    }

    if (action === "inspect") {
      setModal("inspection");
      return;
    }

    if (action === "plan") {
      setModal("plan");
      return;
    }

    setModal("detail");
  }

  async function handleModalSave(message = "Saved") {
    const confirmCopy = {
      inspection: {
        title: "Submit PM inspection?",
        text: "This will save the PM inspection result.",
        button: "Submit"
      },
      mapping: {
        title: "Save machine mapping?",
        text: "This will update the PM type mapping for this machine.",
        button: "Save"
      },
      plan: {
        title: "Save PM plan?",
        text: "This will update the preventive maintenance plan.",
        button: "Save"
      },
      type: {
        title: "Save PM type?",
        text: "This will update the PM type master data.",
        button: "Save"
      }
    };
    const copy = confirmCopy[modal] || { title: "Save changes?", text: "This will update preventive maintenance data.", button: "Save" };
    const confirm = await Swal.fire(buildConfirmAlert(copy.title, copy.text, { confirmButtonText: copy.button }));

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      if (modal === "type") {
        await api.post("/preventive/types", {
          code: `PM-${Date.now().toString().slice(-4)}`,
          name: "New PM Type",
          description: "Created from Preventive Maintenance UI.",
          frequencyDays: 1,
          advanceDays: 0,
          status: "Active"
        });
      } else if (modal === "plan") {
        await api.post("/preventive/plans", {});
      } else if (modal === "inspection") {
        const planId = preventiveData.inspections[0]?.planId || preventiveData.plans[0]?.id;
        if (planId) {
          await api.post(`/preventive/inspections/${planId}/submit`, {
            inspector: preventiveData.employees[0],
            checker: preventiveData.employees[1],
            result: "OK",
            remark: "Submitted from Preventive Maintenance UI."
          });
        }
      }
      await loadPreventiveData({ quiet: true });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: error.response?.data?.message || error.message
      });
      return;
    }

    await Swal.fire(buildSuccessAlert(message));
    setModal(null);
  }

  if (isChecking) {
    return null;
  }

  return (
    <PreventiveDataContext.Provider value={preventiveData}>
    <main className={classNames("grid min-h-screen bg-slate-100 text-slate-950 max-[900px]:grid-cols-1", isSidebarCollapsed ? "grid-cols-[82px_minmax(0,1fr)]" : "grid-cols-[280px_minmax(0,1fr)]")}>
      <aside className={classNames("sticky top-0 h-screen overflow-x-hidden border-r border-slate-800 bg-slate-950 text-white transition-all max-[900px]:relative max-[900px]:h-auto", isSidebarCollapsed ? "p-4" : "p-5")}>
        <div className={classNames("mb-5 flex items-center", isSidebarCollapsed ? "justify-center" : "gap-3")}>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black shadow-lg shadow-emerald-600/25">PM</span>
          <div className={isSidebarCollapsed ? "hidden" : ""}>
            <h1 className="m-0 text-lg font-black leading-tight">Preventive</h1>
            <p className="m-0 mt-1 text-sm font-bold text-slate-400">Maintenance Control</p>
          </div>
        </div>

        <button className="mb-4 h-11 w-full rounded-xl border border-white/10 bg-white/10 text-sm font-black text-white transition hover:bg-white/15" type="button" onClick={() => setIsSidebarCollapsed((current) => !current)}>
          {isSidebarCollapsed ? ">" : "Collapse"}
        </button>

        <nav className="grid gap-2" aria-label="Preventive Maintenance navigation">
          {navigation.map((item) => {
            const active = item.href === "/preventive-maintenance" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                className={classNames(
                  "flex items-center rounded-xl border py-2.5 text-sm font-black transition",
                  isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3",
                  active ? "border-emerald-400/50 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "border-transparent text-slate-300 hover:bg-white/10"
                )}
                href={item.href}
                key={item.key}
                title={item.label}
              >
                <span className={classNames("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black", active ? "bg-slate-950/30 text-white" : "bg-slate-900 text-slate-300")}>{item.icon}</span>
                <span className={isSidebarCollapsed ? "hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col p-5 max-[760px]:p-3">
        <header className="mb-5 flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm max-[760px]:flex-col max-[760px]:items-start">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Preventive Maintenance</p>
            <h2 className="m-0 mt-1 text-3xl font-black tracking-tight">{title.title}</h2>
            <span className="mt-1 block text-sm font-bold text-slate-500">{title.subtitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-700">{session?.user?.empName || "System Administrator"}</span>
            <ShellButton variant="dark" onClick={handleLogout}>Logout</ShellButton>
          </div>
        </header>

        {pageKey === "dashboard" && <DashboardPage onOpenModal={setModal} />}
        {pageKey === "plans" && <PlansPage onOpenModal={setModal} onOpenAction={openActionModal} />}
        {pageKey === "setup" && <SetupPage onOpenModal={setModal} />}
        {pageKey === "setupChecklist" && <PmTypeChecklistPage />}
        {pageKey === "inspection" && <InspectionPage onOpenModal={setModal} onOpenAction={openActionModal} />}
        {pageKey === "reports" && <ReportsPage onOpenAction={openActionModal} />}

        <AppFooter label="Preventive Maintenance" />
      </section>

      {modal === "plan" && <PlanModal onClose={() => setModal(null)} onSave={() => handleModalSave("PM plan saved")} />}
      {modal === "type" && <PmTypeModal onClose={() => setModal(null)} onSave={() => handleModalSave("PM type saved")} />}
      {modal === "mapping" && <MappingModal onClose={() => setModal(null)} onSave={() => handleModalSave("Machine mapping saved")} />}
      {modal === "inspection" && <InspectionModal record={selectedRecord} onClose={() => setModal(null)} onSave={() => handleModalSave("Inspection submitted")} />}
      {modal === "detail" && <DetailModal record={selectedRecord} onClose={() => setModal(null)} />}
    </main>
    </PreventiveDataContext.Provider>
  );
}

function DashboardPage({ onOpenModal }) {
  const { dashboardTrend, plans, statusPie } = usePreventiveData();
  const summary = {
    total: plans.length,
    dueToday: plans.filter((item) => item.status === "dueToday").length,
    overdue: plans.filter((item) => item.status === "overdue").length,
    completed: plans.filter((item) => item.status === "completed").length,
    ng: plans.filter((item) => item.status === "ng").length
  };

  return (
    <div className="grid gap-5">
      <section className="grid grid-cols-5 gap-3 max-[1200px]:grid-cols-3 max-[760px]:grid-cols-1">
        <StatCard label="Total PM Plan" value={summary.total} tone="slate" detail="Active plan set" />
        <StatCard label="Due Today" value={summary.dueToday} tone="amber" detail="Need inspection" />
        <StatCard label="Overdue" value={summary.overdue} tone="rose" detail="Requires follow-up" />
        <StatCard label="Completed" value={summary.completed} tone="emerald" detail="This cycle" />
        <StatCard label="NG Result" value={summary.ng} tone="violet" detail="Abnormal finding" />
      </section>

      <section className="grid grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)] gap-5 max-[1100px]:grid-cols-1">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">PM Status Overview</p>
              <h3 className="m-0 mt-1 text-xl font-black">Daily planned vs completed</h3>
            </div>
            <DropdownInput defaultValue="2026-05" options={["2026-05", "2026-04"]} />
          </div>
          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={dashboardTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" fill="#38bdf8" name="Planned" radius={[8, 8, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[8, 8, 0, 0]} />
                <Bar dataKey="overdue" fill="#ef4444" name="Overdue" radius={[8, 8, 0, 0]} />
                <Bar dataKey="ng" fill="#7c3aed" name="NG" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Machine Status Summary</p>
          <h3 className="m-0 mt-1 text-xl font-black">PM health mix</h3>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" innerRadius={56} outerRadius={92} paddingAngle={3}>
                  {statusPie.map((item) => <Cell fill={item.color} key={item.name} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2">
            {statusPie.map((item) => (
              <div className="flex items-center justify-between text-sm font-bold" key={item.name}>
                <span className="flex items-center gap-2"><i className={classNames("h-3 w-3 rounded-full", pieLegendDots[item.name])} />{item.name}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

    </div>
  );
}

function FilterBar() {
  const { areas, machineTypes, machines, types } = usePreventiveData();
  return (
    <section className="grid grid-cols-5 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-[1200px]:grid-cols-3 max-[760px]:grid-cols-1">
      <Field label="Area">
        <DropdownInput options={["", ...areas].map((item) => ({ value: item, label: item || "All area" }))} placeholder="All area" />
      </Field>
      <Field label="Machine Type">
        <DropdownInput options={["", ...machineTypes].map((item) => ({ value: item, label: item || "All machine type" }))} placeholder="All machine type" />
      </Field>
      <Field label="Machine">
        <DropdownInput options={["", ...machines.map((item) => `${item.code} - ${item.name}`)].map((item) => ({ value: item, label: item || "All machine" }))} placeholder="Search machine" />
      </Field>
      <Field label="PM Type">
        <DropdownInput options={["", ...types.map((item) => item.name)].map((item) => ({ value: item, label: item || "All PM type" }))} placeholder="All PM type" />
      </Field>
      <Field label="Status">
        <DropdownInput options={[{ value: "", label: "All status" }, ...Object.entries(pmStatuses).map(([key, item]) => ({ value: key, label: item.label }))]} />
      </Field>
    </section>
  );
}

function getPlanAction(row) {
  if (row.status === "noPlan") {
    return { label: "Map PM Type", action: "map", variant: "warning" };
  }

  if (["dueToday", "overdue"].includes(row.status)) {
    return { label: "Start Inspection", action: "inspect", variant: "primary" };
  }

  if (row.status === "inProgress") {
    return { label: "Continue", action: "inspect", variant: "primary" };
  }

  if (["completed", "ng"].includes(row.status)) {
    return { label: "View", action: "detail", variant: "soft" };
  }

  return { label: "Edit Plan", action: "plan", variant: "soft" };
}

function PlansPage({ onOpenAction, onOpenModal }) {
  const { plans } = usePreventiveData();
  const [view, setView] = useState("list");

  const columns = [
    { key: "no", label: "No", center: true, render: (_, index) => index + 1 },
    { key: "machineCode", label: "Machine Code" },
    { key: "machineName", label: "Machine Name" },
    { key: "area", label: "Area", center: true },
    { key: "pmType", label: "PM Type" },
    { key: "frequencyDays", label: "Frequency", center: true, render: (row) => `${row.frequencyDays} days` },
    { key: "nextDate", label: "Next PM", center: true },
    { key: "assignee", label: "Assigned To" },
    { key: "status", label: "Status", center: true, render: (row) => statusBadge(row.status) },
    {
      key: "action",
      label: "Action",
      center: true,
      render: (row) => {
        const action = getPlanAction(row);
        return <ShellButton variant={action.variant} className="h-9 px-3" onClick={() => onOpenAction(action.action, row)}>{action.label}</ShellButton>;
      }
    }
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3 max-[760px]:flex-col max-[760px]:items-stretch">
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {["list", "calendar", "layout"].map((item) => (
            <button className={classNames("h-10 rounded-xl px-4 text-sm font-black capitalize", view === item ? "bg-slate-950 text-white" : "text-slate-600")} key={item} type="button" onClick={() => setView(item)}>
              {item === "layout" ? "Machine Layout" : item}
            </button>
          ))}
        </div>
        <ShellButton onClick={() => onOpenModal("plan")}>Create PM Plan</ShellButton>
      </div>
      <FilterBar />
      {view === "list" && <DataTable columns={columns} rows={plans} />}
      {view === "calendar" && <CalendarView onOpenAction={onOpenAction} />}
      {view === "layout" && <MachineLayoutView onOpenAction={onOpenAction} />}
    </div>
  );
}

function CalendarView({ onOpenAction }) {
  const { plans } = usePreventiveData();
  const [selectedDay, setSelectedDay] = useState(13);
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  const eventMap = plans.reduce((acc, plan) => {
    const day = Number(String(plan.nextDate || "").slice(-2));
    acc[day] = acc[day] || [];
    acc[day].push(plan);
    return acc;
  }, {});
  const selectedPlans = eventMap[selectedDay] || [];

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_360px] gap-5 max-[1100px]:grid-cols-1">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-xl font-black">May 2026 PM Calendar</h3>
          <DropdownInput defaultValue="2026-05" options={["2026-05", "2026-06"]} />
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div className="rounded-xl bg-slate-100 py-2 font-black text-slate-500" key={day}>{day}</div>)}
          {days.map((day) => (
            <button className={classNames("min-h-24 rounded-2xl border p-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40", selectedDay === day ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white")} key={day} type="button" onClick={() => setSelectedDay(day)}>
              <span className="font-black">{day}</span>
              {eventMap[day]?.length ? <span className="mt-2 block rounded-lg bg-white px-2 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">{eventMap[day].length} PM</span> : null}
            </button>
          ))}
        </div>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Selected Day</p>
        <h3 className="m-0 mt-1 text-xl font-black">May {selectedDay}, 2026</h3>
        <div className="mt-4 grid gap-3">
          {selectedPlans.length ? selectedPlans.map((plan) => {
            const action = getPlanAction(plan);
            return (
              <div className="rounded-xl border border-slate-200 p-3" key={plan.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 font-black">{plan.machineCode}</p>
                    <p className="m-0 mt-1 text-xs font-bold text-slate-500">{plan.pmType}</p>
                  </div>
                  {statusBadge(plan.status)}
                </div>
                <ShellButton variant={action.variant} className="mt-3 h-9 w-full px-3" onClick={() => onOpenAction(action.action, plan)}>{action.label}</ShellButton>
              </div>
            );
          }) : <p className="m-0 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">No PM plan on this day.</p>}
        </div>
      </article>
    </section>
  );
}

function MachineLayoutView({ onOpenAction }) {
  const { areas, machines } = usePreventiveData();
  return (
    <div className="grid gap-4">
      {areas.map((area) => (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={area}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m-0 text-xl font-black">{area}</h3>
            <span className="text-sm font-bold text-slate-500">{machines.filter((machine) => machine.area === area).length} machines</span>
          </div>
          <div className="grid grid-cols-6 gap-2.5 max-[1500px]:grid-cols-5 max-[1200px]:grid-cols-4 max-[900px]:grid-cols-3 max-[760px]:grid-cols-1">
            {machines.filter((machine) => machine.area === area).map((machine) => (
              <button className="min-h-36 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white" key={machine.id} type="button" onClick={() => onOpenAction(machine.status === "noPlan" ? "map" : ["dueToday", "overdue", "inProgress"].includes(machine.status) ? "inspect" : "detail", machine)}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-black text-white">{machine.type.slice(0, 2).toUpperCase()}</span>
                  {statusBadge(machine.status)}
                </div>
                <p className="m-0 truncate text-sm font-black">{machine.code}</p>
                <p className="m-0 mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{machine.name}</p>
                <p className="m-0 mt-2 truncate text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">{machine.type}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SetupPage({ onOpenModal }) {
  const { types } = usePreventiveData();
  const [view, setView] = useState("types");
  const columns = [
    { key: "no", label: "No", center: true, render: (_, index) => index + 1 },
    { key: "code", label: "Code", center: true },
    { key: "name", label: "PM Type Name" },
    { key: "frequencyDays", label: "Default Frequency", center: true, render: (row) => `${row.frequencyDays} days` },
    { key: "advanceDays", label: "Advance Notify", center: true, render: (row) => `${row.advanceDays} days` },
    { key: "itemCount", label: "Checklist", center: true, render: (row) => `${row.itemCount} items` },
    { key: "status", label: "Status", center: true, render: (row) => <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">{row.status}</span> },
    {
      key: "action",
      label: "Action",
      center: true,
      render: () => (
        <div className="flex justify-center gap-2">
          <ShellButton variant="soft" className="h-9 px-3" onClick={() => onOpenModal("type")}>Edit</ShellButton>
          <Link className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-black text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700" href="/preventive-maintenance/setup/checklist">
            Checklist
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="grid gap-5">
      <section className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 max-[760px]:grid-cols-1">
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            ["types", "PM Type Master"],
            ["mapping", "Machine Mapping"]
          ].map(([key, label]) => (
            <button className={classNames("h-10 rounded-xl px-4 text-sm font-black", view === key ? "bg-slate-950 text-white" : "text-slate-600")} key={key} type="button" onClick={() => setView(key)}>{label}</button>
          ))}
        </div>
        <ShellButton onClick={() => onOpenModal(view === "mapping" ? "mapping" : "type")}>{view === "mapping" ? "Map PM Type" : "Create PM Type"}</ShellButton>
      </section>
      {view === "types" && <DataTable columns={columns} rows={types} />}
      {view === "mapping" && <MappingView onOpenModal={onOpenModal} />}
    </div>
  );
}

function MappingView({ onOpenModal }) {
  const { mappings } = usePreventiveData();
  const columns = [
    { key: "no", label: "No", center: true, render: (_, index) => index + 1 },
    { key: "machineCode", label: "Machine Code" },
    { key: "machineName", label: "Machine Name" },
    { key: "area", label: "Area", center: true },
    { key: "type", label: "Machine Type", center: true },
    {
      key: "pmTypes",
      label: "Mapped PM Types",
      render: (row) => row.pmTypes.length ? (
        <div className="flex flex-wrap gap-2">
          {row.pmTypes.map((pmType) => (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200" key={pmType.name}>
              {pmType.name} / {pmType.frequencyDays}d
            </span>
          ))}
        </div>
      ) : <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-200">No PM Type</span>
    },
    {
      key: "nextDate",
      label: "Next PM",
      center: true,
      render: (row) => row.pmTypes.length ? row.pmTypes.map((item) => item.nextDate).sort()[0] : "-"
    },
    {
      key: "action",
      label: "Action",
      center: true,
      render: (row) => <ShellButton variant={row.pmTypes.length ? "soft" : "warning"} className="h-9 px-3" onClick={() => onOpenModal("mapping")}>{row.pmTypes.length ? "Manage Types" : "Map PM Type"}</ShellButton>
    }
  ];
  return (
    <div className="grid gap-4">
      <FilterBar />
      <DataTable columns={columns} rows={mappings} />
    </div>
  );
}

function PmTypeChecklistPage() {
  const { types } = usePreventiveData();
  const selectedType = types[0] || { checklist: [], code: "", name: "", description: "" };
  const checklist = selectedType.checklist || [];
  const [selectedItem, setSelectedItem] = useState(checklist[0]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  function startAddItem() {
    setSelectedItem(null);
    setIsItemModalOpen(true);
  }

  function startEditItem(item) {
    setSelectedItem(item);
    setIsItemModalOpen(true);
  }

  async function saveChecklistItem(draft) {
    const confirm = await Swal.fire(buildConfirmAlert("Save checklist item?", "This will update the PM checklist criteria.", { confirmButtonText: "Save" }));

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      if (selectedItem?.id) {
        await api.put(`/preventive/checklist/${selectedItem.id}`, draft);
      } else {
        await api.post(`/preventive/types/${selectedType.id}/checklist`, draft);
      }
      await Swal.fire(buildSuccessAlert("Checklist saved"));
      setIsItemModalOpen(false);
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Save failed", text: error.response?.data?.message || error.message });
    }
  }

  return (
    <div className="grid gap-5">
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm max-[760px]:flex-col max-[760px]:items-stretch">
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">PM Type</p>
          <h3 className="m-0 mt-1 text-2xl font-black">{selectedType.name}</h3>
          <p className="m-0 mt-1 text-sm font-bold text-slate-500">{selectedType.code} | {selectedType.description}</p>
        </div>
        <div className="flex gap-2">
          <Link className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 shadow-sm transition hover:bg-slate-50" href="/preventive-maintenance/setup">
            Back to PM Type Master
          </Link>
          <ShellButton variant="warning" onClick={startAddItem}>Add Checklist Item</ShellButton>
        </div>
      </section>

      <section className="grid gap-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Checklist Items</p>
            <h3 className="m-0 mt-1 text-xl font-black">PM topics and input criteria</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-3 text-center">No</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left">Topic</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-center">Input Type</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-center">Criteria</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-center">Required</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {checklist.map((item, index) => (
                  <tr className={classNames("border-b border-slate-100 last:border-0", selectedItem?.id === item.id ? "bg-emerald-50/50" : "")} key={item.id}>
                    <td className="px-3 py-3 text-center font-black">{index + 1}</td>
                    <td className="px-3 py-3 font-bold">{item.topic}</td>
                    <td className="px-3 py-3 text-center"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{item.inputType}</span></td>
                    <td className="px-3 py-3 text-center font-bold text-slate-600">{item.criteria || item.options || `${item.min ?? ""} - ${item.max ?? ""} ${item.unit ?? ""}`}</td>
                    <td className="px-3 py-3 text-center"><span className={classNames("rounded-full px-3 py-1 text-xs font-black", item.required ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500")}>{item.required ? "Yes" : "No"}</span></td>
                    <td className="px-3 py-3 text-center"><ShellButton variant="soft" className="h-9 px-3" onClick={() => startEditItem(item)}>Edit</ShellButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      {isItemModalOpen ? <ChecklistItemModal item={selectedItem} onClose={() => setIsItemModalOpen(false)} onSave={saveChecklistItem} /> : null}
    </div>
  );
}

function InspectionPage({ onOpenAction }) {
  const { inspections } = usePreventiveData();
  const columns = [
    { key: "no", label: "No", center: true, render: (_, index) => index + 1 },
    { key: "pmNo", label: "PM No" },
    { key: "machineCode", label: "Machine Code" },
    { key: "machineName", label: "Machine Name" },
    { key: "area", label: "Area", center: true },
    { key: "pmType", label: "PM Type" },
    { key: "dueDate", label: "Due Date", center: true },
    { key: "inspector", label: "Inspector" },
    { key: "status", label: "Status", center: true, render: (row) => statusBadge(row.status) },
    {
      key: "action",
      label: "Action",
      center: true,
      render: (row) => {
        const action = getPlanAction(row);
        const label = row.status === "inProgress" ? "Continue" : ["completed", "ng"].includes(row.status) ? "View" : "Start";
        return <ShellButton variant={["completed", "ng"].includes(row.status) ? "soft" : action.variant} className="h-9 px-3" onClick={() => onOpenAction(action.action, row)}>{label}</ShellButton>;
      }
    }
  ];

  return (
    <div className="grid gap-5">
      <FilterBar />
      <DataTable columns={columns} rows={inspections} />
    </div>
  );
}

function ReportsPage({ onOpenAction }) {
  const { history, machines } = usePreventiveData();
  const columns = [
    { key: "no", label: "No", center: true, render: (_, index) => index + 1 },
    { key: "date", label: "Date", center: true },
    { key: "time", label: "Time", center: true, render: (row) => `${row.startTime} - ${row.endTime}` },
    { key: "durationMin", label: "Duration", center: true, render: (row) => `${row.durationMin} min` },
    { key: "pmNo", label: "PM No" },
    { key: "machineCode", label: "Machine" },
    { key: "pmType", label: "PM Type" },
    { key: "inspector", label: "Inspector" },
    { key: "checker", label: "Checker" },
    { key: "result", label: "Result", center: true, render: (row) => <span className={classNames("rounded-full px-3 py-1 text-xs font-black", row.result === "NG" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>{row.result}</span> },
    { key: "remark", label: "Remark" },
    { key: "action", label: "Action", center: true, render: (row) => <ShellButton variant="soft" className="h-9 px-3" onClick={() => onOpenAction("detail", row)}>View</ShellButton> }
  ];

  return (
    <div className="grid gap-5">
      <section className="grid grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-[1200px]:grid-cols-3 max-[760px]:grid-cols-1">
        <Field label="Date From"><TextInput defaultValue="2026-05-01" type="date" /></Field>
        <Field label="Date To"><TextInput defaultValue="2026-05-31" type="date" /></Field>
        <Field label="Machine"><DropdownInput options={["", ...machines.map((item) => item.code)].map((item) => ({ value: item, label: item || "All machine" }))} placeholder="All machine" /></Field>
        <Field label="Result"><DropdownInput options={[{ value: "", label: "All result" }, "OK", "NG"]} /></Field>
        <div className="flex items-end"><ShellButton variant="warning" className="w-full">Export Excel</ShellButton></div>
      </section>
      <section className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
        <StatCard label="Total Record" value={history.length} />
        <StatCard label="OK" value={history.filter((item) => item.result === "OK").length} tone="emerald" />
        <StatCard label="NG" value={history.filter((item) => item.result === "NG").length} tone="rose" />
      </section>
      <DataTable columns={columns} rows={history} />
    </div>
  );
}

function PlanModal({ onClose, onSave }) {
  const { areas, employees, machineTypes, machines, types } = usePreventiveData();
  return (
    <Modal
      eyebrow="PM Plan"
      footer={<><ShellButton variant="soft" onClick={onClose}>Cancel</ShellButton><ShellButton onClick={onSave}>Save Plan</ShellButton></>}
      onClose={onClose}
      title="Create / Edit PM Plan"
    >
      <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
        <Field label="Area"><DropdownInput defaultValue={areas[0]} options={areas} /></Field>
        <Field label="Machine Type"><DropdownInput defaultValue={machineTypes[0]} options={machineTypes} /></Field>
        <Field label="Machine"><DropdownInput defaultValue={machines[0] ? `${machines[0].code} - ${machines[0].name}` : ""} options={machines.map((item) => `${item.code} - ${item.name}`)} /></Field>
        <Field label="PM Type"><DropdownInput defaultValue={types[0]?.name} options={types.map((item) => item.name)} /></Field>
        <Field label="Frequency Days"><TextInput defaultValue="1" min="1" type="number" /></Field>
        <Field label="Advance Notify Days"><TextInput defaultValue="0" min="0" type="number" /></Field>
        <Field label="Start Date"><TextInput defaultValue="2026-05-13" type="date" /></Field>
        <Field label="Assigned To"><DropdownInput defaultValue={employees[0]} options={employees} /></Field>
      </div>
    </Modal>
  );
}

const defaultChecklistDraft = {
  topic: "",
  inputType: "OK / NG",
  required: "Yes",
  min: "",
  max: "",
  unit: "",
  options: "Good, Normal, Bad, Other",
  criteria: ""
};

function buildChecklistDraft(item = defaultChecklistDraft) {
  return {
    topic: item.topic || "",
    inputType: item.inputType || "OK / NG",
    required: item.required === false ? "No" : "Yes",
    min: item.min ?? "",
    max: item.max ?? "",
    unit: item.unit || "",
    options: item.options || "Good, Normal, Bad, Other",
    criteria: item.criteria || ""
  };
}

function PmTypeModal({ onClose, onSave }) {
  const { types } = usePreventiveData();
  const type = types[0] || {};
  return (
    <Modal
      eyebrow="PM Setup"
      footer={<><ShellButton variant="soft" onClick={onClose}>Cancel</ShellButton><ShellButton onClick={onSave}>Save PM Type</ShellButton></>}
      onClose={onClose}
      size="max-w-6xl"
      title="PM Type Master"
    >
      <div className="grid gap-5">
        <section className="grid grid-cols-4 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 max-[1000px]:grid-cols-2 max-[760px]:grid-cols-1">
          <Field label="PM Type Code"><TextInput defaultValue={type.code || ""} /></Field>
          <Field label="PM Type Name"><TextInput defaultValue={type.name || ""} /></Field>
          <Field label="Default Frequency Days"><TextInput defaultValue={type.frequencyDays || 1} min="1" type="number" /></Field>
          <Field label="Advance Notify Days"><TextInput defaultValue={type.advanceDays || 0} min="0" type="number" /></Field>
          <Field label="Status"><DropdownInput defaultValue="Active" options={["Active", "Inactive"]} /></Field>
          <div className="col-span-3 max-[1000px]:col-span-1">
            <Field label="Description"><textarea className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" defaultValue={type.description || ""} /></Field>
          </div>
        </section>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="m-0 text-sm font-bold text-emerald-800">
            Checklist items are managed on a separate page so long PM topics stay easier to read and edit.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function MappingModal({ onClose, onSave }) {
  const { areas, employees, machineTypes, machines, mappings, types } = usePreventiveData();
  const mappingItems = mappings[0]?.pmTypes || [];
  return (
    <Modal
      eyebrow="Machine Mapping"
      footer={<><ShellButton variant="soft" onClick={onClose}>Cancel</ShellButton><ShellButton onClick={onSave}>Save Mapping</ShellButton></>}
      onClose={onClose}
      title="Map PM Types To Machine"
    >
      <div className="grid gap-5">
        <section className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 max-[760px]:grid-cols-1">
        <Field label="Area"><DropdownInput defaultValue={areas[0]} options={areas} /></Field>
        <Field label="Machine Type"><DropdownInput defaultValue={machineTypes[0]} options={machineTypes} /></Field>
        <Field label="Machine No"><DropdownInput defaultValue={machines[0] ? `${machines[0].code} - ${machines[0].name}` : ""} options={machines.map((item) => `${item.code} - ${item.name}`)} /></Field>
        <Field label="Assigned To"><DropdownInput defaultValue={employees[0]} options={employees} /></Field>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">PM Type Mapping</p>
              <h3 className="m-0 mt-1 text-xl font-black">One machine can use multiple PM types</h3>
            </div>
            <ShellButton variant="warning">Add PM Type</ShellButton>
          </div>
          <div className="grid gap-3">
            {mappingItems.map((mapping, index) => (
              <div className="grid grid-cols-[44px_minmax(0,1fr)_120px_150px_120px_100px] items-center gap-3 rounded-2xl border border-slate-200 p-3 max-[1000px]:grid-cols-1" key={mapping.name}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black">{index + 1}</span>
                <Field label="PM Type"><DropdownInput defaultValue={mapping.name} options={types.map((item) => item.name)} /></Field>
                <Field label="Frequency"><TextInput defaultValue={mapping.frequencyDays} min="1" type="number" /></Field>
                <Field label="Start Date"><TextInput defaultValue="2026-05-13" type="date" /></Field>
                <Field label="Advance"><TextInput defaultValue="0" min="0" type="number" /></Field>
                <Field label="Status"><DropdownInput defaultValue="Active" options={["Active", "Inactive"]} /></Field>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}

function ChecklistItemModal({ item, onClose, onSave }) {
  const [draft, setDraft] = useState(buildChecklistDraft(item || defaultChecklistDraft));

  return (
    <Modal
      eyebrow={item ? "Edit Item" : "New Item"}
      footer={<><ShellButton variant="soft" onClick={onClose}>Cancel</ShellButton><ShellButton onClick={() => onSave(draft)}>Apply Item</ShellButton></>}
      onClose={onClose}
      size="max-w-2xl"
      title={item?.topic || "Checklist Item"}
    >
      <div className="grid gap-4">
        <Field label="Item Name"><TextInput value={draft.topic} onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))} placeholder="Inspection topic" /></Field>
        <Field label="Input Type"><DropdownInput value={draft.inputType} onChange={(nextValue) => setDraft((current) => ({ ...current, inputType: nextValue }))} options={inputTypes} /></Field>
        <Field label="Required"><DropdownInput value={draft.required} onChange={(nextValue) => setDraft((current) => ({ ...current, required: nextValue }))} options={["Yes", "No"]} /></Field>
        {draft.inputType === "Number" ? (
          <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
            <Field label="Min"><TextInput value={draft.min} onChange={(event) => setDraft((current) => ({ ...current, min: event.target.value }))} type="number" /></Field>
            <Field label="Max"><TextInput value={draft.max} onChange={(event) => setDraft((current) => ({ ...current, max: event.target.value }))} type="number" /></Field>
            <Field label="Unit"><TextInput value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} /></Field>
          </div>
        ) : null}
        {draft.inputType === "Dropdown" ? (
          <Field label="Dropdown Options"><TextInput value={draft.options} onChange={(event) => setDraft((current) => ({ ...current, options: event.target.value }))} /></Field>
        ) : null}
        <Field label="Criteria / Detail">
          <textarea className="min-h-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" value={draft.criteria} onChange={(event) => setDraft((current) => ({ ...current, criteria: event.target.value }))} placeholder="Expected condition, warning, or rule" />
        </Field>
      </div>
    </Modal>
  );
}

function InspectionModal({ onClose, onSave, record }) {
  const { employees, types } = usePreventiveData();
  const selectedType = types.find((item) => item.name === record?.pmType) || types[0] || {};
  const checklist = selectedType.checklist || [];

  return (
    <Modal
      eyebrow="Inspection"
      footer={<><ShellButton variant="soft" onClick={onClose}>Save Draft</ShellButton><ShellButton onClick={onSave}>Submit Inspection</ShellButton></>}
      onClose={onClose}
      size="max-w-6xl"
      title="PM Inspection Form"
    >
      <section className="mb-5 grid grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 max-[1000px]:grid-cols-2 max-[760px]:grid-cols-1">
        <Field label="PM No"><TextInput defaultValue={record?.pmNo || "Auto generated"} readOnly /></Field>
        <Field label="Machine"><TextInput defaultValue={record ? `${record.machineCode} / ${record.machineName}` : ""} readOnly /></Field>
        <Field label="PM Type"><TextInput defaultValue={record?.pmType || selectedType.name || ""} readOnly /></Field>
        <Field label="Due Date"><TextInput defaultValue={record?.dueDate || ""} readOnly /></Field>
        <Field label="Inspector"><DropdownInput defaultValue={record?.inspector || employees[0]} options={employees} /></Field>
        <Field label="Checker"><DropdownInput defaultValue="" options={[{ value: "", label: "Optional checker" }, ...employees.map((item) => ({ value: item, label: item }))]} /></Field>
        <Field label="Overall Result"><TextInput defaultValue="Auto calculated from checklist" readOnly /></Field>
      </section>
      <div className="grid gap-3">
        {checklist.map((item, index) => (
          <div className="grid grid-cols-[44px_minmax(220px,0.9fr)_minmax(240px,1fr)_160px] items-start gap-3 rounded-2xl border border-slate-200 p-3 max-[1000px]:grid-cols-1" key={item.id}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black">{index + 1}</span>
            <div>
              <p className="m-0 font-black">{item.topic}</p>
              <p className="m-0 mt-1 text-xs font-bold text-slate-500">{item.inputType} {item.required ? "| Required" : "| Optional"}</p>
            </div>
            {item.inputType === "OK / NG" && <DropdownInput defaultValue="OK" options={["OK", "NG"]} />}
            {item.inputType === "Number" && <TextInput defaultValue={item.topic.includes("Air") ? "6" : "35"} type="number" />}
            {item.inputType === "Dropdown" && <DropdownInput defaultValue="Normal" options={(item.options || "Good, Normal, Bad, Other").split(", ")} />}
            {item.inputType === "Text" && <TextInput placeholder="Remark" />}
            {item.inputType === "Image" && <input className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold" type="file" />}
            <TextInput placeholder="Remark / abnormal detail" />
          </div>
        ))}
      </div>
      <Field label="Overall Remark">
        <textarea className="mt-4 min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Overall PM result detail" />
      </Field>
    </Modal>
  );
}

function DetailModal({ onClose, record }) {
  const { types } = usePreventiveData();
  const selectedType = types.find((item) => item.name === record?.pmType) || types[2] || types[0] || {};
  const checklist = selectedType.checklist || [];
  return (
    <Modal eyebrow="PM Detail" onClose={onClose} title="PM Record Detail" footer={<ShellButton variant="dark" onClick={onClose}>Close</ShellButton>}>
      <section className="grid gap-5">
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[760px]:grid-cols-1">
          <Field label="PM No"><TextInput defaultValue={record?.pmNo || "PM Record"} readOnly /></Field>
          <Field label="Machine"><TextInput defaultValue={record ? `${record.machineCode || ""} / ${record.machineName || ""}` : ""} readOnly /></Field>
          <Field label="PM Type"><TextInput defaultValue={record?.pmType || selectedType.name || ""} readOnly /></Field>
          <Field label="Result"><TextInput defaultValue={record?.result || statusLabel(record?.status) || "-"} readOnly /></Field>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="m-0 mb-3 text-xl font-black">Checklist Result</h3>
          <div className="grid gap-3">
            {checklist.map((item, index) => (
              <div className="grid grid-cols-[44px_minmax(0,1fr)_120px_minmax(180px,0.8fr)] items-center gap-3 rounded-xl bg-white p-3 max-[760px]:grid-cols-1" key={item.id}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black">{index + 1}</span>
                <div>
                  <p className="m-0 font-black">{item.topic}</p>
                  <p className="m-0 mt-1 text-xs font-bold text-slate-500">{item.inputType}</p>
                </div>
                <span className={classNames("rounded-full px-3 py-1 text-center text-xs font-black", index === 2 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>{index === 2 ? "NG" : "OK"}</span>
                <span className="text-sm font-bold text-slate-600">{index === 2 ? "Panel temperature exceeded limit." : "Normal condition."}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Modal>
  );
}
