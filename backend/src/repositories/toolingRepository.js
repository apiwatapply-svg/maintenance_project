const { sql, getPool } = require("../config/database");
const { getToolingResourceConfig } = require("../config/toolingResources");

function addInput(request, key, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (Number.isInteger(Number(value)) && key.toLowerCase().endsWith("id")) {
    request.input(key, sql.Int, Number(value));
    return;
  }

  request.input(key, sql.NVarChar, String(value));
}

function addPayloadInput(request, key, value) {
  if (value === undefined) {
    return;
  }

  if (
    [
      "categoryId",
      "locationId",
      "preferredSupplierId",
      "leadTimeDays",
      "slowMovementDays",
      "deadStockDays"
    ].includes(key)
  ) {
    request.input(key, sql.Int, value === null ? null : Number(value));
    return;
  }

  if (
    [
      "minimumStock",
      "maximumStock",
      "safetyStock",
      "minimumOrderQuantity",
      "quantityOnHand"
    ].includes(key)
  ) {
    request.input(key, sql.Decimal(18, 2), Number(value));
    return;
  }

  request.input(key, sql.NVarChar, value === null ? null : String(value));
}

function buildWhere(config, filters, request) {
  const where = [];

  if (filters.search && config.searchColumns.length) {
    request.input("search", sql.NVarChar, `%${filters.search}%`);
    where.push(`(${config.searchColumns.map((column) => `${column} LIKE @search`).join(" OR ")})`);
  }

  config.filters.forEach((key) => {
    if (key === "search" || !filters[key]) {
      return;
    }

    addInput(request, key, filters[key]);
    where.push(`${key} = @${key}`);
  });

  if (filters.dateFrom && config.table === "dbo.tb_tooling_stock_transaction") {
    request.input("dateFrom", sql.DateTime2, new Date(filters.dateFrom));
    where.push("transactionDate >= @dateFrom");
  }

  if (filters.dateTo && config.table === "dbo.tb_tooling_stock_transaction") {
    request.input("dateTo", sql.DateTime2, new Date(filters.dateTo));
    where.push("transactionDate <= @dateTo");
  }

  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

async function dashboard() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      (SELECT COUNT(1) FROM dbo.tbm_tooling_item WHERE status = 'active') AS totalItems,
      (SELECT COUNT(1)
       FROM dbo.tb_tooling_stock_balance AS balance
       INNER JOIN dbo.tbm_tooling_item AS item ON item.id = balance.itemId
       WHERE balance.quantityOnHand <= item.minimumStock) AS lowStockItems,
      (SELECT COUNT(1) FROM dbo.tb_tooling_request WHERE status = 'pending') AS pendingRequests,
      0 AS stockoutRiskItems,
      0 AS slowMovementItems,
      0 AS overstockItems
  `);

  return result.recordset[0];
}

async function list(resource, filters) {
  const config = getToolingResourceConfig(resource);
  const page = Math.max(Number(filters.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize || 10), 1), 100);
  const offset = (page - 1) * pageSize;
  const pool = await getPool();
  const listRequest = pool.request();
  const countRequest = pool.request();
  const where = buildWhere(config, filters, listRequest);
  const countWhere = buildWhere(config, filters, countRequest);

  listRequest.input("offset", sql.Int, offset);
  listRequest.input("pageSize", sql.Int, pageSize);

  const selectSql = resource === "stock"
    ? `
      SELECT
        balance.*,
        item.itemCode,
        item.itemName,
        item.unit,
        item.minimumStock,
        location.locationCode,
        location.locationName
      FROM dbo.tb_tooling_stock_balance AS balance
      INNER JOIN dbo.tbm_tooling_item AS item ON item.id = balance.itemId
      INNER JOIN dbo.tbm_tooling_location AS location ON location.id = balance.locationId
      ${where}
      ORDER BY ${config.defaultSort}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `
    : `
      SELECT *
      FROM ${config.table}
      ${where}
      ORDER BY ${config.defaultSort}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

  const dataResult = await listRequest.query(selectSql);

  const countResult = await countRequest.query(`
    SELECT COUNT(1) AS total
    FROM ${config.table}
    ${countWhere}
  `);

  return {
    data: dataResult.recordset,
    pagination: {
      page,
      pageSize,
      total: countResult.recordset[0]?.total || 0
    }
  };
}

