"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
    title: "Departments",
    description: "จัดการแผนกทั้งหมดในโรงงาน",
    fields: [
      { key: "code", label: "Code" },
      { key: "name", label: "Department Name", required: true },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: ["search", "status"]
  },
  areas: {
    title: "Areas",
    description: "จัดการ Area แยกตามแผนก",
    fields: [
      { key: "departmentId", label: "Department", type: "department", required: true },
      { key: "code", label: "Code" },
      { key: "name", label: "Area Name", required: true },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: ["search", "status", "departmentId"]
  },
  "machine-types": {
    title: "Machine Types",
    description: "จัดการประเภทเครื่องจักรของแต่ละ Area",
    fields: [
      { key: "areaId", label: "Area", type: "area", required: true },
      { key: "code", label: "Code" },
      { key: "name", label: "Machine Type", required: true },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: ["search", "status", "areaId"]
  },
  "machine-numbers": {
    title: "Machine Numbers",
    description: "จัดการหมายเลขเครื่องจักรของแต่ละ Machine Type",
    fields: [
      { key: "machineTypeId", label: "Machine Type", type: "machineType", required: true },
      { key: "machineNumber", label: "Machine Number", required: true },
      { key: "name", label: "Machine Name" },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: ["search", "status", "machineTypeId"]
  },
  users: {
    title: "Users",
    description: "จัดการผู้ใช้ แผนก และสิทธิ์ของแต่ละ feature",
    fields: [
      { key: "username", label: "Username", required: true },
      { key: "password", label: "Password", type: "password" },
      { key: "fullName", label: "Full Name" },
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
  if (typeof window === "undefined") {
    return {};
  }

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
    values.permissions = Object.fromEntries(featureOptions.map((feature) => [feature.key, "none"]));
  }

  return values;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeResource, setActiveResource] = useState("departments");
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState({ departments: [], areas: [], "machine-types": [] });
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState(emptyPagination);
  const [form, setForm] = useState(defaultForm("departments"));
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const config = resources[activeResource];
  const totalPages = Math.max(Math.ceil(pagination.total / pagination.pageSize), 1);

  useEffect(() => {
    const session = localStorage.getItem("adminSession");

    if (!session) {
      router.push("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    setFilters({ page: 1, pageSize: 10, ...getSavedFilters(activeResource) });
    setForm(defaultForm(activeResource));
    setEditingId(null);
    setMessage("");
  }, [activeResource]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    function handleAdminChange(event) {
      if (event.resource === activeResource) {
        loadItems();
      }

      if (["departments", "areas", "machine-types"].includes(event.resource)) {
        loadLookups();
      }
    }

    socket.on("admin:data-changed", handleAdminChange);

    return () => {
      socket.off("admin:data-changed", handleAdminChange);
    };
  }, [activeResource, filters]);

  useEffect(() => {
    if (Object.keys(filters).length) {
      loadItems();
      saveFilters(activeResource, filters);
    }
  }, [activeResource, filters]);

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
      const response = await api.get(`/admin/${activeResource}`, { params: filters });
      setItems(response.data.data);
      setPagination(response.data.pagination);
    } catch {
      setItems([]);
      setPagination(emptyPagination);
      setMessage("ยังไม่สามารถโหลดข้อมูลจาก API ได้");
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

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ ...defaultForm(activeResource), ...item });
  }

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm(activeResource));
  }

  async function saveItem(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (editingId) {
        await api.put(`/admin/${activeResource}/${editingId}`, form);
        setMessage("อัปเดตข้อมูลแล้ว");
      } else {
        await api.post(`/admin/${activeResource}`, form);
        setMessage("เพิ่มข้อมูลแล้ว");
      }

      resetForm();
      loadItems();
      loadLookups();
    } catch {
      setMessage("บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
    }
  }

  async function deleteItem(id) {
    setMessage("");

    try {
      await api.delete(`/admin/${activeResource}/${id}`);
      setMessage("ลบข้อมูลแล้ว");
      loadItems();
      loadLookups();
    } catch {
      setMessage("ลบข้อมูลไม่สำเร็จ");
    }
  }

  const columns = useMemo(() => config.fields.filter((field) => field.type !== "permissions"), [config]);

  return (
    <main className="admin-page">
      <style>{adminStyles}</style>
      <aside className="admin-sidebar">
        <div className="admin-logo">AD</div>
        <h1>Admin mode</h1>
        <p>Factory master data and feature access control</p>
        <nav>
          {resourceKeys.map((key) => (
            <button
              key={key}
              className={activeResource === key ? "active" : ""}
              onClick={() => setActiveResource(key)}
              type="button"
            >
              {resources[key].title}
            </button>
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

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <p>Management</p>
            <h2>{config.title}</h2>
            <span>{config.description}</span>
          </div>
          <button type="button" onClick={resetForm}>
            New record
          </button>
        </header>

        <section className="admin-panel">
          <h3>Filters</h3>
          <div className="filter-grid">
            {config.filters.includes("search") && (
              <label>
                Search
                <input
                  value={filters.search || ""}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Search..."
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
                options={[{ value: "", label: "All features" }, ...featureOptions.map((feature) => ({ value: feature.key, label: feature.label }))]}
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
        </section>

        <section className="admin-layout">
          <form className="admin-form" onSubmit={saveItem}>
            <h3>{editingId ? "Edit record" : "Create record"}</h3>
            {config.fields.map((field) => (
              <FormField
                key={field.key}
                field={field}
                value={form[field.key]}
                lookups={lookups}
                onChange={(value) => updateForm(field.key, value)}
              />
            ))}
            {message && <strong className="admin-message">{message}</strong>}
            <div className="form-actions">
              <button type="submit">{editingId ? "Update" : "Create"}</button>
              <button type="button" onClick={resetForm}>
                Clear
              </button>
            </div>
          </form>

          <section className="admin-table-panel">
            <div className="table-header">
              <h3>Records</h3>
              <span>
                Page {pagination.page} / {totalPages}
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
                    {activeResource === "users" && <th>Permissions</th>}
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
                      {activeResource === "users" && (
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
                          <button type="button" onClick={() => startEdit(item)}>
                            Edit
                          </button>
                          <button type="button" onClick={() => deleteItem(item.id)}>
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
            <div className="pagination">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((current) => ({ ...current, page: pagination.page - 1 }))}
              >
                Previous
              </button>
              <SelectField
                label="Page size"
                value={pagination.pageSize}
                onChange={(value) =>
                  setFilters((current) => ({ ...current, page: 1, pageSize: Number(value) }))
                }
                options={[10, 20, 50].map((size) => ({ value: size, label: `${size} rows` }))}
              />
              <button
                type="button"
                disabled={pagination.page >= totalPages}
                onClick={() => setFilters((current) => ({ ...current, page: pagination.page + 1 }))}
              >
                Next
              </button>
            </div>
          </section>
        </section>
      </section>
    </main>
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

function FormField({ field, value, lookups, onChange }) {
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
        required={field.required}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function formatValue(field, item, lookups) {
  if (field.type === "department") {
    return displayLookup(lookups.departments, item[field.key]);
  }

  if (field.type === "area") {
    return displayLookup(lookups.areas, item[field.key]);
  }

  if (field.type === "machineType") {
    return displayLookup(lookups["machine-types"], item[field.key]);
  }

  return item[field.key] || "-";
}

const adminStyles = `
.admin-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  background: #eef6fb;
  color: #0f172a;
}
.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  border-right: 4px solid #0f172a;
  background: #111827;
  padding: 24px;
  color: white;
}
.admin-logo {
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
  border-radius: 8px;
  background: #6d28d9;
  font-weight: 950;
  box-shadow: 5px 6px 0 rgb(255 255 255 / .18);
}
.admin-sidebar h1 {
  margin: 24px 0 8px;
  font-size: 30px;
  font-weight: 950;
}
.admin-sidebar p {
  margin: 0 0 22px;
  color: #cbd5e1;
  line-height: 1.5;
}
.admin-sidebar nav {
  display: grid;
  gap: 10px;
}
.admin-sidebar button,
.logout-button {
  border: 3px solid #e2e8f0;
  border-radius: 8px;
  background: transparent;
  padding: 12px;
  color: white;
  text-align: left;
  font-weight: 900;
}
.admin-sidebar button.active {
  background: #5eead4;
  color: #0f172a;
}
.logout-button {
  width: 100%;
  margin-top: 28px;
  background: #be123c;
  text-align: center;
}
.admin-content {
  min-width: 0;
  padding: 28px;
}
.admin-header,
.admin-panel,
.admin-form,
.admin-table-panel {
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: white;
  box-shadow: 8px 9px 0 rgb(15 23 42 / .12);
}
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
}
.admin-header p,
.admin-header span {
  margin: 0;
  color: #64748b;
  font-weight: 800;
}
.admin-header h2 {
  margin: 4px 0;
  font-size: 38px;
  font-weight: 950;
}
.admin-header button,
.form-actions button,
.pagination button,
.row-actions button {
  border: 3px solid #0f172a;
  border-radius: 8px;
  background: #0f172a;
  padding: 10px 14px;
  color: white;
  font-weight: 900;
}
.admin-panel {
  margin-top: 22px;
  padding: 20px;
}
.admin-panel h3,
.admin-form h3,
.admin-table-panel h3 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 950;
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 14px;
}
.admin-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 22px;
  margin-top: 22px;
}
.admin-form,
.admin-table-panel {
  padding: 20px;
}
label {
  display: block;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}
input,
select {
  width: 100%;
  margin-top: 7px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px 11px;
  color: #0f172a;
  font-weight: 800;
}
.admin-form {
  display: grid;
  align-content: start;
  gap: 14px;
}
.permissions-field {
  display: grid;
  gap: 10px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  padding: 12px;
}
.permissions-field legend {
  padding: 0 8px;
  font-weight: 950;
}
.form-actions,
.pagination,
.row-actions,
.table-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.form-actions button:nth-child(2),
.pagination button,
.row-actions button:nth-child(2) {
  background: white;
  color: #0f172a;
}
.admin-message {
  color: #0f766e;
}
.table-header {
  justify-content: space-between;
}
.admin-table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}
th,
td {
  border-bottom: 2px solid #e2e8f0;
  padding: 12px;
  text-align: left;
  vertical-align: top;
}
th {
  color: #475569;
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.permission-list {
  display: grid;
  gap: 4px;
  font-size: 12px;
  font-weight: 800;
}
.pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
.pagination label {
  max-width: 150px;
}
button:disabled {
  opacity: .45;
}
@media (max-width: 1100px) {
  .admin-page,
  .admin-layout {
    grid-template-columns: 1fr;
  }
  .admin-sidebar {
    position: static;
    height: auto;
  }
  .filter-grid {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}
@media (max-width: 640px) {
  .admin-content {
    padding: 16px;
  }
  .admin-header,
  .filter-grid,
  .pagination {
    display: grid;
    grid-template-columns: 1fr;
  }
}
`;
