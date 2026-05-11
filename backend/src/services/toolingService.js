const toolingRepository = require("../repositories/toolingRepository");
const { getToolingResourceConfig } = require("../config/toolingResources");
const { emitToolingChange } = require("./socketService");

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

function createTransactionNo(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function assertStockMovementPayload(payload) {
  const missing = ["itemId", "locationId"].filter((field) => !payload[field]);

  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  if (Number(payload.quantity) <= 0) {
    const error = new Error("Quantity must be greater than zero");
    error.statusCode = 400;
    throw error;
  }
}

function assertReturnPayload(payload) {
  assertStockMovementPayload(payload);

  if (!["good", "damaged", "lost"].includes(payload.condition)) {
    const error = new Error("Return condition must be good, damaged, or lost");
    error.statusCode = 400;
    throw error;
  }
}

function assertRequestPayload(payload) {
  if (!payload.requesterId) {
    const error = new Error("Requester is required");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    const error = new Error("Request must contain at least one item");
    error.statusCode = 400;
    throw error;
  }

  payload.items.forEach((item) => {
    const missing = ["itemId", "locationId"].filter((field) => !item[field]);

    if (missing.length) {
      const error = new Error(`Missing request item field(s): ${missing.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }

    if (Number(item.quantity || item.requestedQuantity || 0) <= 0) {
      const error = new Error("Request item quantity must be greater than zero");
      error.statusCode = 400;
      throw error;
    }
  });
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

async function stockIn(payload) {
  assertStockMovementPayload(payload);
  const { item } = await toolingRepository.validateActiveItemLocation(
    payload.itemId,
    payload.locationId
  );
  const movement = await toolingRepository.stockIn({
    ...payload,
    transactionNo: createTransactionNo("TIN"),
    movementType: "stock_in"
  });

  emitToolingChange({
    action: "stock_in",
    resource: "stock",
    id: movement.id,
    itemId: movement.itemId,
    locationId: movement.locationId
  });

  if (
    Number(movement.balanceBefore || 0) <= Number(item.minimumStock || 0) &&
    Number(movement.balanceAfter || 0) > Number(item.minimumStock || 0)
  ) {
    emitToolingChange(
      {
        action: "stock_recovered",
        resource: "stock",
        id: movement.id,
        itemId: movement.itemId,
        locationId: movement.locationId,
        balanceAfter: movement.balanceAfter
      },
      "tooling:stock-recovered"
    );
  }

  return movement;
}

async function stockOut(payload) {
  assertStockMovementPayload(payload);
  const { item } = await toolingRepository.validateActiveItemLocation(
    payload.itemId,
    payload.locationId
  );
  const movement = await toolingRepository.stockOut({
    ...payload,
    transactionNo: createTransactionNo("TOUT"),
    movementType: "stock_out"
  });

  emitToolingChange({
    action: "stock_out",
    resource: "stock",
    id: movement.id,
    itemId: movement.itemId,
    locationId: movement.locationId
  });

  if (Number(movement.balanceAfter || 0) <= Number(item.minimumStock || 0)) {
    emitToolingChange(
      {
        action: "low_stock",
        resource: "stock",
        id: movement.id,
        itemId: movement.itemId,
        locationId: movement.locationId,
        balanceAfter: movement.balanceAfter
      },
      "tooling:low-stock"
    );
  }

  return movement;
}

async function createRequest(payload) {
  assertRequestPayload(payload);
  const request = await toolingRepository.createRequest({
    ...payload,
    requestNo: createTransactionNo("REQ"),
    status: "pending",
    items: payload.items.map((item) => ({
      ...item,
      requestedQuantity: Number(item.requestedQuantity || item.quantity)
    }))
  });

  emitToolingChange(
    {
      action: "request_created",
      resource: "requests",
      id: request.id
    },
    "tooling:request-created"
  );

  return request;
}

async function listRequests(filters) {
  return toolingRepository.listRequests(filters);
}

async function getRequestById(id) {
  const request = await toolingRepository.getRequestById(id);

  if (!request) {
    const error = new Error("Request not found");
    error.statusCode = 404;
    throw error;
  }

  return request;
}

async function approveRequest(id, approvedBy) {
  const request = await toolingRepository.approveRequest(id, approvedBy);

  if (!request) {
    const error = new Error("Request not found or cannot be approved");
    error.statusCode = 404;
    throw error;
  }

  emitToolingChange(
    {
      action: "request_approved",
      resource: "requests",
      id: request.id
    },
    "tooling:request-approved"
  );

  return request;
}

async function rejectRequest(id, rejectedBy, remark) {
  const request = await toolingRepository.rejectRequest(id, rejectedBy, remark);

  if (!request) {
    const error = new Error("Request not found or cannot be rejected");
    error.statusCode = 404;
    throw error;
  }

  emitToolingChange(
    {
      action: "request_rejected",
      resource: "requests",
      id: request.id
    },
    "tooling:request-rejected"
  );

  return request;
}

async function issueRequest(id, issuedBy) {
  const request = await toolingRepository.issueRequest({
    requestId: id,
    issuedBy,
    transactionNoPrefix: createTransactionNo("TREQ")
  });

  if (!request) {
    const error = new Error("Request not found or cannot be issued");
    error.statusCode = 404;
    throw error;
  }

  emitToolingChange(
    {
      action: "request_issued",
      resource: "requests",
      id: request.id
    },
    "tooling:request-issued"
  );

  (request.movements || []).forEach((movement) => {
    emitToolingChange({
      action: "stock_out",
      resource: "stock",
      itemId: movement.itemId,
      locationId: movement.locationId
    });
  });

  return request;
}

async function returnItem(payload) {
  assertReturnPayload(payload);
  await toolingRepository.validateActiveItemLocation(payload.itemId, payload.locationId);
  const movement = await toolingRepository.returnItem({
    ...payload,
    transactionNo: createTransactionNo("TRTN"),
    movementType: `return_${payload.condition}`
  });

  emitToolingChange({
    action: movement.movementType,
    resource: "stock",
    id: movement.id,
    itemId: movement.itemId,
    locationId: movement.locationId
  });

  return movement;
}

module.exports = {
  dashboard,
  list,
  getById,
  create,
  update,
  remove,
  searchItems,
  findItemByQrCode,
  stockIn,
  stockOut,
  createRequest,
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  issueRequest,
  returnItem
};
