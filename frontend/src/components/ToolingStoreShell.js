"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Swal from "sweetalert2";
import AppFooter from "@/components/AppFooter";
import api from "@/lib/api";
import { downloadHtmlExcel } from "@/lib/excelExport";
import { clearSession, getSessionConfig, getStoredSession } from "@/lib/session";
import { buildConfirmAlert, buildSuccessAlert } from "@/lib/swalHelpers";
import {
  buildToolingQuery,
  buildToolingMovementRows,
  canShowToolingCalibrationAction,
  getDefaultToolingMovementMonth,
  getToolingActionLabel,
  getToolingCalibrationActionFields,
  getToolingDashboardStorageKey,
  getToolingFilterStorageKey,
  getToolingImagePath,
  getToolingModuleStorageKey,
  getToolingPage,
  getToolingPageNumbers,
  getToolingSidebarStorageKey,
  toolingNavigationGroups,
  toolingPages
} from "@/lib/toolingResources";

const defaultFilters = { page: 1, pageSize: 10 };
const lookupSources = {
  categories: "categories",
  locations: "locations",
  units: "units",
  tools: "tools",
  stockItems: "stock-items",
  borrowIssues: "borrow-issue"
};
const readOnlyCreatePages = new Set(["overdue-borrow", "stock-balance", "movement-history", "calibration-due-soon", "calibration-expired"]);

function defaultForm(page) {
  return Object.fromEntries((page.fields || []).map((field) => [field.key, field.defaultValue ?? (field.type === "select" ? field.options[0] : field.type === "number" ? 0 : "")]));
}

