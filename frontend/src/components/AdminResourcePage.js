"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

const featureOptions = [
  { key: "preventiveMaintenance", label: "Preventive Maintenance" },
  { key: "toolingStore", label: "Toolling & Store" },
  { key: "jobRequest", label: "Job Request" },
  { key: "adminMode", label: "Admin mode" }
];

const resources = {
  departments: {
    path: "/admin/departments",
    title: "Departments",
    createLabel: "Add Department",
    description: "Manage factory department master data.",
    fields: [
      { key: "code", label: "Code" },
      { key: "name", label: "Department Name", required: true },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: ["search", "status"]
  },
  areas: {
    path: "/admin/areas",
    title: "Areas",
    createLabel: "Add Area",
    description: "Manage areas under each department.",
    fields: [
      { key: "departmentId", label: "Department", type: "department", required: true },
      { key: "code", label: "Code" },
      { key: "name", label: "Area Name", required: true },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: ["search", "status", "departmentId"]
  },
  "machine-types": {
    path: "/admin/machine-types",
    title: "Machine Types",
    createLabel: "Add Machine Type",
    description: "Manage machine type master data for each area.",
    fields: [
      { key: "areaId", label: "Area", type: "area", required: true },
      { key: "code", label: "Code" },
      { key: "name", label: "Machine Type", required: true },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: ["search", "status", "areaId"]
  },
  "machine-numbers": {
    path: "/admin/machine-numbers",
    title: "Machine Numbers",
    createLabel: "Add Machine Number",
    description: "Manage machine numbers under each machine type.",
    fields: [
      { key: "machineTypeId", label: "Machine Type", type: "machineType", required: true },
      { key: "machineNumber", label: "Machine Number", required: true },
      { key: "name", label: "Machine Name" },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: ["search", "status", "machineTypeId"]
  },
  users: {
    path: "/admin/users",
    title: "Users",
    createLabel: "Add User",
    description: "Manage user departments and feature permissions.",
    fields: [
      { key: "empId", label: "Emp ID", required: true },
      { key: "name", label: "Name", required: true },
      { key: "username", label: "Username", required: true },
      { key: "password", label: "Password", type: "password" },
      { key: "departmentId", label: "Department", type: "department", required: true },
      { key: "status", label: "Status", type: "status" },
      { key: "role", label: "Global Role", type: "globalRole" },
      { key: "permissions", label: "Feature Permissions", type: "permissions" }
    ],
    filters: ["search", "status", "departmentId", "feature", "role"]
  }
};

const resourceKeys = Object.keys(resources);
const emptyPagination = { page: 1, pageSize: 10, total: 0 };

function getSavedFilters(resource) {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem(`adminFilters:${resource}`)) || {};
  } catch {
    return {};
  }
}

function saveFilters(resource, filters) {
  localStorage.setItem(`adminFilters:${resource}`, JSON.stringify(filters));
}

function displayLookup(items, id, fallback = "-") {
  const item = items.find((entry) => String(entry.id) === String(id));
  return item?.name || item?.machineNumber || fallback;
}

function defaultForm(resource) {
  const values = { status: "active" };

  if (resource === "users") {
    values.role = "user";
    values.permissions = Object.fromEntries(featureOptions.map((feature) => [feature.key, "none"]));
  }

  return values;
}

export default function AdminResourcePage({ resourceKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const config = resources[resourceKey];
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState({ departments: [], areas: [], "machine-types": [] });
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState(emptyPagination);
  const [form, setForm] = useState(defaultForm(resourceKey));
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.max(Math.ceil(pagination.total / pagination.pageSize), 1);
  const columns = useMemo(
    () => config.fields.filter((field) => field.type !== "permissions" && field.type !== "password"),
    [config]
  );

  useEffect(() => {
    if (!localStorage.getItem("adminSession")) {
      router.push("/admin/login");
    }

    setIsSidebarCollapsed(localStorage.getItem("adminSidebarCollapsed") === "true");
  }, [router]);

  useEffect(() => {
    setFilters({ page: 1, pageSize: 10, ...getSavedFilters(resourceKey) });
    setForm(defaultForm(resourceKey));
    setEditingId(null);
    setIsModalOpen(false);
    setMessage("");
  }, [resourceKey]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (Object.keys(filters).length) {
      loadItems();
      saveFilters(resourceKey, filters);
    }
  }, [resourceKey, filters]);

  useEffect(() => {
    const socket = getSocket();

    function handleAdminChange(event) {
      if (event.resource === resourceKey) loadItems();
      if (["departments", "areas", "machine-types"].includes(event.resource)) loadLookups();
    }

    socket.on("admin:data-changed", handleAdminChange);

    return () => {
      socket.off("admin:data-changed", handleAdminChange);
    };
  }, [resourceKey, filters]);

  async function loadLookups() {
    const keys = ["departments", "areas", "machine-types"];
    const nextLookups = {};

    await Promise.all(
      keys.map(async (key) => {
        try {
          const response = await api.get(`/admin/${key}`, { params: { pageSize: 100 } });
          nextLookups[key] = response.data.data;
        } catch {
          nextLookups[key] = [];
        }
      })
    );

    setLookups(nextLookups);
  }

  async function loadItems() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await api.get(`/admin/${resourceKey}`, { params: filters });
      setItems(response.data.data);
      setPagination(response.data.pagination);
    } catch {
      setItems([]);
      setPagination(emptyPagination);
      setMessage("Unable to load data from the API.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(defaultForm(resourceKey));
    setIsModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setForm({ ...defaultForm(resourceKey), ...item, password: "" });
    setIsModalOpen(true);
  }

  function closeModal() {
    setEditingId(null);
    setForm(defaultForm(resourceKey));
    setIsModalOpen(false);
  }

  async function saveItem(event) {
    event.preventDefault();
    setMessage("");

    try {
      const payload = { ...form };
      if (resourceKey === "users" && editingId && !payload.password) {
        delete payload.password;
      }

      if (editingId) {
        await api.put(`/admin/${resourceKey}/${editingId}`, payload);
        setMessage("Record updated.");
      } else {
        await api.post(`/admin/${resourceKey}`, payload);
        setMessage("Record created.");
      }

      closeModal();
      loadItems();
      loadLookups();
    } catch {
      setMessage("Save failed. Please check required fields.");
    }
  }

  async function deleteItem(id) {
    setMessage("");

    try {
      await api.delete(`/admin/${resourceKey}/${id}`);
      setMessage("Record deleted.");
      loadItems();
      loadLookups();
    } catch {
      setMessage("Delete failed.");
    }
  }

  return (
    <main className="admin-page">
      <style>{adminStyles}</style>
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        pathname={pathname}
        router={router}
        toggleCollapsed={() => {
          setIsSidebarCollapsed((current) => {
            localStorage.setItem("adminSidebarCollapsed", String(!current));
            return !current;
          });
        }}
      />

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <p>Master Data Management</p>
            <h1>{config.title}</h1>
            <span>{config.description}</span>
          </div>
          <button type="button" onClick={openCreateModal}>
            {config.createLabel}
          </button>
        </header>

        <section className="admin-panel">
          <div className="section-title">
            <h2>Filters</h2>
            <button
              type="button"
              onClick={() => setFilters({ page: 1, pageSize: pagination.pageSize })}
            >
              Reset filters
            </button>
          </div>
          <FilterFields
            config={config}
            filters={filters}
            lookups={lookups}
            updateFilter={updateFilter}
          />
        </section>

        <section className="admin-table-panel">
          <div className="table-header">
            <div>
              <h2>Records</h2>
              {message && <strong className="admin-message">{message}</strong>}
            </div>
            <span>
              Page {pagination.page} of {totalPages} ({pagination.total} total)
            </span>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  {columns.map((field) => (
                    <th key={field.key}>{field.label}</th>
                  ))}
                  {resourceKey === "users" && <th>Permissions</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    {columns.map((field) => (
                      <td key={field.key}>{formatValue(field, item, lookups)}</td>
                    ))}
                    {resourceKey === "users" && (
                      <td>
                        <div className="permission-list">
                          {featureOptions.map((feature) => (
                            <span key={feature.key}>
                              {feature.label}: {item.permissions?.[feature.key] || "none"}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="row-actions">
                        <button className="edit-button" type="button" onClick={() => openEditModal(item)}>
                          Edit
                        </button>
                        <button className="delete-button" type="button" onClick={() => deleteItem(item.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={columns.length + 3}>{isLoading ? "Loading..." : "No records"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            pagination={pagination}
            totalPages={totalPages}
            setFilters={setFilters}
          />
        </section>
      </section>

      {isModalOpen && (
        <ResourceModal
          config={config}
          form={form}
          editingId={editingId}
          lookups={lookups}
          onClose={closeModal}
          onSubmit={saveItem}
          updateForm={updateForm}
        />
      )}
    </main>
  );
}

function AdminSidebar({ isCollapsed, pathname, router, toggleCollapsed }) {
  return (
    <aside className={`admin-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-mark">AD</div>
        <div>
          <h2>Admin Console</h2>
          <span>Maintenance Project</span>
        </div>
      </div>
      <button className="sidebar-toggle" type="button" onClick={toggleCollapsed}>
        {isCollapsed ? ">" : "<"}
      </button>
      <nav>
        {resourceKeys.map((key) => (
          <Link
            key={key}
            className={pathname === resources[key].path ? "active" : ""}
            href={resources[key].path}
            title={resources[key].title}
          >
            <span>{resources[key].title}</span>
          </Link>
        ))}
      </nav>
      <button
        className="logout-button"
        type="button"
        onClick={() => {
          localStorage.removeItem("adminSession");
          router.push("/admin/login");
        }}
      >
        Logout
      </button>
    </aside>
  );
}

function FilterFields({ config, filters, lookups, updateFilter }) {
  return (
    <div className="filter-grid">
      {config.filters.includes("search") && (
        <label>
          Search
          <input
            value={filters.search || ""}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search code, name, emp id, username..."
          />
        </label>
      )}
      {config.filters.includes("status") && (
        <SelectField
          label="Status"
          value={filters.status || ""}
          onChange={(value) => updateFilter("status", value)}
          options={[
            { value: "", label: "All" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" }
          ]}
        />
      )}
      {config.filters.includes("departmentId") && (
        <SelectField
          label="Department"
          value={filters.departmentId || ""}
          onChange={(value) => updateFilter("departmentId", value)}
          options={[
            { value: "", label: "All departments" },
            ...lookups.departments.map((item) => ({ value: item.id, label: item.name }))
          ]}
        />
      )}
      {config.filters.includes("areaId") && (
        <SelectField
          label="Area"
          value={filters.areaId || ""}
          onChange={(value) => updateFilter("areaId", value)}
          options={[
            { value: "", label: "All areas" },
            ...lookups.areas.map((item) => ({ value: item.id, label: item.name }))
          ]}
        />
      )}
      {config.filters.includes("machineTypeId") && (
        <SelectField
          label="Machine Type"
          value={filters.machineTypeId || ""}
          onChange={(value) => updateFilter("machineTypeId", value)}
          options={[
            { value: "", label: "All machine types" },
            ...lookups["machine-types"].map((item) => ({ value: item.id, label: item.name }))
          ]}
        />
      )}
      {config.filters.includes("feature") && (
        <SelectField
          label="Feature"
          value={filters.feature || ""}
          onChange={(value) => updateFilter("feature", value)}
          options={[
            { value: "", label: "All features" },
            ...featureOptions.map((feature) => ({ value: feature.key, label: feature.label }))
          ]}
        />
      )}
      {config.filters.includes("role") && (
        <SelectField
          label="Feature Role"
          value={filters.role || ""}
          onChange={(value) => updateFilter("role", value)}
          options={[
            { value: "", label: "All roles" },
            { value: "user", label: "User" },
            { value: "admin", label: "Admin" },
            { value: "none", label: "None" }
          ]}
        />
      )}
    </div>
  );
}

function ResourceModal({ config, form, editingId, lookups, onClose, onSubmit, updateForm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="resource-modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <p>{editingId ? "Edit Record" : "Create Record"}</p>
            <h2>{config.title}</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          {config.fields.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={form[field.key]}
              lookups={lookups}
              editingId={editingId}
              onChange={(value) => updateForm(field.key, value)}
            />
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">{editingId ? "Update" : "Create"}</button>
        </div>
      </form>
    </div>
  );
}

function Pagination({ pagination, totalPages, setFilters }) {
  return (
    <div className="pagination">
      <div className="pagination-summary">
        Showing page <strong>{pagination.page}</strong> of <strong>{totalPages}</strong>
      </div>
      <div className="pagination-controls">
        <button
          className="pager-button"
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => setFilters((current) => ({ ...current, page: pagination.page - 1 }))}
        >
          Previous
        </button>
        <SelectField
          label="Rows"
          value={pagination.pageSize}
          onChange={(value) =>
            setFilters((current) => ({ ...current, page: 1, pageSize: Number(value) }))
          }
          options={[10, 20, 50].map((size) => ({ value: size, label: `${size} rows` }))}
        />
        <button
          className="pager-button"
          type="button"
          disabled={pagination.page >= totalPages}
          onClick={() => setFilters((current) => ({ ...current, page: pagination.page + 1 }))}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormField({ field, value, lookups, editingId, onChange }) {
  if (field.type === "permissions") {
    const permissions = value || {};

    return (
      <fieldset className="permissions-field">
        <legend>{field.label}</legend>
        {featureOptions.map((feature) => (
          <SelectField
            key={feature.key}
            label={feature.label}
            value={permissions[feature.key] || "none"}
            onChange={(role) => onChange({ ...permissions, [feature.key]: role })}
            options={[
              { value: "none", label: "None" },
              { value: "user", label: "User" },
              { value: "admin", label: "Admin" }
            ]}
          />
        ))}
      </fieldset>
    );
  }

  if (field.type === "status") {
    return (
      <SelectField
        label={field.label}
        value={value || "active"}
        onChange={onChange}
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" }
        ]}
      />
    );
  }

  if (field.type === "globalRole") {
    return (
      <SelectField
        label={field.label}
        value={value || "user"}
        onChange={onChange}
        options={[
          { value: "user", label: "User" },
          { value: "admin", label: "Admin" }
        ]}
      />
    );
  }

  if (field.type === "department") {
    return (
      <SelectField
        label={field.label}
        value={value || ""}
        onChange={onChange}
        options={[
          { value: "", label: "Select department" },
          ...lookups.departments.map((item) => ({ value: item.id, label: item.name }))
        ]}
      />
    );
  }

  if (field.type === "area") {
    return (
      <SelectField
        label={field.label}
        value={value || ""}
        onChange={onChange}
        options={[
          { value: "", label: "Select area" },
          ...lookups.areas.map((item) => ({ value: item.id, label: item.name }))
        ]}
      />
    );
  }

  if (field.type === "machineType") {
    return (
      <SelectField
        label={field.label}
        value={value || ""}
        onChange={onChange}
        options={[
          { value: "", label: "Select machine type" },
          ...lookups["machine-types"].map((item) => ({ value: item.id, label: item.name }))
        ]}
      />
    );
  }

  return (
    <label>
      {field.label}
      <input
        type={field.type === "password" ? "password" : "text"}
        required={field.required && !(field.type === "password" && editingId)}
        value={value || ""}
        placeholder={field.type === "password" && editingId ? "Leave blank to keep current password" : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function formatValue(field, item, lookups) {
  if (field.type === "department") return displayLookup(lookups.departments, item[field.key]);
  if (field.type === "area") return displayLookup(lookups.areas, item[field.key]);
  if (field.type === "machineType") return displayLookup(lookups["machine-types"], item[field.key]);
  if (field.type === "password") return "********";
  return item[field.key] || "-";
}

const adminStyles = `
@keyframes conveyorMove {
  from { background-position: 0 0; }
  to { background-position: 44px 0; }
}
@keyframes statusPulse {
  0%, 100% { transform: scale(1); opacity: .68; }
  50% { transform: scale(1.18); opacity: 1; }
}
@keyframes panelEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.admin-page {
  min-height: 100vh;
  display: flex;
  background:
    linear-gradient(90deg, rgb(15 23 42 / .035) 1px, transparent 1px),
    linear-gradient(180deg, rgb(15 23 42 / .03) 1px, transparent 1px),
    #eef3f8;
  background-size: 28px 28px;
  color: #111827;
}
.admin-sidebar {
  position: sticky;
  top: 0;
  flex: 0 0 264px;
  height: 100vh;
  border-right: 1px solid #cbd5e1;
  background:
    linear-gradient(180deg, #0f172a, #172033 62%, #111827),
    #111827;
  padding: 20px;
  color: white;
  transition: flex-basis .18s ease, padding .18s ease;
}
.admin-sidebar.collapsed {
  flex-basis: 82px;
  padding: 16px 12px;
}
.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 26px;
}
.brand-mark {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: linear-gradient(135deg, #2563eb, #14b8a6);
  box-shadow: 0 10px 22px rgb(20 184 166 / .22);
  font-weight: 800;
}
.brand h2 {
  margin: 0;
  font-size: 18px;
}
.brand span {
  color: #94a3b8;
  font-size: 12px;
}
.admin-sidebar.collapsed .brand {
  justify-content: center;
}
.admin-sidebar.collapsed .brand h2,
.admin-sidebar.collapsed .brand span,
.admin-sidebar.collapsed nav a span,
.admin-sidebar.collapsed .logout-button {
  display: none;
}
.sidebar-toggle {
  width: 100%;
  margin-bottom: 16px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #1e293b;
  padding: 9px;
  color: #e2e8f0;
  font-weight: 800;
  transition: transform .16s ease, border-color .16s ease, background .16s ease;
}
.sidebar-toggle:hover {
  border-color: #64748b;
  background: #253348;
}
.admin-sidebar nav {
  display: grid;
  gap: 6px;
}
.admin-sidebar a,
.logout-button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 11px 12px;
  color: #cbd5e1;
  text-align: left;
  text-decoration: none;
  font-weight: 700;
  transition: background .16s ease, color .16s ease, transform .16s ease;
}
.admin-sidebar a:hover {
  transform: translateX(2px);
}
.admin-sidebar.collapsed a {
  text-align: center;
}
.admin-sidebar.collapsed a::before {
  content: attr(title);
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 11px;
}
.admin-sidebar.collapsed a[title="Departments"]::before { content: "DEP"; }
.admin-sidebar.collapsed a[title="Areas"]::before { content: "ARE"; }
.admin-sidebar.collapsed a[title="Machine Types"]::before { content: "TYP"; }
.admin-sidebar.collapsed a[title="Machine Numbers"]::before { content: "MC"; }
.admin-sidebar.collapsed a[title="Users"]::before { content: "USR"; }
.admin-sidebar a.active,
.admin-sidebar a:hover {
  background: #1e293b;
  color: white;
}
.logout-button {
  width: 100%;
  margin-top: 28px;
  color: #fecaca;
}
.admin-content {
  min-width: 0;
  flex: 1;
  padding: 24px;
}
.admin-header,
.admin-panel,
.admin-table-panel {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
}
.admin-header {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;
  box-shadow: 0 12px 36px rgb(15 23 42 / .08);
  animation: panelEnter .22s ease both;
}
.admin-header::before {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 5px;
  background:
    repeating-linear-gradient(90deg, #14b8a6 0 18px, #f59e0b 18px 24px, #1d4ed8 24px 42px);
  background-size: 44px 5px;
  animation: conveyorMove 1.8s linear infinite;
}
.admin-header::after {
  content: "";
  position: absolute;
  top: 22px;
  right: 180px;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 7px rgb(34 197 94 / .12);
  animation: statusPulse 1.7s ease-in-out infinite;
}
.admin-header p,
.admin-header span {
  margin: 0;
  color: #64748b;
}
.admin-header h1 {
  margin: 4px 0;
  font-size: 32px;
}
button {
  cursor: pointer;
}
.admin-header button,
.modal-actions button:last-child,
.pager-button,
.edit-button {
  border: 0;
  border-radius: 6px;
  background: #2563eb;
  padding: 10px 14px;
  color: white;
  font-weight: 700;
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}
.admin-header button:hover,
.modal-actions button:last-child:hover,
.pager-button:hover:not(:disabled),
.edit-button:hover {
  background: #1d4ed8;
  box-shadow: 0 8px 18px rgb(37 99 235 / .2);
  transform: translateY(-1px);
}
.admin-panel,
.admin-table-panel {
  margin-top: 18px;
  padding: 18px;
  box-shadow: 0 10px 28px rgb(15 23 42 / .055);
  animation: panelEnter .24s ease both;
}
.section-title,
.table-header,
.modal-header,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.section-title h2,
.table-header h2,
.modal-header h2 {
  margin: 0;
  font-size: 20px;
}
.section-title button,
.modal-header button,
.modal-actions button:first-child,
.delete-button {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  padding: 9px 12px;
  color: #334155;
  font-weight: 700;
  transition: border-color .16s ease, background .16s ease, color .16s ease;
}
.delete-button:hover {
  border-color: #fecaca;
  background: #fff1f2;
  color: #be123c;
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 14px;
  margin-top: 16px;
}
label {
  display: block;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}
input,
select {
  width: 100%;
  margin-top: 7px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  padding: 10px 11px;
  color: #0f172a;
}
input:focus,
select:focus {
  border-color: #2563eb;
  outline: 2px solid rgb(37 99 235 / .16);
}
.admin-message {
  display: block;
  margin-top: 4px;
  color: #0f766e;
}
.admin-table-wrap {
  margin-top: 16px;
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
}
th,
td {
  border-bottom: 1px solid #e2e8f0;
  padding: 12px;
  text-align: left;
  vertical-align: top;
}
th {
  color: #64748b;
  font-size: 12px;
  letter-spacing: .04em;
  text-transform: uppercase;
}
th:last-child,
td:last-child {
  width: 170px;
  text-align: right;
}
th:nth-child(2),
td:nth-child(2),
th:nth-child(4),
td:nth-child(4),
th:nth-child(6),
td:nth-child(6),
th:nth-child(7),
td:nth-child(7) {
  white-space: nowrap;
}
tbody tr {
  transition: background .14s ease;
}
tbody tr:hover {
  background: #f8fafc;
}
.row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
  min-width: 152px;
  white-space: nowrap;
}
.edit-button,
.delete-button {
  min-width: 68px;
  padding: 8px 12px;
}
.permission-list {
  display: grid;
  gap: 4px;
  color: #334155;
  font-size: 12px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}
.pagination-summary {
  color: #475569;
  font-size: 14px;
}
.pagination-controls {
  display: inline-flex;
  align-items: flex-end;
  gap: 10px;
}
.pagination-controls label {
  width: 150px;
}
.pager-button {
  min-width: 96px;
  height: 42px;
}
button:disabled {
  cursor: not-allowed;
  opacity: .45;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgb(15 23 42 / .54);
  padding: 24px;
}
.resource-modal {
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border-radius: 8px;
  background: white;
  box-shadow: 0 24px 80px rgb(15 23 42 / .28);
}
.modal-header,
.modal-actions {
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}
.modal-actions {
  border-top: 1px solid #e2e8f0;
  border-bottom: 0;
  justify-content: flex-end;
}
.modal-header p {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}
.modal-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 20px;
}
.permissions-field {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 14px;
}
.permissions-field legend {
  padding: 0 8px;
  font-weight: 800;
}
@media (max-width: 1100px) {
  .admin-page {
    display: block;
  }
  .admin-sidebar {
    position: static;
    height: auto;
    width: auto;
  }
  .admin-sidebar.collapsed {
    padding: 16px 12px;
  }
  .filter-grid {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}
@media (max-width: 680px) {
  .admin-content {
    padding: 14px;
  }
  .admin-header,
  .section-title,
  .table-header,
  .pagination {
    align-items: stretch;
    flex-direction: column;
  }
  .pagination-controls {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr;
  }
  .pagination-controls label {
    width: auto;
  }
  .row-actions {
    justify-content: flex-start;
  }
  .filter-grid,
  .modal-body,
  .permissions-field {
    grid-template-columns: 1fr;
  }
}
`;
