"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSystemConfig, getSystemLogoutRedirect } from "@/lib/systemSession.mjs";

const workspaceThemes = {
  pm: {
    accent: "#059669",
    panel: "#064e3b",
    title: "Preventive Maintenance",
    subtitle: "Maintenance workspace"
  },
  store: {
    accent: "#d97706",
    panel: "#78350f",
    title: "Toolling & Store",
    subtitle: "Store and tooling workspace"
  },
  job: {
    accent: "#0284c7",
    panel: "#0c4a6e",
    title: "Job Request",
    subtitle: "Request desk workspace"
  }
};

export default function SystemWorkspacePage({ type }) {
  const router = useRouter();
  const config = getSystemConfig(type);
  const theme = workspaceThemes[type];
  const [session, setSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const rawSession = localStorage.getItem(config.sessionKey);

    if (!rawSession) {
      router.replace(config.loginPath);
      return;
    }

    try {
      setSession(JSON.parse(rawSession));
    } catch {
      localStorage.removeItem(config.sessionKey);
      router.replace(config.loginPath);
      return;
    }

    setIsCheckingSession(false);
  }, [config.loginPath, config.sessionKey, router]);

  function handleLogout() {
    localStorage.removeItem(config.sessionKey);
    router.replace(getSystemLogoutRedirect());
  }

  if (isCheckingSession) {
    return null;
  }

  const access = session?.user?.permissions?.[config.permissionKey] || "none";

  return (
    <main className="system-workspace-page">
      <style>{workspaceStyles}</style>
      <section className="system-workspace-shell">
        <header className="system-workspace-header" style={{ borderColor: theme.accent }}>
          <div>
            <p style={{ color: theme.accent }}>{theme.subtitle}</p>
            <h1>{theme.title}</h1>
            <span>
              Signed in as {session?.user?.name || session?.user?.username} with {access} access.
            </span>
          </div>
          <button type="button" onClick={handleLogout} style={{ backgroundColor: theme.accent }}>
            Logout
          </button>
        </header>

        <section className="system-workspace-panel" style={{ backgroundColor: theme.panel }}>
          <div className="workspace-grid" />
          <div className="workspace-machine" aria-hidden="true">
            <span className="machine-line line-a" />
            <span className="machine-line line-b" />
            <span className="machine-dot" />
          </div>
          <div className="workspace-copy">
            <p>{config.label}</p>
            <h2>Workspace ready</h2>
            <span>Feature pages can be connected here when the module is ready.</span>
          </div>
        </section>
      </section>
    </main>
  );
}

const workspaceStyles = `
@keyframes panelPulse {
  0%, 100% { opacity: .55; transform: translateX(-12px); }
  50% { opacity: 1; transform: translateX(12px); }
}
.system-workspace-page {
  min-height: 100vh;
  padding: 28px;
  background:
    linear-gradient(90deg, rgb(15 23 42 / .04) 1px, transparent 1px),
    linear-gradient(180deg, rgb(15 23 42 / .04) 1px, transparent 1px),
    #f8fafc;
  color: #0f172a;
}
.system-workspace-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
}
.system-workspace-header,
.system-workspace-panel {
  border: 3px solid #0f172a;
  border-radius: 8px;
  box-shadow: 9px 10px 0 rgb(15 23 42 / .12);
}
.system-workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  background: rgb(255 255 255 / .96);
  padding: 24px;
}
.system-workspace-header p,
.workspace-copy p {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.system-workspace-header h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: .95;
}
.system-workspace-header span {
  display: block;
  margin-top: 12px;
  color: #475569;
  font-weight: 800;
}
.system-workspace-header button {
  min-width: 122px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-weight: 950;
  box-shadow: 5px 6px 0 rgb(15 23 42 / .18);
}
.system-workspace-panel {
  position: relative;
  min-height: 420px;
  margin-top: 18px;
  overflow: hidden;
  color: white;
}
.workspace-grid {
  position: absolute;
  inset: 0;
  opacity: .16;
  background-image:
    linear-gradient(rgb(255 255 255 / .65) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / .65) 1px, transparent 1px);
  background-size: 34px 34px;
}
.workspace-machine {
  position: absolute;
  right: 60px;
  top: 74px;
  width: 280px;
  height: 180px;
  border: 5px solid #0f172a;
  border-radius: 18px;
  background: #e0f2fe;
  box-shadow: 10px 12px 0 rgb(15 23 42 / .22);
}
.machine-line {
  position: absolute;
  left: 34px;
  height: 10px;
  border-radius: 999px;
  background: #0f172a;
}
.line-a { top: 52px; width: 170px; }
.line-b { top: 86px; width: 118px; opacity: .45; }
.machine-dot {
  position: absolute;
  right: 34px;
  bottom: 34px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 12px rgb(34 197 94 / .18);
  animation: panelPulse 2s ease-in-out infinite;
}
.workspace-copy {
  position: absolute;
  left: 34px;
  bottom: 34px;
  z-index: 2;
  max-width: 460px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  background: rgb(255 255 255 / .95);
  padding: 20px;
  color: #0f172a;
}
.workspace-copy h2 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.6rem);
  line-height: .98;
}
.workspace-copy span {
  display: block;
  margin-top: 12px;
  color: #475569;
  font-weight: 800;
  line-height: 1.6;
}
@media (max-width: 760px) {
  .system-workspace-page {
    padding: 18px;
  }
  .system-workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .workspace-machine {
    right: 28px;
    width: 230px;
  }
  .workspace-copy {
    left: 20px;
    right: 20px;
    bottom: 20px;
  }
}
`;
