const adminRepository = require("../repositories/adminRepository");
const { getResourceConfig, featureKeys } = require("../config/adminResources");
const { emitAdminChange } = require("./socketService");

function parsePermissions(value) {
  if (!value || typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapRecord(record) {
  if (!record) {
    return record;
  }

  return {
    ...record,
    permissions: parsePermissions(record.permissions)
  };
}

function assertPayload(resource, payload) {
  const config = getResourceConfig(resource);
  const missing = [];

  if (resource === "departments" && !payload.name) missing.push("name");
  if (resource === "areas" && !payload.departmentId) missing.push("departmentId");
  if (resource === "areas" && !payload.name) missing.push("name");
  if (resource === "machine-types" && !payload.areaId) missing.push("areaId");
  if (resource === "machine-types" && !payload.name) missing.push("name");
  if (resource === "machine-numbers" && !payload.machineTypeId) missing.push("machineTypeId");
  if (resource === "machine-numbers" && !payload.machineNumber) missing.push("machineNumber");
  if (resource === "users" && !payload.empId) missing.push("empId");
  if (resource === "users" && !payload.name) missing.push("name");
  if (resource === "users" && !payload.position) missing.push("position");
  if (resource === "users" && !payload.username) missing.push("username");
  if (resource === "users" && !payload.departmentId) missing.push("departmentId");

  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const sanitized = {};
  config.fields.forEach((field) => {
    if (payload[field] !== undefined) {
      sanitized[field] = payload[field];
    }
  });

  if (resource === "users" && sanitized.permissions) {
    const invalidFeature = Object.keys(sanitized.permissions).find(
      (feature) => !featureKeys.includes(feature)
    );
    const invalidRole = Object.values(sanitized.permissions).find(
      (role) => !["user", "admin", "none"].includes(role)
    );

    if (invalidFeature || invalidRole) {
      const error = new Error("Invalid user feature permissions");
      error.statusCode = 400;
      throw error;
    }
  }

  if (!sanitized.status) {
    sanitized.status = "active";
  }

  return sanitized;
}

async function login(credentials) {
  const user = await adminRepository.findUserByUsername(credentials.username);

  if (user && user.password === credentials.password) {
    return {
      token: "admin-local-token",
      user: {
        id: user.id,
        empId: user.empId,
        name: user.name,
        position: user.position,
        username: user.username,
        departmentId: user.departmentId,
        role: user.role || "user",
        permissions: parsePermissions(user.permissions)
      }
    };
  }

  const error = new Error("Invalid username or password");
  error.statusCode = 401;
  throw error;
}

async function list(resource, filters) {
  getResourceConfig(resource);
  const result = await adminRepository.list(resource, filters);

  return {
    ...result,
    data: result.data.map(mapRecord)
  };
}

async function getById(resource, id) {
  getResourceConfig(resource);
  const record = await adminRepository.getById(resource, id);

  if (!record) {
    const error = new Error("Record not found");
    error.statusCode = 404;
    throw error;
  }

  return mapRecord(record);
}

async function create(resource, payload) {
  const sanitized = assertPayload(resource, payload);
  const record = mapRecord(await adminRepository.create(resource, sanitized));
  emitAdminChange({ action: "create", resource, id: record.id });
  return record;
}

async function update(resource, id, payload) {
  const config = getResourceConfig(resource);
  const sanitized = {};

  config.fields.forEach((field) => {
    if (payload[field] !== undefined) {
      sanitized[field] = payload[field];
    }
  });

  if (resource === "users" && sanitized.permissions) {
    const invalidFeature = Object.keys(sanitized.permissions).find(
      (feature) => !featureKeys.includes(feature)
    );
    const invalidRole = Object.values(sanitized.permissions).find(
      (role) => !["user", "admin", "none"].includes(role)
    );

    if (invalidFeature || invalidRole) {
      const error = new Error("Invalid user feature permissions");
      error.statusCode = 400;
      throw error;
    }
  }

  const record = await adminRepository.update(resource, id, sanitized);

  if (!record) {
    const error = new Error("Record not found");
    error.statusCode = 404;
    throw error;
  }

  const mapped = mapRecord(record);
  emitAdminChange({ action: "update", resource, id: mapped.id });
  return mapped;
}

async function remove(resource, id) {
  getResourceConfig(resource);
  const record = await adminRepository.remove(resource, id);

  if (!record) {
    const error = new Error("Record not found");
    error.statusCode = 404;
    throw error;
  }

  const mapped = mapRecord(record);
  emitAdminChange({ action: "delete", resource, id: mapped.id });
  return mapped;
}

module.exports = {
  login,
  list,
  getById,
  create,
  update,
  remove
};
