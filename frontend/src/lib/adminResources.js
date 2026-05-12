export const adminResourceGroups = [
  {
    label: "Access",
    items: [{ key: "users", label: "User", href: "/admin/users", icon: "US" }]
  },
  {
    label: "Master Data",
    items: [
      { key: "departments", label: "Departments", href: "/admin/departments", icon: "DP" },
      { key: "areas", label: "Area", href: "/admin/areas", icon: "AR" },
      { key: "machine-types", label: "Machine Type", href: "/admin/machine-types", icon: "MT" },
      { key: "machine-nos", label: "Machine No", href: "/admin/machine-nos", icon: "MN" }
    ]
  },
  {
    label: "Employee Data",
    items: [{ key: "employees", label: "Employee Data", href: "/admin/employees", icon: "EM" }]
  }
];

export const adminResources = {
  users: {
    title: "User",
    endpoint: "users",
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "emp_name", label: "Name" },
      { key: "department_name", label: "Department" },
      { key: "username", label: "Username" },
      { key: "role", label: "Role" },
      { key: "admin_scope", label: "Scope" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "emp_id", label: "Emp ID", required: true },
      { key: "emp_name", label: "Name", required: true },
      { key: "department_code", label: "Department", required: true, type: "lookup", lookup: "departments", fill: { department_name: "department_name" } },
      { key: "department_name", label: "Department Name", required: true, type: "readonly" },
      { key: "username", label: "Username", required: true },
      { key: "password", label: "Password", required: true, type: "password" },
      { key: "role", label: "Role", type: "select", options: ["super_admin", "admin", "user"] },
      { key: "admin_scope", label: "Admin Scope", type: "select", options: ["all", "maintenance", "qc", "production", "tooling_store", "none"] },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: [
      { key: "search", label: "Search", type: "text", placeholder: "Emp, name, username..." },
      { key: "department_code", label: "Department", type: "lookup", lookup: "departments" },
      { key: "role", label: "Role", type: "select", options: ["", "super_admin", "admin", "user"] },
      { key: "status", label: "Status", type: "statusFilter" }
    ]
  },
  departments: {
    title: "Departments",
    endpoint: "departments",
    columns: [
      { key: "department_code", label: "Code" },
      { key: "department_name", label: "Department" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "department_code", label: "Code", required: true },
      { key: "department_name", label: "Department", required: true },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: [
      { key: "search", label: "Search", type: "text", placeholder: "Code or department..." },
      { key: "status", label: "Status", type: "statusFilter" }
    ]
  },
  areas: {
    title: "Area",
    endpoint: "areas",
    columns: [
      { key: "area_code", label: "Code" },
      { key: "area_name", label: "Area" },
      { key: "department_code", label: "Department" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "area_code", label: "Code", required: true },
      { key: "area_name", label: "Area", required: true },
      { key: "department_code", label: "Department", required: true, type: "lookup", lookup: "departments" },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: [
      { key: "search", label: "Search", type: "text", placeholder: "Code or area..." },
      { key: "department_code", label: "Department", type: "lookup", lookup: "departments" },
      { key: "status", label: "Status", type: "statusFilter" }
    ]
  },
  "machine-types": {
    title: "Machine Type",
    endpoint: "machine-types",
    columns: [
      { key: "machine_type_code", label: "Code" },
      { key: "machine_type_name", label: "Machine Type" },
      { key: "area_code", label: "Area" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "machine_type_code", label: "Code", required: true },
      { key: "machine_type_name", label: "Machine Type", required: true },
      { key: "area_code", label: "Area", required: true, type: "lookup", lookup: "areas" },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: [
      { key: "search", label: "Search", type: "text", placeholder: "Code or type..." },
      { key: "area_code", label: "Area", type: "lookup", lookup: "areas" },
      { key: "status", label: "Status", type: "statusFilter" }
    ]
  },
  "machine-nos": {
    title: "Machine No",
    endpoint: "machine-nos",
    columns: [
      { key: "machine_no", label: "Machine No" },
      { key: "machine_name", label: "Machine Name" },
      { key: "machine_type_code", label: "Machine Type" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "machine_no", label: "Machine No", required: true },
      { key: "machine_name", label: "Machine Name" },
      { key: "machine_type_code", label: "Machine Type", required: true, type: "lookup", lookup: "machine-types" },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: [
      { key: "search", label: "Search", type: "text", placeholder: "Machine no or name..." },
      { key: "machine_type_code", label: "Machine Type", type: "lookup", lookup: "machine-types" },
      { key: "status", label: "Status", type: "statusFilter" }
    ]
  },
  employees: {
    title: "Employee Data",
    endpoint: "employees",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "emp_id", label: "Emp ID" },
      { key: "emp_name", label: "Name" },
      { key: "department_name", label: "Department" },
      { key: "section", label: "Section" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "emp_id", label: "Emp ID", required: true },
      { key: "emp_name", label: "Name", required: true },
      { key: "department_code", label: "Department", required: true, type: "lookup", lookup: "departments", fill: { department_name: "department_name" } },
      { key: "department_name", label: "Department Name", required: true, type: "readonly" },
      { key: "section", label: "Section", required: true },
      { key: "image_file", label: "Employee Photo", type: "image" },
      { key: "status", label: "Status", type: "status" }
    ],
    filters: [
      { key: "search", label: "Search", type: "text", placeholder: "ID, name, department..." },
      { key: "department_code", label: "Department", type: "lookup", lookup: "departments" },
      { key: "section", label: "Section", type: "text", placeholder: "Repair" },
      { key: "status", label: "Status", type: "statusFilter" }
    ]
  }
};

export function getAdminResource(key) {
  return adminResources[key] || null;
}

export function getAdminResourceByPath(pathname) {
  return Object.entries(adminResources).find(([key]) => pathname === `/admin/${key}`)?.[0] || "users";
}

export function getAdminFilterStorageKey(resourceKey) {
  return `adminFilters:${resourceKey}`;
}

export function buildAdminQuery(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

export function getPageNumbers(page, total, pageSize) {
  const totalPages = Math.max(Math.ceil(Number(total || 0) / Number(pageSize || 10)), 1);
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}
