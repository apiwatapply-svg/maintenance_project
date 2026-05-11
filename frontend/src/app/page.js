import Link from "next/link";

const systems = [
  {
    name: "Preventive Maintenance",
    href: "/preventive-maintenance/login",
    code: "PM",
    theme: "pm",
    description: "Plan, inspect, and track scheduled maintenance work."
  },
  {
    name: "Toolling & Store",
    href: "/tooling-store/login",
    code: "TS",
    theme: "store",
    description: "Control tooling, spare parts, and store movement."
  },
  {
    name: "Job Request",
    href: "/job-request/login",
    code: "JR",
    theme: "job",
    description: "Create, approve, and follow maintenance job requests."
  },
  {
    name: "MMS Dashboard",
    href: "/mms-dashboard",
    code: "MMS",
    theme: "mms",
    actionLabel: "Open",
    description: "View machine status, maintenance KPIs, and factory overview."
  },
  {
    name: "Admin mode",
    href: "/admin/login",
    code: "AD",
    theme: "admin",
    description: "Manage users, permissions, and system configuration."
  }
];

function GatewayIcon({ theme, code }) {
  return (
    <div className={`gateway-icon gateway-icon-${theme}`} aria-hidden="true">
      <span className="icon-code">{code}</span>
      <span className="icon-part part-a" />
      <span className="icon-part part-b" />
      <span className="icon-part part-c" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="gateway-page">
      <style>{gatewayStyles}</style>
      <section className="gateway-shell">
        <div className="gateway-hero">
          <div className="factory-mascot" aria-hidden="true">
            <span className="factory-building" />
            <span className="factory-roof" />
            <span className="factory-window window-a" />
            <span className="factory-window window-b" />
            <span className="factory-smoke smoke-a" />
            <span className="factory-smoke smoke-b" />
            <span className="factory-gear gear-a" />
            <span className="factory-gear gear-b" />
          </div>
          <div className="gateway-copy">
            <p>Maintenance System</p>
            <h1>Select your workspace</h1>
            <span>Choose a system to continue to its dedicated login screen.</span>
          </div>
        </div>

        <div className="gateway-grid">
          {systems.map((system) => (
            <Link
              key={system.href}
              href={system.href}
              className={`gateway-card gateway-card-${system.theme}`}
            >
              <GatewayIcon theme={system.theme} code={system.code} />
              <h2>{system.name}</h2>
                <p>{system.description}</p>
                <div className="gateway-card-footer">
                <span>{system.actionLabel || "Login"}</span>
                <strong>&rarr;</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

const gatewayStyles = `
@keyframes gatewayRise {
  from { opacity: 0; transform: translateY(26px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes mascotFloat {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
}
@keyframes smokePuff {
  0% { opacity: 0; transform: translateY(18px) scale(.7); }
  45% { opacity: .75; }
  100% { opacity: 0; transform: translateY(-28px) scale(1.2); }
}
@keyframes gearTurn {
  to { transform: rotate(360deg); }
}
@keyframes iconBob {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-6px) rotate(2deg); }
}
@keyframes scanMove {
  0%, 100% { transform: translateX(-16px); }
  50% { transform: translateX(16px); }
}
.gateway-page {
  min-height: 100vh;
  overflow-x: hidden;
  padding: 34px 24px;
  background:
    radial-gradient(circle at 12% 14%, rgb(186 230 253 / .85), transparent 24%),
    radial-gradient(circle at 88% 16%, rgb(254 243 199 / .86), transparent 22%),
    linear-gradient(135deg, #f8fafc, #eef2ff 48%, #ecfeff);
  color: #0f172a;
}
.gateway-shell {
  width: min(1240px, 100%);
  min-height: calc(100vh - 68px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 34px;
}
.gateway-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
  align-items: center;
  gap: 28px;
  overflow: hidden;
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: rgb(255 255 255 / .84);
  padding: 28px;
  box-shadow: 12px 14px 0 rgb(15 23 42 / .14);
}
.gateway-hero::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  content: "";
  opacity: .22;
  background-image:
    linear-gradient(#0f172a 1px, transparent 1px),
    linear-gradient(90deg, #0f172a 1px, transparent 1px);
  background-size: 38px 38px;
}
.gateway-copy {
  position: relative;
  z-index: 2;
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}
.gateway-copy p {
  margin: 0 0 12px;
  color: #0f766e;
  font-size: 14px;
  font-weight: 950;
  letter-spacing: .2em;
  text-transform: uppercase;
}
.gateway-copy h1 {
  max-width: 680px;
  margin: 0;
  color: #020617;
  font-size: clamp(3rem, 5.6vw, 5.7rem);
  font-weight: 950;
  line-height: .92;
  overflow-wrap: anywhere;
}
.gateway-copy span {
  display: block;
  max-width: 620px;
  margin-top: 18px;
  color: #475569;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.6;
}
.factory-mascot {
  position: relative;
  z-index: 2;
  grid-column: 2;
  grid-row: 1;
  width: min(320px, 100%);
  height: 230px;
  justify-self: end;
  animation: mascotFloat 3.1s ease-in-out infinite;
}
.factory-building {
  position: absolute;
  left: 36px;
  bottom: 18px;
  width: 230px;
  height: 122px;
  border: 5px solid #0f172a;
  border-radius: 18px;
  background: #bfdbfe;
  box-shadow: 10px 12px 0 rgb(15 23 42 / .18);
}
.factory-roof {
  position: absolute;
  left: 58px;
  bottom: 130px;
  width: 190px;
  height: 64px;
  border: 5px solid #0f172a;
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  background: #fbbf24;
}
.factory-window {
  position: absolute;
  bottom: 66px;
  width: 44px;
  height: 38px;
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: #fef9c3;
}
.window-a { left: 74px; }
.window-b { left: 138px; }
.factory-smoke {
  position: absolute;
  top: 10px;
  width: 34px;
  height: 34px;
  border: 4px solid #0f172a;
  border-radius: 999px;
  background: white;
  animation: smokePuff 2.2s ease-in-out infinite;
}
.smoke-a { right: 76px; }
.smoke-b { right: 116px; animation-delay: 520ms; }
.factory-gear {
  position: absolute;
  border: 5px dashed #0f172a;
  border-radius: 999px;
  background: #5eead4;
  animation: gearTurn 6s linear infinite;
}
.gear-a { right: 22px; bottom: 34px; width: 72px; height: 72px; }
.gear-b { right: 80px; bottom: 4px; width: 48px; height: 48px; animation-direction: reverse; }
.gateway-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}
.gateway-card {
  position: relative;
  display: flex;
  min-height: 315px;
  flex-direction: column;
  overflow: hidden;
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: white;
  padding: 20px;
  color: #0f172a;
  text-decoration: none;
  box-shadow: 9px 11px 0 rgb(15 23 42 / .14);
  transition: transform 180ms ease, box-shadow 180ms ease;
  animation: gatewayRise 650ms ease both;
}
.gateway-card:hover {
  box-shadow: 5px 6px 0 rgb(15 23 42 / .18);
  transform: translate(4px, 5px);
}
.gateway-card::before {
  position: absolute;
  right: -48px;
  top: -48px;
  width: 150px;
  height: 150px;
  border: 4px solid #0f172a;
  border-radius: 999px;
  content: "";
  opacity: .55;
}
.gateway-card-pm::before { background: #bbf7d0; }
.gateway-card-store::before { background: #fde68a; }
.gateway-card-job::before { background: #bae6fd; }
.gateway-card-admin::before { background: #ddd6fe; }
.gateway-card-mms::before { background: #ccfbf1; }
.gateway-card h2 {
  position: relative;
  min-height: 58px;
  margin: 0;
  font-size: clamp(19px, 1.75vw, 23px);
  font-weight: 950;
  line-height: 1.08;
}
.gateway-card p {
  position: relative;
  margin: 18px 0 26px;
  color: #475569;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.7;
}
.gateway-icon {
  position: relative;
  display: flex;
  width: 68px;
  height: 68px;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  overflow: hidden;
  border: 4px solid #0f172a;
  border-radius: 14px;
  color: white;
  font-size: 18px;
  font-weight: 950;
  box-shadow: 6px 7px 0 rgb(15 23 42 / .16);
  animation: iconBob 2.6s ease-in-out infinite;
}
.gateway-icon-pm { background: #059669; }
.gateway-icon-store { background: #d97706; }
.gateway-icon-job { background: #0284c7; }
.gateway-icon-admin { background: #6d28d9; }
.gateway-icon-mms { background: #0f766e; }
.icon-code {
  position: relative;
  z-index: 3;
}
.icon-part {
  position: absolute;
  display: block;
  border-radius: 999px;
  background: rgb(255 255 255 / .64);
}
.part-a { left: 13px; top: 14px; width: 42px; height: 4px; }
.part-b { left: 13px; bottom: 14px; width: 34px; height: 4px; animation: scanMove 1.4s ease-in-out infinite; }
.part-c { right: 12px; top: 28px; width: 9px; height: 9px; }
.gateway-card-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  border-top: 3px solid #0f172a;
  padding-top: 18px;
}
.gateway-card-footer span {
  font-size: 14px;
  font-weight: 950;
}
.gateway-card-footer strong {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 3px solid #0f172a;
  border-radius: 999px;
  background: #0f172a;
  color: white;
  font-size: 20px;
  transition: transform 180ms ease;
}
.gateway-card:hover strong {
  transform: translateX(4px);
}
@media (max-width: 1100px) {
  .gateway-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .gateway-hero {
    grid-template-columns: 1fr;
  }
  .gateway-copy,
  .factory-mascot {
    grid-column: 1;
    grid-row: auto;
  }
  .factory-mascot {
    justify-self: start;
  }
}
@media (max-width: 900px) {
  .gateway-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .gateway-page {
    padding: 18px;
  }
  .gateway-grid {
    grid-template-columns: 1fr;
  }
  .gateway-hero {
    padding: 22px;
    box-shadow: 7px 8px 0 rgb(15 23 42 / .14);
  }
  .factory-mascot {
    width: 280px;
    transform-origin: left center;
  }
  .gateway-card {
    min-height: 290px;
  }
}
`;
