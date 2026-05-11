"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  getToolingDashboardBarMax,
  getToolingDashboardBarTooltip,
  getToolingDashboardDefaultMonth,
  getToolingDashboardPieSegments,
  getToolingDashboardSelectedItems,
  getToolingDashboardTickValues
} from "@/lib/toolingUi.mjs";
import ToolingLayout from "./ToolingLayout";

const defaultSummary = {
  totalItems: 0,
  lowStockItems: 0,
  movementToday: 0,
  stockoutRiskItems: 0,
  slowMovementItems: 0,
  overstockItems: 0
};

const summaryCards = [
  { key: "totalItems", label: "Total Items", tone: "blue" },
  { key: "lowStockItems", label: "Low Stock", tone: "amber" },
  { key: "movementToday", label: "Movement Today", tone: "slate" },
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
  const [yearMonth, setYearMonth] = useState(getToolingDashboardDefaultMonth());
  const [selectedDate, setSelectedDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const response = await api.get("/tooling/dashboard", {
        headers,
        params: { yearMonth }
      });
      setSummary({ ...defaultSummary, ...response.data });
      setMessage("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot load Toolling dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [headers, yearMonth]);

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

      <MovementChart
        chart={summary.movementChart}
        isLoading={isLoading}
        selectedDate={selectedDate}
        yearMonth={yearMonth}
        onMonthChange={(value) => {
          setYearMonth(value);
          setSelectedDate("");
        }}
        onSelectDate={setSelectedDate}
        onBack={() => setSelectedDate("")}
      />

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

function MovementChart({
  chart,
  isLoading,
  selectedDate,
  yearMonth,
  onMonthChange,
  onSelectDate,
  onBack
}) {
  const dailyRows = chart?.daily || [];
  const selectedItems = getToolingDashboardSelectedItems(chart, selectedDate);
  const rows = selectedDate ? selectedItems : dailyRows;
  const maxValue = getToolingDashboardBarMax(rows);
  const monthSegments = getToolingDashboardPieSegments(chart?.totals);
  const issueSegments = getIssuePieSegments(selectedItems);
  const pieSegments = selectedDate ? issueSegments : monthSegments;
  const title = selectedDate ? `Item movement on ${selectedDate}` : "Daily stock movement";
  const pieTitle = selectedDate ? "Issue share by item" : "Monthly in / out share";

  return (
    <section className="movement-panel" aria-label="Tooling stock movement chart">
      <div className="movement-head">
        <div>
          <p>Movement Analysis</p>
          <h2>{title}</h2>
        </div>
        <div className="movement-actions">
          {selectedDate ? (
            <button className="secondary-action" type="button" onClick={onBack}>
              Back to month
            </button>
          ) : null}
          <label>
            Month
            <input
              type="month"
              value={yearMonth}
              onChange={(event) => onMonthChange(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="movement-chart-grid">
        <div className="bar-chart-card">
          {isLoading ? (
            <div className="chart-empty">Loading movement chart...</div>
          ) : rows.length ? (
            <BarChart
              rows={rows}
              maxValue={maxValue}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
            />
          ) : (
            <div className="chart-empty">No movement data for this selection.</div>
          )}
        </div>

        <aside className="pie-chart-card">
          <p>{pieTitle}</p>
          <PieChart segments={pieSegments} />
        </aside>
      </div>
    </section>
  );
}

function BarChart({ rows, maxValue, selectedDate, onSelectDate }) {
  const width = 1000;
  const height = 350;
  const left = 48;
  const right = 22;
  const top = 24;
  const bottom = 62;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const groupWidth = chartWidth / Math.max(rows.length, 1);
  const barWidth = Math.max(5, Math.min(18, groupWidth * 0.28));
  const labelStep = selectedDate ? 1 : Math.max(1, Math.ceil(rows.length / 12));
  const tickValues = getToolingDashboardTickValues(maxValue);

  return (
    <svg className="movement-svg" viewBox={`0 0 ${width} ${height}`} role="img">
      <title>{selectedDate ? "Daily item movement" : "Monthly daily movement"}</title>
      {tickValues.map((value) => {
        const y = top + chartHeight - ((Number(value || 0) / maxValue) * chartHeight);

        return (
          <g key={value}>
            <line x1={left} x2={width - right} y1={y} y2={y} className="grid-line" />
            <text x={left - 12} y={y + 4} textAnchor="end" className="axis-label">
              {value}
            </text>
          </g>
        );
      })}
      {rows.map((row, index) => {
        const centerX = left + (groupWidth * index) + (groupWidth / 2);
        const inHeight = (Number(row.stockIn || 0) / maxValue) * chartHeight;
        const outHeight = (Number(row.stockOut || 0) / maxValue) * chartHeight;
        const label = selectedDate ? row.itemCode || row.itemName || `Item ${index + 1}` : row.day;
        const canDrill = !selectedDate && (Number(row.stockIn || 0) > 0 || Number(row.stockOut || 0) > 0);

        return (
          <g
            key={row.date || row.itemCode || index}
            className={canDrill ? "bar-group drillable" : "bar-group"}
            data-chart-day={row.date || ""}
            role={canDrill ? "button" : undefined}
            tabIndex={canDrill ? 0 : undefined}
            onClick={() => {
              if (canDrill) {
                onSelectDate(row.date);
              }
            }}
            onKeyDown={(event) => {
              if (canDrill && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onSelectDate(row.date);
              }
            }}
          >
            <title>{getToolingDashboardBarTooltip(row, Boolean(selectedDate))}</title>
            {canDrill ? (
              <rect
                x={centerX - (groupWidth / 2)}
                y={top}
                width={groupWidth}
                height={chartHeight}
                className="bar-hit-area"
              />
            ) : null}
            <rect
              x={centerX - barWidth - 2}
              y={top + chartHeight - inHeight}
              width={barWidth}
              height={Math.max(inHeight, Number(row.stockIn || 0) ? 3 : 0)}
              rx="3"
              className="bar-in"
            />
            <rect
              x={centerX + 2}
              y={top + chartHeight - outHeight}
              width={barWidth}
              height={Math.max(outHeight, Number(row.stockOut || 0) ? 3 : 0)}
              rx="3"
              className="bar-out"
            />
            {index % labelStep === 0 ? (
              <text x={centerX} y={height - 24} textAnchor="middle" className="axis-label">
                {String(label).slice(0, 10)}
              </text>
            ) : null}
          </g>
        );
      })}
      <line x1={left} x2={width - right} y1={top + chartHeight} y2={top + chartHeight} className="axis-line" />
      <g className="chart-legend">
        <circle cx={width - 214} cy={18} r="6" className="legend-in" />
        <text x={width - 202} y={22}>Stock In</text>
        <circle cx={width - 118} cy={18} r="6" className="legend-out" />
        <text x={width - 106} y={22}>Stock Out</text>
      </g>
    </svg>
  );
}

function PieChart({ segments }) {
  if (!segments.length) {
    return <div className="pie-empty">No issue or receive data.</div>;
  }

  let cursor = 0;
  const gradient = segments.map((segment) => {
    const start = cursor;
    cursor += segment.percent;
    return `${segment.color} ${start}% ${cursor}%`;
  }).join(", ");

  return (
    <div className="pie-wrap">
      <div className="pie-visual" style={{ background: `conic-gradient(${gradient})` }}>
        <span>{segments.reduce((total, segment) => total + Number(segment.value || 0), 0).toLocaleString()}</span>
      </div>
      <div className="pie-list">
        {segments.map((segment) => (
          <div className="pie-row" key={segment.key}>
            <span style={{ background: segment.color }} />
            <b>{segment.label}</b>
            <em>{Number(segment.value || 0).toLocaleString()} pcs</em>
            <strong>{segment.percent}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function getIssuePieSegments(items) {
  const colors = ["#f59e0b", "#2563eb", "#16a34a", "#7c3aed", "#dc2626", "#475569"];
  const rows = (items || []).filter((item) => Number(item.stockOut || 0) > 0);
  const total = rows.reduce((sum, item) => sum + Number(item.stockOut || 0), 0);

  if (!total) {
    return [];
  }

  return rows.map((item, index) => ({
    key: String(item.itemId || item.itemCode || index),
    label: item.itemCode || item.itemName || `Item ${index + 1}`,
    value: Number(item.stockOut || 0),
    percent: Math.round((Number(item.stockOut || 0) / total) * 100),
    color: colors[index % colors.length]
  }));
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
.movement-panel {
  margin-top: 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
  padding: 16px;
}
.movement-head,
.movement-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.movement-head p,
.pie-chart-card > p {
  margin: 0 0 6px;
  color: #b45309;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.movement-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.55rem;
  line-height: 1.1;
}
.movement-actions label {
  display: grid;
  gap: 6px;
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.movement-actions input {
  height: 40px;
  min-width: 160px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #0f172a;
  font-weight: 850;
  padding: 0 12px;
}
.secondary-action {
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  font-weight: 900;
  padding: 0 14px;
  cursor: pointer;
}
.movement-chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(260px, 3fr);
  gap: 14px;
  margin-top: 16px;
  align-items: stretch;
}
.bar-chart-card,
.pie-chart-card {
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}
.movement-svg {
  display: block;
  width: 100%;
  height: clamp(260px, 31vh, 350px);
}
.grid-line {
  stroke: #dbe3ee;
  stroke-width: 1;
}
.axis-line {
  stroke: #94a3b8;
  stroke-width: 1.5;
}
.axis-label,
.chart-legend text {
  fill: #475569;
  font-size: 12px;
  font-weight: 850;
}
.bar-in {
  fill: #2563eb;
  transition: opacity .18s ease, transform .18s ease;
}
.bar-out {
  fill: #f59e0b;
  transition: opacity .18s ease, transform .18s ease;
}
.bar-group.drillable {
  cursor: pointer;
}
.bar-hit-area {
  fill: transparent;
}
.bar-group.drillable:hover .bar-in,
.bar-group.drillable:hover .bar-out,
.bar-group.drillable:focus .bar-in,
.bar-group.drillable:focus .bar-out {
  opacity: .72;
}
.legend-in {
  fill: #2563eb;
}
.legend-out {
  fill: #f59e0b;
}
.chart-empty,
.pie-empty {
  display: grid;
  min-height: 260px;
  place-items: center;
  color: #64748b;
  font-weight: 850;
  text-align: center;
}
.pie-wrap {
  display: grid;
  gap: 14px;
  justify-items: center;
}
.pie-visual {
  display: grid;
  width: min(180px, 72%);
  aspect-ratio: 1;
  place-items: center;
  border-radius: 999px;
  box-shadow: inset 0 0 0 18px rgb(255 255 255 / .72), 0 12px 24px rgb(15 23 42 / .10);
}
.pie-visual span {
  display: grid;
  width: 86px;
  height: 86px;
  place-items: center;
  border-radius: 999px;
  background: white;
  color: #0f172a;
  font-size: 1.35rem;
  font-weight: 950;
}
.pie-list {
  display: grid;
  gap: 8px;
  width: 100%;
}
.pie-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  color: #334155;
  font-size: 12px;
  font-weight: 850;
}
.pie-row span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.pie-row b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pie-row em {
  color: #64748b;
  font-style: normal;
}
.pie-row strong {
  color: #0f172a;
}
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
  .movement-chart-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 620px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .movement-head,
  .movement-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .movement-actions input,
  .secondary-action {
    width: 100%;
  }
}
`;
