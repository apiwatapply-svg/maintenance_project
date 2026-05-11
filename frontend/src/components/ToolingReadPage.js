"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getPaginationPages } from "@/lib/pagination.mjs";
import {
  buildToolingQuery,
  getToolingItemDefaultForm,
  getToolingPageRange,
  getToolingRowNumber,
  resolveToolingImageUrl,
  toolingCriticalLevelOptions,
  toolingFilterStorageKeys,
  validateToolingImageFileMeta,
  validateToolingItemForm
} from "@/lib/toolingUi.mjs";
import ToolingLayout from "./ToolingLayout";

const emptyPagination = { page: 1, pageSize: 10, total: 0 };

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || "").split(",").pop() || "");
    reader.onerror = () => reject(new Error("Cannot read image file."));
    reader.readAsDataURL(file);
  });
}

const resourceConfigs = {
  items: {
    endpoint: "/tooling/items",
    storageKey: toolingFilterStorageKeys.items,
    filters: [
      { key: "search", label: "Search", type: "text", placeholder: "Code or name" },
      { key: "status", label: "Status", type: "select", options: ["", "active", "inactive"] },
      { key: "itemType", label: "Type", type: "select", options: ["", "spare_part", "tooling"] },
      { key: "criticalLevel", label: "Critical", type: "select", options: toolingCriticalLevelOptions }
    ],
    columns: [
      { key: "imageUrl", label: "Photo", type: "image" },
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
      { key: "imageUrl", label: "Photo", type: "image" },
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
  const [lookups, setLookups] = useState({ categories: [], locations: [], suppliers: [] });
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState(emptyPagination);
  const [itemForm, setItemForm] = useState(getToolingItemDefaultForm());
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const totalPages = Math.max(Math.ceil(pagination.total / pagination.pageSize), 1);
  const range = getToolingPageRange(pagination);
  const canManageItems = resource === "items";

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
    if (!canManageItems) {
      return;
    }

    async function loadLookups() {
      try {
        const [categories, locations, suppliers] = await Promise.all([
          api.get("/tooling/categories", { headers, params: { status: "active", pageSize: 100 } }),
          api.get("/tooling/locations", { headers, params: { status: "active", pageSize: 100 } }),
          api.get("/tooling/suppliers", { headers, params: { status: "active", pageSize: 100 } })
        ]);

        setLookups({
          categories: categories.data.data || [],
          locations: locations.data.data || [],
          suppliers: suppliers.data.data || []
        });
      } catch {
        setLookups({ categories: [], locations: [], suppliers: [] });
      }
    }

    loadLookups();
  }, [canManageItems, headers]);

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

  function openCreateModal() {
    setEditingId(null);
    setItemForm(getToolingItemDefaultForm());
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(row) {
    setEditingId(row.id);
    setItemForm({ ...getToolingItemDefaultForm(), ...row });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function updateItemForm(key, value) {
    setItemForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: "" }));
  }

  function sanitizeItemPayload(form) {
    const numberFields = [
      "categoryId",
      "locationId",
      "preferredSupplierId",
      "minimumStock",
      "maximumStock",
      "safetyStock",
      "leadTimeDays",
      "slowMovementDays",
      "deadStockDays",
      "minimumOrderQuantity"
    ];

    return Object.fromEntries(
      Object.entries(form).map(([key, value]) => {
        if (["categoryId", "locationId", "preferredSupplierId"].includes(key) && value === "") {
          return [key, null];
        }

        if (numberFields.includes(key)) {
          return [key, Number(value || 0)];
        }

        return [key, value];
      })
    );
  }

  async function handleSaveItem(event) {
    event.preventDefault();

    const nextErrors = validateToolingItemForm(itemForm);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = sanitizeItemPayload(itemForm);

      if (editingId) {
        await api.put(`/tooling/items/${editingId}`, payload, { headers });
      } else {
        await api.post("/tooling/items", payload, { headers });
      }

      setIsModalOpen(false);
      setMessage(editingId ? "Item updated." : "Item created.");
      loadRows(filters);
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot save item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUploadImage(file) {
    const imageError = validateToolingImageFileMeta(file);

    if (imageError) {
      setFormErrors((current) => ({ ...current, imageUrl: imageError }));
      return;
    }

    setIsUploadingImage(true);
    setFormErrors((current) => ({ ...current, imageUrl: "" }));

    try {
      const data = await readFileAsBase64(file);
      const response = await api.post(
        "/tooling/items/images",
        {
          fileName: file.name,
          mimeType: file.type,
          data
        },
        { headers }
      );

      setItemForm((current) => ({ ...current, imageUrl: response.data.imageUrl }));
      setMessage("Image uploaded.");
    } catch (error) {
      setFormErrors((current) => ({
        ...current,
        imageUrl: error.response?.data?.message || error.message || "Cannot upload image."
      }));
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleDeleteItem(row) {
    const isConfirmed = window.confirm(`Delete ${row.itemCode}?`);

    if (!isConfirmed) {
      return;
    }

    try {
      await api.delete(`/tooling/items/${row.id}`, { headers });
      setMessage("Item deleted.");
      loadRows(filters);
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot delete item.");
    }
  }

  return (
    <section className="tooling-content">
      <style>{readStyles}</style>
      {canManageItems ? (
        <div className="read-actions">
          <button type="button" onClick={openCreateModal}>
            Add Item
          </button>
        </div>
      ) : null}

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
                <th>No</th>
                {config.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                {canManageItems ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || `${row.itemId}-${row.locationId}`}>
                  <td>{getToolingRowNumber(index, pagination)}</td>
                  {config.columns.map((column) => (
                    <td key={column.key}>
                      <CellValue column={column} row={row} />
                    </td>
                  ))}
                  {canManageItems ? (
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => openEditModal(row)}>
                          Edit
                        </button>
                        <button className="danger" type="button" onClick={() => handleDeleteItem(row)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!isLoading && !rows.length ? (
                <tr>
                  <td colSpan={config.columns.length + 1 + (canManageItems ? 1 : 0)}>No records found.</td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td colSpan={config.columns.length + 1 + (canManageItems ? 1 : 0)}>Loading...</td>
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

      {isModalOpen ? (
        <ItemModal
          editingId={editingId}
          errors={formErrors}
          form={itemForm}
          isUploadingImage={isUploadingImage}
          isSaving={isSaving}
          lookups={lookups}
          onChange={updateItemForm}
          onClose={() => setIsModalOpen(false)}
          onImageUpload={handleUploadImage}
          onSubmit={handleSaveItem}
        />
      ) : null}
    </section>
  );
}

function ItemModal({
  editingId,
  errors,
  form,
  isSaving,
  isUploadingImage,
  lookups,
  onChange,
  onClose,
  onImageUpload,
  onSubmit
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="item-modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <span>Item Master</span>
            <b>{editingId ? "Edit Item" : "Add Item"}</b>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-grid">
          <ItemField error={errors.itemCode} label="Item Code">
            <input value={form.itemCode || ""} onChange={(event) => onChange("itemCode", event.target.value)} />
          </ItemField>
          <ItemField error={errors.itemName} label="Item Name">
            <input value={form.itemName || ""} onChange={(event) => onChange("itemName", event.target.value)} />
          </ItemField>
          <ItemField label="Category">
            <select value={form.categoryId || ""} onChange={(event) => onChange("categoryId", event.target.value)}>
              <option value="">None</option>
              {lookups.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.categoryCode} - {category.categoryName}
                </option>
              ))}
            </select>
          </ItemField>
          <ItemField label="Item Type">
            <select value={form.itemType || "spare_part"} onChange={(event) => onChange("itemType", event.target.value)}>
              <option value="spare_part">Spare Part</option>
              <option value="consumable">Consumable</option>
              <option value="safety_stock">Safety Stock</option>
              <option value="tooling">Tooling</option>
            </select>
          </ItemField>
          <ItemField error={errors.unit} label="Unit">
            <input value={form.unit || ""} onChange={(event) => onChange("unit", event.target.value)} />
          </ItemField>
          <ItemField label="Location">
            <select value={form.locationId || ""} onChange={(event) => onChange("locationId", event.target.value)}>
              <option value="">None</option>
              {lookups.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} - {location.locationName}
                </option>
              ))}
            </select>
          </ItemField>
          <ItemField label="Supplier">
            <select
              value={form.preferredSupplierId || ""}
              onChange={(event) => onChange("preferredSupplierId", event.target.value)}
            >
              <option value="">None</option>
              {lookups.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.supplierCode} - {supplier.supplierName}
                </option>
              ))}
            </select>
          </ItemField>
          <ItemField label="Critical Level">
            <select
              value={form.criticalLevel || "normal"}
              onChange={(event) => onChange("criticalLevel", event.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="critical">Critical</option>
            </select>
          </ItemField>
          {[
            ["minimumStock", "Min Stock"],
            ["maximumStock", "Max Stock"],
            ["safetyStock", "Safety Stock"],
            ["leadTimeDays", "Lead Time Days"],
            ["slowMovementDays", "Slow Movement Days"],
            ["deadStockDays", "Dead Stock Days"],
            ["minimumOrderQuantity", "MOQ"]
          ].map(([key, label]) => (
            <ItemField key={key} label={label}>
              <input
                min="0"
                step="0.01"
                type="number"
                value={form[key] ?? 0}
                onChange={(event) => onChange(key, event.target.value)}
              />
            </ItemField>
          ))}
          <ItemField label="QR Code">
            <input value={form.qrCode || ""} onChange={(event) => onChange("qrCode", event.target.value)} />
          </ItemField>
          <ItemField error={errors.imageUrl} label="Item Image">
            <div className="image-upload">
              {form.imageUrl ? (
                <img
                  alt={`${form.itemName || form.itemCode || "Tooling item"} preview`}
                  src={resolveToolingImageUrl(form.imageUrl)}
                />
              ) : (
                <span>No image</span>
              )}
              <div>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isUploadingImage}
                  type="file"
                  onChange={(event) => {
                    onImageUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <input
                  readOnly
                  value={form.imageUrl || ""}
                  placeholder={isUploadingImage ? "Uploading..." : "Stored image path"}
                />
              </div>
            </div>
          </ItemField>
          <ItemField label="Status">
            <select value={form.status || "active"} onChange={(event) => onChange("status", event.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </ItemField>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ItemField({ children, error, label }) {
  return (
    <label>
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function CellValue({ column, row }) {
  const value = row[column.key];
  const isLow =
    column.highlightLow && Number(row.quantityOnHand || 0) <= Number(row.minimumStock || 0);

  if (column.type === "image") {
    return value ? (
      <img
        alt={`${row.itemName || row.itemCode || "Tooling item"} photo`}
        className="item-thumb"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={resolveToolingImageUrl(value)}
      />
    ) : (
      <span className="no-photo">No photo</span>
    );
  }

  if (column.key === "status") {
    return <span className={`status-pill ${value === "active" ? "is-active" : ""}`}>{value}</span>;
  }

  if (column.highlightLow) {
    return <span className={`stock-pill ${isLow ? "is-low" : ""}`}>{value ?? 0}</span>;
  }

  return value ?? "-";
}

const readStyles = `
.read-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}
.read-actions button,
.row-actions button,
.modal-actions button,
.modal-head button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 10px 14px;
  font-weight: 950;
}
.read-actions button,
.modal-actions button.primary {
  border-color: #f59e0b;
  background: #f59e0b;
  color: #111827;
}
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
  min-width: 900px;
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
.item-thumb {
  display: block;
  width: 62px;
  height: 48px;
  margin: 0 auto;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  object-fit: cover;
}
.no-photo {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 850;
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
.row-actions {
  display: inline-flex;
  justify-content: center;
  gap: 8px;
}
.row-actions button {
  min-width: 72px;
  padding: 9px 12px;
}
.row-actions button:first-child {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}
.row-actions button.danger {
  border-color: #fecaca;
  color: #991b1b;
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
.item-modal {
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
.modal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px 0;
}
.modal-grid label {
  display: grid;
  gap: 7px;
}
.modal-grid label span {
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.modal-grid input,
.modal-grid select {
  height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 0 12px;
  font-weight: 850;
}
.image-upload {
  display: grid;
  grid-template-columns: 74px 1fr;
  gap: 10px;
  align-items: center;
}
.image-upload img,
.image-upload > span {
  width: 74px;
  height: 58px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  object-fit: cover;
}
.image-upload > span {
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0;
  text-transform: none;
}
.image-upload > div {
  display: grid;
  gap: 7px;
}
.image-upload input[type="file"] {
  height: auto;
  padding: 8px;
}
.image-upload input[readonly] {
  color: #475569;
  background: #f8fafc;
}
.modal-grid small {
  color: #b91c1c;
  font-weight: 850;
}
.modal-actions {
  border-top: 1px solid #e2e8f0;
  justify-content: flex-end;
  padding-top: 14px;
}
@media (max-width: 960px) {
  .read-toolbar {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
  .modal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
  .modal-grid {
    grid-template-columns: 1fr;
  }
  .modal-head,
  .modal-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
`;
