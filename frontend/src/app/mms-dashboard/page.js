const statusCards = [
  { label: "Machines Online", value: "96%", tone: "green" },
  { label: "Open PM", value: "18", tone: "blue" },
  { label: "Job Queue", value: "7", tone: "amber" },
  { label: "Critical Alerts", value: "2", tone: "red" }
];

const lineStatus = [
  { line: "Line A", status: "Running", progress: 88 },
  { line: "Line B", status: "Inspection", progress: 64 },
  { line: "Tool Store", status: "Stock Check", progress: 72 },
  { line: "Maintenance Bay", status: "Standby", progress: 45 }
];

export default function MmsDashboard() {
  return (
    <main className="mms-page">
      <style>{mmsStyles}</style>
      <section className="mms-shell">
        <header className="mms-header">
          <div>
            <p>Machine Maintenance System</p>
            <h1>MMS Dashboard</h1>
            <span>Factory status overview without login access.</span>
          </div>
          <div className="live-indicator">
            <span />
            Live overview
          </div>
        </header>

        <section className="metric-grid">
          {statusCards.map((card) => (
            <article key={card.label} className={`metric-card metric-${card.tone}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel">
            <div className="panel-title">
              <h2>Production Lines</h2>
              <span>Today</span>
            </div>
            <div className="line-list">
              {lineStatus.map((item) => (
                <div className="line-row" key={item.line}>
                  <div>
                    <strong>{item.line}</strong>
                    <span>{item.status}</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
                  <b>{item.progress}%</b>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel machine-map">
            <div className="panel-title">
              <h2>Factory Map</h2>
              <span>Zone monitor</span>
            </div>
            <div className="map-grid" aria-hidden="true">
              {Array.from({ length: 24 }, (_, index) => (
                <span key={index} className={index % 7 === 0 ? "warning" : index % 5 === 0 ? "idle" : "running"} />
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

const mmsStyles = `
@keyframes sweep {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
.mms-page {
  min-height: 100vh;
  padding: 28px;
  background:
    linear-gradient(90deg, rgb(15 23 42 / .04) 1px, transparent 1px),
    linear-gradient(180deg, rgb(15 23 42 / .04) 1px, transparent 1px),
    #edf5f4;
  background-size: 32px 32px;
  color: #0f172a;
}
.mms-shell {
  width: min(1220px, 100%);
  margin: 0 auto;
}
.mms-header,
.metric-card,
.dashboard-panel {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: rgb(255 255 255 / .94);
  box-shadow: 0 14px 34px rgb(15 23 42 / .08);
}
.mms-header {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
}
.mms-header::after {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, #14b8a6, transparent);
  content: "";
  animation: sweep 2.6s linear infinite;
}
.mms-header p {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.mms-header h1 {
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 4.8rem);
  line-height: .95;
}
.mms-header span {
  display: block;
  margin-top: 12px;
  color: #475569;
  font-weight: 700;
}
.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #99f6e4;
  border-radius: 999px;
  background: #f0fdfa;
  padding: 10px 14px;
  color: #0f766e;
  font-weight: 900;
  white-space: nowrap;
}
.live-indicator span {
  width: 10px;
  height: 10px;
  margin: 0;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 6px rgb(34 197 94 / .14);
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.metric-card {
  padding: 20px;
  border-left-width: 5px;
}
.metric-card span {
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
}
.metric-card strong {
  display: block;
  margin-top: 12px;
  font-size: 36px;
}
.metric-green { border-left-color: #10b981; }
.metric-blue { border-left-color: #2563eb; }
.metric-amber { border-left-color: #f59e0b; }
.metric-red { border-left-color: #ef4444; }
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.25fr .75fr;
  gap: 18px;
  margin-top: 18px;
}
.dashboard-panel {
  padding: 22px;
}
.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.panel-title h2 {
  margin: 0;
  font-size: 22px;
}
.panel-title span {
  color: #64748b;
  font-weight: 800;
}
.line-list {
  display: grid;
  gap: 14px;
}
.line-row {
  display: grid;
  grid-template-columns: 150px 1fr 52px;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 14px;
}
.line-row strong,
.line-row span {
  display: block;
}
.line-row span {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}
.progress-track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}
.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #14b8a6, #2563eb);
}
.line-row b {
  text-align: right;
}
.map-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
.map-grid span {
  aspect-ratio: 1;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
}
.map-grid .running { background: #86efac; }
.map-grid .idle { background: #fde68a; }
.map-grid .warning { background: #fecaca; }
@media (max-width: 900px) {
  .metric-grid,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .mms-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 620px) {
  .mms-page {
    padding: 16px;
  }
  .line-row {
    grid-template-columns: 1fr;
  }
  .line-row b {
    text-align: left;
  }
}
`;
