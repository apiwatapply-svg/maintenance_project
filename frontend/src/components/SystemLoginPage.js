"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import { getSessionConfig, saveSession } from "@/lib/session";

const themes = {
  pm: {
    code: "PM",
    title: "Preventive Maintenance Login",
    eyebrow: "Maintenance access",
    label: "Preventive Maintenance",
    headline: "Keep every machine ready before trouble starts.",
    statusLeft: "Line A",
    statusRight: "Inspection running",
    page: "linear-gradient(135deg, #f0fdf4, #e0f2fe)",
    panel: "#064e3b",
    accent: "#059669",
    art: "pm"
  },
  store: {
    code: "TS",
    title: "Toolling & Store Login",
    eyebrow: "Store access",
    label: "Toolling & Store",
    headline: "Find the right tool and keep parts moving.",
    statusLeft: "Store bay",
    statusRight: "Stock movement",
    page: "linear-gradient(135deg, #fffbeb, #e0f2fe)",
    panel: "#78350f",
    accent: "#d97706",
    art: "store"
  },
  job: {
    code: "JR",
    title: "Job Request Login",
    eyebrow: "Request access",
    label: "Job Request",
    headline: "Turn every request into clear maintenance action.",
    statusLeft: "Request desk",
    statusRight: "Queue monitoring",
    page: "linear-gradient(135deg, #f0f9ff, #eef2ff)",
    panel: "#0c4a6e",
    accent: "#0284c7",
    art: "job"
  },
  admin: {
    code: "AD",
    title: "Admin mode Login",
    eyebrow: "Administrator access",
    label: "Admin mode",
    headline: "Control users, access, and system settings.",
    statusLeft: "Control room",
    statusRight: "Admin mode",
    page: "linear-gradient(135deg, #f5f3ff, #e2e8f0)",
    panel: "#1e1b4b",
    accent: "#6d28d9",
    art: "admin"
  }
};

function CartoonArt({ type }) {
  if (type === "pm") {
    return (
      <div className="cartoon-stage">
        <div className="cartoon-machine">
          <span className="machine-light" />
          <span className="machine-gauge" />
          <span className="machine-screen" />
        </div>
        <div className="cartoon-worker">
          <span className="helmet" />
          <span className="head" />
          <span className="body" />
          <span className="arm" />
          <span className="wrench" />
        </div>
        <span className="wave wave-a" />
        <span className="wave wave-b" />
      </div>
    );
  }

  if (type === "store") {
    return (
      <div className="cartoon-stage store-stage">
        <span className="shelf shelf-top" />
        <span className="shelf shelf-bottom" />
        <span className="crate crate-a" />
        <span className="crate crate-b" />
        <span className="crate crate-c" />
        <span className="hammer-tool" />
        <span className="driver-tool" />
      </div>
    );
  }

  if (type === "job") {
    return (
      <div className="cartoon-stage board-stage">
        <span className="ticket-card ticket-a" />
        <span className="ticket-card ticket-b" />
        <span className="ticket-card ticket-c" />
        <div className="cartoon-worker board-worker">
          <span className="helmet" />
          <span className="head" />
          <span className="body" />
          <span className="arm" />
        </div>
      </div>
    );
  }

  return (
    <div className="cartoon-stage console-stage">
      <span className="console-screen" />
      <span className="console-row row-a" />
      <span className="console-row row-b" />
      <span className="shield-icon" />
      <span className="scan-bar" />
    </div>
  );
}

