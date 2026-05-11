"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getToolingApiHeaders,
  getToolingNavItems,
  getToolingPageMeta,
  getToolingSessionRedirect
} from "@/lib/toolingUi.mjs";

export default function ToolingLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pageMeta = getToolingPageMeta(pathname);
  const headers = useMemo(() => getToolingApiHeaders(session), [session]);

  useEffect(() => {
    const rawSession = localStorage.getItem("toolingStoreSession");

    if (!rawSession) {
      router.replace("/tooling-store/login");
      return;
    }

    try {
      const parsedSession = JSON.parse(rawSession);
      const redirect = getToolingSessionRedirect(pathname, parsedSession);

      if (redirect) {
        router.replace(redirect);
        return;
      }

      setSession(parsedSession);
      setIsChecking(false);
    } catch {
      localStorage.removeItem("toolingStoreSession");
      router.replace("/tooling-store/login");
    }
  }, [pathname, router]);

  function handleLogout() {
    localStorage.removeItem("toolingStoreSession");
    router.replace("/");
  }

  if (isChecking) {
    return null;
  }

  return (
    <main className="tooling-page">
      <style>{toolingLayoutStyles}</style>
      <aside className={`tooling-sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
        <div className="tooling-brand">
          <span className="brand-mark">TS</span>
          <div>
            <strong>Toolling</strong>
            <small>Store Control</small>
          </div>
        </div>

        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? ">" : "<"}
        </button>

        <nav className="tooling-nav" aria-label="Toolling navigation">
          {getToolingNavItems(session?.user?.permissions?.toolingStore).map((item) => (
            <Link
              className={`tooling-nav-link ${pageMeta.key === item.key ? "is-active" : ""}`}
              href={item.href}
              key={item.key}
            >
              <span>{item.icon}</span>
              <b>{item.label}</b>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="tooling-shell">
        <header className="tooling-header">
          <div>
            <p>Inventory Control</p>
            <h1>{pageMeta.title}</h1>
          </div>
          <div className="tooling-user">
            <span>{session?.user?.name || session?.user?.username}</span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {children({ session, headers })}
      </section>
    </main>
  );
}

const toolingLayoutStyles = `
@keyframes toolingConveyor {
  from { background-position-x: 0; }
  to { background-position-x: 52px; }
}
@keyframes toolingSignal {
  0%, 100% { opacity: .45; transform: scale(.92); }
  50% { opacity: 1; transform: scale(1); }
}
.tooling-page {
  min-height: 100vh;
  display: flex;
  background:
    linear-gradient(90deg, rgb(15 23 42 / .045) 1px, transparent 1px),
    linear-gradient(180deg, rgb(15 23 42 / .045) 1px, transparent 1px),
    #eef3f8;
  background-size: 26px 26px;
  color: #0f172a;
}
.tooling-sidebar {
  position: sticky;
  top: 0;
  width: 264px;
  height: 100vh;
  flex: 0 0 auto;
  border-right: 1px solid #cbd5e1;
  background: #0f1f2e;
  color: white;
  padding: 18px;
  transition: width .2s ease;
}
.tooling-sidebar.is-collapsed {
  width: 88px;
}
.tooling-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
}
.brand-mark,
.tooling-nav-link span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 2px solid #101827;
  border-radius: 8px;
  background: #f59e0b;
  color: #101827;
  font-size: 13px;
  font-weight: 950;
  box-shadow: 4px 5px 0 rgb(0 0 0 / .22);
}
.tooling-brand strong,
.tooling-brand small {
  display: block;
  white-space: nowrap;
}
.tooling-brand small {
  margin-top: 2px;
  color: #cbd5e1;
  font-weight: 800;
}
.tooling-sidebar.is-collapsed .tooling-brand div,
.tooling-sidebar.is-collapsed .tooling-nav-link b {
  display: none;
}
.sidebar-toggle {
  width: 100%;
  margin: 20px 0 12px;
  border: 1px solid rgb(255 255 255 / .18);
  border-radius: 8px;
  background: rgb(255 255 255 / .08);
  color: white;
  padding: 10px;
  font-weight: 950;
}
.tooling-nav {
  display: grid;
  gap: 10px;
}
.tooling-nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 10px;
  color: #dbeafe;
  text-decoration: none;
}
.tooling-nav-link.is-active {
  border-color: rgb(245 158 11 / .42);
  background: rgb(245 158 11 / .13);
  color: white;
}
.tooling-nav-link.is-active span {
  animation: toolingSignal 1.7s ease-in-out infinite;
}
.tooling-shell {
  width: 100%;
  padding: 22px;
}
.tooling-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 94px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background:
    repeating-linear-gradient(90deg, rgb(245 158 11 / .12) 0 18px, transparent 18px 52px),
    white;
  background-size: 52px 100%;
  box-shadow: 0 10px 24px rgb(15 23 42 / .08);
  padding: 20px;
  animation: toolingConveyor 7s linear infinite;
}
.tooling-header p {
  margin: 0 0 6px;
  color: #b45309;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.tooling-header h1 {
  margin: 0;
  font-size: clamp(1.9rem, 4vw, 3.2rem);
  line-height: 1;
}
.tooling-user {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 900;
}
.tooling-user button {
  border: 0;
  border-radius: 8px;
  background: #0f172a;
  color: white;
  padding: 11px 16px;
  font-weight: 950;
}
.tooling-content {
  margin-top: 18px;
}
@media (max-width: 820px) {
  .tooling-page {
    display: block;
  }
  .tooling-sidebar {
    position: relative;
    width: 100%;
    height: auto;
  }
  .tooling-sidebar.is-collapsed {
    width: 100%;
  }
  .tooling-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .tooling-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
`;
