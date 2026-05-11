"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getPaginationPages } from "@/lib/pagination.mjs";
import {
  buildToolingQuery,
  getToolingPageRange,
  getToolingRequestDefaultForm,
  validateToolingRequestForm
} from "@/lib/toolingUi.mjs";
import ToolingLayout from "./ToolingLayout";

const emptyPagination = { page: 1, pageSize: 10, total: 0 };
const requestStatuses = ["", "pending", "approved", "rejected", "issued"];
const itemDraftDefault = { itemId: "", locationId: "", quantity: 1 };

export default function ToolingRequestsPage() {
  return (
    <ToolingLayout>
      {({ headers, session }) => <ToolingRequestsContent headers={headers} session={session} />}
    </ToolingLayout>
  );
}

function ToolingRequestsContent({ headers, session }) {
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ status: "", search: "", page: 1, pageSize: 10 });
  const [pagination, setPagination] = useState(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const access = session?.user?.permissions?.toolingStore || "none";
  const isAdmin = access === "admin";
  const totalPages = Math.max(Math.ceil(pagination.total / pagination.pageSize), 1);
  const range = getToolingPageRange(pagination);

  const loadRequests = useCallback(
    async (nextFilters = filters) => {
      setIsLoading(true);
      try {
        const response = await api.get("/tooling/requests", {
          headers,
          params: buildToolingQuery(nextFilters)
        });
        setRequests(response.data.data || []);
        setPagination(response.data.pagination || emptyPagination);
        setMessage("");
      } catch (error) {
        setMessage(error.response?.data?.message || "Cannot load requests.");
      } finally {
        setIsLoading(false);
      }
    },
    [filters, headers]
  );

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadRequests(filters);

    socket.on("tooling:request-created", refresh);
    socket.on("tooling:request-approved", refresh);
    socket.on("tooling:request-rejected", refresh);
    socket.on("tooling:request-issued", refresh);

    return () => {
      socket.off("tooling:request-created", refresh);
      socket.off("tooling:request-approved", refresh);
      socket.off("tooling:request-rejected", refresh);
      socket.off("tooling:request-issued", refresh);
    };
  }, [filters, loadRequests]);

  function updateFilter(key, value) {
    const nextFilters = { ...filters, [key]: value, page: 1 };
    setFilters(nextFilters);
    loadRequests(nextFilters);
  }

  function changePage(page) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadRequests(nextFilters);
  }

  function changePageSize(pageSize) {
    const nextFilters = { ...filters, page: 1, pageSize: Number(pageSize) };
    setFilters(nextFilters);
    loadRequests(nextFilters);
  }

  async function handleAction(id, action, body = {}) {
    try {
      await api.put(`/tooling/requests/${id}/${action}`, body, { headers });
      setMessage(`Request ${action} completed.`);
      loadRequests(filters);
    } catch (error) {
      setMessage(error.response?.data?.message || `Cannot ${action} request.`);
    }
  }

  return (
    <section className="tooling-content">
      <style>{requestStyles}</style>
      <div className="request-actions">
        <button type="button" onClick={() => setIsModalOpen(true)}>
          New Request
        </button>
      </div>

      <div className="request-toolbar">
        <label>
          <span>Search</span>
          <input
            value={filters.search}
            placeholder="Request no."
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </label>
        <label>
          <span>Status</span>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            {requestStatuses.map((status) => (
              <option key={status} value={status}>
                {status || "All"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message ? <div className="request-message">{message}</div> : null}

      <section className="request-card">
        <div className="request-card-head">
          <b>Requests</b>
          <span>
            {range.from}-{range.to} of {pagination.total}
          </span>
        </div>

        <div className="request-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request No</th>
                <th>Requester</th>
                <th>Department</th>
                <th>Status</th>
                <th>Remark</th>
                <th>Created</th>
                {isAdmin ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {requests.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.requestNo}</td>
                  <td>{entry.requesterName || entry.requesterId}</td>
                  <td>{entry.departmentName || entry.departmentId || "-"}</td>
                  <td>
                    <span className={`request-status status-${entry.status}`}>{entry.status}</span>
                  </td>
                  <td>{entry.remark || "-"}</td>
                  <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "-"}</td>
                  {isAdmin ? (
                    <td>
                      <div className="request-row-actions">
                        {entry.status === "pending" ? (
                          <>
                            <button type="button" onClick={() => handleAction(entry.id, "approve")}>
                              Approve
                            </button>
                            <button
                              className="danger"
                              type="button"
                              onClick={() => handleAction(entry.id, "reject", { remark: "Rejected by store" })}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {entry.status === "approved" ? (
                          <button type="button" onClick={() => handleAction(entry.id, "issue")}>
                            Issue
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!isLoading && !requests.length ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6}>No requests found.</td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6}>Loading...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="request-pagination">
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

      {isModalOpen ? (
        <RequestModal
          headers={headers}
          onClose={() => setIsModalOpen(false)}
          onCreated={() => {
            setIsModalOpen(false);
            loadRequests(filters);
          }}
        />
      ) : null}
    </section>
  );
}

function RequestModal({ headers, onClose, onCreated }) {
  const [form, setForm] = useState(getToolingRequestDefaultForm());
  const [draft, setDraft] = useState(itemDraftDefault);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const selectedItem = useMemo(
    () => items.find((item) => String(item.value) === String(draft.itemId)),
    [draft.itemId, items]
  );

  useEffect(() => {
    async function loadLocations() {
      try {
        const response = await api.get("/tooling/locations", {
          headers,
          params: { status: "active", pageSize: 100 }
        });
        setLocations(response.data.data || []);
      } catch {
        setLocations([]);
      }
    }

    loadLocations();
  }, [headers]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!search.trim()) {
        return;
      }

      try {
        const response = await api.get("/tooling/items/search", {
          headers,
          params: { q: search.trim() }
        });
        setItems(response.data || []);
      } catch {
        setItems([]);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [headers, search]);

  function addItem() {
    const quantity = Number(draft.quantity || 0);

    if (!draft.itemId || !draft.locationId || quantity <= 0) {
      setMessage("Select item, location, and quantity.");
      return;
    }

    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          itemId: Number(draft.itemId),
          locationId: Number(draft.locationId),
          quantity,
          label: selectedItem?.label || `Item ${draft.itemId}`,
          locationLabel:
            locations.find((location) => String(location.id) === String(draft.locationId))
              ?.locationName || `Location ${draft.locationId}`
        }
      ]
    }));
    setDraft(itemDraftDefault);
    setSearch("");
    setMessage("");
  }

  async function submitRequest(event) {
    event.preventDefault();

    const nextErrors = validateToolingRequestForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    try {
      await api.post(
        "/tooling/requests",
        {
          referenceType: form.referenceType,
          referenceId: form.referenceId || null,
          remark: form.remark,
          items: form.items.map((item) => ({
            itemId: item.itemId,
            locationId: item.locationId,
            quantity: item.quantity
          }))
        },
        { headers }
      );
      onCreated();
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot create request.");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="request-modal" onSubmit={submitRequest}>
        <div className="modal-head">
          <div>
            <span>Request</span>
            <b>New Issue Request</b>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {message ? <div className="request-message">{message}</div> : null}
        {errors.items ? <div className="request-error">{errors.items}</div> : null}

        <div className="quick-add">
          <label>
            <span>Search Item</span>
            <input
              value={search}
              placeholder="Code or name"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <span>Item</span>
            <select
              value={draft.itemId}
              onChange={(event) => setDraft((current) => ({ ...current, itemId: event.target.value }))}
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({Number(item.quantityOnHand || 0).toLocaleString()} {item.unit})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Location</span>
            <select
              value={draft.locationId}
              onChange={(event) => setDraft((current) => ({ ...current, locationId: event.target.value }))}
            >
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} - {location.locationName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Quantity</span>
            <input
              min="1"
              step="0.01"
              type="number"
              value={draft.quantity}
              onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
            />
          </label>
          <button type="button" onClick={addItem}>
            Add
          </button>
        </div>

        <div className="request-items">
          {form.items.map((item, index) => (
            <div className="request-item-row" key={`${item.itemId}-${item.locationId}-${index}`}>
              <b>{item.label}</b>
              <span>{item.locationLabel}</span>
              <strong>{item.quantity}</strong>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    items: current.items.filter((_, itemIndex) => itemIndex !== index)
                  }))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <label className="remark-field">
          <span>Remark</span>
          <input
            value={form.remark}
            placeholder="Short note"
            onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
          />
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}

const requestStyles = `
.request-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}
.request-actions button,
.request-row-actions button,
.modal-actions button,
.modal-head button,
.quick-add button,
.request-item-row button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 10px 14px;
  font-weight: 950;
}
.request-actions button,
.request-row-actions button,
.modal-actions button.primary,
.quick-add button {
  border-color: #f59e0b;
  background: #f59e0b;
  color: #111827;
}
.request-toolbar {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 12px;
  margin-bottom: 14px;
}
.request-toolbar label,
.quick-add label,
.remark-field {
  display: grid;
  gap: 7px;
}
.request-toolbar span,
.quick-add span,
.remark-field span {
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.request-toolbar input,
.request-toolbar select,
.quick-add input,
.quick-add select,
.remark-field input,
.request-pagination select {
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 0 12px;
  font-weight: 850;
}
.request-message,
.request-error {
  margin-bottom: 14px;
  border-radius: 8px;
  padding: 12px 14px;
  font-weight: 850;
}
.request-message {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
}
.request-error {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #991b1b;
}
.request-card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
  padding: 18px;
}
.request-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.request-table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
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
.request-status {
  display: inline-flex;
  min-width: 86px;
  justify-content: center;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}
.status-pending { background: #fef3c7; color: #92400e; }
.status-approved { background: #dcfce7; color: #166534; }
.status-rejected { background: #fee2e2; color: #991b1b; }
.status-issued { background: #dbeafe; color: #1d4ed8; }
.request-row-actions {
  display: inline-flex;
  gap: 8px;
}
.request-row-actions button.danger {
  border-color: #fecaca;
  background: white;
  color: #991b1b;
}
.request-pagination {
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
.request-pagination select {
  justify-self: end;
  min-width: 92px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgb(15 23 42 / .48);
  padding: 22px;
}
.request-modal {
  width: min(980px, 100%);
  max-height: 90vh;
  overflow: auto;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 24px 70px rgb(15 23 42 / .24);
  padding: 18px;
}
.modal-head,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.modal-head {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 14px;
}
.modal-head span {
  display: block;
  color: #b45309;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.modal-head b {
  display: block;
  margin-top: 4px;
  font-size: 1.5rem;
}
.quick-add {
  display: grid;
  grid-template-columns: 1.2fr 1.5fr 1.4fr .7fr auto;
  align-items: end;
  gap: 12px;
  padding: 16px 0;
}
.request-items {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}
.request-item-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr .4fr auto;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px;
}
.request-item-row span {
  color: #475569;
  font-weight: 850;
}
.modal-actions {
  border-top: 1px solid #e2e8f0;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 14px;
}
@media (max-width: 980px) {
  .quick-add,
  .request-item-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 620px) {
  .request-toolbar,
  .request-pagination {
    grid-template-columns: 1fr;
  }
  .page-buttons {
    grid-column: auto;
  }
  .request-pagination select {
    justify-self: stretch;
  }
  .modal-head,
  .modal-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
`;
