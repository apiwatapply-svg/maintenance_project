export const toolingPages = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/tooling-store",
    icon: "DB",
    title: "Tooling Dashboard"
  },
  {
    key: "master-data",
    label: "Master Data",
    href: "/tooling-store/master-data",
    icon: "MD",
    title: "Master Data",
    children: ["tools", "stock-items", "categories", "locations", "units"]
  },
  {
    key: "tool-borrowing",
    label: "Tool Borrowing",
    href: "/tooling-store/tool-borrowing",
    icon: "TB",
    title: "Tool Borrowing",
    children: ["borrow-issue", "return-tool", "overdue-borrow"]
  },
  {
    key: "spare-part-stock",
    label: "Spare Part Stock",
    href: "/tooling-store/spare-part-stock",
    icon: "SP",
    title: "Spare Part Stock",
    children: ["stock-in", "stock-out", "stock-balance"]
  },
  {
    key: "calibration",
    label: "Calibration",
    href: "/tooling-store/calibration",
    icon: "CA",
    title: "Calibration",
    children: ["calibration-list", "calibration-due-soon", "calibration-expired"]
  },
  {
    key: "history",
    label: "History",
    href: "/tooling-store/history",
    icon: "HS",
    title: "History",
    children: ["movement-history"]
  },
  {
    key: "tools",
    label: "Tool List",
    href: "/tooling-store/tools",
    icon: "TL",
    title: "Tool List",
    endpoint: "tools",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "tool_code", label: "Tool Code" },
      { key: "tool_name", label: "Tool Name" },
      { key: "category_code", label: "Category" },
      { key: "brand", label: "Brand" },
      { key: "model", label: "Model" },
      { key: "serial_number", label: "Serial No." },
      { key: "location_code", label: "Location" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "tool_code", label: "Tool Code", required: true },
      { key: "tool_name", label: "Tool Name", required: true },
      { key: "category_code", label: "Category", type: "lookup", lookup: "categories", required: true },
      { key: "brand", label: "Brand" },
      { key: "model", label: "Model" },
      { key: "serial_number", label: "Serial Number" },
      { key: "location_code", label: "Location", type: "lookup", lookup: "locations", required: true },
      { key: "status", label: "Status", type: "select", options: ["Available", "Borrowed", "Repair", "Lost"] },
      { key: "minimum_stock", label: "Minimum Stock", type: "number" },
      { key: "unit_code", label: "Unit", type: "lookup", lookup: "units" },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/torque-wrench.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "status", "category_code", "location_code"]
  },
  {
    key: "stock-items",
    label: "Spare Parts",
    href: "/tooling-store/stock-items",
    icon: "ST",
    title: "Spare Part / Consumable",
    endpoint: "stock-items",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "category_code", label: "Category" },
      { key: "location_code", label: "Location" },
      { key: "current_stock", label: "Current" },
      { key: "minimum_stock", label: "Min" },
      { key: "unit_code", label: "Unit" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "item_code", label: "Item Code", required: true },
      { key: "item_name", label: "Item Name", required: true },
      { key: "category_code", label: "Category", type: "lookup", lookup: "categories", required: true },
      { key: "location_code", label: "Location", type: "lookup", lookup: "locations", required: true },
      { key: "unit_code", label: "Unit", type: "lookup", lookup: "units", required: true },
      { key: "current_stock", label: "Current Stock", type: "number" },
      { key: "minimum_stock", label: "Minimum Stock", type: "number" },
      { key: "maximum_stock", label: "Maximum Stock", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"] },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/bearing.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "status", "category_code", "location_code"]
  },
  {
    key: "categories",
    label: "Categories",
    href: "/tooling-store/categories",
    icon: "CG",
    title: "Tool Categories",
    endpoint: "categories",
    columns: [
      { key: "category_code", label: "Code" },
      { key: "category_name", label: "Category" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "category_code", label: "Code", required: true },
      { key: "category_name", label: "Category", required: true },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"] }
    ],
    filters: ["search", "status"]
  },
  {
    key: "locations",
    label: "Locations",
    href: "/tooling-store/locations",
    icon: "LC",
    title: "Tool Locations",
    endpoint: "locations",
    columns: [
      { key: "location_code", label: "Code" },
      { key: "location_name", label: "Location" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "location_code", label: "Code", required: true },
      { key: "location_name", label: "Location", required: true },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"] }
    ],
    filters: ["search", "status"]
  },
  {
    key: "units",
    label: "Units",
    href: "/tooling-store/units",
    icon: "UN",
    title: "Units",
    endpoint: "units",
    columns: [
      { key: "unit_code", label: "Code" },
      { key: "unit_name", label: "Unit" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "unit_code", label: "Code", required: true },
      { key: "unit_name", label: "Unit", required: true },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"] }
    ],
    filters: ["search", "status"]
  },
  {
    key: "borrow-issue",
    label: "Borrow / Issue",
    href: "/tooling-store/borrow-issue",
    icon: "BI",
    title: "Borrow / Issue Tool",
    endpoint: "borrow-issue",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "issue_no", label: "Issue No." },
      { key: "request_no", label: "Request No." },
      { key: "tool_code", label: "Tool Code" },
      { key: "tool_name", label: "Tool Name" },
      { key: "borrower", label: "Borrower" },
      { key: "issue_date", label: "Issue Date" },
      { key: "due_date", label: "Due Date" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "issue_no", label: "Issue No.", readOnly: true, autoNumber: true },
      { key: "request_no", label: "Request No." },
      { key: "tool_code", label: "Tool Code / Tool Name / Serial", type: "lookup", lookup: "tools", required: true, autoFill: { tool_name: "tool_name", image_path: "image_path" } },
      { key: "tool_name", label: "Tool Name", readOnly: true },
      { key: "borrower", label: "Borrower", required: true },
      { key: "issue_date", label: "Issue Date", type: "date", required: true },
      { key: "due_date", label: "Due Date", type: "date", required: true },
      { key: "status", label: "Status", type: "select", options: ["Ready To Issue", "Issued", "Returned"] },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/caliper.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "status"],
    description: "Issue available tools to approved borrowers with due date tracking.",
  },
  {
    key: "return-tool",
    label: "Return Tool",
    href: "/tooling-store/return-tool",
    icon: "RT",
    title: "Return Tool",
    endpoint: "return-tool",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "return_no", label: "Return No." },
      { key: "issue_no", label: "Issue No." },
      { key: "tool_code", label: "Tool Code" },
      { key: "tool_name", label: "Tool Name" },
      { key: "return_by", label: "Return By" },
      { key: "return_date", label: "Return Date" },
      { key: "condition_status", label: "Condition" }
    ],
    fields: [
      { key: "return_no", label: "Return No.", readOnly: true, autoNumber: true },
      { key: "issue_no", label: "Issue No.", type: "lookup", lookup: "borrowIssues", required: true, autoFill: { tool_code: "tool_code", tool_name: "tool_name", image_path: "image_path" } },
      { key: "tool_code", label: "Tool Code", readOnly: true },
      { key: "tool_name", label: "Tool Name", readOnly: true },
      { key: "return_by", label: "Return By", required: true },
      { key: "return_date", label: "Return Date", type: "date", required: true },
      { key: "condition_status", label: "Condition", type: "select", options: ["Good", "Need Check", "Damaged"] },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/dial-gauge.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "condition_status"],
    description: "Receive returned tools and update tool availability.",
  },
  {
    key: "overdue-borrow",
    label: "Overdue Borrow",
    href: "/tooling-store/overdue-borrow",
    icon: "OD",
    title: "Overdue Borrow",
    endpoint: "overdue-borrow",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "borrow_no", label: "Borrow No." },
      { key: "tool_code", label: "Tool Code" },
      { key: "tool_name", label: "Tool Name" },
      { key: "borrower", label: "Borrower" },
      { key: "department", label: "Department" },
      { key: "due_date", label: "Due Date" },
      { key: "overdue_days", label: "Overdue Days" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "borrow_no", label: "Borrow No.", required: true },
      { key: "tool_code", label: "Tool Code", required: true },
      { key: "tool_name", label: "Tool Name", required: true },
      { key: "borrower", label: "Borrower", required: true },
      { key: "department", label: "Department", required: true },
      { key: "due_date", label: "Due Date", type: "date", required: true },
      { key: "overdue_days", label: "Overdue Days", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Overdue", "Followed", "Returned"] },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/torque-wrench.svg" }
    ],
    filters: ["search", "status"],
    description: "Monitor borrowed tools that passed their due date.",
  },
  {
    key: "stock-in",
    label: "Stock In",
    href: "/tooling-store/stock-in",
    icon: "IN",
    title: "Stock In",
    endpoint: "stock-in",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "receive_no", label: "Receive No." },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "quantity", label: "Quantity" },
      { key: "unit_code", label: "Unit" },
      { key: "location_code", label: "Location" },
      { key: "reference_no", label: "Reference" },
      { key: "receive_date", label: "Receive Date" }
    ],
    fields: [
      { key: "receive_no", label: "Receive No.", readOnly: true, autoNumber: true },
      { key: "item_code", label: "Scan QR / Item Code / Item Name", type: "lookup", lookup: "stockItems", required: true, autoFill: { item_name: "item_name", unit_code: "unit_code", location_code: "location_code", image_path: "image_path" } },
      { key: "item_name", label: "Item Name", readOnly: true },
      { key: "quantity", label: "Receive Quantity", type: "number", defaultValue: 1 },
      { key: "unit_code", label: "Unit", type: "lookup", lookup: "units", required: true },
      { key: "location_code", label: "Location", type: "lookup", lookup: "locations", required: true },
      { key: "reference_no", label: "PO / Invoice / Reference" },
      { key: "receive_date", label: "Receive Date", type: "date", required: true },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/bearing.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "location_code"],
    description: "Receive spare parts or consumables into inventory.",
  },
  {
    key: "stock-out",
    label: "Stock Out",
    href: "/tooling-store/stock-out",
    icon: "OU",
    title: "Stock Out",
    endpoint: "stock-out",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "issue_no", label: "Issue No." },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "quantity", label: "Quantity" },
      { key: "unit_code", label: "Unit" },
      { key: "reference_type", label: "Reference Type" },
      { key: "reference_no", label: "Reference" },
      { key: "issue_date", label: "Issue Date" }
    ],
    fields: [
      { key: "issue_no", label: "Issue No.", readOnly: true, autoNumber: true },
      { key: "item_code", label: "Scan QR / Item Code / Item Name", type: "lookup", lookup: "stockItems", required: true, autoFill: { item_name: "item_name", unit_code: "unit_code", image_path: "image_path" } },
      { key: "item_name", label: "Item Name", readOnly: true },
      { key: "quantity", label: "Issue Quantity", type: "number", defaultValue: 1 },
      { key: "unit_code", label: "Unit", type: "lookup", lookup: "units", required: true },
      { key: "reference_type", label: "Reference Type", type: "select", options: ["PM", "Job Request", "Work Order", "General Use"] },
      { key: "reference_no", label: "Job / PM / Reference" },
      { key: "issue_date", label: "Issue Date", type: "date", required: true },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/insulation-tape.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "reference_type"],
    description: "Issue spare parts or consumables from inventory.",
  },
  {
    key: "stock-balance",
    label: "Stock Balance",
    href: "/tooling-store/stock-balance",
    icon: "SB",
    title: "Stock Balance",
    endpoint: "stock-balance",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "current_stock", label: "Current" },
      { key: "minimum_stock", label: "Min" },
      { key: "maximum_stock", label: "Max" },
      { key: "unit_code", label: "Unit" },
      { key: "location_code", label: "Location" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "item_code", label: "Item Code", required: true },
      { key: "item_name", label: "Item Name", required: true },
      { key: "current_stock", label: "Current Stock", type: "number" },
      { key: "minimum_stock", label: "Minimum Stock", type: "number" },
      { key: "maximum_stock", label: "Maximum Stock", type: "number" },
      { key: "unit_code", label: "Unit", type: "lookup", lookup: "units", required: true },
      { key: "location_code", label: "Location", type: "lookup", lookup: "locations", required: true },
      { key: "status", label: "Status", type: "select", options: ["Normal", "Low Stock", "Over Stock"] },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/bearing.svg" }
    ],
    filters: ["search", "status", "location_code"],
    description: "Check current stock by item, location, minimum stock, and maximum stock.",
  },
  {
    key: "movement-history",
    label: "Movement History",
    href: "/tooling-store/movement-history",
    icon: "MH",
    title: "Movement History",
    endpoint: "movement-history",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "movement_date", label: "Date" },
      { key: "movement_type", label: "Movement Type" },
      { key: "item_code", label: "Code" },
      { key: "item_name", label: "Name" },
      { key: "quantity", label: "Quantity" },
      { key: "reference_no", label: "Reference" },
      { key: "created_by", label: "User" }
    ],
    fields: [
      { key: "movement_date", label: "Date", type: "date", required: true },
      { key: "movement_type", label: "Movement Type", type: "select", options: ["Stock In", "Stock Out", "Borrow", "Return", "Adjustment", "Calibration"] },
      { key: "item_code", label: "Code", required: true },
      { key: "item_name", label: "Name", required: true },
      { key: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
      { key: "reference_no", label: "Reference" },
      { key: "created_by", label: "User" },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/bearing.svg" }
    ],
    filters: ["search", "movement_type"],
    description: "Review stock in, stock out, borrow, return, adjustment, and calibration movement.",
  },
  {
    key: "calibration-list",
    label: "Calibration List",
    href: "/tooling-store/calibration-list",
    icon: "CL",
    title: "Calibration List",
    endpoint: "calibration-list",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "tool_code", label: "Tool Code" },
      { key: "tool_name", label: "Tool Name" },
      { key: "serial_number", label: "Serial Number" },
      { key: "last_calibration_date", label: "Last Calibration" },
      { key: "calibration_interval_days", label: "Every Days" },
      { key: "next_calibration_date", label: "Next Calibration" },
      { key: "status", label: "Status" },
      { key: "owner", label: "Owner" }
    ],
    fields: [
      { key: "tool_code", label: "Tool Code", required: true },
      { key: "tool_name", label: "Tool Name", required: true },
      { key: "serial_number", label: "Serial Number" },
      { key: "last_calibration_date", label: "Last Calibration", type: "date" },
      { key: "calibration_interval_days", label: "Calibrate Every (Days)", type: "number", defaultValue: 180 },
      { key: "next_calibration_date", label: "Next Calibration", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["Normal", "Due Soon", "Expired"] },
      { key: "owner", label: "Owner" },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/torque-wrench.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "status"],
    description: "Track measuring tools and calibration schedules.",
  },
  {
    key: "calibration-due-soon",
    label: "Due Soon",
    href: "/tooling-store/calibration-due-soon",
    icon: "DS",
    title: "Calibration Due Soon",
    endpoint: "calibration-due-soon",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "tool_code", label: "Tool Code" },
      { key: "tool_name", label: "Tool Name" },
      { key: "serial_number", label: "Serial Number" },
      { key: "calibration_interval_days", label: "Every Days" },
      { key: "next_calibration_date", label: "Next Calibration" },
      { key: "owner", label: "Owner" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "tool_code", label: "Tool Code", required: true },
      { key: "tool_name", label: "Tool Name", required: true },
      { key: "serial_number", label: "Serial Number" },
      { key: "last_calibration_date", label: "Last Calibration", type: "date" },
      { key: "calibration_interval_days", label: "Calibrate Every (Days)", type: "number", defaultValue: 180 },
      { key: "next_calibration_date", label: "Next Calibration", type: "date" },
      { key: "owner", label: "Owner" },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/torque-wrench.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "owner"],
    description: "Show tools with next calibration date within 30 days.",
  },
  {
    key: "calibration-expired",
    label: "Expired",
    href: "/tooling-store/calibration-expired",
    icon: "EX",
    title: "Calibration Expired",
    endpoint: "calibration-expired",
    columns: [
      { key: "image_path", label: "Photo", type: "image" },
      { key: "tool_code", label: "Tool Code" },
      { key: "tool_name", label: "Tool Name" },
      { key: "serial_number", label: "Serial Number" },
      { key: "calibration_interval_days", label: "Every Days" },
      { key: "next_calibration_date", label: "Expired Date" },
      { key: "owner", label: "Owner" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { key: "tool_code", label: "Tool Code", required: true },
      { key: "tool_name", label: "Tool Name", required: true },
      { key: "serial_number", label: "Serial Number" },
      { key: "last_calibration_date", label: "Last Calibration", type: "date" },
      { key: "calibration_interval_days", label: "Calibrate Every (Days)", type: "number", defaultValue: 180 },
      { key: "next_calibration_date", label: "Expired Date", type: "date" },
      { key: "owner", label: "Owner" },
      { key: "image_path", label: "Image", type: "image", defaultValue: "/tooling-images/caliper.svg" },
      { key: "remark", label: "Remark", type: "textarea" }
    ],
    filters: ["search", "owner"],
    description: "Show tools with calibration date already expired.",
  },
  {
    key: "reports",
    label: "Reports",
    href: "/tooling-store/reports",
    icon: "RP",
    title: "Reports",
    endpoint: "reports",
    columns: [
      { key: "report_name", label: "Report" },
      { key: "description", label: "Description" },
      { key: "last_generated_date", label: "Last Generated" },
      { key: "row_count", label: "Rows" },
      { key: "report_type", label: "Type" },
      { key: "export_type", label: "Export" }
    ],
    fields: [
      { key: "report_name", label: "Report", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "last_generated_date", label: "Last Generated", type: "date" },
      { key: "row_count", label: "Rows", type: "number" },
      { key: "report_type", label: "Type", type: "select", options: ["Master", "Stock", "Borrow", "Calibration", "Movement"] },
      { key: "export_type", label: "Export", type: "select", options: ["Excel"] }
    ],
    filters: ["search", "report_type"],
    description: "Export tool, spare part, stock, borrow, calibration, and movement reports to Excel.",
  }
];

