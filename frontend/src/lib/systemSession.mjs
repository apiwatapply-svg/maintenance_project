export const systemTypes = ["pm", "store", "job"];

export const systemConfigs = {
  pm: {
    sessionKey: "pmSession",
    loginPath: "/preventive-maintenance/login",
    homePath: "/preventive-maintenance",
    permissionKey: "preventiveMaintenance",
    label: "Preventive Maintenance"
  },
  store: {
    sessionKey: "toolingStoreSession",
    loginPath: "/tooling-store/login",
    homePath: "/tooling-store",
    permissionKey: "toolingStore",
    label: "Toolling & Store"
  },
  job: {
    sessionKey: "jobRequestSession",
    loginPath: "/job-request/login",
    homePath: "/job-request",
    permissionKey: "jobRequest",
    label: "Job Request"
  }
};

export function getSystemConfig(type) {
  return systemConfigs[type];
}

export function getSystemSessionRedirect(pathname, sessions) {
  const activeType = systemTypes.find((type) => sessions[type]);

  if (!activeType) {
    return null;
  }

  const activeConfig = getSystemConfig(activeType);
  const loginPaths = systemTypes.map((type) => getSystemConfig(type).loginPath);
  loginPaths.push("/admin/login");

  if (pathname === "/" || loginPaths.includes(pathname)) {
    return activeConfig.homePath;
  }

  return null;
}

export function canAccessFeature(user, permissionKey) {
  const access = user?.permissions?.[permissionKey];
  return access === "user" || access === "admin";
}

export function getSystemLogoutRedirect() {
  return "/";
}
