const toolingRepository = require("../repositories/toolingRepository");
const { getToolingResourceConfig } = require("../config/toolingResources");
const { emitToolingChange } = require("./socketService");
const { saveToolingItemImage } = require("./toolingImageService");

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

function normalizeDashboardYearMonth(value, fallbackDate = new Date()) {
  const text = String(value || "").trim();

  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) {
    return text;
  }

  const year = fallbackDate.getFullYear();
  const month = String(fallbackDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMovementDate(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value || "").slice(0, 10);
}

function buildDashboardMovementChart(yearMonth, movementRows = []) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyMap = new Map();
  const itemsByDate = {};
  const totals = { stockIn: 0, stockOut: 0 };

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${yearMonth}-${String(day).padStart(2, "0")}`;
    dailyMap.set(date, { date, day, stockIn: 0, stockOut: 0 });
    itemsByDate[date] = [];
  }

  movementRows.forEach((row) => {
    const date = formatMovementDate(row.movementDate);

    if (!dailyMap.has(date)) {
      return;
    }

    const stockIn = Number(row.stockIn || 0);
    const stockOut = Number(row.stockOut || 0);
    const dayRow = dailyMap.get(date);

    dayRow.stockIn += stockIn;
    dayRow.stockOut += stockOut;
    totals.stockIn += stockIn;
    totals.stockOut += stockOut;

    itemsByDate[date].push({
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      imageUrl: row.imageUrl,
      stockIn,
      stockOut
    });
  });

  return {
    yearMonth,
    daily: Array.from(dailyMap.values()),
    totals,
    itemsByDate
  };
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

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function daysSince(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function calculatePlanningRow(row) {
  const lookbackDays = Math.max(Number(row.lookbackDays || 90), 1);
  const currentStock = Number(row.currentStock || 0);
  const issuedQuantity = Number(row.issuedQuantity || 0);
  const leadTimeDays = Number(row.leadTimeDays || 0);
  const safetyStock = Number(row.safetyStock || 0);
  const maximumStock = Number(row.maximumStock || 0);
  const minimumOrderQuantity = Number(row.minimumOrderQuantity || 0);
  const slowMovementDays = Number(row.slowMovementDays || 90);
  const deadStockDays = Number(row.deadStockDays || 180);
  const criticalLevel = row.criticalLevel || "normal";
  const averageDailyUsage = round(issuedQuantity / lookbackDays, 4);
  const reorderPoint = round((averageDailyUsage * leadTimeDays) + safetyStock);
  const daysUntilStockout = averageDailyUsage > 0
    ? round(currentStock / averageDailyUsage)
    : null;
  const suggestedOrderQuantity = maximumStock > currentStock
    ? Math.max(round(maximumStock - currentStock), minimumOrderQuantity)
    : 0;
  const lastIssueAge = daysSince(row.lastIssueDate);
  let planningStatus = "normal";

  if (currentStock > 0 && lastIssueAge !== null && lastIssueAge >= deadStockDays) {
    planningStatus = "dead_stock";
  } else if (currentStock > 0 && lastIssueAge !== null && lastIssueAge >= slowMovementDays) {
    planningStatus = criticalLevel === "critical" ? "critical_slow_movement" : "slow_movement";
  } else if (maximumStock > 0 && currentStock > maximumStock) {
    planningStatus = "overstock";
  } else if (daysUntilStockout !== null && daysUntilStockout <= leadTimeDays) {
    planningStatus = "stockout_risk";
  } else if (currentStock <= reorderPoint) {
    planningStatus = "need_order";
  } else if (currentStock <= reorderPoint + safetyStock) {
    planningStatus = "reorder_soon";
  }

  return {
    ...row,
    currentStock: round(currentStock),
    averageDailyUsage,
    reorderPoint,
    daysUntilStockout,
    suggestedOrderQuantity,
    planningStatus,
    criticalLevel
  };
}

const reportKeys = new Set([
  "low-stock",
  "reorder-suggestion",
  "stockout-risk",
  "slow-movement",
  "overstock",
  "movement",
  "issue-by-department",
  "issue-by-machine",
  "issue-by-job"
]);

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

async function dashboard(filters = {}) {
  const yearMonth = normalizeDashboardYearMonth(filters.yearMonth);
  const result = await toolingRepository.dashboard({ yearMonth });
  const { movementRows, ...summary } = result;

  return {
    ...summary,
    movementChart: buildDashboardMovementChart(yearMonth, movementRows || [])
  };
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

async function uploadItemImage(payload) {
  return saveToolingItemImage(payload);
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
    qrCode: item.qrCode,
    imageUrl: item.imageUrl,
    locationId: item.locationId,
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

async function planning(filters) {
  const result = await toolingRepository.planning(filters);
  const mappedRows = (result.data || []).map((row) => calculatePlanningRow({
    ...row,
    lookbackDays: filters.lookbackDays || 90
  }));
  const planningStatus = filters.planningStatus;

  return {
    ...result,
    data: planningStatus
      ? mappedRows.filter((row) => row.planningStatus === planningStatus)
      : mappedRows
  };
}

async function report(reportKey, filters) {
  if (!reportKeys.has(reportKey)) {
    const error = new Error("Tooling report not found");
    error.statusCode = 404;
    throw error;
  }

  return toolingRepository.report(reportKey, filters);
}

module.exports = {
  dashboard,
  list,
  getById,
  create,
  uploadItemImage,
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
  returnItem,
  calculatePlanningRow,
  buildDashboardMovementChart,
  normalizeDashboardYearMonth,
  planning,
  report
};
