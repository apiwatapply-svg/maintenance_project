"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import AppFooter from "@/components/AppFooter";
import api, { getBackendAssetUrl } from "@/lib/api";
import { adminResourceGroups, buildAdminQuery, getAdminFilterStorageKey, getAdminResource, getPageNumbers } from "@/lib/adminResources";
import { clearSession, getSessionConfig, getStoredSession } from "@/lib/session";

function defaultForm(config) {
  return Object.fromEntries(config.fields.map((field) => [field.key, field.type === "status" ? "active" : field.options?.[0] || ""]));
}

const lookupEndpoints = {
  departments: "departments",
  areas: "areas",
  "machine-types": "machine-types"
};

const lookupLabelKeys = {
  departments: ["department_code", "department_name"],
  areas: ["area_code", "area_name"],
  "machine-types": ["machine_type_code", "machine_type_name"]
};

const lookupValueKeys = {
  departments: "department_code",
  areas: "area_code",
  "machine-types": "machine_type_code"
};

function toLookupOptions(lookupKey, rows = [], includeAll = false) {
  const valueKey = lookupValueKeys[lookupKey];
  const labelKeys = lookupLabelKeys[lookupKey] || [valueKey];
  const options = rows.map((row) => ({
    value: row[valueKey],
    label: labelKeys.map((key) => row[key]).filter(Boolean).join(" - "),
    raw: row
  }));

  return includeAll ? [{ value: "", label: "All" }, ...options] : options;
}

