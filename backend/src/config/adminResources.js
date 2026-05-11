const featureKeys = [
  "preventiveMaintenance",
  "toolingStore",
  "jobRequest",
  "adminMode"
];

const adminResources = {
  departments: {
    table: "Departments",
    defaultSort: "name",
    fields: ["code", "name", "status"],
    filters: ["search", "status"],
    searchColumns: ["code", "name"]
  },
  areas: {
    table: "Areas",
    defaultSort: "name",
    fields: ["departmentId", "code", "name", "status"],
    filters: ["search", "status", "departmentId"],
    searchColumns: ["code", "name"]
  },
  "machine-types": {
    table: "MachineTypes",
    defaultSort: "name",
    fields: ["areaId", "code", "name", "status"],
    filters: ["search", "status", "areaId"],
    searchColumns: ["code", "name"]
  },
  "machine-numbers": {
    table: "MachineNumbers",
    defaultSort: "machineNumber",
    fields: ["machineTypeId", "machineNumber", "name", "status"],
    filters: ["search", "status", "machineTypeId"],
    searchColumns: ["machineNumber", "name"]
  },
  users: {
    table: "Users",
    defaultSort: "username",
    fields: ["username", "fullName", "departmentId", "status", "permissions"],
    filters: ["search", "status", "departmentId", "feature", "role"],
    searchColumns: ["username", "fullName"]
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