export default function ToolingStoreShell({ pageKey = "dashboard" }) {
  const router = useRouter();
  const pathname = usePathname();
  const config = getSessionConfig("store");
  const page = getToolingPage(pageKey) || getToolingPage("dashboard");
  const firstChildPage = page.children?.length ? getToolingPage(page.children[0]) : null;
  const [session, setSession] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => Object.fromEntries(toolingNavigationGroups.map((group) => [group.key, true])));
  const [activeSubPageKey, setActiveSubPageKey] = useState(firstChildPage?.key || "");
  const activePage = page.children?.length ? getToolingPage(page.children.includes(activeSubPageKey) ? activeSubPageKey : page.children[0]) || firstChildPage : page;
  const [movementMonth, setMovementMonth] = useState(() => getDefaultToolingMovementMonth());
  const [filters, setFilters] = useState(defaultFilters);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(defaultFilters);
  const [lookups, setLookups] = useState(Object.fromEntries(Object.keys(lookupSources).map((key) => [key, []])));
  const [dashboard, setDashboard] = useState({
    totalTools: 0,
    availableTools: 0,
    borrowedTools: 0,
    repairTools: 0,
    lostTools: 0,
    lowStockItems: 0,
    overdueBorrow: 0,
    calibrationDueSoon: 0,
    calibrationExpired: 0,
    stockInRows: [],
    stockOutRows: [],
    stockBalanceRows: [],
    overdueRows: [],
    calibrationDueSoonRows: [],
    calibrationExpiredRows: []
  });
  const [form, setForm] = useState(() => defaultForm(page));
  const [editingRow, setEditingRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("record");
  const pageNumbers = useMemo(() => getToolingPageNumbers(pagination.page, pagination.total, pagination.pageSize), [pagination]);

  useEffect(() => {
    const storedSession = getStoredSession("store");

    if (!storedSession) {
      router.replace(config.loginPath);
      return;
    }

    setSession(storedSession);
    setIsChecking(false);
  }, [config.loginPath, router]);

  useEffect(() => {
    try {
      const storedGroups = JSON.parse(localStorage.getItem(getToolingSidebarStorageKey())) || {};
      setExpandedGroups((current) => ({ ...current, ...storedGroups }));
    } catch {
      setExpandedGroups(Object.fromEntries(toolingNavigationGroups.map((group) => [group.key, true])));
    }
  }, []);

  useEffect(() => {
    if (isChecking) {
      return;
    }

    loadLookups();
    if (pageKey === "dashboard") {
      const storedMonth = localStorage.getItem(getToolingDashboardStorageKey("movementMonth"));
      if (storedMonth) {
        setMovementMonth(storedMonth);
      }
      loadDashboard();
      return;
    }

    try {
      if (page.children?.length) {
        const storedSubPage = localStorage.getItem(getToolingModuleStorageKey(pageKey));
        const nextSubPage = page.children.includes(storedSubPage) ? storedSubPage : page.children[0];
        setActiveSubPageKey(nextSubPage);
        return;
      }

      const storedFilters = JSON.parse(localStorage.getItem(getToolingFilterStorageKey(activePage.key))) || {};
      setFilters({ ...defaultFilters, ...storedFilters });
    } catch {
      setFilters(defaultFilters);
    }
    setForm(defaultForm(activePage));
    setEditingRow(null);
    setIsModalOpen(false);
  }, [isChecking, pageKey]);

  useEffect(() => {
    if (isChecking || !page.children?.length || !activePage) {
      return;
    }

    localStorage.setItem(getToolingModuleStorageKey(pageKey), activePage.key);
    try {
      const storedFilters = JSON.parse(localStorage.getItem(getToolingFilterStorageKey(activePage.key))) || {};
      setFilters({ ...defaultFilters, ...storedFilters });
    } catch {
      setFilters(defaultFilters);
    }
    setForm(defaultForm(activePage));
    setEditingRow(null);
    setIsModalOpen(false);
  }, [activePage?.key, isChecking, page.children?.length, pageKey]);

  useEffect(() => {
    if (!isChecking && activePage?.endpoint) {
      loadRows(filters);
      localStorage.setItem(getToolingFilterStorageKey(activePage.key), JSON.stringify(filters));
    }
  }, [filters, isChecking, activePage?.key]);

  async function loadLookups() {
    try {
      const entries = await Promise.all(
        Object.entries(lookupSources).map(async ([key, endpoint]) => {
          const response = await api.get(`/tooling/${endpoint}`, { params: { page: 1, pageSize: 100 } });
          return [key, response.data.data || []];
        })
      );
      setLookups(Object.fromEntries(entries));
    } catch {
      setLookups(Object.fromEntries(Object.keys(lookupSources).map((key) => [key, []])));
    }
  }

  async function loadDashboard() {
    try {
      const [
        toolsResponse,
        stockBalanceResponse,
        stockInResponse,
        stockOutResponse,
        overdueResponse,
        calibrationDueSoonResponse,
        calibrationExpiredResponse
      ] = await Promise.all([
        api.get("/tooling/tools", { params: { page: 1, pageSize: 100 } }),
        api.get("/tooling/stock-balance", { params: { page: 1, pageSize: 100 } }),
        api.get("/tooling/stock-in", { params: { page: 1, pageSize: 100 } }),
        api.get("/tooling/stock-out", { params: { page: 1, pageSize: 100 } }),
        api.get("/tooling/overdue-borrow", { params: { page: 1, pageSize: 100 } }),
        api.get("/tooling/calibration-due-soon", { params: { page: 1, pageSize: 100 } }),
        api.get("/tooling/calibration-expired", { params: { page: 1, pageSize: 100 } })
      ]);
      const tools = toolsResponse.data.data || [];
      const stockBalanceRows = stockBalanceResponse.data.data || [];
      const overdueRows = overdueResponse.data.data || [];
      const calibrationDueSoonRows = calibrationDueSoonResponse.data.data || [];
      const calibrationExpiredRows = calibrationExpiredResponse.data.data || [];
      setDashboard({
        totalTools: toolsResponse.data.pagination?.total || tools.length,
        availableTools: tools.filter((tool) => tool.status === "Available").length,
        borrowedTools: tools.filter((tool) => tool.status === "Borrowed").length,
        repairTools: tools.filter((tool) => tool.status === "Repair").length,
        lostTools: tools.filter((tool) => tool.status === "Lost").length,
        lowStockItems: stockBalanceRows.filter((item) => Number(item.current_stock || 0) < Number(item.minimum_stock || 0)).length,
        overdueBorrow: overdueResponse.data.pagination?.total || overdueRows.length,
        calibrationDueSoon: calibrationDueSoonResponse.data.pagination?.total || calibrationDueSoonRows.length,
        calibrationExpired: calibrationExpiredResponse.data.pagination?.total || calibrationExpiredRows.length,
        stockInRows: stockInResponse.data.data || [],
        stockOutRows: stockOutResponse.data.data || [],
        stockBalanceRows,
        overdueRows,
        calibrationDueSoonRows,
        calibrationExpiredRows
      });
    } catch (error) {
      await Swal.fire("Load failed", error?.response?.data?.message || "Cannot load dashboard.", "error");
    }
  }

  async function loadRows(nextFilters = filters) {
    try {
      const response = await api.get(`/tooling/${activePage.endpoint}`, { params: buildToolingQuery(nextFilters) });
      setRows(response.data.data || []);
      setPagination(response.data.pagination || defaultFilters);
    } catch (error) {
      await Swal.fire("Load failed", error?.response?.data?.message || "Cannot load records.", "error");
    }
  }

  function openCreateModal() {
    setEditingRow(null);
    setForm(applyToolingFormRules(activePage, withOperationalDefaults(defaultForm(activePage), activePage)));
    setModalMode("record");
    setIsModalOpen(true);
  }

  function openEditModal(row) {
    setEditingRow(row);
    setForm({ ...defaultForm(activePage), ...row });
    setModalMode("record");
    setIsModalOpen(true);
  }

  function openCalibrationModal(row) {
    const today = getLocalDateInputValue();
    setEditingRow(row);
    setForm(applyToolingFormRules(activePage, {
      ...defaultForm(activePage),
      ...row,
      last_calibration_date: today
    }));
    setModalMode("calibration");
    setIsModalOpen(true);
  }

  function updateForm(nextForm) {
    setForm((current) => {
      const resolvedForm = typeof nextForm === "function" ? nextForm(current) : nextForm;
      return applyToolingFormRules(activePage, resolvedForm);
    });
  }

  async function saveForm(event) {
    event.preventDefault();

    try {
      const actionLabel = modalMode === "calibration" ? "Update calibration" : editingRow ? "Save changes" : getToolingActionLabel(activePage.key) || "Create record";
      const confirm = await Swal.fire(buildConfirmAlert(
        `${actionLabel}?`,
        "Please confirm before updating store records.",
        { confirmButtonText: actionLabel }
      ));

      if (!confirm.isConfirmed) {
        return;
      }

      if (editingRow) {
        await api.put(`/tooling/${activePage.endpoint}/${editingRow.id}`, form);
      } else {
        await api.post(`/tooling/${activePage.endpoint}`, form);
      }

      setIsModalOpen(false);
      await Swal.fire(buildSuccessAlert("Saved", "Record has been saved."));
      await loadRows();
    } catch (error) {
      await Swal.fire("Save failed", error?.response?.data?.message || "Please check required fields.", "error");
    }
  }

  async function deleteRow(row) {
    const confirm = await Swal.fire(buildConfirmAlert("Delete record?", "This action cannot be undone.", { icon: "warning", confirmButtonText: "Delete" }));

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      await api.delete(`/tooling/${activePage.endpoint}/${row.id}`);
      await Swal.fire(buildSuccessAlert("Deleted", "Record has been deleted."));
      await loadRows();
    } catch (error) {
      await Swal.fire("Delete failed", error?.response?.data?.message || "Cannot delete record.", "error");
    }
  }

  async function handleLogout() {
    const confirm = await Swal.fire(buildConfirmAlert("Logout?", "You will return to the main page.", { confirmButtonText: "Logout" }));

    if (!confirm.isConfirmed) {
      return;
    }

    clearSession("store");
    router.replace("/");
  }

  if (isChecking) {
    return null;
  }

  return (
    <main className={`grid min-h-screen bg-slate-100 text-slate-950 max-[900px]:grid-cols-1 ${isSidebarCollapsed ? "grid-cols-[80px_minmax(0,1fr)]" : "grid-cols-[280px_minmax(0,1fr)]"}`}>
      <aside className={`sticky top-0 h-screen overflow-x-hidden overflow-y-auto border-r border-slate-800 bg-slate-950 text-white transition-all max-[900px]:relative max-[900px]:h-auto ${isSidebarCollapsed ? "p-4" : "p-5"}`}>
        <div className={`mb-6 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25">TS</span>
          <div className={isSidebarCollapsed ? "hidden" : ""}>
            <h1 className="m-0 text-lg font-black leading-tight">Tooling & Store</h1>
            <p className="m-0 mt-1 text-sm font-bold text-slate-400">Inventory Control</p>
          </div>
        </div>

        <button
          className="mb-5 h-11 w-full rounded-xl border border-white/10 bg-white/10 text-sm font-black text-white transition hover:bg-white/15"
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? ">" : "Collapse"}
        </button>

        <nav className="grid gap-3" aria-label="Tooling Store navigation">
          {toolingNavigationGroups.map((group) => {
            const groupPages = group.pages.map((key) => getToolingPage(key)).filter(Boolean);
            const isExpanded = expandedGroups[group.key];

            return (
              <section className="grid gap-2" key={group.key}>
                <button
                  className={`flex h-9 w-full items-center rounded-lg text-xs font-black uppercase tracking-[0.12em] text-slate-400 transition hover:text-white ${isSidebarCollapsed ? "justify-center px-0" : "justify-between px-2"}`}
                  type="button"
                  onClick={() => {
                    setExpandedGroups((current) => {
                      const nextGroups = { ...current, [group.key]: !current[group.key] };
                      localStorage.setItem(getToolingSidebarStorageKey(), JSON.stringify(nextGroups));
                      return nextGroups;
                    });
                  }}
                  title={group.label}
                >
                  <span className={isSidebarCollapsed ? "hidden" : ""}>{group.label}</span>
                  <span className="text-slate-500">{isExpanded ? "-" : "+"}</span>
                </button>

                {isExpanded ? (
                  <div className="grid gap-1">
                    {groupPages.map((item) => (
                      <Link
                        className={`flex w-full items-center rounded-xl border py-2.5 text-sm font-black no-underline transition ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3 text-left"} ${
                          pathname === item.href ? "border-amber-400/50 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "border-transparent text-slate-300 hover:bg-white/10"
                        }`}
                        href={item.href}
                        key={item.key}
                        title={item.label}
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs text-amber-300">{item.icon}</span>
                        <span className={isSidebarCollapsed ? "hidden" : ""}>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col p-6 max-[760px]:p-4">
        <header className="mb-5 flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm max-[760px]:flex-col max-[760px]:items-start">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-amber-700">Tooling Store System</p>
            <h2 className="m-0 mt-1 text-3xl font-black tracking-tight">{page.title}</h2>
            <span className="mt-1 block text-sm font-bold text-slate-500">Signed in as {session?.user?.empName || session?.user?.username}</span>
          </div>
          <div className="flex items-center gap-3">
            {activePage?.endpoint && !readOnlyCreatePages.has(activePage.key) ? (
              <button className="h-11 rounded-xl bg-amber-500 px-4 text-sm font-black text-slate-950" type="button" onClick={openCreateModal}>{getToolingActionLabel(activePage.key) || "Add"}</button>
            ) : null}
            <button className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white" type="button" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {pageKey === "dashboard" ? (
          <ToolingDashboard dashboard={dashboard} movementMonth={movementMonth} setMovementMonth={setMovementMonth} />
        ) : page.children?.length ? (
          <ToolingModulePage
            activePage={activePage}
            filters={filters}
            page={page}
            pageNumbers={pageNumbers}
            pagination={pagination}
            lookups={lookups}
            rows={rows}
            setActiveSubPageKey={setActiveSubPageKey}
            setFilters={setFilters}
            onDelete={deleteRow}
            onEdit={openEditModal}
            onCalibrate={openCalibrationModal}
          />
        ) : activePage?.endpoint ? (
          <ToolingTable
            filters={filters}
            page={activePage}
            pageNumbers={pageNumbers}
            pagination={pagination}
            lookups={lookups}
            rows={rows}
            setFilters={setFilters}
            onDelete={deleteRow}
            onEdit={openEditModal}
            onCalibrate={openCalibrationModal}
          />
        ) : (
          <ToolingPlaceholder page={page} />
        )}

        <AppFooter label="Tooling & Store" />
      </section>

      {isModalOpen ? (
        <ToolingModal
          form={form}
          lookups={lookups}
          mode={modalMode}
          page={activePage}
          setForm={updateForm}
          onClose={() => setIsModalOpen(false)}
          onSubmit={saveForm}
        />
      ) : null}
    </main>
  );
}

function ToolingDashboard({ dashboard, movementMonth, setMovementMonth }) {
  const cards = [
    { label: "Total Tools", value: dashboard.totalTools, sub: "registered", tone: "border-slate-300 bg-white", bar: "bg-slate-900" },
    { label: "Available", value: dashboard.availableTools, sub: "ready to use", tone: "border-emerald-200 bg-emerald-50", bar: "bg-emerald-500" },
    { label: "Borrowed", value: dashboard.borrowedTools, sub: "in use", tone: "border-sky-200 bg-sky-50", bar: "bg-sky-500" },
    { label: "Repair", value: dashboard.repairTools, sub: "blocked", tone: "border-orange-200 bg-orange-50", bar: "bg-orange-500" },
    { label: "Low Stock", value: dashboard.lowStockItems, sub: "need refill", tone: "border-red-200 bg-red-50", bar: "bg-red-500" },
    { label: "Overdue", value: dashboard.overdueBorrow, sub: "borrow late", tone: "border-rose-200 bg-rose-50", bar: "bg-rose-500" },
    { label: "Cal Due", value: dashboard.calibrationDueSoon, sub: "within 30 days", tone: "border-amber-200 bg-amber-50", bar: "bg-amber-500" },
    { label: "Cal Expired", value: dashboard.calibrationExpired, sub: "cannot use", tone: "border-red-200 bg-red-50", bar: "bg-red-700" }
  ];
  const focusRows = [
    { label: "Borrow control", value: `${dashboard.overdueBorrow} overdue`, note: "Follow up tools that passed due date.", tone: "bg-rose-50 text-rose-700 border-rose-200", icon: "BR" },
    { label: "Stock refill", value: `${dashboard.lowStockItems} low stock`, note: "Prepare purchase request before shortage.", tone: "bg-amber-50 text-amber-700 border-amber-200", icon: "RF" },
    { label: "Calibration", value: `${dashboard.calibrationDueSoon} due soon`, note: "Schedule calibration before tools are blocked.", tone: "bg-sky-50 text-sky-700 border-sky-200", icon: "CL" }
  ];
  const lowStockRows = dashboard.stockBalanceRows.filter((item) => Number(item.current_stock || 0) < Number(item.minimum_stock || 0));
  const movementDays = useMemo(() => buildToolingMovementRows(movementMonth, dashboard.stockInRows, dashboard.stockOutRows), [dashboard.stockInRows, dashboard.stockOutRows, movementMonth]);
  const statusSlices = [
    { label: "Available", value: dashboard.availableTools, tone: "bg-emerald-500", color: "#10b981" },
    { label: "Borrowed", value: dashboard.borrowedTools, tone: "bg-sky-500", color: "#0ea5e9" },
    { label: "Repair", value: dashboard.repairTools, tone: "bg-orange-500", color: "#f97316" },
    { label: "Lost", value: dashboard.lostTools, tone: "bg-slate-500", color: "#64748b" }
  ];
  const stockRisk = buildShortageRiskRows(dashboard.stockBalanceRows, dashboard.stockOutRows, movementMonth);

  return (
    <section className="grid flex-1 gap-5">
      <div className="grid grid-cols-4 gap-3 max-[1200px]:grid-cols-2 max-[640px]:grid-cols-1">
        {cards.map((card) => (
          <article className={`overflow-hidden rounded-2xl border p-5 shadow-sm ${card.tone}`} key={card.label}>
            <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
            <strong className="mt-2 block text-3xl font-black">{card.value}</strong>
            <span className="mt-1 block text-xs font-black uppercase tracking-[0.08em] text-slate-500">{card.sub}</span>
            <span className={`mt-4 block h-1.5 rounded-full ${card.bar}`} />
          </article>
        ))}
      </div>

      <section className="grid grid-cols-[1.4fr_0.6fr] gap-4 max-[1200px]:grid-cols-1">
        <MovementChart movementMonth={movementMonth} rows={movementDays} setMovementMonth={setMovementMonth} />
        <ToolStatusChart rows={statusSlices} />
      </section>

      <section className="grid grid-cols-[0.9fr_1.1fr] gap-4 max-[1200px]:grid-cols-1">
        <StockRiskChart rows={stockRisk} />
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-3 max-[760px]:flex-col max-[760px]:items-start">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Operational Focus</p>
              <h3 className="m-0 mt-1 text-2xl font-black">Today&apos;s action board</h3>
            </div>
          </div>
          <div className="grid gap-3">
            {focusRows.map((item) => (
              <article className={`grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-4 ${item.tone} max-[760px]:grid-cols-[48px_minmax(0,1fr)]`} key={item.label}>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xs font-black shadow-sm">{item.icon}</span>
                <div>
                  <h4 className="m-0 text-base font-black text-slate-950">{item.label}</h4>
                  <p className="m-0 mt-1 text-sm font-bold text-slate-600">{item.note}</p>
                </div>
                <strong className="rounded-xl bg-white px-3 py-2 text-sm font-black shadow-sm max-[760px]:col-span-2">{item.value}</strong>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="grid grid-cols-3 gap-4 max-[1280px]:grid-cols-1">
        <DashboardTable
          columns={["Borrow No.", "Tool Code", "Tool Name", "Borrower", "Department", "Borrow Date", "Due Date", "Overdue Days"]}
          rows={dashboard.overdueRows.map((row) => [row.borrow_no, row.tool_code, row.tool_name, row.borrower, row.department, row.created_at ? String(row.created_at).slice(0, 10) : "-", row.due_date, row.overdue_days])}
          title="Overdue Borrow List"
        />
        <DashboardTable
          columns={["Item Code", "Item Name", "Current Stock", "Minimum Stock", "Unit", "Location"]}
          rows={lowStockRows.map((row) => [row.item_code, row.item_name, row.current_stock, row.minimum_stock, row.unit_code, row.location_code])}
          title="Low Stock List"
        />
        <DashboardTable
          columns={["Tool Code", "Tool Name", "Serial Number", "Every Days", "Next Calibration Date", "Status"]}
          rows={dashboard.calibrationDueSoonRows.map((row) => [row.tool_code, row.tool_name, row.serial_number, row.calibration_interval_days, row.next_calibration_date, row.status])}
          title="Calibration Due Soon List"
        />
      </section>
    </section>
  );
}

function buildShortageRiskRows(stockBalanceRows, stockOutRows, movementMonth) {
  const daysInMonth = buildToolingMovementRows(movementMonth).length || 30;

  return stockBalanceRows.map((item) => {
    const monthlyUsage = stockOutRows
      .filter((row) => row.item_code === item.item_code && String(row.issue_date || "").startsWith(movementMonth))
      .reduce((sum, row) => sum + Math.abs(Number(row.quantity || 0)), 0);
    const averageDailyUsage = monthlyUsage / daysInMonth;
    const currentStock = Number(item.current_stock || 0);
    const minimumStock = Number(item.minimum_stock || 0);
    const leadTimeDays = Number(item.lead_time_days || 7);
    const safetyDays = Number(item.safety_days || 2);
    const replenishmentWindow = leadTimeDays + safetyDays;
    const daysUntilStockout = averageDailyUsage > 0 ? currentStock / averageDailyUsage : Number.POSITIVE_INFINITY;
    const baseRisk = Number.isFinite(daysUntilStockout) ? Math.max(0, Math.min(100, Math.round((1 - daysUntilStockout / (replenishmentWindow * 2)) * 100))) : 0;
    const lowStockRisk = currentStock < minimumStock ? 70 : 0;
    const value = Math.max(baseRisk, lowStockRisk);

    return {
      label: item.item_name || item.item_code,
      value,
      width: getRiskWidthClass(value),
      tone: getRiskToneClass(value),
      currentStock,
      averageDailyUsage: Number(averageDailyUsage.toFixed(2)),
      leadTimeDays,
      safetyDays
    };
  }).filter((item) => item.value > 0).sort((first, second) => second.value - first.value).slice(0, 3);
}

function getRiskWidthClass(value) {
  if (value >= 90) return "w-[90%]";
  if (value >= 80) return "w-[80%]";
  if (value >= 70) return "w-[70%]";
  if (value >= 60) return "w-[60%]";
  if (value >= 50) return "w-[50%]";
  if (value >= 40) return "w-[40%]";
  if (value >= 30) return "w-[30%]";
  if (value >= 20) return "w-[20%]";
  return "w-[10%]";
}

function getRiskToneClass(value) {
  if (value >= 80) return "bg-red-500";
  if (value >= 60) return "bg-orange-500";
  if (value >= 40) return "bg-amber-500";
  return "bg-sky-500";
}

function applyToolingFormRules(page, nextForm) {
  if (!page?.key?.startsWith("calibration")) {
    return nextForm;
  }

  const intervalDays = Number(nextForm.calibration_interval_days || 0);
  if (nextForm.last_calibration_date && intervalDays > 0) {
    return {
      ...nextForm,
      next_calibration_date: addLocalDays(nextForm.last_calibration_date, intervalDays)
    };
  }

  return nextForm;
}

function addLocalDays(dateValue, days) {
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function MovementChart({ movementMonth, rows, setMovementMonth }) {
  function handleMonthChange(event) {
    const nextMonth = event.target.value || getDefaultToolingMovementMonth();
    setMovementMonth(nextMonth);
    localStorage.setItem(getToolingDashboardStorageKey("movementMonth"), nextMonth);
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-end justify-between gap-3 max-[760px]:flex-col max-[760px]:items-start">
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Stock Movement</p>
          <h3 className="m-0 mt-1 text-2xl font-black">In vs Out by day</h3>
        </div>
        <div className="flex items-end gap-4 max-[760px]:w-full max-[760px]:items-start max-[760px]:flex-col">
          <label className="grid gap-1">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Month / Year</span>
            <input
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              type="month"
              value={movementMonth}
              onChange={handleMonthChange}
            />
          </label>
          <div className="flex h-11 items-center gap-3 text-xs font-black">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Stock In</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Stock Out</span>
          </div>
        </div>
      </div>
      <div className="h-80 rounded-2xl border border-slate-200 bg-white p-3">
        <ResponsiveContainer height="100%" width="100%" minWidth={0}>
          <BarChart data={rows} margin={{ top: 18, right: 24, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 12, fontWeight: 800 }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 12, fontWeight: 800 }} tickLine={false} />
            <Tooltip content={<ChartTooltip labelPrefix="Day" />} cursor={{ fill: "#f1f5f9" }} />
            <Legend formatter={(value) => (value === "inQty" ? "Stock In" : "Stock Out")} />
            <Bar dataKey="inQty" fill="#10b981" name="Stock In" radius={[8, 8, 0, 0]} />
            <Bar dataKey="outQty" fill="#0ea5e9" name="Stock Out" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function ToolStatusChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Tool Status</p>
      <h3 className="m-0 mt-1 text-2xl font-black">Availability mix</h3>
      <div className="relative mt-4 h-56">
        <ResponsiveContainer height="100%" width="100%" minWidth={0}>
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie data={rows.filter((row) => row.value > 0)} dataKey="value" innerRadius={58} nameKey="label" outerRadius={88} paddingAngle={2}>
              {rows.filter((row) => row.value > 0).map((row) => (
                <Cell fill={row.color} key={row.label} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <strong className="block text-2xl font-black">{total}</strong>
            <span className="text-xs font-black uppercase text-slate-500">Tools</span>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-3" key={row.label}>
            <span className="inline-flex items-center gap-2 text-sm font-black"><span className={`h-3 w-3 rounded-full ${row.tone}`} /> {row.label}</span>
            <span className="text-sm font-black text-slate-600">{row.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function ChartTooltip({ active, label, labelPrefix = "", payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-950 shadow-xl">
      {label ? <p className="m-0 mb-1 text-xs uppercase tracking-[0.08em] text-slate-500">{labelPrefix ? `${labelPrefix} ${label}` : label}</p> : null}
      <div className="grid gap-1">
        {payload.map((entry) => (
          <p className="m-0 flex items-center justify-between gap-5" key={entry.dataKey || entry.name}>
            <span className="inline-flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${getTooltipDotClass(entry.name)}`} />
              {entry.name === "inQty" ? "Stock In" : entry.name === "outQty" ? "Stock Out" : entry.name}
            </span>
            <span>{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function getTooltipDotClass(name) {
  if (name === "inQty" || name === "Available") {
    return "bg-emerald-500";
  }
  if (name === "outQty" || name === "Borrowed") {
    return "bg-sky-500";
  }
  if (name === "Repair") {
    return "bg-orange-500";
  }
  return "bg-slate-500";
}

function StockRiskChart({ rows }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Spare Part Risk</p>
      <h3 className="m-0 mt-1 text-2xl font-black">Shortage probability Top 3</h3>
      <p className="m-0 mt-2 text-sm font-bold leading-6 text-slate-600">
        Risk score = compare days until stockout against lead time plus safety buffer. Higher score means the item may run out before replenishment arrives.
      </p>
      <div className="mt-5 grid gap-4">
        {!rows.length ? <p className="m-0 rounded-xl bg-slate-50 p-4 text-sm font-black text-slate-500">No shortage risk found for the selected month.</p> : null}
        {rows.map((row) => (
          <div className="grid gap-2" key={row.label}>
            <div className="flex items-center justify-between text-sm font-black">
              <span>{row.label}</span>
              <span>{row.value}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${row.tone} ${row.width}`} />
            </div>
            <p className="m-0 text-xs font-bold text-slate-500">
              Stock {row.currentStock}, avg use {row.averageDailyUsage}/day, lead time {row.leadTimeDays} days, buffer {row.safetyDays} days
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function ToolingModulePage({ activePage, filters, lookups, page, pageNumbers, pagination, rows, setActiveSubPageKey, setFilters, onDelete, onEdit, onCalibrate }) {
  const childPages = page.children.map((key) => getToolingPage(key)).filter(Boolean);

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={`${page.title} sections`}>
          {childPages.map((child) => {
            const isActive = activePage?.key === child.key;

            return (
              <button
                className={`h-11 rounded-xl px-4 text-sm font-black transition ${
                  isActive ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
                }`}
                key={child.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSubPageKey(child.key)}
              >
                {child.label}
              </button>
            );
          })}
        </div>
      </div>

      {activePage?.endpoint ? (
        <ToolingTable
          filters={filters}
          lookups={lookups}
          page={activePage}
          pageNumbers={pageNumbers}
          pagination={pagination}
          rows={rows}
          setFilters={setFilters}
          onDelete={onDelete}
          onEdit={onEdit}
          onCalibrate={onCalibrate}
        />
      ) : (
        <ToolingPlaceholder page={activePage || page} />
      )}
    </section>
  );
}

function exportToolingTable(page = {}, rows = []) {
  return downloadHtmlExcel({
    filename: `tooling-${page.key || "report"}-${new Date().toISOString().slice(0, 10)}`,
    title: `Tooling & Store - ${page.title || "Report"}`,
    subtitle: page.description || "Tooling and store operational report",
    filters: [
      { label: "Generated At", value: new Date().toLocaleString() },
      { label: "Page", value: page.title || "-" },
      { label: "Rows", value: rows.length }
    ],
    sections: [
      {
        title: page.title || "Report",
        columns: [
          { key: "no", label: "No", width: 48 },
          ...(page.columns || []).map((column) => ({
            key: column.key,
            label: column.label,
            width: column.key.includes("description") || column.key.includes("remark") ? 220 : 130
          }))
        ],
        rows: rows.map((row, index) => ({
          no: index + 1,
          ...(page.columns || []).reduce((record, column) => ({
            ...record,
            [column.key]: row[column.key] ?? "-"
          }), {})
        }))
      }
    ]
  });
}

function ToolingPlaceholder({ page }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 max-[760px]:flex-col">
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Tooling Store</p>
          <h3 className="m-0 mt-1 text-2xl font-black">{page.title}</h3>
          <p className="m-0 mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-600">{page.description}</p>
        </div>
      </div>
      <p className="m-0 rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-600">This module is ready for backend data connection.</p>
    </section>
  );
}

function DashboardTable({ columns, rows, title }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="m-0 text-lg font-black">{title}</h3>
      <div className="mt-3 max-h-[292px] overflow-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {columns.map((column) => (
                <th className="border-b border-slate-200 p-2 text-center text-[11px] font-black uppercase tracking-[0.08em] text-slate-500" key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td className="border-b border-slate-100 p-2 text-center text-sm font-bold" key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ToolingTable({ filters, lookups = {}, page, pageNumbers, pagination, rows, setFilters, onDelete, onEdit, onCalibrate }) {
  const hasCalibrationAction = getToolingCalibrationActionFields(page.key).length > 0;

  return (
    <section className="grid flex-1 gap-4">
      <div className="grid grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
        {page.filters.includes("search") ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Search</span>
            <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-amber-400" value={filters.search || ""} onChange={(event) => setFilters((current) => ({ ...current, page: 1, search: event.target.value }))} />
          </label>
        ) : null}
        {page.filters.includes("status") ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Status</span>
            <SearchableDropdown
              options={[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "Available", label: "Available" }, { value: "Borrowed", label: "Borrowed" }, { value: "Repair", label: "Repair" }, { value: "Lost", label: "Lost" }]}
              value={filters.status || ""}
              onChange={(value) => setFilters((current) => ({ ...current, page: 1, status: value }))}
              placeholder="All"
            />
          </label>
        ) : null}
        {page.filters.filter((filter) => filter !== "search" && filter !== "status").map((filter) => (
          <label className="grid gap-1.5" key={filter}>
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{formatToolingLabel(filter)}</span>
            <SearchableDropdown
              options={getFilterOptions(page, filter, lookups)}
              value={filters[filter] || ""}
              onChange={(value) => setFilters((current) => ({ ...current, page: 1, [filter]: value }))}
              placeholder="All"
            />
          </label>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {page.key === "reports" ? (
          <div className="mb-3 flex justify-end">
            <button className="h-10 rounded-xl bg-amber-500 px-4 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-400" onClick={() => exportToolingTable(page, rows)} type="button">
              Export Excel
            </button>
          </div>
        ) : null}
        <div className="overflow-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <th className="border-b border-slate-200 p-3 text-center text-xs font-black uppercase tracking-[0.08em] text-slate-500">No</th>
                {page.columns.map((column) => (
                  <th className="border-b border-slate-200 p-3 text-center text-xs font-black uppercase tracking-[0.08em] text-slate-500" key={column.key}>{column.label}</th>
                ))}
                <th className="border-b border-slate-200 p-3 text-center text-xs font-black uppercase tracking-[0.08em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td className="border-b border-slate-200 p-3 text-center font-bold">{(pagination.page - 1) * pagination.pageSize + index + 1}</td>
                  {page.columns.map((column) => (
                    <td className="border-b border-slate-200 p-3 text-center font-bold" key={column.key}>
                      {column.type === "image" ? (
                        <img className="mx-auto h-14 w-20 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1" src={getToolingImagePath(row)} alt={row.tool_name || row.item_name || "Tooling item"} />
                      ) : (
                        row[column.key] ?? "-"
                      )}
                    </td>
                  ))}
                  <td className="border-b border-slate-200 p-3">
                    <div className="flex justify-center gap-2">
                      {hasCalibrationAction && canShowToolingCalibrationAction(row) ? (
                        <button className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white" type="button" onClick={() => onCalibrate(row)}>Calibrate</button>
                      ) : null}
                      <button className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-black text-white" type="button" onClick={() => onEdit(row)}>Edit</button>
                      <button className="h-10 rounded-xl border border-red-200 bg-white px-4 text-sm font-black text-red-700" type="button" onClick={() => onDelete(row)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="border-b border-slate-200 p-6 text-center font-bold text-slate-500" colSpan={page.columns.length + 2}>No records found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {pageNumbers.map((pageNumber) => (
            <button className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-black ${pageNumber === pagination.page ? "border-amber-500 bg-amber-500 text-slate-950" : "border-slate-200 bg-white text-slate-700"}`} key={pageNumber} type="button" onClick={() => setFilters((current) => ({ ...current, page: pageNumber }))}>
              {pageNumber}
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function ToolingModal({ form, lookups, mode = "record", page, setForm, onClose, onSubmit }) {
  const previewImage = getToolingImagePath(form);
  const actionFields = mode === "calibration" ? getToolingCalibrationActionFields(page.key) : [];
  const visibleFields = actionFields.length ? page.fields.filter((field) => actionFields.includes(field.key)) : page.fields;
  const hasImageField = page.fields.some((field) => field.type === "image");
  const modalTitle = mode === "calibration" ? "Update Calibration" : "Record";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
      <form className="max-h-[92vh] w-[min(920px,100%)] overflow-auto rounded-2xl bg-white shadow-2xl" onSubmit={onSubmit}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-amber-700">{page.title}</p>
            <h3 className="m-0 mt-1 text-2xl font-black">{modalTitle}</h3>
          </div>
          <button className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black" type="button" onClick={onClose}>Close</button>
        </div>
        <div className={`grid gap-5 p-6 max-[900px]:grid-cols-1 ${hasImageField ? "grid-cols-[220px_minmax(0,1fr)]" : "grid-cols-1"}`}>
          {hasImageField ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <img className="h-40 w-full rounded-xl object-contain" src={previewImage} alt={form.tool_name || form.item_name || page.title} />
              <p className="m-0 mt-3 text-sm font-black text-slate-800">{form.tool_name || form.item_name || "Item preview"}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
            {visibleFields.map((field) => (
              <label className={`grid gap-1.5 ${field.type === "textarea" || field.type === "image" ? "col-span-2 max-[760px]:col-span-1" : ""}`} key={field.key}>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
                <FieldInput
                  field={field}
                  lookups={lookups}
                  value={form[field.key] ?? ""}
                  onChange={(value) => {
                    if (typeof value === "function") {
                      setForm(value);
                      return;
                    }
                    setForm((current) => ({ ...current, [field.key]: value }));
                  }}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black" type="button" onClick={onClose}>Cancel</button>
          <button className="h-11 rounded-xl bg-amber-500 px-5 text-sm font-black text-slate-950" type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function withOperationalDefaults(form, page) {
  const today = getLocalDateInputValue();
  const nextForm = { ...form };

  ["issue_date", "return_date", "receive_date"].forEach((field) => {
    if (page.fields.some((item) => item.key === field) && !nextForm[field]) {
      nextForm[field] = today;
    }
  });

  if (page.key === "borrow-issue" && !nextForm.status) {
    nextForm.status = "Issued";
  }

  if (page.key === "stock-in" || page.key === "stock-out") {
    nextForm.quantity = nextForm.quantity || 1;
  }

  return nextForm;
}

function FieldInput({ field, lookups, value, onChange }) {
  if (field.type === "select") {
    return <SearchableDropdown options={field.options.map((option) => ({ value: option, label: option }))} value={value} onChange={onChange} placeholder="Select" />;
  }

  if (field.type === "lookup") {
    return (
      <SearchableDropdown
        options={lookupOptions(field.lookup, lookups[field.lookup])}
        value={value}
        onChange={(nextValue, selectedRow) => {
          onChange((current) => ({
            ...current,
            [field.key]: nextValue,
            ...buildAutoFillValues(field, selectedRow)
          }));
        }}
        placeholder="Search and select"
      />
    );
  }

  if (field.type === "textarea") {
    return <textarea className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold outline-none focus:border-amber-400" value={value} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.type === "image") {
    return (
      <div className="grid gap-2">
        <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-amber-400" value={value} onChange={(event) => onChange(event.target.value)} placeholder="/tooling-images/example.svg" />
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <img className="h-28 w-full object-contain" src={getToolingImagePath(value)} alt="Selected image preview" />
        </div>
      </div>
    );
  }

  return (
    <input
      className={`h-11 rounded-xl border border-slate-200 px-3 font-bold outline-none focus:border-amber-400 ${field.readOnly ? "bg-slate-100 text-slate-500" : "bg-white"}`}
      readOnly={field.readOnly}
      required={field.required}
      type={field.type === "number" || field.type === "date" ? field.type : "text"}
      value={value}
      placeholder={field.autoNumber ? "Auto generated" : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function buildAutoFillValues(field, selectedRow = {}) {
  if (!field.autoFill || !selectedRow) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(field.autoFill).map(([targetKey, sourceKey]) => [targetKey, selectedRow[sourceKey] || ""])
  );
}

function getFilterOptions(page, filter, lookups) {
  const field = page.fields?.find((item) => item.key === filter);

  if (field?.type === "lookup") {
    return [{ value: "", label: "All" }, ...lookupOptions(field.lookup, lookups[field.lookup])];
  }

  if (field?.options?.length) {
    return [{ value: "", label: "All" }, ...field.options.map((option) => ({ value: option, label: option }))];
  }

  const values = {
    condition_status: ["Good", "Need Check", "Damaged"],
    reference_type: ["PM", "Job Request", "Work Order", "General Use"],
    movement_type: ["Stock In", "Stock Out", "Borrow", "Return", "Adjustment", "Calibration"],
    report_type: ["Master", "Stock", "Borrow", "Calibration", "Movement"],
    owner: ["Tooling Store", "QC Room"]
  }[filter] || [];

  return [{ value: "", label: "All" }, ...values.map((value) => ({ value, label: value }))];
}

function formatToolingLabel(value) {
  return value.replaceAll("_", " ");
}

function lookupOptions(lookupKey, rows = []) {
  const maps = {
    categories: ["category_code", "category_name"],
    locations: ["location_code", "location_name"],
    units: ["unit_code", "unit_name"],
    tools: ["tool_code", "tool_name", "serial_number"],
    stockItems: ["item_code", "item_name", "current_stock"],
    borrowIssues: ["issue_no", "tool_code", "borrower"]
  };
  const [valueKey, ...labelKeys] = maps[lookupKey] || [];

  return rows.map((row) => ({
    value: row[valueKey],
    label: [row[valueKey], ...labelKeys.map((key) => row[key])].filter(Boolean).join(" - "),
    raw: row
  }));
}

function SearchableDropdown({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => String(option.value) === String(value));
  const visibleOptions = options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative">
      <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white focus-within:border-amber-400">
        <input className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 font-bold outline-none" placeholder={placeholder} value={isOpen ? query : selected?.label || value || ""} onBlur={() => setTimeout(() => setIsOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }} onFocus={() => { setQuery(""); setIsOpen(true); }} />
        <button className="h-full w-11 rounded-r-xl border-l border-slate-200 text-sm font-black text-slate-600" type="button" onClick={() => setIsOpen((current) => !current)}>v</button>
      </div>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-12 z-[70] max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {visibleOptions.map((option) => (
            <button className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-amber-50 ${String(option.value) === String(value) ? "bg-amber-100 text-amber-900" : "text-slate-800"}`} key={`${option.value}-${option.label}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.value, option.raw); setQuery(""); setIsOpen(false); }}>
              {option.label}
            </button>
          ))}
          {!visibleOptions.length ? <div className="px-3 py-2 text-sm font-bold text-slate-500">No options found.</div> : null}
        </div>
      ) : null}
    </div>
  );
}
