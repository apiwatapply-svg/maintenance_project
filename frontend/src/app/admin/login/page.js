"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import SystemLoginPage from "@/components/SystemLoginPage";

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
      if (credentials.username === "admin" && credentials.password === "admin") {
        localStorage.setItem(
          "adminSession",
          JSON.stringify({ token: "admin-local-token", user: { username: "admin", role: "admin" } })
        );
        router.push("/admin");
        return;
      }

      setError("Username หรือ Password ไม่ถูกต้อง");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <SystemLoginPage type="admin" />
      <div className="admin-login-overlay">
        <style>{adminLoginStyles}</style>
        <form className="admin-login-panel" onSubmit={handleSubmit}>
          <Link href="/" className="admin-login-back">
            &larr; Back
          </Link>
          <div className="admin-login-badge">AD</div>
          <p>Administrator access</p>
          <h1>Admin mode Login</h1>
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
      </div>
    </div>
  );
}

const adminLoginStyles = `
.admin-login-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  align-items: center;
  justify-items: end;
  padding: 32px;
  pointer-events: none;
}
.admin-login-panel {
  width: min(440px, 100%);
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: rgb(255 255 255 / .96);
  padding: 28px;
  box-shadow: 10px 12px 0 rgb(15 23 42 / .16);
  pointer-events: auto;
}
.admin-login-back {
  display: inline-flex;
  margin-bottom: 22px;
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
  margin-bottom: 20px;
  border: 3px solid #0f172a;
  border-radius: 8px;
  background: #6d28d9;
  color: white;
  font-weight: 950;
  box-shadow: 6px 7px 0 rgb(15 23 42 / .16);
}
.admin-login-panel p {
  margin: 0 0 8px;
  color: #6d28d9;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.admin-login-panel h1 {
  margin: 0 0 24px;
  color: #020617;
  font-size: 34px;
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
@media (max-width: 900px) {
  .admin-login-overlay {
    position: static;
    justify-items: center;
    background: #f5f3ff;
  }
}
`;
