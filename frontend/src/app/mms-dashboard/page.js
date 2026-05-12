export default function MmsDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl content-center gap-5">
        <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-sky-700">Public MMS</p>
          <h1 className="m-0 mt-2 text-4xl font-black tracking-tight">MMS Dashboard</h1>
          <p className="m-0 mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">
            This dashboard is public by design and does not require login. Other system pages must sign in first.
          </p>
        </article>
      </section>
    </main>
  );
}
