const { sql, getPool } = require("../config/database");
const { getResourceConfig } = require("../config/adminResources");

function normalizePermissions(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function addInput(request, key, value) {
  if (value === undefined) {
    return;
  }

  if (typeof value === "number") {
    request.input(key, sql.Int, value);
    return;
  }

  request.input(key, sql.NVarChar, String(value));
}

function buildWhere(config, filters, request) {
  const where = [];

  if (filters.search && config.searchColumns.length) {
    request.input("search", sql.NVarChar, `%${filters.search}%`);
    where.push(`(${config.searchColumns.map((column) => `${column} LIKE @search`).join(" OR ")})`);
  }

  ["status", "departmentId", "areaId", "machineTypeId"].forEach((key) => {
    if (filters[key]) {
      addInput(request, key, filters[key]);
      where.push(`${key} = @${key}`);
    }
  });

  if (filters.feature && filters.role && config.table === "dbo.tbm_user") {
    request.input("permissionSearch", sql.NVarChar, `%"${filters.feature}":"${filters.role}"%`);
    where.push("permissions LIKE @permissionSearch");
  }

  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

async function list(resource, filters) {
  const config = getResourceConfig(resource);
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

  const dataResult = await listRequest.query(`
    SELECT *
    FROM ${config.table}
    ${where}
    ORDER BY ${config.defaultSort}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

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
  const config = getResourceConfig(resource);
  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, Number(id)).query(`
    SELECT *
    FROM ${config.table}
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

async function findUserByUsername(username) {
  const pool = await getPool();
  const result = await pool.request().input("username", sql.NVarChar, username).query(`
    SELECT TOP 1 *
    FROM dbo.tbm_user
    WHERE username = @username AND status = 'active'
  `);

  return result.recordset[0] || null;
}

async function create(resource, payload) {
  const config = getResourceConfig(resource);
  const pool = await getPool();
  const request = pool.request();
  const fields = config.fields.filter((field) => payload[field] !== undefined);

  fields.forEach((field) => {
    addInput(
      request,
      field,
      field === "permissions" ? normalizePermissions(payload[field]) : payload[field]
    );
  });

  const result = await request.query(`
    INSERT INTO ${config.table} (${fields.join(", ")})
    OUTPUT INSERTED.*
    VALUES (${fields.map((field) => `@${field}`).join(", ")})
  `);

  return result.recordset[0];
}

async function update(resource, id, payload) {
  const config = getResourceConfig(resource);
  const pool = await getPool();
  const request = pool.request();
  const fields = config.fields.filter((field) => payload[field] !== undefined);

  request.input("id", sql.Int, Number(id));
  fields.forEach((field) => {
    addInput(
      request,
      field,
      field === "permissions" ? normalizePermissions(payload[field]) : payload[field]
    );
  });

  const result = await request.query(`
    UPDATE ${config.table}
    SET ${fields.map((field) => `${field} = @${field}`).join(", ")}
    OUTPUT INSERTED.*
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

async function remove(resource, id) {
  const config = getResourceConfig(resource);
  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, Number(id)).query(`
    DELETE FROM ${config.table}
    OUTPUT DELETED.*
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

module.exports = {
  list,
  getById,
  findUserByUsername,
  create,
  update,
  remove
};
