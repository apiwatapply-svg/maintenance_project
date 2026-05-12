"use client";

import Link from "next/link";
import { useState } from "react";
import AppFooter from "@/components/AppFooter";

export default function MmsDashboardShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <main className={`grid min-h-screen bg-slate-100 text-slate-950 max-[900px]:grid-cols-1 ${isSidebarCollapsed ? "grid-cols-[80px_minmax(0,1fr)]" : "grid-cols-[280px_minmax(0,1fr)]"}`}>
      <aside className={`sticky top-0 h-screen overflow-x-hidden overflow-y-auto border-r border-slate-800 bg-slate-950 text-white transition-all max-[900px]:relative max-[900px]:h-auto ${isSidebarCollapsed ? "p-4" : "p-5"}`}>
        <div className={`mb-6 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-sm font-black shadow-lg shadow-sky-600/25">MS</span>
          <div className={isSidebarCollapsed ? "hidden" : ""}>
            <h1 className="m-0 text-lg font-black leading-tight">MMS Dashboard</h1>
            <p className="m-0 mt-1 text-sm font-bold text-slate-400">Machine Monitoring System</p>
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

        <nav className="grid gap-3" aria-label="MMS navigation">
          <section className={`rounded-2xl border border-white/10 bg-white/[0.04] ${isSidebarCollapsed ? "p-1" : "p-2"}`}>
            <div className={`rounded-xl px-3 py-2 ${isSidebarCollapsed ? "hidden" : ""}`}>
              <b className="block text-sm font-black text-slate-200">Monitoring</b>
              <small className="text-xs font-bold text-slate-500">1 menu</small>
            </div>
            <div className={`${isSidebarCollapsed ? "mt-0" : "mt-2"} grid gap-1.5`}>
              <Link
                className={`flex w-full items-center rounded-xl border border-sky-400/50 bg-sky-600 py-2.5 text-sm font-black text-white no-underline shadow-lg shadow-sky-600/20 transition ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3 text-left"}`}
                href="/mms-dashboard"
                title="Dashboard"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs text-sky-300">DB</span>
                <span className={isSidebarCollapsed ? "hidden" : ""}>Dashboard</span>
              </Link>
            </div>
          </section>
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col p-6 max-[760px]:p-4">
        <header className="mb-5 flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm max-[760px]:flex-col max-[760px]:items-start">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-sky-700">Public MMS</p>
            <h2 className="m-0 mt-1 text-3xl font-black tracking-tight">MMS Dashboard</h2>
            <span className="mt-1 block text-sm font-bold text-slate-500">Machine Monitoring System</span>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-black text-sky-700">Public</span>
        </header>

        <section className="grid flex-1 content-center gap-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Dashboard</p>
            <h3 className="m-0 mt-2 text-2xl font-black">Machine monitoring system is ready for setup.</h3>
            <p className="m-0 mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              This dashboard is public by design and does not require login. Other system pages must sign in first.
            </p>
          </article>
        </section>

        <AppFooter label="MMS Dashboard" />
      </section>
    </main>
  );
}
