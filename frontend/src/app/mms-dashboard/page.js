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
            Waiting for data source
          </div>
        </header>

        <section className="empty-dashboard">
          <div className="empty-icon" aria-hidden="true">
            <span />
          </div>
          <p>Dashboard data is not connected yet.</p>
          <h2>No live machine data available</h2>
          <span>Once MMS data endpoints are ready, this page can show live machine status, maintenance KPIs, and production line health.</span>
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
.empty-dashboard {
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
.mms-header p,
.empty-dashboard p {
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
  border: 1px solid #bae6fd;
  border-radius: 999px;
  background: #f0f9ff;
  padding: 10px 14px;
  color: #0369a1;
  font-weight: 900;
  white-space: nowrap;
}
.live-indicator span {
  width: 10px;
  height: 10px;
  margin: 0;
  border-radius: 999px;
  background: #38bdf8;
  box-shadow: 0 0 0 6px rgb(56 189 248 / .14);
}
.empty-dashboard {
  display: grid;
  min-height: 420px;
  place-items: center;
  margin-top: 18px;
  padding: 42px;
  text-align: center;
}
.empty-icon {
  position: relative;
  width: 118px;
  height: 86px;
  margin-bottom: 18px;
  border: 4px solid #0f172a;
  border-radius: 10px;
  background: #dbeafe;
  box-shadow: 8px 9px 0 rgb(15 23 42 / .12);
}
.empty-icon::before,
.empty-icon::after,
.empty-icon span {
  position: absolute;
  border-radius: 999px;
  background: #0f766e;
  content: "";
}
.empty-icon::before {
  left: 20px;
  top: 26px;
  width: 78px;
  height: 6px;
}
.empty-icon::after {
  left: 20px;
  top: 46px;
  width: 46px;
  height: 6px;
}
.empty-icon span {
  right: 18px;
  bottom: 16px;
  width: 14px;
  height: 14px;
}
.empty-dashboard h2 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.8rem);
  line-height: 1;
}
.empty-dashboard > span {
  display: block;
  max-width: 620px;
  margin-top: 16px;
  color: #475569;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.7;
}
@media (max-width: 900px) {
  .mms-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 620px) {
  .mms-page {
    padding: 16px;
  }
  .empty-dashboard {
    min-height: 360px;
    padding: 28px;
  }
}
`;
