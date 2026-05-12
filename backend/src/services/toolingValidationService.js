const validToolStatuses = new Set(["Available", "Borrowed", "Repair", "Lost"]);
const numericFields = ["minimum_stock", "current_stock", "maximum_stock", "quantity", "overdue_days", "row_count", "calibration_interval_days"];

function makeBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function validateToolingPayload(resourceKey, payload = {}) {
  if (resourceKey === "tools" && payload.status && !validToolStatuses.has(payload.status)) {
    throw makeBadRequest("Invalid tool status.");
  }

  numericFields.forEach((field) => {
    if (payload[field] === undefined) {
      return;
    }

    const numericValue = Number(payload[field]);
    if (!Number.isFinite(numericValue)) {
      throw makeBadRequest(`${field} must be a valid number.`);
    }

    if (numericValue < 0) {
      throw makeBadRequest(`${field} must not be negative.`);
    }
  });

  if (payload.calibration_interval_days !== undefined && Number(payload.calibration_interval_days) < 1) {
    throw makeBadRequest("calibration_interval_days must be at least 1.");
  }

  return { ok: true };
}

module.exports = {
  validateToolingPayload,
  numericFields,
  validToolStatuses
};