function buildFormPayload(resourceKey, form) {
  if (resourceKey !== "employees") {
    return { ...form };
  }

  const formData = new FormData();

  Object.entries(form).forEach(([key, value]) => {
    if (key === "image_file") {
      if (value instanceof File) {
        formData.append(key, value);
      }
      return;
    }

    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  return formData;
}

export default function AdminResourcePage({ resourceKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const adminConfig = getSessionConfig("admin");
  const config = getAdminResource(resourceKey);
  const [session, setSession] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ page: 1, pageSize: 10 });
  const [form, setForm] = useState(() => defaultForm(config));
  const [editingRow, setEditingRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lookups, setLookups] = useState({ departments: [], areas: [], "machine-types": [] });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pageNumbers = useMemo(
    () => getPageNumbers(pagination.page, pagination.total, pagination.pageSize),
    [pagination.page, pagination.pageSize, pagination.total]
  );

  useEffect(() => {
    const storedSession = getStoredSession("admin");

    if (!storedSession) {
      router.replace(adminConfig.loginPath);
      return;
    }

    setSession(storedSession);
    setIsChecking(false);
  }, [adminConfig.loginPath, router]);

  useEffect(() => {
    try {
      const storedFilters = JSON.parse(localStorage.getItem(getAdminFilterStorageKey(resourceKey))) || {};
      setFilters({ page: 1, pageSize: 10, ...storedFilters });
    } catch {
      setFilters({ page: 1, pageSize: 10 });
    }
    setForm(defaultForm(config));
    setEditingRow(null);
    setIsModalOpen(false);
  }, [config, resourceKey]);

  useEffect(() => {
    if (!isChecking) {
      loadRows(filters);
      localStorage.setItem(getAdminFilterStorageKey(resourceKey), JSON.stringify(filters));
    }
  }, [filters, isChecking, resourceKey]);

  useEffect(() => {
    if (!isChecking) {
      loadLookups();
    }
  }, [isChecking]);

  async function loadLookups() {
    try {
      const entries = await Promise.all(
        Object.entries(lookupEndpoints).map(async ([key, endpoint]) => {
          const response = await api.get(`/admin/${endpoint}`, { params: { page: 1, pageSize: 200 } });
          return [key, response.data.data || []];
        })
      );
      setLookups(Object.fromEntries(entries));
    } catch (error) {
      await Swal.fire("Lookup failed", error?.response?.data?.message || "Cannot load dropdown data.", "error");
    }
  }

  async function loadRows(nextFilters = filters) {
    try {
      const response = await api.get(`/admin/${config.endpoint}`, { params: buildAdminQuery(nextFilters) });
      setRows(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, pageSize: 10, total: 0 });
    } catch (error) {
      await Swal.fire("Load failed", error?.response?.data?.message || "Cannot load data.", "error");
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }

  function openCreateModal() {
    setEditingRow(null);
    setForm(defaultForm(config));
    setIsModalOpen(true);
  }

  function openEditModal(row) {
    setEditingRow(row);
    setForm({ ...defaultForm(config), ...row, password: "" });
    setIsModalOpen(true);
  }

  function updateFormField(field, value, option) {
    setForm((current) => {
      const next = { ...current, [field.key]: value };
      if (field.fill && option?.raw) {
        Object.entries(field.fill).forEach(([targetKey, sourceKey]) => {
          next[targetKey] = option.raw[sourceKey] || "";
        });
      }
      return next;
    });
  }

  async function saveForm(event) {
    event.preventDefault();

    try {
      const payload = buildFormPayload(resourceKey, form);
      if (resourceKey === "users" && editingRow && !payload.password) {
        delete payload.password;
      }

      if (editingRow) {
        await api.put(`/admin/${config.endpoint}/${editingRow.id}`, payload);
      } else {
        await api.post(`/admin/${config.endpoint}`, payload);
      }

      setIsModalOpen(false);
      await Swal.fire("Saved", "Record has been saved.", "success");
      await loadRows();
    } catch (error) {
      await Swal.fire("Save failed", error?.response?.data?.message || "Please check required fields.", "error");
    }
  }

  async function deleteRow(row) {
    const confirm = await Swal.fire({
      title: "Delete record?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel"
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      await api.delete(`/admin/${config.endpoint}/${row.id}`);
      await Swal.fire("Deleted", "Record has been deleted.", "success");
      await loadRows();
    } catch (error) {
      await Swal.fire("Delete failed", error?.response?.data?.message || "Cannot delete record.", "error");
    }
  }

  function handleLogout() {
    clearSession("admin");
    router.replace("/");
  }

  if (isChecking) {
    return null;
  }

  return (
    <main className={`grid min-h-screen bg-slate-100 text-slate-950 max-[900px]:grid-cols-1 ${isSidebarCollapsed ? "grid-cols-[80px_minmax(0,1fr)]" : "grid-cols-[288px_minmax(0,1fr)]"}`}>
      <aside className={`sticky top-0 h-screen overflow-x-hidden overflow-y-auto border-r border-slate-800 bg-slate-950 text-white transition-all max-[900px]:relative max-[900px]:h-auto ${isSidebarCollapsed ? "p-4" : "p-5"}`}>
        <div className={`mb-6 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-sm font-black shadow-lg shadow-violet-600/25">AD</span>
          <div className={isSidebarCollapsed ? "hidden" : ""}>
            <h1 className="m-0 text-lg font-black leading-tight">Admin Mode</h1>
            <p className="m-0 mt-1 text-sm font-bold text-slate-400">System Control</p>
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

        <nav className="grid gap-3" aria-label="Admin navigation">
          {adminResourceGroups.map((group) => (
            <section className={`rounded-2xl border border-white/10 bg-white/[0.04] ${isSidebarCollapsed ? "p-1" : "p-2"}`} key={group.label}>
              <div className={`rounded-xl px-3 py-2 ${isSidebarCollapsed ? "hidden" : ""}`}>
                <b className="block text-sm font-black text-slate-200">{group.label}</b>
                <small className="text-xs font-bold text-slate-500">{group.items.length} menus</small>
              </div>
              <div className={`${isSidebarCollapsed ? "mt-0" : "mt-2"} grid gap-1.5`}>
                {group.items.map((item) => (
                  <Link
                    className={`flex w-full items-center rounded-xl border py-2.5 text-sm font-black no-underline transition ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3 text-left"} ${
                      pathname === item.href
                        ? "border-violet-400/50 bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                        : "border-transparent text-slate-300 hover:bg-white/10"
                    }`}
                    href={item.href}
                    key={item.key}
                    title={item.label}
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs text-violet-300">{item.icon}</span>
                    <span className={isSidebarCollapsed ? "hidden" : ""}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col p-6 max-[760px]:p-4">
        <header className="mb-5 flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm max-[760px]:flex-col max-[760px]:items-start">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-violet-700">Administration</p>
            <h2 className="m-0 mt-1 text-3xl font-black tracking-tight">{config.title}</h2>
            <span className="mt-1 block text-sm font-bold text-slate-500">Signed in as {session?.user?.empName || session?.user?.username}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-black text-white" type="button" onClick={openCreateModal}>Add {config.title}</button>
            <button className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white" type="button" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1">
          {config.filters.map((filter) => (
            <label className="grid gap-1.5" key={filter.key}>
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{filter.label}</span>
              <FilterInput filter={filter} value={filters[filter.key] || ""} lookups={lookups} onChange={(value) => updateFilter(filter.key, value)} />
            </label>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0 text-xl font-black">Records</h3>
            <span className="text-sm font-bold text-slate-500">Total {pagination.total}</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 p-3 text-center text-xs font-black uppercase tracking-[0.08em] text-slate-500">No</th>
                  {config.columns.map((column) => (
                    <th className="border-b border-slate-200 p-3 text-center text-xs font-black uppercase tracking-[0.08em] text-slate-500" key={column.key}>{column.label}</th>
                  ))}
                  <th className="border-b border-slate-200 p-3 text-center text-xs font-black uppercase tracking-[0.08em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border-b border-slate-200 p-3 text-center font-bold">{(pagination.page - 1) * pagination.pageSize + index + 1}</td>
                    {config.columns.map((column) => (
                      <td className="border-b border-slate-200 p-3 text-center font-bold" key={column.key}>
                        <TableCell column={column} row={row} />
                      </td>
                    ))}
                    <td className="border-b border-slate-200 p-3">
                      <div className="flex justify-center gap-2">
                        <button className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-black text-white" type="button" onClick={() => openEditModal(row)}>Edit</button>
                        <button className="h-10 rounded-xl border border-red-200 bg-white px-4 text-sm font-black text-red-700" type="button" onClick={() => deleteRow(row)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td className="border-b border-slate-200 p-6 text-center font-bold text-slate-500" colSpan={config.columns.length + 2}>No records found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-[760px]:grid-cols-1">
            <span className="text-sm font-bold text-slate-500">Page {pagination.page}</span>
            <div className="flex justify-center gap-2">
              {pageNumbers.map((page) => (
                <button
                  className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-black ${
                    page === pagination.page ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700"
                  }`}
                  key={page}
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, page }))}
                >
                  {page}
                </button>
              ))}
            </div>
            <div className="w-28 justify-self-end">
              <SearchableDropdown
              options={[10, 20, 50].map((size) => ({ value: size, label: String(size) }))}
              value={filters.pageSize || 10}
              onChange={(value) => setFilters((current) => ({ ...current, page: 1, pageSize: Number(value) }))}
              placeholder="10"
            />
            </div>
          </div>
        </section>
        <AppFooter label="Admin Mode" />
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5">
          <form className="max-h-[92vh] w-[min(920px,100%)] overflow-auto rounded-2xl bg-white shadow-2xl" onSubmit={saveForm}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-violet-700">{config.title}</p>
                <h3 className="m-0 mt-1 text-2xl font-black">{editingRow ? "Edit Record" : "Add Record"}</h3>
              </div>
              <button className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black" type="button" onClick={() => setIsModalOpen(false)}>Close</button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6 max-[760px]:grid-cols-1">
              {config.fields.map((field) => (
                <label className="grid gap-1.5" key={field.key}>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
                  <FieldInput
                    field={field}
                    value={form[field.key] || ""}
                    lookups={lookups}
                    onChange={(value, option) => updateFormField(field, value, option)}
                    editingRow={editingRow}
                    existingImagePath={form.image_path}
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-black text-white" type="submit">Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function FilterInput({ filter, value, lookups, onChange }) {
  if (filter.type === "statusFilter") {
    return (
      <SearchableDropdown
        options={[
          { value: "", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" }
        ]}
        value={value}
        onChange={onChange}
        placeholder="All"
      />
    );
  }

  if (filter.type === "select") {
    return (
      <SearchableDropdown
        options={filter.options.map((option) => ({ value: option, label: option || "All" }))}
        value={value}
        onChange={onChange}
        placeholder="All"
      />
    );
  }

  if (filter.type === "lookup") {
    return (
      <SearchableDropdown
        options={toLookupOptions(filter.lookup, lookups[filter.lookup], true)}
        value={value}
        onChange={onChange}
        placeholder="All"
      />
    );
  }

  return (
    <input
      className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-violet-400"
      placeholder={filter.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function TableCell({ column, row }) {
  if (column.type === "image") {
    return row[column.key] ? (
      <img
        alt={`${row.emp_name || "Employee"} photo`}
        className="mx-auto h-12 w-12 rounded-xl border border-slate-200 object-cover"
        src={getBackendAssetUrl(row[column.key])}
      />
    ) : (
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-400">NO</span>
    );
  }

  return row[column.key] || "-";
}

function FieldInput({ field, value, lookups, onChange, editingRow, existingImagePath }) {
  if (field.type === "status") {
    return (
      <SearchableDropdown
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" }
        ]}
        value={value || "active"}
        onChange={onChange}
        placeholder="Active"
      />
    );
  }

  if (field.type === "select") {
    return (
      <SearchableDropdown
        options={field.options.map((option) => ({ value: option, label: option }))}
        value={value}
        onChange={onChange}
        placeholder="Select"
      />
    );
  }

  if (field.type === "lookup") {
    return (
      <SearchableDropdown
        options={toLookupOptions(field.lookup, lookups[field.lookup])}
        value={value}
        onChange={onChange}
        placeholder="Search and select"
      />
    );
  }

  if (field.type === "readonly") {
    return (
      <input
        className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 font-bold text-slate-600 outline-none"
        readOnly
        required={field.required}
        value={value}
      />
    );
  }

  if (field.type === "image") {
    const selectedFileName = value instanceof File ? value.name : "";

    return (
      <div className="grid gap-3">
        {existingImagePath ? (
          <img
            alt="Current employee photo"
            className="h-24 w-24 rounded-2xl border border-slate-200 object-cover"
            src={getBackendAssetUrl(existingImagePath)}
          />
        ) : null}
        <input
          accept="image/png,image/jpeg,image/webp"
          className="block h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-sm file:font-black file:text-white"
          type="file"
          onChange={(event) => onChange(event.target.files?.[0] || "")}
        />
        <span className="text-xs font-bold text-slate-500">{selectedFileName || "JPG, PNG, WEBP up to 5MB"}</span>
      </div>
    );
  }

  return (
    <input
      className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-violet-400"
      placeholder={field.type === "password" && editingRow ? "Leave blank to keep current password" : ""}
      required={field.required && !(field.type === "password" && editingRow)}
      type={field.type === "password" ? "password" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SearchableDropdown({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => String(option.value) === String(value));
  const visibleOptions = options.filter((option) => {
    const text = `${option.label} ${option.value}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  function chooseOption(option) {
    onChange(option.value, option);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white focus-within:border-violet-400">
        <input
          className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 font-bold outline-none"
          placeholder={placeholder}
          value={isOpen ? query : selected?.label || value || ""}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setIsOpen(true);
          }}
        />
        <button
          className="h-full w-11 rounded-r-xl border-l border-slate-200 text-sm font-black text-slate-600"
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          v
        </button>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-12 z-[70] max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {visibleOptions.map((option) => (
            <button
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-violet-50 ${
                String(option.value) === String(value) ? "bg-violet-100 text-violet-800" : "text-slate-800"
              }`}
              key={`${option.value}-${option.label}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </button>
          ))}
          {!visibleOptions.length ? (
            <div className="px-3 py-2 text-sm font-bold text-slate-500">No options found.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
