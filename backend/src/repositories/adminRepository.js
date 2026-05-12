const { sql, getPool } = require("../config/database");
const { getAdminResource, normalizePagination } = require("../config/adminResources");

function assertResource(resourceKey) {
  const resource = getAdminResource(resourceKey);

  if (!resource) {
    const error = new Error("Unknown admin resource.");
    error.statusCode = 404;
    throw error;
  }

  return resource;
}

function addFilters(request, resource, query) {
  const clauses = [];

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

async function listAdminResource(resourceKey, query = {}) {
  const resource = assertResource(resourceKey);
  const pagination = normalizePagination(query);
  const pool = await getPool();
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

async function createAdminResource(resourceKey, payload = {}) {
  const resource = assertResource(resourceKey);
  const values = { ...resource.defaults, ...payload };
  const columns = resource.columns.filter((column) => values[column] !== undefined);
  const pool = await getPool();
  const request = pool.request();

  columns.forEach((column) => {
    request.input(column, sql.NVarChar(sql.MAX), values[column]);
  });

  const columnSql = columns.join(", ");
  const valueSql = columns.map((column) => `@${column}`).join(", ");
  const result = await request.query(`
    INSERT INTO dbo.${resource.table} (${columnSql})
    OUTPUT INSERTED.*
    VALUES (${valueSql});
  `);

  return result.recordset[0];
}

async function updateAdminResource(resourceKey, id, payload = {}) {
  const resource = assertResource(resourceKey);
  const values = { ...payload };
  const columns = resource.columns.filter((column) => values[column] !== undefined);
  const pool = await getPool();
  const request = pool.request().input("id", sql.Int, id);

  if (!columns.length) {
    const error = new Error("No fields to update.");
    error.statusCode = 400;
    throw error;
  }

  columns.forEach((column) => {
    request.input(column, sql.NVarChar(sql.MAX), values[column]);
  });

  const setSql = columns.map((column) => `${column} = @${column}`).join(", ");
  const result = await request.query(`
    UPDATE dbo.${resource.table}
    SET ${setSql}, updated_at = SYSUTCDATETIME()
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

async function deleteAdminResource(resourceKey, id) {
  const resource = assertResource(resourceKey);
  const pool = await getPool();
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

module.exports = {
  listAdminResource,
  createAdminResource,
  updateAdminResource,
  deleteAdminResource
};
