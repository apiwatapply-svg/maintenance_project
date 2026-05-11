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

export default function ToolingHistoryPage() {
  return (
    <ToolingLayout>
      {({ headers, session }) => <ToolingHistoryContent headers={headers} session={session} />}
    </ToolingLayout>
  );
}

function ToolingHistoryContent({ headers, session }) {
  const [filters, setFilters] = useState({ page: 1, pageSize: 10, movementType: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [message, setMessage] = useState("");
  const isAdmin = session?.user?.permissions?.toolingStore === "admin";
  const totalPages = Math.max(Math.ceil(pagination.total / pagination.pageSize), 1);
  const range = getToolingPageRange(pagination);

  const loadHistory = useCallback(
    async (nextFilters = filters) => {
      if (!isAdmin) {
        setRows([]);
        setMessage("Admin permission is required for history.");
        return;
      }

      try {
        const response = await api.get("/tooling/history", {
          headers,
          params: buildToolingQuery(nextFilters)
        });
        setRows(response.data.data || []);
        setPagination(response.data.pagination || emptyPagination);
        setMessage("");
      } catch (error) {
        setMessage(error.response?.data?.message || "Cannot load transaction history.");
      }
    },
    [filters, headers, isAdmin]
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadHistory(filters);

    socket.on("tooling:data-changed", refresh);
    socket.on("tooling:request-issued", refresh);

    return () => {
      socket.off("tooling:data-changed", refresh);
      socket.off("tooling:request-issued", refresh);
    };
  }, [filters, loadHistory]);

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value, page: 1 };
    setFilters(nextFilters);
    loadHistory(nextFilters);
  }

  function changePage(page) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadHistory(nextFilters);
  }

  function changePageSize(pageSize) {
    const nextFilters = { ...filters, page: 1, pageSize: Number(pageSize) };
    setFilters(nextFilters);
    loadHistory(nextFilters);
  }

  return (
    <section className="tooling-content">
      <style>{historyStyles}</style>
      {message ? <div className="history-message">{message}</div> : null}

      <div className="history-toolbar">
        <label>
          <span>Movement</span>
          <select value={filters.movementType} onChange={(event) => updateFilter("movementType", event.target.value)}>
            <option value="">All</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
            <option value="return_good">Return Good</option>
            <option value="return_damaged">Return Damaged</option>
            <option value="return_lost">Return Lost</option>
          </select>
        </label>
        <label>
          <span>Search</span>
          <input value={filters.search || ""} placeholder="Transaction or reference" onChange={(event) => updateFilter("search", event.target.value)} />
        </label>
      </div>

      <section className="history-card">
        <div className="history-head">
          <b>Transaction Log</b>
          <span>{range.from}-{range.to} of {pagination.total}</span>
        </div>
        <div className="history-table-wrap">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Photo</th>
                <th>Transaction</th>
                <th>Movement</th>
                <th>Item</th>
                <th>Location</th>
                <th>Quantity</th>
                <th>Reference</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || index}>
                  <td>{getToolingRowNumber(index, pagination)}</td>
                  <td>
                    {row.imageUrl ? (
                      <img alt={`${row.itemName || row.itemCode} photo`} className="history-thumb" src={resolveToolingImageUrl(row.imageUrl)} />
                    ) : (
                      <span className="no-photo">No photo</span>
                    )}
                  </td>
                  <td>{row.transactionNo || "-"}</td>
                  <td><span className="movement-pill">{row.movementType || "-"}</span></td>
                  <td>{[row.itemCode, row.itemName].filter(Boolean).join(" - ") || "-"}</td>
                  <td>{row.locationCode || row.locationName || row.locationId || "-"}</td>
                  <td>{Number(row.quantity || 0).toLocaleString()}</td>
                  <td>{row.referenceNo || row.referenceType || "-"}</td>
                  <td>{row.transactionDate ? new Date(row.transactionDate).toLocaleString() : "-"}</td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan="9">No transaction history.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="history-pagination">
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

const historyStyles = `
.history-message {
  margin-bottom: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  padding: 12px 14px;
  font-weight: 850;
}
.history-toolbar {
  display: grid;
  grid-template-columns: 220px minmax(220px, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}
.history-toolbar label {
  display: grid;
  gap: 7px;
}
.history-toolbar span {
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.history-toolbar input,
.history-toolbar select,
.history-pagination select {
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 0 12px;
  font-weight: 850;
}
.history-card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
  padding: 18px;
}
.history-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}
.history-table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 1080px;
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
td {
  font-weight: 750;
}
.history-thumb {
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
.movement-pill {
  display: inline-flex;
  border-radius: 999px;
  background: #e0f2fe;
  color: #075985;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 950;
}
.history-pagination {
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
.history-pagination select {
  justify-self: end;
  min-width: 92px;
}
@media (max-width: 760px) {
  .history-toolbar,
  .history-pagination {
    grid-template-columns: 1fr;
  }
  .page-buttons { grid-column: auto; }
  .history-pagination select { justify-self: stretch; }
}
`;
