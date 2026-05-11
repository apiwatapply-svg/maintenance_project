"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import {
  getToolingMovementConfig,
  validateToolingMovementForm
} from "@/lib/toolingUi.mjs";
import ToolingLayout from "./ToolingLayout";

const initialForm = {
  itemId: "",
  locationId: "",
  quantity: "",
  referenceNo: "",
  remark: ""
};

export default function ToolingMovementPage({ type }) {
  const movementConfig = getToolingMovementConfig(type);

  return (
    <ToolingLayout>
      {({ headers, session }) => (
        <ToolingMovementContent config={movementConfig} headers={headers} session={session} />
      )}
    </ToolingLayout>
  );
}

function ToolingMovementContent({ config, headers, session }) {
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [qrCode, setQrCode] = useState("");
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const access = session?.user?.permissions?.toolingStore || "none";
  const canMoveStock = access === "admin";
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
      if (!search.trim()) {
        setItems([]);
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

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function handleQrLookup(event) {
    event.preventDefault();

    if (!qrCode.trim()) {
      return;
    }

    try {
      const response = await api.get(`/tooling/items/qr/${encodeURIComponent(qrCode.trim())}`, {
        headers
      });
      const item = response.data;
      setItems((current) => [
        {
          value: item.id,
          label: `${item.itemCode} - ${item.itemName}`,
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantityOnHand: item.quantityOnHand,
          unit: item.unit
        },
        ...current.filter((entry) => String(entry.value) !== String(item.id))
      ]);
      setForm((current) => ({
        ...current,
        itemId: item.id,
        locationId: item.locationId || current.locationId
      }));
      setMessage("Item loaded from QR.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Item not found.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canMoveStock) {
      setMessage("Admin permission is required for stock movement.");
      return;
    }

    const nextErrors = validateToolingMovementForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSaving(true);
    try {
      await api.post(
        config.endpoint,
        {
          ...form,
          itemId: Number(form.itemId),
          locationId: Number(form.locationId),
          quantity: Number(form.quantity)
        },
        { headers }
      );
      setForm(initialForm);
      setQrCode("");
      setSearch("");
      setItems([]);
      setMessage(`${config.title} saved.`);
    } catch (error) {
      setMessage(error.response?.data?.message || `Cannot save ${config.title}.`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="tooling-content">
      <style>{movementStyles}</style>

      {!canMoveStock ? (
        <div className="tooling-alert">Admin permission is required for stock movement.</div>
      ) : null}
      {message ? <div className="tooling-message">{message}</div> : null}

      <section className="movement-card">
        <div className="movement-panel">
          <div className="scan-head">
            <span>{config.key === "stockIn" ? "RECEIVE" : "ISSUE"}</span>
            <b>{config.title}</b>
          </div>
          <div className="scan-indicator" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <form className="movement-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="wide">
              <span>QR / Manual Code</span>
              <div className="inline-field">
                <input
                  value={qrCode}
                  placeholder="Scan or type code"
                  onChange={(event) => setQrCode(event.target.value)}
                />
                <button type="button" onClick={handleQrLookup}>
                  Load
                </button>
              </div>
            </label>

            <label className="wide">
              <span>Search Item</span>
              <input
                value={search}
                placeholder="Type item code or name"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="wide">
              <span>Item</span>
              <select
                value={form.itemId}
                onChange={(event) => updateField("itemId", event.target.value)}
              >
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
              <select
                value={form.locationId}
                onChange={(event) => updateField("locationId", event.target.value)}
              >
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
              <span>{config.quantityLabel}</span>
              <input
                min="0"
                step="0.01"
                type="number"
                value={form.quantity}
                onChange={(event) => updateField("quantity", event.target.value)}
              />
              {errors.quantity ? <small>{errors.quantity}</small> : null}
            </label>

            <label>
              <span>{config.referenceLabel}</span>
              <input
                value={form.referenceNo}
                onChange={(event) => updateField("referenceNo", event.target.value)}
              />
            </label>

            <label>
              <span>Remark</span>
              <input value={form.remark} onChange={(event) => updateField("remark", event.target.value)} />
            </label>
          </div>

          <div className="movement-summary">
            <div>
              <span>Selected</span>
              <b>{selectedItem?.label || "-"}</b>
            </div>
            <button disabled={isSaving || !canMoveStock} type="submit">
              {isSaving ? "Saving..." : config.actionLabel}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

const movementStyles = `
@keyframes scanPulse {
  0%, 100% { transform: translateX(-12px); opacity: .45; }
  50% { transform: translateX(12px); opacity: 1; }
}
.tooling-alert,
.tooling-message {
  margin-bottom: 14px;
  border-radius: 8px;
  padding: 12px 14px;
  font-weight: 850;
}
.tooling-alert {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #991b1b;
}
.tooling-message {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
}
.movement-card {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
}
.movement-panel,
.movement-form {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 12px 28px rgb(15 23 42 / .08);
}
.movement-panel {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgb(255 255 255 / .08) 1px, transparent 1px),
    linear-gradient(180deg, rgb(255 255 255 / .08) 1px, transparent 1px),
    #0f1f2e;
  background-size: 28px 28px;
  color: white;
  padding: 22px;
}
.scan-head span,
.movement-form label span,
.movement-summary span {
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.scan-head span {
  color: #fbbf24;
}
.scan-head b {
  display: block;
  margin-top: 10px;
  font-size: 2.8rem;
  line-height: 1;
}
.scan-indicator {
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 28px;
  display: grid;
  gap: 12px;
}
.scan-indicator span {
  display: block;
  height: 34px;
  border: 2px solid rgb(255 255 255 / .18);
  border-radius: 8px;
  background: linear-gradient(90deg, #f59e0b, #22c55e);
  animation: scanPulse 2s ease-in-out infinite;
}
.scan-indicator span:nth-child(2) {
  animation-delay: .25s;
}
.scan-indicator span:nth-child(3) {
  animation-delay: .5s;
}
.movement-form {
  padding: 18px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.form-grid label {
  display: grid;
  gap: 7px;
}
.form-grid label.wide {
  grid-column: 1 / -1;
}
.form-grid input,
.form-grid select {
  height: 44px;
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #0f172a;
  padding: 0 12px;
  font-weight: 850;
}
.form-grid small {
  color: #b91c1c;
  font-weight: 850;
}
.inline-field {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}
.inline-field button,
.movement-summary button {
  border: 0;
  border-radius: 8px;
  background: #f59e0b;
  color: #111827;
  padding: 0 18px;
  font-weight: 950;
}
.movement-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 18px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}
.movement-summary b {
  display: block;
  margin-top: 4px;
}
.movement-summary button {
  min-width: 160px;
  min-height: 46px;
}
.movement-summary button:disabled {
  cursor: not-allowed;
  opacity: .55;
}
@media (max-width: 980px) {
  .movement-card {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 620px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .movement-summary {
    align-items: stretch;
    flex-direction: column;
  }
}
`;
