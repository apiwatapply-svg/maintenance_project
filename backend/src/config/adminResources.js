const adminResources = {
  users: {
    table: "tbm_user",
    idColumn: "id",
    searchable: ["emp_id", "emp_name", "username", "department_code", "department_name"],
    filters: ["status", "department_code", "role", "admin_scope"],
    columns: [
      "emp_id",
      "emp_name",
      "department_code",
      "department_name",
      "username",
      "password",
      "role",
      "admin_scope",
      "status"
    ],
    defaults: {
      role: "user",
      admin_scope: "none",
      status: "active"
    },
    sort: "id"
  },
  departments: {
    table: "tbm_department",
    idColumn: "id",
    searchable: ["department_code", "department_name"],
    filters: ["status"],
    columns: ["department_code", "department_name", "status"],
    defaults: { status: "active" },
    sort: "id"
  },
  areas: {
    table: "tbm_area",
    idColumn: "id",
    searchable: ["area_code", "area_name", "department_code"],
    filters: ["status", "department_code"],
    columns: ["area_code", "area_name", "department_code", "status"],
    defaults: { status: "active" },
    sort: "id"
  },
  "machine-types": {
    table: "tbm_machine_type",
    idColumn: "id",
    searchable: ["machine_type_code", "machine_type_name", "area_code"],
    filters: ["status", "area_code"],
    columns: ["machine_type_code", "machine_type_name", "area_code", "status"],
    defaults: { status: "active" },
    sort: "id"
  },
  "machine-nos": {
    table: "tbm_machine_no",
    idColumn: "id",
    searchable: ["machine_no", "machine_name", "machine_type_code"],
    filters: ["status", "machine_type_code"],
    columns: ["machine_no", "machine_name", "machine_type_code", "status"],
    defaults: { status: "active" },
    sort: "id"
  },
  employees: {
    table: "tbm_employee",
    idColumn: "id",
    searchable: ["emp_id", "emp_name", "department_code", "department_name", "section"],
    filters: ["status", "department_code", "section"],
    columns: ["emp_id", "emp_name", "department_code", "department_name", "section", "image_path", "status"],
    defaults: { status: "active" },
    sort: "id"
  }
};

function getAdminResource(key) {
  return adminResources[key] || null;
}

function normalizePagination(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize || 10), 1), 100);
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

module.exports = {
  adminResources,
  getAdminResource,
  normalizePagination
};
