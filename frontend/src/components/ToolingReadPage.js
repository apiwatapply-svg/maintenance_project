"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getPaginationPages } from "@/lib/pagination.mjs";
import {
  buildToolingQuery,
  getToolingPageRange,
  toolingFilterStorageKeys
} from "@/lib/toolingUi.mjs";
import ToolingLayout from "./ToolingLayout";

const emptyPagination = { page: 1, pageSize: 10, total: 0 };

const resourceConfigs = {
  items: {
    endpoint: "/tooling/items",
    storageKey: toolingFilterStorageKeys.items,
    filters: [
      { key: "search", label: "Search", type: "text", placeholder: "Code or name" },
      { key: "status", label: "Status", type: "select", options: ["", "active", "inactive"] },
      { key: "itemType", label: "Type", type: "select", options: ["", "spare_part", "tooling"] },
      { key: "criticalLevel", label: "Critical", type: "select", options: ["", "low", "medium", "high"] }
    ],
    columns: [
      { key: "itemCode", label: "Code" },
      { key: "itemName", label: "Item Name" },
      { key: "itemType", label: "Type" },
      { key: "unit", label: "Unit" },
      { key: "minimumStock", label: "Min" },
      { key: "maximumStock", label: "Max" },
      { key: "status", label: "Status" }
    ]
  },
  stock: {
    endpoint: "/tooling/stock",
    storageKey: toolingFilterStorageKeys.stock,
    filters: [
      { key: "itemId", label: "Item ID", type: "text", placeholder: "Item ID" },
      { key: "locationId", label: "Location ID", type: "text", placeholder: "Location ID" }
    ],
    columns: [
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "locationCode", label: "Location" },
      { key: "quantityOnHand", label: "On Hand", highlightLow: true },
      { key: "minimumStock", label: "Min" },
      { key: "unit", label: "Unit" }
    ]
  }
};

export default function ToolingReadPage({ resource }) {
  return (
    <ToolingLayout>
      {({ headers }) => <ToolingReadContent headers={headers} resource={resource} />}
    </ToolingLayout>
  );
}

function readSavedFilters(config) {
  try {
    return JSON.parse(localStorage.getItem(config.storageKey)) || {};
  } catch {
    return {};
  }
}

