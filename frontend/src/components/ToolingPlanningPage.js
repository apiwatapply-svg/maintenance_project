"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getPaginationPages } from "@/lib/pagination.mjs";
import {
  buildToolingQuery,
  getToolingPageRange,
  getToolingRowNumber,
  resolveToolingImageUrl
} from "@/lib/toolingUi.mjs";
import ToolingLayout from "./ToolingLayout";

const emptyPagination = { page: 1, pageSize: 10, total: 0 };
const statuses = [
  "",
  "normal",
  "reorder_soon",
  "need_order",
  "stockout_risk",
  "slow_movement",
  "critical_slow_movement",
  "dead_stock",
  "overstock"
];
const criticalLevels = ["", "normal", "important", "critical"];

export default function ToolingPlanningPage() {
  return (
    <ToolingLayout>
      {({ headers }) => <ToolingPlanningContent headers={headers} />}
    </ToolingLayout>
  );
}

function ToolingPlanningContent({ headers }) {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ search: "", planningStatus: "", criticalLevel: "", page: 1, pageSize: 10 });
  const [pagination, setPagination] = useState(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const totalPages = Math.max(Math.ceil(pagination.total / pagination.pageSize), 1);
  const range = getToolingPageRange(pagination);

  const loadPlanning = useCallback(
    async (nextFilters = filters) => {
      setIsLoading(true);
      try {
        const response = await api.get("/tooling/planning", {
          headers,
          params: buildToolingQuery(nextFilters)
        });
        setRows(response.data.data || []);
        setPagination(response.data.pagination || emptyPagination);
        setMessage("");
      } catch (error) {
        setMessage(error.response?.data?.message || "Cannot load planning.");
      } finally {
        setIsLoading(false);
      }
    },
    [filters, headers]
  );

  useEffect(() => {
    loadPlanning();
  }, [loadPlanning]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadPlanning(filters);

    socket.on("tooling:data-changed", refresh);
    socket.on("tooling:low-stock", refresh);
    socket.on("tooling:stock-recovered", refresh);
    socket.on("tooling:request-issued", refresh);

    return () => {
      socket.off("tooling:data-changed", refresh);
      socket.off("tooling:low-stock", refresh);
      socket.off("tooling:stock-recovered", refresh);
      socket.off("tooling:request-issued", refresh);
    };
  }, [filters, loadPlanning]);

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value, page: 1 };
    setFilters(nextFilters);
    loadPlanning(nextFilters);
  }

  function changePage(page) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadPlanning(nextFilters);
  }

  function changePageSize(pageSize) {
    const nextFilters = { ...filters, page: 1, pageSize: Number(pageSize) };
    setFilters(nextFilters);
    loadPlanning(nextFilters);
  }

  return (
    <section className="tooling-content">
      <style>{planningStyles}</style>
      <div className="planning-toolbar">
        <label>
          <span>Search</span>
          <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
        </label>
        <label>
          <span>Status</span>
          <select value={filters.planningStatus} onChange={(event) => updateFilter("planningStatus", event.target.value)}>
            {statuses.map((status) => <option key={status} value={status}>{status || "All"}</option>)}
          </select>
        </label>
        <label>
          <span>Critical</span>
          <select value={filters.criticalLevel} onChange={(event) => updateFilter("criticalLevel", event.target.value)}>
            {criticalLevels.map((level) => <option key={level} value={level}>{level || "All"}</option>)}
          </select>
        </label>
      </div>

      {message ? <div className="planning-message">{message}</div> : null}

      <section className="planning-card">
        <div className="planning-card-head">
          <b>Planning</b>
          <span>{range.from}-{range.to} of {pagination.total}</span>
        </div>
        <div className="planning-table-wrap">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Photo</th>
                <th>Item</th>
                <th>Current</th>
                <th>Avg / Day</th>
                <th>Reorder Point</th>
                <th>Days Left</th>
                <th>Suggested Order</th>
                <th>Status</th>
                <th>Critical</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.itemId || row.itemCode}>
                  <td>{getToolingRowNumber(index, pagination)}</td>
                  <td>
                    {row.imageUrl ? (
                      <img
                        alt={`${row.itemName || row.itemCode} photo`}
                        className="planning-thumb"
                        src={resolveToolingImageUrl(row.imageUrl)}
                      />
                    ) : (
                      <span className="no-photo">No photo</span>
                    )}
                  </td>
                  <td>{row.itemCode} - {row.itemName}</td>
                  <td>{row.currentStock}</td>
                  <td>{row.averageDailyUsage}</td>
                  <td>{row.reorderPoint}</td>
                  <td>{row.daysUntilStockout ?? "-"}</td>
                  <td>{row.suggestedOrderQuantity}</td>
                  <td><span className={`planning-status status-${row.planningStatus}`}>{row.planningStatus}</span></td>
                  <td>{row.criticalLevel}</td>
                </tr>
              ))}
              {!isLoading && !rows.length ? <tr><td colSpan="10">No planning records found.</td></tr> : null}
              {isLoading ? <tr><td colSpan="10">Loading...</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="planning-pagination">
          <div className="page-buttons">
            {getPaginationPages(pagination.page, totalPages).map((page) =>
              String(page).startsWith("ellipsis") ? (
                <span className="page-ellipsis" key={page}>...</span>
              ) : (
                <button className={page === pagination.page ? "is-active" : ""} key={page} type="button" onClick={() => changePage(page)}>
                  {page}
                </button>
              )
            )}
          </div>
          <select aria-label="Page size" value={pagination.pageSize} onChange={(event) => changePageSize(event.target.value)}>
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      </section>
    </section>
  );
}

