export const sessionConfigs = {
  admin: {
    key: "adminSession",
    homePath: "/admin",
    loginPath: "/admin/login",
    feature: "admin"
  },
  pm: {
    key: "pmSession",
    homePath: "/preventive-maintenance",
    loginPath: "/preventive-maintenance/login",
    feature: "pm"
  },
  store: {
    key: "toolingStoreSession",
    homePath: "/tooling-store",
    loginPath: "/tooling-store/login",
    feature: "store"
  },
  job: {
    key: "jobRequestSession",
    homePath: "/job-request",
    loginPath: "/job-request/login",
    feature: "job"
  }
};

export const protectedSessionTypes = ["admin", "pm", "store", "job"];

export function getSessionConfig(type) {
  return sessionConfigs[type];
}

export function getStoredSession(type) {
  const config = getSessionConfig(type);

  if (!config || typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem(config.key));
  } catch {
    localStorage.removeItem(config.key);
    return null;
  }
}

export function saveSession(type, session) {
  const config = getSessionConfig(type);

  if (config) {
    localStorage.setItem(config.key, JSON.stringify(session));
  }
}

export function clearSession(type) {
  const config = getSessionConfig(type);

  if (config) {
    localStorage.removeItem(config.key);
  }
}

export function getFirstActiveSession() {
  if (typeof window === "undefined") {
    return null;
  }

  for (const type of protectedSessionTypes) {
    const session = getStoredSession(type);

    if (session) {
      return {
        type,
        session,
        config: getSessionConfig(type)
      };
    }
  }

  return null;
}
