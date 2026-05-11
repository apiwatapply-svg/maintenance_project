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

module.exports = {
  dashboard,
  list
};
