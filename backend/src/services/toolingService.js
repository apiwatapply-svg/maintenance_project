const toolingRepository = require("../repositories/toolingRepository");
const { getToolingResourceConfig } = require("../config/toolingResources");

function assertPayload(resource, payload) {
  const config = getToolingResourceConfig(resource);
  const missing = config.requiredFields.filter((field) => !payload[field]);

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

  if (config.fields.includes("status") && !sanitized.status) {
    sanitized.status = "active";
  }

  return sanitized;
}

async function dashboard() {
  return toolingRepository.dashboard();
}

async function list(resource, filters) {
  getToolingResourceConfig(resource);
  return toolingRepository.list(resource, filters);
}

async function getById(resource, id) {
  getToolingResourceConfig(resource);
  const record = await toolingRepository.getById(resource, id);

  if (!record) {
    const error = new Error("Record not found");
    error.statusCode = 404;
    throw error;
  }

  return record;
}

async function create(resource, payload) {
  const sanitized = assertPayload(resource, payload);
  return toolingRepository.create(resource, sanitized);
}

async function update(resource, id, payload) {
  getToolingResourceConfig(resource);
  const record = await toolingRepository.update(resource, id, payload);

  if (!record) {
    const error = new Error("Record not found");
    error.statusCode = 404;
    throw error;
  }

  return record;
}

async function remove(resource, id) {
  getToolingResourceConfig(resource);
  const record = await toolingRepository.remove(resource, id);

  if (!record) {
    const error = new Error("Record not found");
    error.statusCode = 404;
    throw error;
  }

  return record;
}

async function searchItems(query) {
  const rows = await toolingRepository.searchItems(query || "");

  return rows.map((item) => ({
    value: item.id,
    label: `${item.itemCode} - ${item.itemName}`,
    itemCode: item.itemCode,
    itemName: item.itemName,
    quantityOnHand: item.quantityOnHand,
    unit: item.unit,
    isLowStock: Number(item.quantityOnHand || 0) <= Number(item.minimumStock || 0)
  }));
}

async function findItemByQrCode(qrCode) {
  const record = await toolingRepository.findItemByQrCode(qrCode);

  if (!record) {
    const error = new Error("Item not found");
    error.statusCode = 404;
    throw error;
  }

  return record;
}

module.exports = {
  dashboard,
  list,
  getById,
  create,
  update,
  remove,
  searchItems,
  findItemByQrCode
};
