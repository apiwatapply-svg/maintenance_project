"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import {
  getToolingReturnDefaultForm,
  getToolingSearchMatch,
  normalizeToolingQuantityInput,
  resolveToolingImageUrl,
  validateToolingReturnForm
} from "@/lib/toolingUi.mjs";
import ToolingLayout from "./ToolingLayout";

export default function ToolingReturnPage() {
  return (
    <ToolingLayout>
      {({ headers, session }) => <ToolingReturnContent headers={headers} session={session} />}
    </ToolingLayout>
  );
}

function ToolingReturnContent({ headers, session }) {
  const [form, setForm] = useState(getToolingReturnDefaultForm());
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = session?.user?.permissions?.toolingStore === "admin";
  const selectedItem = useMemo(
    () => items.find((item) => String(item.value) === String(form.itemId)),
    [form.itemId, items]
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
      if (!search.trim()) return;

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

  useEffect(() => {
    const item = getToolingSearchMatch(search, items);

    if (item && String(form.itemId) !== String(item.value)) {
      selectItem(item.value);
    }
  }, [items, search]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function selectItem(value) {
    const item = items.find((entry) => String(entry.value) === String(value));

    setForm((current) => ({
      ...current,
      itemId: value,
      locationId: item?.locationId || current.locationId
    }));
    setErrors((current) => ({ ...current, itemId: "", locationId: "" }));
  }

  function updateSearch(value) {
    setSearch(value);
    const item = getToolingSearchMatch(value, items);

    if (item) {
      selectItem(item.value);
    }
  }

  async function submitReturn(event) {
    event.preventDefault();

    if (!isAdmin) {
      setMessage("Admin permission is required for returns.");
      return;
    }

    const nextErrors = validateToolingReturnForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSaving(true);
    try {
      await api.post(
        "/tooling/return",
        {
          ...form,
          itemId: Number(form.itemId),
          locationId: Number(form.locationId),
          quantity: Number(form.quantity)
        },
        { headers }
      );
      setForm(getToolingReturnDefaultForm());
      setSearch("");
      setMessage("Return saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Cannot save return.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="tooling-content">
      <style>{returnStyles}</style>
      {!isAdmin ? <div className="return-alert">Admin permission is required for returns.</div> : null}
      {message ? <div className="return-message">{message}</div> : null}

      <form className="return-card" onSubmit={submitReturn}>
        <div className="return-panel">
          <span>RETURN</span>
          <b>Spare Part Return</b>
          <p>{form.condition === "good" ? "Good returns increase available stock." : "Damaged or lost returns keep available stock unchanged."}</p>
        </div>

        <div className="return-form">
          <label className="wide">
            <span>Scan QR / Item Code / Item Name</span>
            <input
              list="return-item-options"
              value={search}
              placeholder="Scan QR, item code, or item name"
              onChange={(event) => updateSearch(event.target.value)}
            />
            <datalist id="return-item-options">
              {items.map((item) => (
                <option key={item.value} value={item.itemCode}>
                  {item.itemName}
                </option>
              ))}
            </datalist>
          </label>
          <label className="wide">
            <span>Item</span>
            <select value={form.itemId} onChange={(event) => selectItem(event.target.value)}>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({Number(item.quantityOnHand || 0).toLocaleString()} {item.unit})
                </option>
              ))}
            </select>
            {errors.itemId ? <small>{errors.itemId}</small> : null}
          </label>
          <label>
            <span>Location</span>
            <select value={form.locationId} onChange={(event) => updateField("locationId", event.target.value)}>
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} - {location.locationName}
                </option>
              ))}
            </select>
            {errors.locationId ? <small>{errors.locationId}</small> : null}
          </label>
          <label>
            <span>Quantity</span>
            <input
              className="quantity-input"
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              value={form.quantity}
              onChange={(event) =>
                updateField("quantity", normalizeToolingQuantityInput(event.target.value))
              }
            />
            {errors.quantity ? <small>{errors.quantity}</small> : null}
          </label>
          <label>
            <span>Condition</span>
            <select value={form.condition} onChange={(event) => updateField("condition", event.target.value)}>
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
            {errors.condition ? <small>{errors.condition}</small> : null}
          </label>
          <label>
            <span>Reference</span>
            <input value={form.referenceNo} onChange={(event) => updateField("referenceNo", event.target.value)} />
          </label>
          <label className="wide">
            <span>Remark</span>
            <input value={form.remark} onChange={(event) => updateField("remark", event.target.value)} />
          </label>
          <div className="return-summary">
            <div>
              <span>Selected</span>
              <div className="return-selected">
                {selectedItem?.imageUrl ? (
                  <img
                    alt={`${selectedItem.itemName || selectedItem.itemCode} photo`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={resolveToolingImageUrl(selectedItem.imageUrl)}
                  />
                ) : null}
                <b>{selectedItem?.label || "-"}</b>
              </div>
            </div>
            <button disabled={isSaving || !isAdmin} type="submit">
              {isSaving ? "Saving..." : "Save Return"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

const returnStyles = `
.return-alert,
.return-message {
  margin-bottom: 14px;
  border-radius: 8px;
  padding: 12px 14px;
  font-weight: 850;
}
.return-alert {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #991b1b;
}
.return-message {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
}
.return-card {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
}
.return-panel,
.return-form {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
}
.return-panel {
  min-height: 360px;
  background: #0f1f2e;
  color: white;
  padding: 22px;
}
.return-panel span,
.return-form label span,
.return-summary span {
  color: #fbbf24;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.return-form label span,
.return-summary span {
  color: #64748b;
}
.return-panel b {
  display: block;
  margin-top: 10px;
  font-size: 2.6rem;
  line-height: 1;
}
.return-panel p {
  margin-top: 20px;
  color: #cbd5e1;
  font-weight: 800;
  line-height: 1.7;
}
.return-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  background: white;
  padding: 18px;
}
.return-form label {
  display: grid;
  gap: 7px;
}
.return-form label.wide {
  grid-column: 1 / -1;
}
.return-form input,
.return-form select {
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 0 12px;
  font-weight: 850;
}
.return-form .quantity-input {
  text-align: right;
}
.return-form small {
  color: #b91c1c;
  font-weight: 850;
}
.return-summary {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}
.return-summary b {
  display: block;
  margin-top: 4px;
}
.return-selected {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.return-selected img {
  width: 54px;
  height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  object-fit: cover;
}
.return-selected b {
  margin-top: 0;
}
.return-summary button {
  min-width: 160px;
  min-height: 46px;
  border: 0;
  border-radius: 8px;
  background: #f59e0b;
  color: #111827;
  font-weight: 950;
}
.return-summary button:disabled {
  cursor: not-allowed;
  opacity: .55;
}
@media (max-width: 980px) {
  .return-card {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 620px) {
  .return-form {
    grid-template-columns: 1fr;
  }
  .return-summary {
    align-items: stretch;
    flex-direction: column;
  }
}
`;