export default function SystemLoginPage({ type }) {
  const theme = themes[type];
  const router = useRouter();
  const sessionConfig = getSessionConfig(type);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username,
        password,
        feature: sessionConfig.feature
      });

      saveSession(type, response.data);
      router.replace(sessionConfig.homePath);
    } catch (loginError) {
      setError(loginError?.response?.data?.message || "Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="system-login-page" style={{ backgroundImage: theme.page }}>
      <style>{loginStyles}</style>
      <section className="system-login-shell">
        <div className="system-visual" style={{ backgroundColor: theme.panel }}>
          <div className="factory-grid" />
          <div className="system-status">
            <span>{theme.statusLeft}</span>
            <span>{theme.statusRight}</span>
          </div>
          <CartoonArt type={theme.art} />
          <div className="visual-text">
            <p>{theme.label}</p>
            <h1>{theme.headline}</h1>
          </div>
        </div>

        <form className="system-login-card" onSubmit={handleSubmit}>
          <Link href="/" className="system-back-link">
            &larr; Back
          </Link>
          <div className="system-badge" style={{ backgroundColor: theme.accent }}>
            {theme.code}
          </div>
          <p className="system-eyebrow" style={{ color: theme.accent }}>
            {theme.eyebrow}
          </p>
          <h2>{theme.title}</h2>
          <div className="system-fields">
            <label>
              <span>Username</span>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>
          {error ? <p className="system-login-error">{error}</p> : null}
          <button
            className="system-login-button"
            style={{ backgroundColor: theme.accent }}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

const loginStyles = `
@keyframes cartoonBob {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-9px) rotate(1deg); }
}
@keyframes armSwing {
  0%, 100% { transform: rotate(-28deg); }
  50% { transform: rotate(18deg); }
}
@keyframes blinkLight {
  0%, 100% { opacity: .35; }
  50% { opacity: 1; }
}
@keyframes wavePop {
  0% { opacity: 0; transform: scale(.65); }
  45% { opacity: .65; }
  100% { opacity: 0; transform: scale(1.28); }
}
@keyframes hop {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}
@keyframes wiggle {
  0%, 100% { transform: rotate(-10deg); }
  50% { transform: rotate(12deg); }
}
@keyframes slideTicket {
  0%, 100% { transform: translateX(0) rotate(-2deg); }
  50% { transform: translateX(18px) rotate(2deg); }
}
@keyframes scanDown {
  0% { transform: translateY(-38px); }
  100% { transform: translateY(122px); }
}
.system-login-page {
  min-height: 100vh;
  padding: 32px 24px;
  color: #0f172a;
}
.system-login-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, .92fr);
  align-items: center;
  gap: 32px;
  width: min(1152px, 100%);
  min-height: calc(100vh - 64px);
  margin: 0 auto;
}
.system-visual {
  position: relative;
  min-height: 580px;
  overflow: hidden;
  border: 4px solid #0f172a;
  border-radius: 8px;
  color: white;
  box-shadow: 12px 14px 0 rgb(15 23 42 / .18);
}
.system-visual::before {
  position: absolute;
  inset: 0;
  content: "";
  background:
    radial-gradient(circle at 20% 25%, rgb(255 255 255 / .18), transparent 18%),
    radial-gradient(circle at 82% 18%, rgb(255 255 255 / .12), transparent 16%),
    linear-gradient(180deg, transparent 0 70%, rgb(15 23 42 / .18) 70% 100%);
}
.factory-grid {
  position: absolute;
  inset: 0;
  opacity: .18;
  background-image:
    linear-gradient(rgb(255 255 255 / .6) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / .6) 1px, transparent 1px);
  background-size: 34px 34px;
}
.system-status {
  position: absolute;
  top: 26px;
  left: 28px;
  right: 28px;
  z-index: 4;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.visual-text {
  position: absolute;
  left: 34px;
  right: 34px;
  bottom: 34px;
  z-index: 6;
  max-width: 410px;
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: rgb(255 255 255 / .94);
  padding: 18px 20px 20px;
  box-shadow: 8px 9px 0 rgb(15 23 42 / .2);
}
.visual-text p {
  margin: 0 0 10px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.visual-text h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(1.65rem, 3vw, 2.45rem);
  font-weight: 950;
  line-height: 1.04;
}
.system-login-card {
  display: block;
  width: 100%;
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: rgb(255 255 255 / .96);
  padding: 34px;
  box-shadow: 10px 12px 0 rgb(15 23 42 / .14);
}
.system-back-link {
  display: inline-flex;
  margin-bottom: 28px;
  color: #334155;
  font-size: 14px;
  font-weight: 900;
  text-decoration: none;
}
.system-badge {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  color: white;
  font-size: 17px;
  font-weight: 950;
  box-shadow: 6px 7px 0 rgb(15 23 42 / .18);
}
.system-eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.system-login-card h2 {
  margin: 0;
  color: #020617;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 950;
  line-height: 1.04;
}
.system-fields {
  display: grid;
  gap: 16px;
  margin-top: 30px;
}
.system-fields label {
  display: block;
}
.system-fields span {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}
.system-fields input {
  display: block;
  width: 100%;
  border: 3px solid #0f172a;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px 15px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  outline: none;
  transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
.system-fields input:focus {
  background: white;
  box-shadow: 5px 6px 0 rgb(15 23 42 / .14);
  transform: translate(-2px, -2px);
}
.system-login-error {
  margin: 18px 0 -6px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  padding: 12px;
  color: #991b1b;
  font-size: 13px;
  font-weight: 900;
}
.system-login-button {
  width: 100%;
  margin-top: 26px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  padding: 14px 18px;
  color: white;
  font-size: 16px;
  font-weight: 950;
  box-shadow: 6px 7px 0 rgb(15 23 42 / .22);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.system-login-button:hover {
  box-shadow: 3px 4px 0 rgb(15 23 42 / .24);
  transform: translate(3px, 3px);
}
.system-login-button:disabled {
  cursor: not-allowed;
  opacity: .68;
}
.cartoon-stage {
  position: absolute;
  left: 50%;
  top: 39%;
  z-index: 3;
  width: min(440px, 76vw);
  height: 300px;
  transform: translate(-50%, -50%);
}
.cartoon-machine {
  position: absolute;
  left: 108px;
  top: 78px;
  width: 230px;
  height: 150px;
  border: 5px solid #0f172a;
  border-radius: 22px;
  background: #c7f9e5;
  box-shadow: 9px 10px 0 rgb(15 23 42 / .22);
}
.cartoon-machine::before {
  position: absolute;
  left: 22px;
  bottom: -46px;
  width: 190px;
  height: 42px;
  border: 5px solid #0f172a;
  border-radius: 0 0 18px 18px;
  background: #34d399;
  content: "";
}
.machine-light {
  position: absolute;
  left: 22px;
  top: 24px;
  width: 22px;
  height: 22px;
  border: 4px solid #0f172a;
  border-radius: 999px;
  background: #fef08a;
  animation: blinkLight 1.1s ease-in-out infinite;
}
.machine-gauge {
  position: absolute;
  right: 28px;
  top: 20px;
  width: 58px;
  height: 58px;
  border: 5px solid #0f172a;
  border-radius: 999px;
  background: #ecfeff;
}
.machine-gauge::after {
  position: absolute;
  left: 25px;
  top: 14px;
  width: 5px;
  height: 24px;
  border-radius: 999px;
  background: #ef4444;
  content: "";
  transform-origin: bottom;
  animation: wiggle 1.3s ease-in-out infinite;
}
.machine-screen {
  position: absolute;
  left: 58px;
  bottom: 24px;
  width: 86px;
  height: 42px;
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: #0f766e;
}
.cartoon-worker {
  position: absolute;
  left: 30px;
  top: 104px;
  z-index: 5;
  width: 120px;
  height: 160px;
  animation: cartoonBob 2.4s ease-in-out infinite;
}
.cartoon-worker span {
  position: absolute;
  display: block;
  border: 4px solid #0f172a;
}
.helmet {
  left: 38px;
  top: 0;
  z-index: 3;
  width: 52px;
  height: 30px;
  border-radius: 28px 28px 8px 8px;
  background: #facc15;
}
.head {
  left: 43px;
  top: 24px;
  z-index: 2;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: #fed7aa;
}
.body {
  left: 28px;
  top: 66px;
  width: 72px;
  height: 78px;
  border-radius: 22px 22px 12px 12px;
  background: #38bdf8;
}
.arm {
  left: 76px;
  top: 82px;
  width: 46px;
  height: 18px;
  border-radius: 999px;
  background: #fed7aa;
  transform-origin: left center;
  animation: armSwing 1.1s ease-in-out infinite;
}
.wrench {
  right: -8px;
  top: 80px;
  width: 16px;
  height: 54px;
  border-radius: 999px;
  background: #e2e8f0;
  transform: rotate(38deg);
}
.wave {
  position: absolute;
  right: 54px;
  top: 108px;
  width: 96px;
  height: 96px;
  border: 4px solid rgb(255 255 255 / .7);
  border-radius: 999px;
  animation: wavePop 1.8s ease-out infinite;
}
.wave-b { animation-delay: 700ms; }
.store-stage { animation: cartoonBob 3s ease-in-out infinite; }
.shelf {
  position: absolute;
  left: 74px;
  width: 300px;
  height: 22px;
  border: 4px solid #0f172a;
  border-radius: 999px;
  background: #fbbf24;
  box-shadow: 7px 8px 0 rgb(15 23 42 / .2);
}
.shelf-top { top: 92px; }
.shelf-bottom { top: 190px; }
.crate {
  position: absolute;
  display: block;
  border: 5px solid #0f172a;
  border-radius: 12px;
  background: #fdba74;
  box-shadow: 7px 8px 0 rgb(15 23 42 / .18);
  animation: hop 2.1s ease-in-out infinite;
}
.crate-a { left: 94px; top: 28px; width: 78px; height: 64px; }
.crate-b { left: 206px; top: 132px; width: 92px; height: 58px; animation-delay: 250ms; }
.crate-c { left: 304px; top: 38px; width: 64px; height: 54px; animation-delay: 500ms; }
.hammer-tool,
.driver-tool {
  position: absolute;
  display: block;
  border: 5px solid #0f172a;
  background: #e2e8f0;
  animation: wiggle 1.6s ease-in-out infinite;
}
.hammer-tool {
  left: 106px;
  top: 142px;
  width: 20px;
  height: 76px;
  border-radius: 999px;
}
.hammer-tool::before {
  position: absolute;
  left: -20px;
  top: -14px;
  width: 56px;
  height: 22px;
  border: 5px solid #0f172a;
  border-radius: 10px;
  background: #94a3b8;
  content: "";
}
.driver-tool {
  right: 82px;
  top: 120px;
  width: 18px;
  height: 92px;
  border-radius: 999px;
  transform: rotate(32deg);
  animation-delay: 280ms;
}
.board-stage {
  border: 5px solid #0f172a;
  border-radius: 24px;
  background: #dbeafe;
  box-shadow: 10px 12px 0 rgb(15 23 42 / .22);
}
.ticket-card {
  position: absolute;
  left: 36px;
  width: 210px;
  height: 56px;
  border: 4px solid #0f172a;
  border-radius: 12px;
  background: white;
  box-shadow: 5px 6px 0 rgb(15 23 42 / .15);
  animation: slideTicket 2.2s ease-in-out infinite;
}
.ticket-card::before,
.ticket-card::after {
  position: absolute;
  left: 18px;
  height: 6px;
  border-radius: 999px;
  background: #0f172a;
  content: "";
}
.ticket-card::before { top: 16px; width: 84px; }
.ticket-card::after { top: 32px; width: 140px; opacity: .4; }
.ticket-a { top: 42px; }
.ticket-b { top: 118px; animation-delay: 240ms; }
.ticket-c { top: 194px; animation-delay: 480ms; }
.board-worker { left: auto; right: 8px; top: 140px; }
.console-stage {
  border: 5px solid #0f172a;
  border-radius: 24px;
  background: #c4b5fd;
  box-shadow: 10px 12px 0 rgb(15 23 42 / .24);
  animation: cartoonBob 3.2s ease-in-out infinite;
}
.console-screen {
  position: absolute;
  left: 42px;
  top: 38px;
  width: 270px;
  height: 158px;
  border: 5px solid #0f172a;
  border-radius: 18px;
  background: #111827;
}
.console-row {
  position: absolute;
  left: 74px;
  z-index: 2;
  height: 8px;
  border-radius: 999px;
  background: #86efac;
  animation: hop 1.5s ease-in-out infinite;
}
.row-a { top: 86px; width: 130px; }
.row-b { top: 112px; width: 180px; animation-delay: 250ms; }
.shield-icon {
  position: absolute;
  right: 48px;
  bottom: 38px;
  width: 94px;
  height: 106px;
  border: 5px solid #0f172a;
  border-radius: 44px 44px 28px 28px;
  background: #a78bfa;
  box-shadow: 6px 7px 0 rgb(15 23 42 / .18);
}
.shield-icon::after {
  position: absolute;
  left: 32px;
  top: 22px;
  width: 22px;
  height: 46px;
  border-radius: 999px;
  background: white;
  content: "";
}
.scan-bar {
  position: absolute;
  left: 46px;
  top: 56px;
  z-index: 3;
  width: 262px;
  height: 14px;
  border-radius: 999px;
  background: rgb(45 212 191 / .78);
  animation: scanDown 1.9s ease-in-out infinite;
}
@media (max-width: 1023px) {
  .system-login-shell {
    grid-template-columns: 1fr;
  }
  .system-visual {
    min-height: 440px;
  }
  .cartoon-stage {
    top: 36%;
    transform: translate(-50%, -50%) scale(.84);
  }
}
@media (max-width: 640px) {
  .system-login-page {
    padding: 18px;
  }
  .system-visual {
    min-height: 430px;
    box-shadow: 7px 8px 0 rgb(15 23 42 / .16);
  }
  .system-status {
    left: 18px;
    right: 18px;
    font-size: 11px;
  }
  .visual-text {
    left: 18px;
    right: 18px;
    bottom: 18px;
    padding: 15px;
  }
  .visual-text h1 {
    font-size: 1.55rem;
  }
  .system-login-card {
    padding: 24px;
    box-shadow: 7px 8px 0 rgb(15 23 42 / .14);
  }
  .cartoon-stage {
    width: 340px;
    top: 34%;
    transform: translate(-50%, -52%) scale(.68);
  }
}
`;
