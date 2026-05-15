const { sql, getPool } = require("../config/database");
const { getToolingResource, getToolingSchemaStatements, getToolingSeedStatements, normalizeToolingPagination } = require("../config/toolingResources");
const { numericFields, validateToolingPayload } = require("../services/toolingValidationService");

let schemaReady = false;

function assertToolingResource(resourceKey) {
  const resource = getToolingResource(resourceKey);

  if (!resource) {
    const error = new Error("Unknown tooling resource.");
    error.statusCode = 404;
    throw error;
  }

  return resource;
}

async function ensureToolingSchema(pool) {
  if (schemaReady) {
    return;
  }

  for (const statement of getToolingSchemaStatements()) {
    await pool.request().query(statement);
  }
  for (const statement of getToolingSeedStatements()) {
    await pool.request().query(statement);
  }

  schemaReady = true;
}

function addFilters(request, resource, query) {
  const clauses = [];

  Object.entries(resource.fixedFilters || {}).forEach(([column, value]) => {
    const inputName = `fixed_${column}`;
    request.input(inputName, sql.NVarChar(150), value);
    clauses.push(`${column} = @${inputName}`);
  });

  if (query.search && resource.searchable.length) {
    const searchClauses = resource.searchable.map((column, index) => {
      const inputName = `search${index}`;
      request.input(inputName, sql.NVarChar(150), `%${query.search}%`);
      return `${column} LIKE @${inputName}`;
    });
    clauses.push(`(${searchClauses.join(" OR ")})`);
  }

  resource.filters.forEach((column) => {
    if (query[column]) {
      request.input(column, sql.NVarChar(150), query[column]);
      clauses.push(`${column} = @${column}`);
    }
  });

  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function normalizeToolingPayload(resourceKey, payload = {}) {
  const normalizedPayload = normalizeNumericFields(payload);

  if (!resourceKey.startsWith("calibration")) {
    return normalizedPayload;
  }

  const nextPayload = { ...normalizedPayload };
  const intervalDays = Number(nextPayload.calibration_interval_days || 180);
  nextPayload.calibration_interval_days = intervalDays;

  if (nextPayload.last_calibration_date && nextPayload.calibration_interval_days !== undefined && !nextPayload.next_calibration_date) {
    nextPayload.next_calibration_date = addDays(nextPayload.last_calibration_date, intervalDays);
  }

  if (nextPayload.next_calibration_date) {
    nextPayload.status = calculateCalibrationStatus(nextPayload.next_calibration_date);
  }

  return nextPayload;
}

function normalizeNumericFields(payload = {}) {
  const nextPayload = { ...payload };

  numericFields.forEach((field) => {
    if (nextPayload[field] === undefined || nextPayload[field] === null || nextPayload[field] === "") {
      delete nextPayload[field];
      return;
    }

    nextPayload[field] = Number(nextPayload[field]);
  });

  return nextPayload;
}

function addDays(dateValue, days) {
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function calculateCalibrationStatus(nextDateValue, todayValue = new Date()) {
  const today = new Date(Date.UTC(todayValue.getUTCFullYear(), todayValue.getUTCMonth(), todayValue.getUTCDate()));
  const nextDate = new Date(`${String(nextDateValue).slice(0, 10)}T00:00:00.000Z`);
  const daysLeft = Math.ceil((nextDate.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) {
    return "Expired";
  }
  if (daysLeft <= 30) {
    return "Due Soon";
  }
  return "Normal";
}

function getCalibrationStatusRefreshSql() {
  return `
    UPDATE dbo.tb_tooling_calibration
    SET status = CASE
      WHEN DATEDIFF(DAY, CAST(SYSUTCDATETIME() AS DATE), next_calibration_date) < 0 THEN 'Expired'
      WHEN DATEDIFF(DAY, CAST(SYSUTCDATETIME() AS DATE), next_calibration_date) <= 30 THEN 'Due Soon'
      ELSE 'Normal'
    END,
    updated_at = SYSUTCDATETIME()
    WHERE status <> CASE
      WHEN DATEDIFF(DAY, CAST(SYSUTCDATETIME() AS DATE), next_calibration_date) < 0 THEN 'Expired'
      WHEN DATEDIFF(DAY, CAST(SYSUTCDATETIME() AS DATE), next_calibration_date) <= 30 THEN 'Due Soon'
      ELSE 'Normal'
    END;
  `;
}

async function listToolingResource(resourceKey, query = {}) {
  const resource = assertToolingResource(resourceKey);
  const pagination = normalizeToolingPagination(query);
  const pool = await getPool();
  await ensureToolingSchema(pool);

  if (resource.table === "tb_tooling_calibration") {
    await pool.request().query(getCalibrationStatusRefreshSql());
  }

  const request = pool.request()
    .input("offset", sql.Int, pagination.offset)
    .input("pageSize", sql.Int, pagination.pageSize);
  const whereClause = addFilters(request, resource, query);
  const result = await request.query(`
    SELECT *, COUNT(*) OVER() AS total_count
    FROM dbo.${resource.table}
    ${whereClause}
    ORDER BY ${resource.sort} ASC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
  `);

  const total = result.recordset[0]?.total_count || 0;
  const data = result.recordset.map(({ total_count: _totalCount, ...item }) => item);

  return {
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total
    }
  };
}

async function createToolingResource(resourceKey, payload = {}) {
  const resource = assertToolingResource(resourceKey);
  const nextPayload = normalizeToolingPayload(resourceKey, payload);
  validateToolingPayload(resourceKey, nextPayload);

  const values = { ...resource.defaults, ...nextPayload };
  if (resource.autoNumber && !values[resource.autoNumber.column]) {
    values[resource.autoNumber.column] = await getNextDocumentNo(resource, resource.autoNumber);
  }
  const columns = resource.columns.filter((column) => values[column] !== undefined);
  const pool = await getPool();
  await ensureToolingSchema(pool);

  if (resourceKey === "stock-out") {
    await assertEnoughStock(pool, values.item_code, Number(values.quantity || 0));
  }

  const request = pool.request();
  columns.forEach((column) => {
    bindToolingInput(request, column, values[column]);
  });

  const result = await request.query(`
    INSERT INTO dbo.${resource.table} (${columns.join(", ")})
    OUTPUT INSERTED.*
    VALUES (${columns.map((column) => `@${column}`).join(", ")});
  `);

  const created = result.recordset[0];
  await applyToolingSideEffects(pool, resourceKey, created);

  return created;
}

async function updateToolingResource(resourceKey, id, payload = {}) {
  const resource = assertToolingResource(resourceKey);
  const nextPayload = normalizeToolingPayload(resourceKey, payload);
  validateToolingPayload(resourceKey, nextPayload);

  const values = { ...nextPayload };
  const columns = resource.columns.filter((column) => values[column] !== undefined);

  if (!columns.length) {
    const error = new Error("No fields to update.");
    error.statusCode = 400;
    throw error;
  }

  const pool = await getPool();
  await ensureToolingSchema(pool);

  const request = pool.request().input("id", sql.Int, id);
  columns.forEach((column) => {
    bindToolingInput(request, column, values[column]);
  });

  const result = await request.query(`
    UPDATE dbo.${resource.table}
    SET ${columns.map((column) => `${column} = @${column}`).join(", ")}, updated_at = SYSUTCDATETIME()
    OUTPUT INSERTED.*
    WHERE ${resource.idColumn} = @id;
  `);

  if (!result.recordset[0]) {
    const error = new Error("Record not found.");
    error.statusCode = 404;
    throw error;
  }

  return result.recordset[0];
}

async function deleteToolingResource(resourceKey, id) {
  const resource = assertToolingResource(resourceKey);
  const pool = await getPool();
  await ensureToolingSchema(pool);

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      DELETE FROM dbo.${resource.table}
      OUTPUT DELETED.*
      WHERE ${resource.idColumn} = @id;
    `);

  if (!result.recordset[0]) {
    const error = new Error("Record not found.");
    error.statusCode = 404;
    throw error;
  }

  return result.recordset[0];
}

async function getNextDocumentNo(resource, autoNumber) {
  const pool = await getPool();
  await ensureToolingSchema(pool);

  const now = new Date();
  const dateText = `${now.getUTCFullYear()}${`${now.getUTCMonth() + 1}`.padStart(2, "0")}${`${now.getUTCDate()}`.padStart(2, "0")}`;
  const prefix = `${autoNumber.prefix}-${dateText}-`;
  const result = await pool.request()
    .input("prefix", sql.NVarChar(30), `${prefix}%`)
    .query(`
      SELECT MAX(${autoNumber.column}) AS last_no
      FROM dbo.${resource.table}
      WHERE ${autoNumber.column} LIKE @prefix;
    `);
  const lastNo = result.recordset[0]?.last_no || "";
  const lastSequence = Number(String(lastNo).slice(-3)) || 0;

  return `${prefix}${`${lastSequence + 1}`.padStart(3, "0")}`;
}

module.exports = {
  ensureToolingSchema,
  listToolingResource,
  createToolingResource,
  updateToolingResource,
  deleteToolingResource,
  normalizeToolingPayload,
  calculateCalibrationStatus,
  getCalibrationStatusRefreshSql
};

function bindToolingInput(request, column, value) {
  if (numericFields.includes(column)) {
    request.input(column, sql.Int, Number(value || 0));
    return;
  }

  if (column.endsWith("_date")) {
    request.input(column, sql.Date, value || null);
    return;
  }

  request.input(column, sql.NVarChar(sql.MAX), value ?? null);
}

async function applyToolingSideEffects(pool, resourceKey, row) {
  if (resourceKey === "stock-in") {
    await applyStockMovement(pool, row, Number(row.quantity || 0));
    await createMovementHistory(pool, row, "Stock In", row.receive_no, row.receive_date, row.quantity);
    return;
  }

  if (resourceKey === "stock-out") {
    await assertEnoughStock(pool, row.item_code, Number(row.quantity || 0));
    await applyStockMovement(pool, row, -Number(row.quantity || 0));
    await createMovementHistory(pool, row, "Stock Out", row.issue_no, row.issue_date, -Number(row.quantity || 0));
    return;
  }

  if (resourceKey === "borrow-issue") {
    await pool.request()
      .input("toolCode", sql.NVarChar(80), row.tool_code)
      .query("UPDATE dbo.tb_tooling_tool SET status = 'Borrowed', updated_at = SYSUTCDATETIME() WHERE tool_code = @toolCode;");
    return;
  }

  if (resourceKey === "return-tool") {
    const nextStatus = row.condition_status === "Good" ? "Available" : "Repair";
    await pool.request()
      .input("toolCode", sql.NVarChar(80), row.tool_code)
      .input("nextStatus", sql.NVarChar(30), nextStatus)
      .query("UPDATE dbo.tb_tooling_tool SET status = @nextStatus, updated_at = SYSUTCDATETIME() WHERE tool_code = @toolCode;");
  }
}

async function assertEnoughStock(pool, itemCode, quantity) {
  const result = await pool.request()
    .input("itemCode", sql.NVarChar(80), itemCode)
    .query("SELECT current_stock FROM dbo.tb_tooling_stock_balance WHERE item_code = @itemCode;");
  const currentStock = Number(result.recordset[0]?.current_stock || 0);

  if (currentStock < quantity) {
    const error = new Error("Stock out cannot exceed available balance.");
    error.statusCode = 400;
    throw error;
  }
}

async function applyStockMovement(pool, row, quantityChange) {
  await pool.request()
    .input("itemCode", sql.NVarChar(80), row.item_code)
    .input("itemName", sql.NVarChar(200), row.item_name)
    .input("quantityChange", sql.Int, quantityChange)
    .input("unitCode", sql.NVarChar(50), row.unit_code || "PCS")
    .input("locationCode", sql.NVarChar(50), row.location_code || "STORE-A")
    .input("imagePath", sql.NVarChar(500), row.image_path || null)
    .query(`
      MERGE dbo.tb_tooling_stock_balance AS target
      USING (SELECT @itemCode AS item_code) AS source
      ON target.item_code = source.item_code
      WHEN MATCHED THEN
        UPDATE SET
          current_stock = current_stock + @quantityChange,
          status = CASE
            WHEN current_stock + @quantityChange < minimum_stock THEN 'Low Stock'
            WHEN maximum_stock > 0 AND current_stock + @quantityChange > maximum_stock THEN 'Over Stock'
            ELSE 'Normal'
          END,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (item_code, item_name, current_stock, minimum_stock, maximum_stock, unit_code, location_code, status, image_path)
        VALUES (@itemCode, @itemName, @quantityChange, 0, 0, @unitCode, @locationCode, 'Normal', @imagePath);

      UPDATE dbo.tb_tooling_stock_item
      SET current_stock = current_stock + @quantityChange,
          updated_at = SYSUTCDATETIME()
      WHERE item_code = @itemCode;
    `);
}

async function createMovementHistory(pool, row, movementType, referenceNo, movementDate, quantity) {
  await pool.request()
    .input("movementDate", sql.Date, movementDate)
    .input("movementType", sql.NVarChar(50), movementType)
    .input("itemCode", sql.NVarChar(80), row.item_code)
    .input("itemName", sql.NVarChar(200), row.item_name)
    .input("quantity", sql.Int, quantity)
    .input("referenceNo", sql.NVarChar(120), referenceNo || null)
    .input("imagePath", sql.NVarChar(500), row.image_path || null)
    .query(`
      INSERT INTO dbo.tb_tooling_movement_history (movement_date, movement_type, item_code, item_name, quantity, reference_no, created_by, image_path)
      VALUES (@movementDate, @movementType, @itemCode, @itemName, @quantity, @referenceNo, 'system', @imagePath);
    `);
}