export const toolingNavigationGroups = [
  { key: "overview", label: "Overview", pages: ["dashboard"] },
  { key: "operations", label: "Operations", pages: ["master-data", "tool-borrowing", "spare-part-stock", "calibration", "history"] },
  { key: "reports", label: "Reports", pages: ["reports"] }
];

export function getToolingPage(key) {
  return toolingPages.find((page) => page.key === key) || null;
}

export function getToolingActionLabel(pageKey) {
  return {
    "borrow-issue": "Issue Tool",
    "return-tool": "Return Tool",
    "stock-in": "Receive Stock",
    "stock-out": "Issue Stock"
  }[pageKey] || "";
}

export function getToolingCalibrationActionFields(pageKey) {
  if (!String(pageKey || "").startsWith("calibration")) {
    return [];
  }

  return ["last_calibration_date", "calibration_interval_days", "next_calibration_date", "remark"];
}

export function canShowToolingCalibrationAction(row = {}) {
  return row.status === "Due Soon";
}

export function getToolingImagePath(rowOrValue = {}) {
  const value = typeof rowOrValue === "string" ? rowOrValue : [
    rowOrValue.image_path,
    rowOrValue.tool_code,
    rowOrValue.tool_name,
    rowOrValue.item_code,
    rowOrValue.item_name
  ].filter(Boolean).join(" ");
  const text = String(value || "").toLowerCase();

  if (text.includes("/tooling-images/")) {
    return String(value).match(/\/tooling-images\/[^\s|]+/)?.[0] || "/tooling-images/torque-wrench.svg";
  }
  if (text.includes("caliper") || text.includes("vernier") || text.includes("tl-cv")) {
    return "/tooling-images/caliper.svg";
  }
  if (text.includes("dial") || text.includes("gauge") || text.includes("tl-dg")) {
    return "/tooling-images/dial-gauge.svg";
  }
  if (text.includes("bearing") || text.includes("brg")) {
    return "/tooling-images/bearing.svg";
  }
  if (text.includes("tape")) {
    return "/tooling-images/insulation-tape.svg";
  }
  if (text.includes("grease")) {
    return "/tooling-images/grease.svg";
  }
  return "/tooling-images/torque-wrench.svg";
}

