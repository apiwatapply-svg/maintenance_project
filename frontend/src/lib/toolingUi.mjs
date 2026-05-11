export const toolingFilterStorageKeys = {
  items: "toolingFilters:items",
  stock: "toolingFilters:stock"
};

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
  }
];

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
