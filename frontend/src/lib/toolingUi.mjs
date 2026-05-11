export const toolingFilterStorageKeys = {
  items: "toolingFilters:items",
  stock: "toolingFilters:stock"
};

export const toolingCriticalLevelOptions = ["", "normal", "important", "critical"];
const toolingImageMaxBytes = 5 * 1024 * 1024;
const toolingImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const navItems = [
  {
    key: "dashboard",
    href: "/tooling-store",
    label: "Dashboard",
    icon: "DB",
    title: "Toolling Dashboard"
  },
  {
    key: "items",
    href: "/tooling-store/items",
    label: "Spare Parts",
    icon: "SP",
    title: "Spare Part Master"
  },
  {
    key: "stock",
    href: "/tooling-store/stock",
    label: "Stock Balance",
    icon: "ST",
    title: "Stock Balance"
  },
  {
    key: "stockIn",
    href: "/tooling-store/stock-in",
    label: "Stock In",
    icon: "IN",
    title: "Stock In"
  },
  {
    key: "stockOut",
    href: "/tooling-store/stock-out",
    label: "Stock Out",
    icon: "OUT",
    title: "Stock Out"
  },
  {
    key: "return",
    href: "/tooling-store/return",
    label: "Return",
    icon: "RT",
    title: "Return"
  },
  {
    key: "planning",
    href: "/tooling-store/planning",
    label: "Planning",
    icon: "PL",
    title: "Inventory Planning"
  },
  {
    key: "reports",
    href: "/tooling-store/reports",
    label: "Reports",
    icon: "RP",
    title: "Reports"
  }
];

const movementConfigs = {
  stockIn: {
    key: "stockIn",
    endpoint: "/tooling/stock-in",
    title: "Stock In",
    actionLabel: "Receive Stock",
    quantityLabel: "Receive Quantity",
    referenceLabel: "PO / Invoice / Reference"
  },
  stockOut: {
    key: "stockOut",
    endpoint: "/tooling/stock-out",
    title: "Stock Out",
    actionLabel: "Issue Stock",
    quantityLabel: "Issue Quantity",
    referenceLabel: "Job / PM / Reference"
  }
};

const toolingReferenceOptions = {
  stockIn: [
    { value: "PO", label: "PO" },
    { value: "INV", label: "Invoice" },
    { value: "DN", label: "Delivery Note" },
    { value: "ADJ-IN", label: "Adjustment In" }
  ],
  stockOut: [
    { value: "PM", label: "Preventive Maintenance" },
    { value: "JOB", label: "Job Request" },
    { value: "MACHINE", label: "Machine" },
    { value: "ADJ-OUT", label: "Adjustment Out" }
  ]
};

export function getToolingNavItems() {
  return navItems;
}

export function getToolingPageMeta(pathname) {
  return navItems.find((item) => item.href === pathname) || navItems[0];
}

export function getToolingSessionRedirect(pathname, session) {
  if (pathname?.startsWith("/tooling-store") && pathname !== "/tooling-store/login" && !session) {
    return "/tooling-store/login";
  }

  return null;
}

export function getToolingApiHeaders(session) {
  const username = session?.user?.username;
  return username ? { "x-username": username } : {};
}

export function buildToolingQuery(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

export function getToolingPageRange(pagination) {
  const total = Number(pagination?.total || 0);
  const page = Math.max(Number(pagination?.page || 1), 1);
  const pageSize = Math.max(Number(pagination?.pageSize || 10), 1);

  if (!total) {
    return { from: 0, to: 0 };
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to };
}

function getDefaultToolingApiBaseUrl() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:5000/api";
  }

  return "http://localhost:5000/api";
}

export function resolveToolingImageUrl(value, apiBaseUrl = getDefaultToolingApiBaseUrl()) {
  const imagePath = String(value || "").trim();

  if (!imagePath) {
    return "";
  }

  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("data:")) {
    return imagePath;
  }

  const apiOrigin = String(apiBaseUrl || "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/$/, "");
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;

  return `${apiOrigin}${normalizedPath}`;
}

export function validateToolingImageFileMeta(file) {
  if (!file) {
    return "Image file is required.";
  }

  if (!toolingImageTypes.has(file.type)) {
    return "Only jpg, png, and webp images are allowed.";
  }

  if (Number(file.size || 0) > toolingImageMaxBytes) {
    return "Image must be 5 MB or smaller.";
  }

  return "";
}