const planningStyles = `
.planning-toolbar {
  display: grid;
  grid-template-columns: 1fr 220px 220px;
  gap: 12px;
  margin-bottom: 14px;
}
.planning-toolbar label {
  display: grid;
  gap: 7px;
}
.planning-toolbar span {
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.planning-toolbar input,
.planning-toolbar select,
.planning-pagination select {
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 0 12px;
  font-weight: 850;
}
.planning-message {
  margin-bottom: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  padding: 12px 14px;
  font-weight: 850;
}
.planning-card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
  padding: 18px;
}
.planning-card-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}
.planning-table-wrap { overflow-x: auto; }
table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}
th, td {
  border-bottom: 1px solid #e2e8f0;
  padding: 14px 12px;
  text-align: center;
}
th {
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
td { font-weight: 750; }
.planning-thumb {
  width: 58px;
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  object-fit: cover;
}
.no-photo {
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}
.planning-status {
  display: inline-flex;
  min-width: 120px;
  justify-content: center;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}
.status-stockout_risk, .status-need_order { background: #fee2e2; color: #991b1b; }
.status-reorder_soon { background: #fef3c7; color: #92400e; }
.status-slow_movement, .status-critical_slow_movement, .status-dead_stock { background: #ede9fe; color: #5b21b6; }
.status-overstock { background: #dbeafe; color: #1d4ed8; }
.status-normal { background: #dcfce7; color: #166534; }
.planning-pagination {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.page-buttons {
  grid-column: 2;
  display: flex;
  justify-content: center;
  gap: 8px;
}
.page-buttons button {
  min-width: 40px;
  height: 38px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  font-weight: 950;
}
.page-buttons button.is-active {
  border-color: #f59e0b;
  background: #f59e0b;
}
.planning-pagination select {
  justify-self: end;
  min-width: 92px;
}
@media (max-width: 760px) {
  .planning-toolbar,
  .planning-pagination {
    grid-template-columns: 1fr;
  }
  .page-buttons {
    grid-column: auto;
  }
  .planning-pagination select {
    justify-self: stretch;
  }
}
`;
