"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getPaginationPages } from "@/lib/pagination.mjs";
import {
  buildToolingQuery,
  buildToolingExcelHtml,
  getToolingPageRange,
  getToolingReportFilterConfig,
  getToolingRowNumber,
  resolveToolingImageUrl,
  sanitizeToolingReportFilters
} from "@/lib/toolingUi.mjs";
import ToolingLayout from "./ToolingLayout";

const emptyPagination = { page: 1, pageSize: 10, total: 0 };
const reportOptions = [
  "low-stock",
  "reorder-suggestion",
  "stockout-risk",
  "slow-movement",
  "overstock",
  "movement",
  "issue-by-department",
  "issue-by-machine",
  "issue-by-job"
];

export default function ToolingReportsPage() {
  return (
    <ToolingLayout>
      {({ headers }) => <ToolingReportsContent headers={headers} />}
    </ToolingLayout>
  );
}

function ToolingReportsContent({ headers }) {
  const [reportKey, setReportKey] = useState("low-stock");
  const [filters, setFilters] = useState({ page: 1, pageSize: 10 });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const totalPages = Math.max(Math.ceil(pagination.total / pagination.pageSize), 1);
  const range = getToolingPageRange(pagination);

  const loadReport = useCallback(
    async (key = reportKey, nextFilters = filters) => {
      setIsLoading(true);
      try {
        const response = await api.get(`/tooling/reports/${key}`, {
          headers,
          params: buildToolingQuery(sanitizeToolingReportFilters(nextFilters))
        });
        setRows(response.data.data || []);
        setPagination(response.data.pagination || emptyPagination);
        setMessage("");
      } catch (error) {
        setMessage(error.response?.data?.message || "Cannot load report.");
      } finally {
        setIsLoading(false);
      }
    },
    [filters, headers, reportKey]
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadReport(reportKey, filters);

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
  }, [filters, loadReport, reportKey]);

  function updateReportKey(value) {
    setReportKey(value);
    const nextFilters = { page: 1, pageSize: filters.pageSize };
    setFilters(nextFilters);
    loadReport(value, nextFilters);
  }

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value, page: 1 };
    setFilters(nextFilters);
    loadReport(reportKey, nextFilters);
  }

  function changePage(page) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadReport(reportKey, nextFilters);
  }

  function changePageSize(pageSize) {
    const nextFilters = { ...filters, page: 1, pageSize: Number(pageSize) };
    setFilters(nextFilters);
    loadReport(reportKey, nextFilters);
  }

  async function exportExcel() {
    try {
      const response = await api.get(`/tooling/reports/${reportKey}`, {
        headers,
        params: buildToolingQuery(sanitizeToolingReportFilters({
          ...filters,
          page: 1,
          pageSize: 100
        }))
      });
      const exportRows = response.data.data || [];
      const exportColumns = buildColumns(exportRows);
      const html = buildToolingExcelHtml({
        title: reportKey,
        columns: exportColumns,
        rows: exportRows
      });
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `tooling-${reportKey}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot export report.");
    }
  }

  const columns = buildColumns(rows);
  const filterConfig = getToolingReportFilterConfig(reportKey);

  return (
    <section className="tooling-content">
      <style>{reportStyles}</style>
      <div className="report-toolbar">
        <label>
          <span>Report</span>
          <select value={reportKey} onChange={(event) => updateReportKey(event.target.value)}>
            {reportOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        {filterConfig.map((filter) => (
          <label key={filter.key}>
            <span>{filter.label}</span>
            {filter.type === "select" ? (
              <select value={filters[filter.key] || ""} onChange={(event) => updateFilter(filter.key, event.target.value)}>
                {filter.options.map((option) => (
                  <option key={option} value={option}>{option || "All"}</option>
                ))}
              </select>
            ) : (
              <input
                value={filters[filter.key] || ""}
                placeholder={filter.placeholder}
                onChange={(event) => updateFilter(filter.key, event.target.value)}
              />
            )}
          </label>
        ))}
        <button className="export-button" type="button" onClick={exportExcel}>
          Export Excel
        </button>
      </div>

      {message ? <div className="report-message">{message}</div> : null}

      <section className="report-card">
        <div className="report-card-head">
          <b>{reportKey}</b>
          <span>{range.from}-{range.to} of {pagination.total}</span>
        </div>
        <div className="report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Photo</th>
                {columns.map((column) => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || row.itemId || row.groupId || index}>
                  <td>{getToolingRowNumber(index, pagination)}</td>
                  <td>
                    {row.imageUrl ? (
                      <img
                        alt={`${row.itemName || row.itemCode || "Tooling item"} photo`}
                        className="report-thumb"
                        src={resolveToolingImageUrl(row.imageUrl)}
                      />
                    ) : (
                      <span className="no-photo">No photo</span>
                    )}
                  </td>
                  {columns.map((column) => <td key={column}>{formatCell(row[column])}</td>)}
                </tr>
              ))}
              {!isLoading && !rows.length ? <tr><td colSpan={Math.max(columns.length + 2, 1)}>No report data.</td></tr> : null}
              {isLoading ? <tr><td colSpan={Math.max(columns.length + 2, 1)}>Loading...</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="report-pagination">
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

function buildColumns(rows) {
  const preferred = [
    "itemCode",
    "itemName",
    "imageUrl",
    "currentStock",
    "planningStatus",
    "suggestedOrderQuantity",
    "daysUntilStockout",
    "movementType",
    "transactionNo",
    "quantity",
    "groupId",
    "transactionCount",
    "totalQuantity"
  ];
  const keys = rows[0] ? Object.keys(rows[0]) : preferred.slice(0, 6);
  return preferred.filter((key) => keys.includes(key)).concat(keys.filter((key) => !preferred.includes(key))).filter((key) => key !== "imageUrl").slice(0, 8);
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

const reportStyles = `
.report-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(180px, 240px)) auto;
  gap: 12px;
  margin-bottom: 14px;
  align-items: end;
}
.report-toolbar label {
  display: grid;
  gap: 7px;
}
.report-toolbar span {
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.report-toolbar input,
.report-toolbar select,
.report-pagination select,
.export-button {
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 0 12px;
  font-weight: 850;
}
.export-button {
  border-color: #0f766e;
  background: #0f766e;
  color: white;
  padding: 0 18px;
}
.report-message {
  margin-bottom: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  padding: 12px 14px;
  font-weight: 850;
}
.report-card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
  padding: 18px;
}
.report-card-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}
.report-table-wrap { overflow-x: auto; }
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
.report-thumb {
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
.report-pagination {
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
.report-pagination select {
  justify-self: end;
  min-width: 92px;
}
@media (max-width: 760px) {
  .report-toolbar,
  .report-pagination {
    grid-template-columns: 1fr;
  }
  .page-buttons { grid-column: auto; }
  .report-pagination select { justify-self: stretch; }
}
`;