function ToolingReadContent({ headers, resource }) {
  const config = resourceConfigs[resource];
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const totalPages = Math.max(Math.ceil(pagination.total / pagination.pageSize), 1);
  const range = getToolingPageRange(pagination);

  useEffect(() => {
    setFilters(readSavedFilters(config));
  }, [config]);

  const loadRows = useCallback(
    async (nextFilters = filters) => {
      setIsLoading(true);
      try {
        const query = buildToolingQuery({
          ...nextFilters,
          page: nextFilters.page || 1,
          pageSize: nextFilters.pageSize || pagination.pageSize
        });
        const response = await api.get(config.endpoint, { headers, params: query });

        setRows(response.data.data || []);
        setPagination(response.data.pagination || emptyPagination);
        localStorage.setItem(config.storageKey, JSON.stringify(nextFilters));
        setMessage("");
      } catch (error) {
        setMessage(error.response?.data?.message || "Cannot load records.");
      } finally {
        setIsLoading(false);
      }
    },
    [config.endpoint, config.storageKey, filters, headers, pagination.pageSize]
  );

  useEffect(() => {
    loadRows(readSavedFilters(config));
  }, [config, loadRows]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadRows(filters);

    socket.on("tooling:data-changed", refresh);
    socket.on("tooling:low-stock", refresh);
    socket.on("tooling:stock-recovered", refresh);

    return () => {
      socket.off("tooling:data-changed", refresh);
      socket.off("tooling:low-stock", refresh);
      socket.off("tooling:stock-recovered", refresh);
    };
  }, [filters, loadRows]);

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value, page: 1 };
    setFilters(nextFilters);
    loadRows(nextFilters);
  }

  function changePage(page) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadRows(nextFilters);
  }

  function changePageSize(pageSize) {
    const nextFilters = { ...filters, page: 1, pageSize: Number(pageSize) };
    setFilters(nextFilters);
    loadRows(nextFilters);
  }

  return (
    <section className="tooling-content">
      <style>{readStyles}</style>
      <div className="read-toolbar">
        {config.filters.map((filter) => (
          <label key={filter.key}>
            <span>{filter.label}</span>
            {filter.type === "select" ? (
              <select
                value={filters[filter.key] || ""}
                onChange={(event) => updateFilter(filter.key, event.target.value)}
              >
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option || "All"}
                  </option>
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
      </div>

      {message ? <div className="tooling-alert">{message}</div> : null}

      <section className="read-card">
        <div className="read-card-head">
          <b>Records</b>
          <span>
            {range.from}-{range.to} of {pagination.total}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id || `${row.itemId}-${row.locationId}`}>
                  {config.columns.map((column) => (
                    <td key={column.key}>
                      <CellValue column={column} row={row} />
                    </td>
                  ))}
                </tr>
              ))}
              {!isLoading && !rows.length ? (
                <tr>
                  <td colSpan={config.columns.length}>No records found.</td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td colSpan={config.columns.length}>Loading...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="read-pagination">
          <div className="page-buttons">
            {getPaginationPages(pagination.page, totalPages).map((page) =>
              String(page).startsWith("ellipsis") ? (
                <span className="page-ellipsis" key={page}>
                  ...
                </span>
              ) : (
                <button
                  className={page === pagination.page ? "is-active" : ""}
                  key={page}
                  type="button"
                  onClick={() => changePage(page)}
                >
                  {page}
                </button>
              )
            )}
          </div>
          <select
            aria-label="Page size"
            value={pagination.pageSize}
            onChange={(event) => changePageSize(event.target.value)}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </section>
    </section>
  );
}

function CellValue({ column, row }) {
  const value = row[column.key];
  const isLow =
    column.highlightLow && Number(row.quantityOnHand || 0) <= Number(row.minimumStock || 0);

  if (column.key === "status") {
    return <span className={`status-pill ${value === "active" ? "is-active" : ""}`}>{value}</span>;
  }

  if (column.highlightLow) {
    return <span className={`stock-pill ${isLow ? "is-low" : ""}`}>{value ?? 0}</span>;
  }

  return value ?? "-";
}

const readStyles = `
.read-toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.read-toolbar label {
  display: grid;
  gap: 7px;
}
.read-toolbar span {
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.read-toolbar input,
.read-toolbar select,
.read-pagination select {
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 0 12px;
  font-weight: 850;
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
.read-card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
  padding: 18px;
}
.read-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.read-card-head b {
  font-size: 1.1rem;
}
.read-card-head span {
  color: #475569;
  font-weight: 850;
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}
th,
td {
  border-bottom: 1px solid #e2e8f0;
  padding: 14px 12px;
  text-align: center;
  vertical-align: middle;
}
th {
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
td {
  color: #0f172a;
  font-weight: 750;
}
.status-pill,
.stock-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  min-height: 28px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}
.status-pill.is-active {
  background: #dcfce7;
  color: #166534;
}
.stock-pill {
  background: #dbeafe;
  color: #1d4ed8;
}
.stock-pill.is-low {
  background: #fef3c7;
  color: #92400e;
}
.read-pagination {
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
  color: #111827;
}
.page-ellipsis {
  align-self: center;
  color: #64748b;
  font-weight: 950;
}
.read-pagination select {
  justify-self: end;
  min-width: 92px;
}
@media (max-width: 960px) {
  .read-toolbar {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}
@media (max-width: 620px) {
  .read-toolbar {
    grid-template-columns: 1fr;
  }
  .read-pagination {
    grid-template-columns: 1fr;
  }
  .page-buttons {
    grid-column: auto;
  }
  .read-pagination select {
    justify-self: stretch;
  }
}
`;
