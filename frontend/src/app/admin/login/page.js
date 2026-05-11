"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";

export default function AdminLogin() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/admin/login", credentials);
      localStorage.setItem("adminSession", JSON.stringify(response.data));
      router.push("/admin");
    } catch {
      setError("Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <style>{adminLoginStyles}</style>
      <section className="admin-login-shell">
        <div className="admin-login-visual">
          <div className="factory-grid" />
          <div className="admin-login-status">
            <span>Control room</span>
            <span>Admin mode</span>
          </div>
          <div className="admin-console-art" aria-hidden="true">
            <span className="console-screen" />
            <span className="console-line line-a" />
            <span className="console-line line-b" />
            <span className="shield-icon" />
            <span className="scan-bar" />
          </div>
          <div className="admin-visual-copy">
            <p>Admin mode</p>
            <h1>Control users, access, and system settings.</h1>
          </div>
        </div>

        <form className="admin-login-panel" onSubmit={handleSubmit}>
          <Link href="/" className="admin-login-back">
            &larr; Back
          </Link>
          <div className="admin-login-badge">AD</div>
          <p>Administrator access</p>
          <h2>Admin mode Login</h2>
          <label>
            Username
            <input
              value={credentials.username}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="admin"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="admin"
            />
          </label>
          {error && <strong className="admin-login-error">{error}</strong>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Checking..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

const adminLoginStyles = `
@keyframes consoleFloat {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-9px) rotate(1deg); }
}
@keyframes scanDown {
  0% { transform: translateY(-34px); }
  100% { transform: translateY(128px); }
}
.admin-login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: linear-gradient(135deg, #f5f3ff, #e2e8f0);
  color: #0f172a;
}
.admin-login-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr);
  align-items: center;
  gap: 32px;
  width: min(1160px, 100%);
}
.admin-login-visual,
.admin-login-panel {
  border: 4px solid #0f172a;
  border-radius: 8px;
  box-shadow: 10px 12px 0 rgb(15 23 42 / .16);
}
.admin-login-visual {
  position: relative;
  min-height: 560px;
  overflow: hidden;
  background: #1e1b4b;
  color: white;
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
.admin-login-status {
  position: absolute;
  top: 26px;
  left: 28px;
  right: 28px;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.admin-console-art {
  position: absolute;
  left: 50%;
  top: 42%;
  width: min(420px, 74vw);
  height: 290px;
  transform: translate(-50%, -50%);
  border: 5px solid #0f172a;
  border-radius: 24px;
  background: #c4b5fd;
  box-shadow: 10px 12px 0 rgb(15 23 42 / .24);
  animation: consoleFloat 3s ease-in-out infinite;
}
.console-screen {
  position: absolute;
  left: 40px;
  top: 40px;
  width: 268px;
  height: 152px;
  border: 5px solid #0f172a;
  border-radius: 18px;
  background: #111827;
}
.console-line {
  position: absolute;
  left: 72px;
  z-index: 2;
  height: 8px;
  border-radius: 999px;
  background: #86efac;
}
.line-a { top: 88px; width: 132px; }
.line-b { top: 116px; width: 180px; }
.shield-icon {
  position: absolute;
  right: 44px;
  bottom: 38px;
  width: 92px;
  height: 104px;
  border: 5px solid #0f172a;
  border-radius: 44px 44px 28px 28px;
  background: #a78bfa;
}
.shield-icon::after {
  position: absolute;
  left: 31px;
  top: 22px;
  width: 22px;
  height: 44px;
  border-radius: 999px;
  background: white;
  content: "";
}
.scan-bar {
  position: absolute;
  left: 46px;
  top: 58px;
  z-index: 3;
  width: 260px;
  height: 13px;
  border-radius: 999px;
  background: rgb(45 212 191 / .78);
  animation: scanDown 1.9s ease-in-out infinite;
}
.admin-visual-copy {
  position: absolute;
  left: 34px;
  right: 34px;
  bottom: 34px;
  z-index: 4;
  max-width: 420px;
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: rgb(255 255 255 / .94);
  padding: 18px 20px;
  color: #0f172a;
  box-shadow: 8px 9px 0 rgb(15 23 42 / .2);
}
.admin-visual-copy p,
.admin-login-panel p {
  margin: 0 0 8px;
  color: #6d28d9;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.admin-visual-copy h1 {
  margin: 0;
  font-size: clamp(1.65rem, 3vw, 2.45rem);
  font-weight: 950;
  line-height: 1.04;
}
.admin-login-panel {
  background: rgb(255 255 255 / .96);
  padding: 34px;
}
.admin-login-back {
  display: inline-flex;
  margin-bottom: 26px;
  color: #334155;
  font-weight: 900;
  text-decoration: none;
}
.admin-login-badge {
  display: flex;
  width: 58px;
  height: 58px;
  align-items: center;
  justify-content: center;
  margin-bottom: 22px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  background: #6d28d9;
  color: white;
  font-weight: 950;
  box-shadow: 6px 7px 0 rgb(15 23 42 / .16);
}
.admin-login-panel h2 {
  margin: 0 0 24px;
  color: #020617;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 950;
  line-height: 1;
}
.admin-login-panel label {
  display: block;
  margin-top: 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}
.admin-login-panel input {
  display: block;
  width: 100%;
  margin-top: 8px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  background: #f8fafc;
  padding: 13px 14px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  outline: none;
}
.admin-login-error {
  display: block;
  margin-top: 14px;
  color: #b91c1c;
  font-size: 14px;
}
.admin-login-panel button {
  width: 100%;
  margin-top: 22px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  background: #6d28d9;
  padding: 14px;
  color: white;
  font-size: 16px;
  font-weight: 950;
  box-shadow: 6px 7px 0 rgb(15 23 42 / .2);
}
@media (max-width: 960px) {
  .admin-login-shell {
    grid-template-columns: 1fr;
  }
  .admin-login-visual {
    min-height: 440px;
  }
}
`;