export function getToolingMovementConfig(key) {
  const config = movementConfigs[key];

  if (!config) {
    throw new Error("Toolling movement config not found");
  }

  return config;
}

export function normalizeToolingScanCode(value) {
  return String(value || "").trim();
}

export function normalizeToolingQuantityInput(value) {
  const text = String(value || "");
  let hasDecimalPoint = false;

  return text
    .split("")
    .filter((character) => {
      if (character >= "0" && character <= "9") {
        return true;
      }

      if (character === "." && !hasDecimalPoint) {
        hasDecimalPoint = true;
        return true;
      }

      return false;
    })
    .join("");
}

export function buildToolingScanLookupPath(value) {
  const code = normalizeToolingScanCode(value);
  return code ? `/tooling/items/qr/${encodeURIComponent(code)}` : "";
}

export function getToolingReferenceOptions(key) {
  return toolingReferenceOptions[key] || [];
}

export function getToolingScanFormPatch(item, current = {}) {
  return {
    ...current,
    itemId: item?.id || current.itemId || "",
    locationId: item?.locationId || current.locationId || "",
    quantity: "1"
  };
}

export function validateToolingMovementForm(form, options = {}) {
  const errors = {};
  const quantity = Number(form?.quantity);
  const availableBalance =
    options.currentBalance?.quantityOnHand ?? options.selectedItem?.quantityOnHand ?? 0;

  if (!form?.itemId) {
    errors.itemId = "Item is required.";
  }

  if (!form?.locationId) {
    errors.locationId = "Location is required.";
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = "Quantity must be a number greater than zero.";
  }

  if (
    options.movementKey === "stockOut" &&
    Number.isFinite(quantity) &&
    quantity > Number(availableBalance)
  ) {
    errors.quantity = "Quantity exceeds current balance.";
  }

  return errors;
}

export function getToolingItemDefaultForm() {
  return {
    itemCode: "",
    itemName: "",
    categoryId: "",
    itemType: "spare_part",
    unit: "pcs",
    minimumStock: 0,
    maximumStock: 0,
    safetyStock: 0,
    leadTimeDays: 0,
    slowMovementDays: 90,
    deadStockDays: 180,
    minimumOrderQuantity: 1,
    preferredSupplierId: "",
    criticalLevel: "normal",
    locationId: "",
    qrCode: "",
    imageUrl: "",
    status: "active"
  };
}

export function validateToolingItemForm(form) {
  const errors = {};

  if (!form?.itemCode?.trim()) {
    errors.itemCode = "Item code is required.";
  }

  if (!form?.itemName?.trim()) {
    errors.itemName = "Item name is required.";
  }

  if (!form?.unit?.trim()) {
    errors.unit = "Unit is required.";
  }

  return errors;
}

export function formatToolingBalance(balance) {
  const quantity = Number(balance?.quantityOnHand || 0);
  const minimumStock = Number(balance?.minimumStock || 0);
  const unit = balance?.unit ? ` ${balance.unit}` : "";

  return {
    label: `${quantity.toLocaleString()}${unit}`,
    isLow: quantity <= minimumStock
  };
}

export function getToolingRequestDefaultForm() {
  return {
    referenceType: "general",
    referenceId: "",
    remark: "",
    items: []
  };
}

export function validateToolingRequestForm(form) {
  const errors = {};

  if (!Array.isArray(form?.items) || form.items.length === 0) {
    errors.items = "Add at least one item.";
    return errors;
  }

  const hasInvalidItem = form.items.some(
    (item) => !item.itemId || !item.locationId || Number(item.quantity || 0) <= 0
  );

  if (hasInvalidItem) {
    errors.items = "Every item needs item, location, and quantity greater than zero.";
  }

  return errors;
}

export function getToolingReturnDefaultForm() {
  return {
    itemId: "",
    locationId: "",
    quantity: "",
    condition: "good",
    referenceNo: "",
    remark: ""
  };
}

export function validateToolingReturnForm(form) {
  const errors = {};
  const quantity = Number(form?.quantity);

  if (!form?.itemId) {
    errors.itemId = "Item is required.";
  }

  if (!form?.locationId) {
    errors.locationId = "Location is required.";
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = "Quantity must be a number greater than zero.";
  }

  if (!["good", "damaged", "lost"].includes(form?.condition)) {
    errors.condition = "Condition must be good, damaged, or lost.";
  }

  return errors;
}