export function buildToolingQuery(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

export function getToolingFilterStorageKey(pageKey) {
  return `toolingFilters:${pageKey}`;
}

export function getToolingModuleStorageKey(pageKey) {
  return `toolingModule:${pageKey}`;
}

export function getToolingSidebarStorageKey() {
  return "toolingSidebar:expandedGroups";
}

export function getToolingDashboardStorageKey(key) {
  return `toolingDashboard:${key}`;
}

export function getDefaultToolingMovementMonth(date = new Date()) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export function buildToolingMovementRows(monthValue, stockInRows = [], stockOutRows = []) {
  const [year, month] = String(monthValue || getDefaultToolingMovementMonth()).split("-").map(Number);
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
  const monthPrefix = `${safeYear}-${`${safeMonth}`.padStart(2, "0")}`;
  const inByDay = sumQuantityByDay(stockInRows, "receive_date", monthPrefix);
  const outByDay = sumQuantityByDay(stockOutRows, "issue_date", monthPrefix);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const day = `${dayNumber}`.padStart(2, "0");
    return {
      day,
      inQty: inByDay[day] || 0,
      outQty: outByDay[day] || 0
    };
  });
}

function sumQuantityByDay(rows, dateKey, monthPrefix) {
  return rows.reduce((totals, row) => {
    const dateText = String(row[dateKey] || "");
    if (!dateText.startsWith(monthPrefix)) {
      return totals;
    }

    const day = dateText.slice(8, 10);
    totals[day] = (totals[day] || 0) + Math.abs(Number(row.quantity || 0));
    return totals;
  }, {});
}

export function getToolingPageNumbers(page, total, pageSize) {
  const totalPages = Math.max(Math.ceil(Number(total || 0) / Number(pageSize || 10)), 1);
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}
