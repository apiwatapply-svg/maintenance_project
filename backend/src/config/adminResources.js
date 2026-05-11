const featureKeys = [
  "preventiveMaintenance",
  "toolingStore",
  "jobRequest",
  "adminMode"
];

const adminResources = {
  departments: {
    table: "dbo.tbm_department",
    defaultSort: "name",
    fields: ["code", "name", "status"],
    filters: ["search", "status"],
    searchColumns: ["code", "name"]
  },
  areas: {
    table: "dbo.tbm_area",
    defaultSort: "name",
    fields: ["departmentId", "code", "name", "status"],
    filters: ["search", "status", "departmentId"],
    searchColumns: ["code", "name"]
  },
  "machine-types": {
    table: "dbo.tbm_machine_type",
    defaultSort: "name",
    fields: ["areaId", "code", "name", "status"],
    filters: ["search", "status", "areaId"],
    searchColumns: ["code", "name"]
  },
  "machine-numbers": {
    table: "dbo.tbm_machine_number",
    defaultSort: "machineNumber",
    fields: ["machineTypeId", "machineNumber", "name", "status"],
    filters: ["search", "status", "machineTypeId"],
    searchColumns: ["machineNumber", "name"]
  },
  users: {
    table: "dbo.tbm_user",
    defaultSort: "empId",
    fields: ["empId", "name", "position", "username", "password", "departmentId", "status", "role", "permissions"],
    filters: ["search", "status", "departmentId", "position", "feature", "role"],
    searchColumns: ["empId", "name", "position", "username"]
  }
};

function getResourceConfig(resource) {
  const config = adminResources[resource];

  if (!config) {
    const error = new Error("Admin resource not found");
    error.statusCode = 404;
    throw error;
  }

  return config;
}

module.exports = {
  adminResources,
  featureKeys,
  getResourceConfig
};
