const toolingResources = {
  items: {
    table: "dbo.tbm_tooling_item",
    defaultSort: "itemCode",
    searchColumns: ["itemCode", "itemName"],
    filters: ["search", "status", "categoryId", "itemType", "locationId", "criticalLevel"]
  },
  stock: {
    table: "dbo.tb_tooling_stock_balance",
    defaultSort: "itemId",
    searchColumns: [],
    filters: ["itemId", "locationId"]
  },
  requests: {
    table: "dbo.tb_tooling_request",
    defaultSort: "requestNo",
    searchColumns: ["requestNo"],
    filters: ["search", "status", "departmentId", "requesterId"]
  },
  transactions: {
    table: "dbo.tb_tooling_stock_transaction",
    defaultSort: "transactionDate",
    searchColumns: ["transactionNo", "referenceNo"],
    filters: ["search", "movementType", "itemId", "locationId", "departmentId"]
  },
  planning: {
    table: "dbo.tb_tooling_planning_snapshot",
    defaultSort: "planningStatus",
    searchColumns: ["itemCode", "itemName"],
    filters: ["search", "planningStatus", "criticalLevel", "supplierId"]
  }
};

function getToolingResourceConfig(resource) {
  const config = toolingResources[resource];

  if (!config) {
    const error = new Error("Toolling & Store resource not found");
    error.statusCode = 404;
    throw error;
  }

  return config;
}

module.exports = {
  getToolingResourceConfig,
  toolingResources
};
