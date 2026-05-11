"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  buildToolingScanLookupPath,
  formatToolingBalance,
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
  const [currentBalance, setCurrentBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const access = session?.user?.permissions?.toolingStore || "none";
  const canMoveStock = access === "admin";
  const selectedItem = useMemo(
    () => items.find((item) => String(item.value) === String(form.itemId)),
    [form.itemId, items]
  );
  const balanceDisplay = formatToolingBalance(currentBalance || selectedItem);

  const loadCurrentBalance = useCallback(
    async (itemId = form.itemId, locationId = form.locationId) => {
      if (!itemId || !locationId) {
        setCurrentBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const response = await api.get("/tooling/stock", {
          headers,
          params: { itemId, locationId, pageSize: 1 }
        });
        const balance = response.data.data?.[0] || {
          itemId,
          locationId,
          itemCode: selectedItem?.itemCode,
          itemName: selectedItem?.itemName,
          quantityOnHand: 0,
          minimumStock: selectedItem?.minimumStock || 0,
          unit: selectedItem?.unit
        };
        setCurrentBalance(balance);
      } catch {
        setCurrentBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [form.itemId, form.locationId, headers, selectedItem]
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

  useEffect(() => {
    loadCurrentBalance();
  }, [loadCurrentBalance]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadCurrentBalance();

    socket.on("tooling:data-changed", refresh);
    socket.on("tooling:low-stock", refresh);
    socket.on("tooling:stock-recovered", refresh);

    return () => {
      socket.off("tooling:data-changed", refresh);
      socket.off("tooling:low-stock", refresh);
      socket.off("tooling:stock-recovered", refresh);
    };
  }, [loadCurrentBalance]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function handleQrLookup(event) {
    event?.preventDefault?.();

    const lookupPath = buildToolingScanLookupPath(qrCode);

    if (!lookupPath) {
      return;
    }

    try {
      const response = await api.get(lookupPath, { headers });
      const item = response.data;
      setItems((current) => [
        {
          value: item.id,
          label: `${item.itemCode} - ${item.itemName}`,
          itemCode: item.itemCode,
          itemName: item.itemName,
          imageUrl: item.imageUrl,
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
      if (item.locationId) {
        loadCurrentBalance(item.id, item.locationId);
      }
      setMessage("Item ready. Confirm quantity and save.");
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

    const nextErrors = validateToolingMovementForm(form, {
      movementKey: config.key,
      currentBalance,
      selectedItem
    });
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
      setForm((current) => ({
        ...initialForm,
        itemId: current.itemId,
        locationId: current.locationId
      }));
      setQrCode("");
      setSearch("");
      setMessage(`${config.title} saved.`);
      loadCurrentBalance(form.itemId, form.locationId);
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
            <span>{config.key === "stockIn" ? "Receiving counter" : "Issue counter"}</span>
            <b>{config.title}</b>
            <p>
              Scan QR code or type the item code, then confirm quantity. Manual search is available
              when a label cannot be scanned.
            </p>
          </div>
          <div className="counter-status" aria-hidden="true">
            <span />
            <strong>{config.key === "stockIn" ? "IN" : "OUT"}</strong>
          </div>
        </div>

        <form className="movement-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="wide scan-field">
              <span>Scan QR / Item Code</span>
              <div className="inline-field scanner-input">
                <input
                  autoFocus
                  value={qrCode}
                  placeholder="Scan QR code or type item code"
                  onChange={(event) => setQrCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleQrLookup(event);
                    }
                  }}
                />
                <button type="button" onClick={handleQrLookup}>
                  Scan
                </button>
              </div>
            </label>

            <label className="wide">
              <span>Manual Search</span>
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
                inputMode="decimal"
                min="0"
                step="0.01"
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
              <div className="selected-item">
                {selectedItem?.imageUrl ? (
                  <img
                    alt={`${selectedItem.itemName || selectedItem.itemCode} photo`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={selectedItem.imageUrl}
                  />
                ) : null}
                <b>{selectedItem?.label || "-"}</b>
              </div>
            </div>
            <div
              className={`balance-card ${
                form.itemId && form.locationId && balanceDisplay.isLow ? "is-low" : ""
              }`}
            >
              <span>Current Balance</span>
              <b>{isLoadingBalance ? "Loading..." : balanceDisplay.label}</b>
              <small>{currentBalance?.locationCode || "Select item and location"}</small>
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
@keyframes counterReady {
  0%, 100% { transform: translateY(0); opacity: .72; }
  50% { transform: translateY(-3px); opacity: 1; }
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
  grid-template-columns: 280px 1fr;
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
  min-height: 320px;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgb(15 23 42 / .04) 1px, transparent 1px),
    linear-gradient(180deg, rgb(15 23 42 / .04) 1px, transparent 1px),
    #f8fafc;
  background-size: 32px 32px;
  color: #0f172a;
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
  color: #0f766e;
}
.scan-head b {
  display: block;
  margin-top: 10px;
  font-size: 2.2rem;
  line-height: 1;
}
.scan-head p {
  margin: 14px 0 0;
  color: #475569;
  font-weight: 750;
  line-height: 1.6;
}
.counter-status {
  position: absolute;
  left: 24px;
  bottom: 24px;
  display: inline-grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  padding: 12px 14px;
  box-shadow: 0 10px 22px rgb(15 23 42 / .08);
}
.counter-status span {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 6px rgb(34 197 94 / .12);
  animation: counterReady 1.8s ease-in-out infinite;
}
.counter-status strong {
  color: #0f172a;
  font-weight: 950;
  letter-spacing: .12em;
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
.scan-field {
  border: 1px solid #fde68a;
  border-radius: 8px;
  background: #fffbeb;
  padding: 14px;
}
.scan-field input {
  height: 54px;
  border-color: #f59e0b;
  background: white;
  font-size: 1.02rem;
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
  background: #0f766e;
  color: white;
  padding: 0 18px;
  font-weight: 950;
}
.scanner-input button {
  min-width: 92px;
  background: #f59e0b;
  color: #111827;
}
.movement-summary {
  display: grid;
  grid-template-columns: 1fr minmax(180px, auto) auto;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}
.movement-summary b {
  display: block;
  margin-top: 4px;
}
.selected-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.selected-item img {
  width: 54px;
  height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  object-fit: cover;
}
.selected-item b {
  margin-top: 0;
}
.movement-summary button {
  min-width: 160px;
  min-height: 46px;
}
.movement-summary button:disabled {
  cursor: not-allowed;
  opacity: .55;
}
.balance-card {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px 12px;
}
.balance-card.is-low {
  border-color: #f59e0b;
  background: #fffbeb;
}
.balance-card b {
  display: block;
  margin-top: 4px;
  font-size: 1.25rem;
}
.balance-card small {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-weight: 850;
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
    grid-template-columns: 1fr;
  }
}
`;
