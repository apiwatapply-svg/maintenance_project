"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import ToolingLayout from "./ToolingLayout";

const defaultSummary = {
  totalItems: 0,
  lowStockItems: 0,
  pendingRequests: 0,
  stockoutRiskItems: 0,
  slowMovementItems: 0,
  overstockItems: 0
};

const summaryCards = [
  { key: "totalItems", label: "Total Items", tone: "blue" },
  { key: "lowStockItems", label: "Low Stock", tone: "amber" },
  { key: "pendingRequests", label: "Pending Requests", tone: "slate" },
  { key: "stockoutRiskItems", label: "Stockout Risk", tone: "red" },
  { key: "slowMovementItems", label: "Slow Movement", tone: "violet" },
  { key: "overstockItems", label: "Overstock", tone: "green" }
];

export default function ToolingDashboard() {
  return (
    <ToolingLayout>
      {({ headers }) => <ToolingDashboardContent headers={headers} />}
    </ToolingLayout>
  );
}

function ToolingDashboardContent({ headers }) {
  const [summary, setSummary] = useState(defaultSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const response = await api.get("/tooling/dashboard", { headers });
      setSummary({ ...defaultSummary, ...response.data });
      setMessage("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot load Toolling dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadDashboard();

    socket.on("tooling:data-changed", refresh);
    socket.on("tooling:low-stock", refresh);
    socket.on("tooling:stock-recovered", refresh);

    return () => {
      socket.off("tooling:data-changed", refresh);
      socket.off("tooling:low-stock", refresh);
      socket.off("tooling:stock-recovered", refresh);
    };
  }, [loadDashboard]);

  return (
    <section className="tooling-content">
      <style>{dashboardStyles}</style>
      {message ? <div className="tooling-alert">{message}</div> : null}

      <div className="dashboard-grid">
        {summaryCards.map((card) => (
          <article className={`dashboard-card tone-${card.tone}`} key={card.key}>
            <span className="card-icon">{card.label.slice(0, 2).toUpperCase()}</span>
            <p>{card.label}</p>
            <strong>{isLoading ? "..." : Number(summary[card.key] || 0).toLocaleString()}</strong>
          </article>
        ))}
      </div>

      <section className="tooling-operating-strip">
        <div className="strip-head">
          <b>Store Bay</b>
          <span>Realtime signals ready</span>
        </div>
        <div className="factory-line" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </section>
  );
}

const dashboardStyles = `
@keyframes lineMove {
  from { transform: translateX(-20%); }
  to { transform: translateX(20%); }
}
.tooling-alert {
  margin-bottom: 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #991b1b;
  padding: 12px 14px;
  font-weight: 850;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.dashboard-card {
  position: relative;
  overflow: hidden;
  min-height: 154px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
  padding: 18px;
}
.dashboard-card::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 5px;
  background: var(--tone);
}
.dashboard-card p {
  margin: 16px 0 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.dashboard-card strong {
  font-size: 2.8rem;
  line-height: 1;
}
.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: rgb(15 23 42 / .06);
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}
.tone-blue { --tone: #2563eb; }
.tone-amber { --tone: #f59e0b; }
.tone-slate { --tone: #475569; }
.tone-red { --tone: #dc2626; }
.tone-violet { --tone: #7c3aed; }
.tone-green { --tone: #16a34a; }
.tooling-operating-strip {
  margin-top: 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #0f1f2e;
  color: white;
  padding: 18px;
  overflow: hidden;
}
.strip-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.strip-head span {
  color: #fde68a;
}
.factory-line {
  display: flex;
  gap: 14px;
  width: 130%;
  animation: lineMove 4s ease-in-out infinite alternate;
}
.factory-line span {
  display: block;
  width: 160px;
  height: 46px;
  border: 2px solid rgb(255 255 255 / .24);
  border-radius: 8px;
  background: repeating-linear-gradient(90deg, #f59e0b 0 24px, #111827 24px 36px);
}
@media (max-width: 960px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
`;
