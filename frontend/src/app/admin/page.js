const adminNavGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: "DB", active: true },
      { label: "Activity", icon: "AC" }
    ]
  },
  {
    label: "Master Data",
    items: [
      { label: "Departments", icon: "DP" },
      { label: "Areas", icon: "AR" },
      { label: "Machines", icon: "MC" }
    ]
  },
  {
    label: "Access",
    items: [
      { label: "Users", icon: "US" },
      { label: "Permissions", icon: "PM" }
    ]
  }
];

export default function AdminModePage() {
  return (
    <main className="grid min-h-screen grid-cols-[280px_minmax(0,1fr)] bg-slate-100 text-slate-950 max-[900px]:grid-cols-1">
      <aside className="sticky top-0 h-screen overflow-y-auto border-r border-slate-800 bg-slate-950 p-5 text-white max-[900px]:relative max-[900px]:h-auto">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-sm font-black shadow-lg shadow-violet-600/25">
            AD
          </span>
          <div>
            <h1 className="m-0 text-lg font-black leading-tight">Admin Mode</h1>
            <p className="m-0 mt-1 text-sm font-bold text-slate-400">System Control</p>
          </div>
        </div>

        <button
          className="mb-5 h-11 w-full rounded-xl border border-white/10 bg-white/10 text-sm font-black text-white transition hover:bg-white/15"
          type="button"
        >
          Collapse
        </button>

        <nav className="grid gap-3" aria-label="Admin navigation">
          {adminNavGroups.map((group) => (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-2" key={group.label}>
              <button
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-200"
                type="button"
              >
                <span>
                  <b className="block text-sm font-black">{group.label}</b>
                  <small className="text-xs font-bold text-slate-500">{group.items.length} menus</small>
                </span>
                <span className="text-xs font-black text-slate-500">v</span>
              </button>

              <div className="mt-2 grid gap-1.5">
                {group.items.map((item) => (
                  <button
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-black transition ${
                      item.active
                        ? "border-violet-400/50 bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                        : "border-transparent text-slate-300 hover:bg-white/10"
                    }`}
                    key={item.label}
                    type="button"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs text-violet-300">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 p-6 max-[760px]:p-4">
        <header className="mb-5 flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm max-[760px]:flex-col max-[760px]:items-start">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-violet-700">Administration</p>
            <h2 className="m-0 mt-1 text-3xl font-black tracking-tight">Admin Console</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-700">
              Ready
            </span>
            <button className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white" type="button">
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Workspace</p>
            <h3 className="m-0 mt-2 text-2xl font-black">Admin mode is ready for setup.</h3>
            <p className="m-0 mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              This page is an empty admin shell prepared for sidebar navigation, top navbar, and future CRUD pages.
            </p>
          </article>

          <div className="grid grid-cols-3 gap-4 max-[1000px]:grid-cols-1">
            {["Users", "Master Data", "Permissions"].map((title) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={title}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-sm font-black text-violet-700">
                  {title.slice(0, 2).toUpperCase()}
                </span>
                <h4 className="m-0 mt-4 text-lg font-black">{title}</h4>
                <p className="m-0 mt-2 text-sm font-semibold text-slate-500">Placeholder area for the next step.</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