async function getById(resource, id) {
  const config = getToolingResourceConfig(resource);
  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, Number(id)).query(`
    SELECT *
    FROM ${config.table}
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

async function create(resource, payload) {
  const config = getToolingResourceConfig(resource);
  const fields = config.fields.filter((field) => payload[field] !== undefined);
  const pool = await getPool();
  const request = pool.request();

  fields.forEach((field) => addPayloadInput(request, field, payload[field]));

  const result = await request.query(`
    INSERT INTO ${config.table} (${fields.join(", ")})
    OUTPUT INSERTED.*
    VALUES (${fields.map((field) => `@${field}`).join(", ")})
  `);

  return result.recordset[0];
}

async function update(resource, id, payload) {
  const config = getToolingResourceConfig(resource);
  const fields = config.fields.filter((field) => payload[field] !== undefined);
  const pool = await getPool();
  const request = pool.request();

  request.input("id", sql.Int, Number(id));
  fields.forEach((field) => addPayloadInput(request, field, payload[field]));

  const result = await request.query(`
    UPDATE ${config.table}
    SET ${fields.map((field) => `${field} = @${field}`).join(", ")}
    OUTPUT INSERTED.*
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

async function remove(resource, id) {
  const config = getToolingResourceConfig(resource);
  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, Number(id)).query(`
    DELETE FROM ${config.table}
    OUTPUT DELETED.*
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

async function searchItems(query) {
  const pool = await getPool();
  const request = pool.request().input("search", sql.NVarChar, `%${query || ""}%`);
  const result = await request.query(`
    SELECT TOP 20
      item.id,
      item.itemCode,
      item.itemName,
      item.unit,
      item.minimumStock,
      item.status,
      COALESCE(SUM(balance.quantityOnHand), 0) AS quantityOnHand
    FROM dbo.tbm_tooling_item AS item
    LEFT JOIN dbo.tb_tooling_stock_balance AS balance ON balance.itemId = item.id
    WHERE item.status = 'active'
      AND (item.itemCode LIKE @search OR item.itemName LIKE @search)
    GROUP BY item.id, item.itemCode, item.itemName, item.unit, item.minimumStock, item.status
    ORDER BY item.itemCode
  `);

  return result.recordset;
}

async function findItemByQrCode(qrCode) {
  const pool = await getPool();
  const result = await pool.request().input("qrCode", sql.NVarChar, qrCode).query(`
    SELECT TOP 1
      item.*,
      location.locationName,
      COALESCE(balance.quantityOnHand, 0) AS quantityOnHand
    FROM dbo.tbm_tooling_item AS item
    LEFT JOIN dbo.tbm_tooling_location AS location ON location.id = item.locationId
    LEFT JOIN dbo.tb_tooling_stock_balance AS balance
      ON balance.itemId = item.id
      AND (item.locationId IS NULL OR balance.locationId = item.locationId)
    WHERE item.qrCode = @qrCode OR item.itemCode = @qrCode
  `);

  return result.recordset[0] || null;
}

async function validateActiveItemLocation(itemId, locationId) {
  const pool = await getPool();
  const itemResult = await pool.request().input("itemId", sql.Int, Number(itemId)).query(`
    SELECT TOP 1 *
    FROM dbo.tbm_tooling_item
    WHERE id = @itemId AND status = 'active'
  `);
  const locationResult = await pool.request().input("locationId", sql.Int, Number(locationId)).query(`
    SELECT TOP 1 *
    FROM dbo.tbm_tooling_location
    WHERE id = @locationId AND status = 'active'
  `);

  if (!itemResult.recordset[0] || !locationResult.recordset[0]) {
    const error = new Error("Item or location is inactive");
    error.statusCode = 400;
    throw error;
  }

  return {
    item: itemResult.recordset[0],
    location: locationResult.recordset[0]
  };
}

async function stockIn(payload) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const balanceResult = await new sql.Request(transaction)
      .input("itemId", sql.Int, Number(payload.itemId))
      .input("locationId", sql.Int, Number(payload.locationId))
      .query(`
        SELECT TOP 1 *
        FROM dbo.tb_tooling_stock_balance WITH (UPDLOCK)
        WHERE itemId = @itemId AND locationId = @locationId
      `);
    const currentBalance = Number(balanceResult.recordset[0]?.quantityOnHand || 0);
    const balanceAfter = currentBalance + Number(payload.quantity);

    if (balanceResult.recordset[0]) {
      await new sql.Request(transaction)
        .input("itemId", sql.Int, Number(payload.itemId))
        .input("locationId", sql.Int, Number(payload.locationId))
        .input("quantityOnHand", sql.Decimal(18, 2), balanceAfter)
        .query(`
          UPDATE dbo.tb_tooling_stock_balance
          SET quantityOnHand = @quantityOnHand, updatedAt = SYSDATETIME()
          WHERE itemId = @itemId AND locationId = @locationId
        `);
    } else {
      await new sql.Request(transaction)
        .input("itemId", sql.Int, Number(payload.itemId))
        .input("locationId", sql.Int, Number(payload.locationId))
        .input("quantityOnHand", sql.Decimal(18, 2), balanceAfter)
        .query(`
          INSERT INTO dbo.tb_tooling_stock_balance (itemId, locationId, quantityOnHand)
          VALUES (@itemId, @locationId, @quantityOnHand)
        `);
    }

    const movement = await insertStockTransaction(transaction, payload, currentBalance, balanceAfter);
    await transaction.commit();
    return movement;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function stockOut(payload) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const balanceResult = await new sql.Request(transaction)
      .input("itemId", sql.Int, Number(payload.itemId))
      .input("locationId", sql.Int, Number(payload.locationId))
      .query(`
        SELECT TOP 1 *
        FROM dbo.tb_tooling_stock_balance WITH (UPDLOCK)
        WHERE itemId = @itemId AND locationId = @locationId
      `);
    const currentBalance = Number(balanceResult.recordset[0]?.quantityOnHand || 0);

    if (currentBalance < Number(payload.quantity)) {
      const error = new Error("Insufficient stock");
      error.statusCode = 400;
      throw error;
    }

    const balanceAfter = currentBalance - Number(payload.quantity);

    await new sql.Request(transaction)
      .input("itemId", sql.Int, Number(payload.itemId))
      .input("locationId", sql.Int, Number(payload.locationId))
      .input("quantityOnHand", sql.Decimal(18, 2), balanceAfter)
      .query(`
        UPDATE dbo.tb_tooling_stock_balance
        SET quantityOnHand = @quantityOnHand, updatedAt = SYSDATETIME()
        WHERE itemId = @itemId AND locationId = @locationId
      `);

    const movement = await insertStockTransaction(transaction, payload, currentBalance, balanceAfter);
    await transaction.commit();
    return movement;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function insertStockTransaction(transaction, payload, balanceBefore, balanceAfter) {
  const request = new sql.Request(transaction);

  request.input("transactionNo", sql.NVarChar, payload.transactionNo);
  request.input("movementType", sql.NVarChar, payload.movementType);
  request.input("itemId", sql.Int, Number(payload.itemId));
  request.input("locationId", sql.Int, Number(payload.locationId));
  request.input("quantity", sql.Decimal(18, 2), Number(payload.quantity));
  request.input("balanceAfter", sql.Decimal(18, 2), balanceAfter);
  request.input("departmentId", sql.Int, payload.departmentId ? Number(payload.departmentId) : null);
  request.input("userId", sql.Int, payload.userId ? Number(payload.userId) : null);
  request.input("referenceType", sql.NVarChar, payload.referenceType || null);
  request.input("referenceId", sql.Int, payload.referenceId ? Number(payload.referenceId) : null);
  request.input("referenceNo", sql.NVarChar, payload.referenceNo || null);
  request.input("remark", sql.NVarChar, payload.remark || null);

  const result = await request.query(`
    INSERT INTO dbo.tb_tooling_stock_transaction (
      transactionNo,
      movementType,
      itemId,
      locationId,
      quantity,
      balanceAfter,
      departmentId,
      userId,
      referenceType,
      referenceId,
      referenceNo,
      remark
    )
    OUTPUT INSERTED.*
    VALUES (
      @transactionNo,
      @movementType,
      @itemId,
      @locationId,
      @quantity,
      @balanceAfter,
      @departmentId,
      @userId,
      @referenceType,
      @referenceId,
      @referenceNo,
      @remark
    )
  `);

  return {
    ...result.recordset[0],
    balanceBefore
  };
}

async function createRequest(payload) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const requestResult = await new sql.Request(transaction)
      .input("requestNo", sql.NVarChar, payload.requestNo)
      .input("requesterId", sql.Int, Number(payload.requesterId))
      .input("departmentId", sql.Int, payload.departmentId ? Number(payload.departmentId) : null)
      .input("referenceType", sql.NVarChar, payload.referenceType || null)
      .input("referenceId", sql.Int, payload.referenceId ? Number(payload.referenceId) : null)
      .input("status", sql.NVarChar, payload.status || "pending")
      .input("remark", sql.NVarChar, payload.remark || null)
      .query(`
        INSERT INTO dbo.tb_tooling_request (
          requestNo,
          requesterId,
          departmentId,
          referenceType,
          referenceId,
          status,
          remark
        )
        OUTPUT INSERTED.*
        VALUES (
          @requestNo,
          @requesterId,
          @departmentId,
          @referenceType,
          @referenceId,
          @status,
          @remark
        )
      `);
    const requestRecord = requestResult.recordset[0];

    for (const item of payload.items) {
      await new sql.Request(transaction)
        .input("requestId", sql.Int, requestRecord.id)
        .input("itemId", sql.Int, Number(item.itemId))
        .input("locationId", sql.Int, Number(item.locationId))
        .input("requestedQuantity", sql.Decimal(18, 2), Number(item.requestedQuantity))
        .query(`
          INSERT INTO dbo.tb_tooling_request_item (
            requestId,
            itemId,
            locationId,
            requestedQuantity,
            status
          )
          VALUES (
            @requestId,
            @itemId,
            @locationId,
            @requestedQuantity,
            'pending'
          )
        `);
    }

    await transaction.commit();
    return getRequestById(requestRecord.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function listRequests(filters = {}) {
  const page = Math.max(Number(filters.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize || 10), 1), 100);
  const offset = (page - 1) * pageSize;
  const pool = await getPool();
  const listRequest = pool.request();
  const countRequest = pool.request();
  const where = [];

  if (filters.status) {
    listRequest.input("status", sql.NVarChar, filters.status);
    countRequest.input("status", sql.NVarChar, filters.status);
    where.push("request.status = @status");
  }

  if (filters.requesterId) {
    listRequest.input("requesterId", sql.Int, Number(filters.requesterId));
    countRequest.input("requesterId", sql.Int, Number(filters.requesterId));
    where.push("request.requesterId = @requesterId");
  }

  if (filters.search) {
    listRequest.input("search", sql.NVarChar, `%${filters.search}%`);
    countRequest.input("search", sql.NVarChar, `%${filters.search}%`);
    where.push("request.requestNo LIKE @search");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  listRequest.input("offset", sql.Int, offset);
  listRequest.input("pageSize", sql.Int, pageSize);

  const dataResult = await listRequest.query(`
    SELECT
      request.*,
      requester.name AS requesterName,
      department.name AS departmentName
    FROM dbo.tb_tooling_request AS request
    LEFT JOIN dbo.tbm_user AS requester ON requester.id = request.requesterId
    LEFT JOIN dbo.tbm_department AS department ON department.id = request.departmentId
    ${whereSql}
    ORDER BY request.createdAt DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  const countResult = await countRequest.query(`
    SELECT COUNT(1) AS total
    FROM dbo.tb_tooling_request AS request
    ${whereSql}
  `);

  return {
    data: dataResult.recordset,
    pagination: {
      page,
      pageSize,
      total: countResult.recordset[0]?.total || 0
    }
  };
}

async function getRequestById(id) {
  const pool = await getPool();
  const requestResult = await pool.request().input("id", sql.Int, Number(id)).query(`
    SELECT
      request.*,
      requester.name AS requesterName,
      department.name AS departmentName
    FROM dbo.tb_tooling_request AS request
    LEFT JOIN dbo.tbm_user AS requester ON requester.id = request.requesterId
    LEFT JOIN dbo.tbm_department AS department ON department.id = request.departmentId
    WHERE request.id = @id
  `);

  const requestRecord = requestResult.recordset[0];

  if (!requestRecord) {
    return null;
  }

  const itemsResult = await pool.request().input("requestId", sql.Int, Number(id)).query(`
    SELECT
      requestItem.*,
      item.itemCode,
      item.itemName,
      item.unit,
      location.locationCode,
      location.locationName
    FROM dbo.tb_tooling_request_item AS requestItem
    INNER JOIN dbo.tbm_tooling_item AS item ON item.id = requestItem.itemId
    INNER JOIN dbo.tbm_tooling_location AS location ON location.id = requestItem.locationId
    WHERE requestItem.requestId = @requestId
    ORDER BY requestItem.id
  `);

  return {
    ...requestRecord,
    items: itemsResult.recordset
  };
}

async function approveRequest(id, approvedBy) {
  const pool = await getPool();
  const result = await pool.request()
    .input("id", sql.Int, Number(id))
    .input("approvedBy", sql.Int, Number(approvedBy))
    .query(`
      UPDATE dbo.tb_tooling_request
      SET status = 'approved', updatedAt = SYSDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @id AND status = 'pending'
    `);

  return result.recordset[0] || null;
}

async function rejectRequest(id, rejectedBy, remark) {
  const pool = await getPool();
  const result = await pool.request()
    .input("id", sql.Int, Number(id))
    .input("rejectedBy", sql.Int, Number(rejectedBy))
    .input("remark", sql.NVarChar, remark || null)
    .query(`
      UPDATE dbo.tb_tooling_request
      SET
        status = 'rejected',
        remark = COALESCE(@remark, remark),
        updatedAt = SYSDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @id AND status IN ('pending', 'approved')
    `);

  return result.recordset[0] || null;
}

async function issueRequest(payload) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const requestResult = await new sql.Request(transaction)
      .input("requestId", sql.Int, Number(payload.requestId))
      .query(`
        SELECT TOP 1 *
        FROM dbo.tb_tooling_request WITH (UPDLOCK)
        WHERE id = @requestId AND status = 'approved'
      `);
    const requestRecord = requestResult.recordset[0];

    if (!requestRecord) {
      const error = new Error("Request is not approved or was not found");
      error.statusCode = 400;
      throw error;
    }

    const itemsResult = await new sql.Request(transaction)
      .input("requestId", sql.Int, Number(payload.requestId))
      .query(`
        SELECT *
        FROM dbo.tb_tooling_request_item
        WHERE requestId = @requestId AND status IN ('pending', 'approved')
        ORDER BY id
      `);
    const movements = [];

    for (const [index, item] of itemsResult.recordset.entries()) {
      const movement = await stockOutWithinTransaction(transaction, {
        transactionNo: `${payload.transactionNoPrefix}-${index + 1}`,
        movementType: "stock_out",
        itemId: item.itemId,
        locationId: item.locationId,
        quantity: item.requestedQuantity,
        departmentId: requestRecord.departmentId,
        userId: payload.issuedBy,
        referenceType: "tooling_request",
        referenceId: requestRecord.id,
        referenceNo: requestRecord.requestNo,
        remark: requestRecord.remark
      });

      await new sql.Request(transaction)
        .input("id", sql.Int, item.id)
        .input("issuedQuantity", sql.Decimal(18, 2), Number(item.requestedQuantity))
        .query(`
          UPDATE dbo.tb_tooling_request_item
          SET issuedQuantity = @issuedQuantity, status = 'issued'
          WHERE id = @id
        `);

      movements.push(movement);
    }

    const issuedResult = await new sql.Request(transaction)
      .input("requestId", sql.Int, Number(payload.requestId))
      .query(`
        UPDATE dbo.tb_tooling_request
        SET status = 'issued', updatedAt = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @requestId
      `);

    await transaction.commit();
    return {
      ...issuedResult.recordset[0],
      movements
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function stockOutWithinTransaction(transaction, payload) {
  const balanceResult = await new sql.Request(transaction)
    .input("itemId", sql.Int, Number(payload.itemId))
    .input("locationId", sql.Int, Number(payload.locationId))
    .query(`
      SELECT TOP 1 *
      FROM dbo.tb_tooling_stock_balance WITH (UPDLOCK)
      WHERE itemId = @itemId AND locationId = @locationId
    `);
  const currentBalance = Number(balanceResult.recordset[0]?.quantityOnHand || 0);

  if (currentBalance < Number(payload.quantity)) {
    const error = new Error("Insufficient stock");
    error.statusCode = 400;
    throw error;
  }

  const balanceAfter = currentBalance - Number(payload.quantity);

  await new sql.Request(transaction)
    .input("itemId", sql.Int, Number(payload.itemId))
    .input("locationId", sql.Int, Number(payload.locationId))
    .input("quantityOnHand", sql.Decimal(18, 2), balanceAfter)
    .query(`
      UPDATE dbo.tb_tooling_stock_balance
      SET quantityOnHand = @quantityOnHand, updatedAt = SYSDATETIME()
      WHERE itemId = @itemId AND locationId = @locationId
    `);

  return insertStockTransaction(transaction, payload, currentBalance, balanceAfter);
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
  validateActiveItemLocation,
  stockIn,
  stockOut,
  createRequest,
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  issueRequest
};
