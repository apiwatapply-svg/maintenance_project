const toolingResources = {
  items: {
    table: "dbo.tbm_tooling_item",
    defaultSort: "itemCode",
    fields: [
      "itemCode",
      "itemName",
      "categoryId",
      "itemType",
      "unit",
      "minimumStock",
      "maximumStock",
      "safetyStock",
      "leadTimeDays",
      "slowMovementDays",
      "deadStockDays",
      "minimumOrderQuantity",
      "preferredSupplierId",
      "criticalLevel",
      "locationId",
      "qrCode",
      "status"
    ],
    requiredFields: ["itemCode", "itemName"],
    searchColumns: ["itemCode", "itemName"],
    filters: ["search", "status", "categoryId", "itemType", "locationId", "criticalLevel"]
  },
  categories: {
    table: "dbo.tbm_tooling_category",
    defaultSort: "categoryCode",
    fields: ["categoryCode", "categoryName", "status"],
    requiredFields: ["categoryCode", "categoryName"],
    searchColumns: ["categoryCode", "categoryName"],
    filters: ["search", "status"]
  },
  locations: {
    table: "dbo.tbm_tooling_location",
    defaultSort: "locationCode",
    fields: ["locationCode", "locationName", "description", "status"],
    requiredFields: ["locationCode", "locationName"],
    searchColumns: ["locationCode", "locationName"],
    filters: ["search", "status"]
  },
  suppliers: {
    table: "dbo.tbm_tooling_supplier",
    defaultSort: "supplierCode",
    fields: ["supplierCode", "supplierName", "contact", "status"],
    requiredFields: ["supplierCode", "supplierName"],
    searchColumns: ["supplierCode", "supplierName"],
    filters: ["search", "status"]
  },
  stock: {
    table: "dbo.tb_tooling_stock_balance",
    defaultSort: "itemId",
    fields: [],
    requiredFields: [],
    searchColumns: [],
    filters: ["itemId", "locationId"]
  },
  requests: {
    table: "dbo.tb_tooling_request",
    defaultSort: "requestNo",
    fields: [],
    requiredFields: [],
    searchColumns: ["requestNo"],
    filters: ["search", "status", "departmentId", "requesterId"]
  },
  transactions: {
    table: "dbo.tb_tooling_stock_transaction",
    defaultSort: "transactionDate",
    fields: [],
    requiredFields: [],
    searchColumns: ["transactionNo", "referenceNo"],
    filters: ["search", "movementType", "itemId", "locationId", "departmentId"]
  },
  planning: {
    table: "dbo.tb_tooling_planning_snapshot",
    defaultSort: "planningStatus",
    fields: [],
    requiredFields: [],
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
