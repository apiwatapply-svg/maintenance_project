"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppFooter from "@/components/AppFooter";
import { clearSession, getSessionConfig, getStoredSession } from "@/lib/session";
import { buildConfirmAlert } from "@/lib/swalHelpers";

const workspaceThemes = {
  pm: {
    code: "PM",
    title: "Preventive Maintenance",
    subtitle: "Maintenance Planning",
    accent: "emerald",
    nav: [
      { label: "Dashboard", icon: "DB", active: true },
      { label: "Plans", icon: "PL" },
      { label: "Inspection", icon: "IN" }
    ]
  },
  store: {
    code: "TS",
    title: "Toolling & Store",
    subtitle: "Inventory Control",
    accent: "amber",
    nav: [
      { label: "Dashboard", icon: "DB", active: true },
      { label: "Spare Parts", icon: "SP" },
      { label: "Stock Movement", icon: "SM" }
    ]
  },
  job: {
    code: "JR",
    title: "Job Request",
    subtitle: "Repair Request Flow",
    accent: "sky",
    nav: [
      { label: "Requests", icon: "RQ", active: true },
      { label: "Repair Jobs", icon: "RJ" },
      { label: "History", icon: "HS" }
    ]
  }
};

const accentClasses = {
  emerald: {
    badge: "bg-emerald-600 shadow-emerald-600/25",
    text: "text-emerald-700",
    soft: "bg-emerald-50 text-emerald-700",
    active: "border-emerald-400/50 bg-emerald-600 text-white shadow-emerald-600/20"
  },
  amber: {
    badge: "bg-amber-500 text-slate-950 shadow-amber-500/25",
    text: "text-amber-700",
    soft: "bg-amber-50 text-amber-800",
    active: "border-amber-400/50 bg-amber-500 text-slate-950 shadow-amber-500/20"
  },
  sky: {
    badge: "bg-sky-600 shadow-sky-600/25",
    text: "text-sky-700",
    soft: "bg-sky-50 text-sky-700",
    active: "border-sky-400/50 bg-sky-600 text-white shadow-sky-600/20"
  }
};

export default function ProtectedWorkspaceShell({ type }) {
  const router = useRouter();
  const config = getSessionConfig(type);
  const theme = workspaceThemes[type];
  const colors = accentClasses[theme.accent];
  const [session, setSession] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedSession = getStoredSession(type);

    if (!storedSession) {
      router.replace(config.loginPath);
      return;
    }

    setSession(storedSession);
    setIsChecking(false);
  }, [config.loginPath, router, type]);

  async function handleLogout() {
    const Swal = (await import("sweetalert2")).default;
    const confirm = await Swal.fire(buildConfirmAlert("Logout?", "You will return to the main page.", { confirmButtonText: "Logout" }));

    if (!confirm.isConfirmed) {
      return;
    }

    clearSession(type);
    router.replace("/");
  }

  if (isChecking) {
    return null;
  }

  return (
    <main className={`grid min-h-screen bg-slate-100 text-slate-950 max-[900px]:grid-cols-1 ${isSidebarCollapsed ? "grid-cols-[80px_minmax(0,1fr)]" : "grid-cols-[280px_minmax(0,1fr)]"}`}>
      <aside className={`sticky top-0 h-screen overflow-x-hidden overflow-y-auto border-r border-slate-800 bg-slate-950 text-white transition-all max-[900px]:relative max-[900px]:h-auto ${isSidebarCollapsed ? "p-4" : "p-5"}`}>
        <div className={`mb-6 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
          <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black shadow-lg ${colors.badge}`}>
            {theme.code}
          </span>
          <div className={isSidebarCollapsed ? "hidden" : ""}>
            <h1 className="m-0 text-lg font-black leading-tight">{theme.title}</h1>
            <p className="m-0 mt-1 text-sm font-bold text-slate-400">{theme.subtitle}</p>
          </div>
        </div>

        <button
          className="mb-5 h-11 w-full rounded-xl border border-white/10 bg-white/10 text-sm font-black text-white transition hover:bg-white/15"
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? ">" : "Collapse"}
        </button>

        <nav className="grid gap-3" aria-label={`${theme.title} navigation`}>
          <section className={`rounded-2xl border border-white/10 bg-white/[0.04] ${isSidebarCollapsed ? "p-1" : "p-2"}`}>
            <button className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-200 ${isSidebarCollapsed ? "hidden" : ""}`} type="button">
              <span>
                <b className="block text-sm font-black">Workspace</b>
                <small className="text-xs font-bold text-slate-500">{theme.nav.length} menus</small>
              </span>
              <span className="text-xs font-black text-slate-500">v</span>
            </button>
            <div className={`${isSidebarCollapsed ? "mt-0" : "mt-2"} grid gap-1.5`}>
              {theme.nav.map((item) => (
                <button
                  className={`flex w-full items-center rounded-xl border py-2.5 text-sm font-black transition ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3 text-left"} ${
                    item.active ? colors.active : "border-transparent text-slate-300 hover:bg-white/10"
                  }`}
                  key={item.label}
                  type="button"
                  title={item.label}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs text-slate-300">
                    {item.icon}
                  </span>
                  <span className={isSidebarCollapsed ? "hidden" : ""}>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col p-6 max-[760px]:p-4">
        <header className="mb-5 flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm max-[760px]:flex-col max-[760px]:items-start">
          <div>
            <p className={`m-0 text-xs font-black uppercase tracking-[0.16em] ${colors.text}`}>{theme.subtitle}</p>
            <h2 className="m-0 mt-1 text-3xl font-black tracking-tight">{theme.title}</h2>
            <span className="mt-1 block text-sm font-bold text-slate-500">
              Signed in as {session?.user?.empName || session?.user?.username}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1.5 text-sm font-black ${colors.soft}`}>Ready</span>
            <button className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Workspace</p>
            <h3 className="m-0 mt-2 text-2xl font-black">{theme.title} is ready for setup.</h3>
            <p className="m-0 mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              This page is protected by login and prepared for the next module screens.
            </p>
          </article>
        </section>
        <AppFooter label={theme.title} />
      </section>
    </main>
  );
}
