"use client";

import { useState } from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SearchableDropdown({ accent = "emerald", options = [], placeholder = "Select", value, defaultValue = "", onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;
  const normalizedOptions = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
  const selected = normalizedOptions.find((option) => String(option.value) === String(currentValue));
  const visibleOptions = normalizedOptions.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(query.toLowerCase()));
  const accentClasses = {
    amber: {
      focus: "focus-within:border-amber-400 focus-within:ring-amber-100",
      hover: "hover:bg-amber-50",
      active: "bg-amber-100 text-amber-900"
    },
    emerald: {
      focus: "focus-within:border-emerald-500 focus-within:ring-emerald-100",
      hover: "hover:bg-emerald-50",
      active: "bg-emerald-100 text-emerald-900"
    },
    sky: {
      focus: "focus-within:border-sky-500 focus-within:ring-sky-100",
      hover: "hover:bg-sky-50",
      active: "bg-sky-100 text-sky-900"
    },
    violet: {
      focus: "focus-within:border-violet-400 focus-within:ring-violet-100",
      hover: "hover:bg-violet-50",
      active: "bg-violet-100 text-violet-800"
    }
  };
  const colors = accentClasses[accent] || accentClasses.emerald;

  function chooseOption(option) {
    setInternalValue(option.value);
    onChange?.(option.value, option);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="relative min-w-0">
      <div className={classNames("flex h-11 items-center rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:ring-4", colors.focus)}>
        <input
          className="w-0 min-w-0 flex-1 rounded-l-xl bg-transparent px-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={placeholder}
          value={isOpen ? query : selected?.label || currentValue || ""}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setIsOpen(true);
          }}
        />
        <button className="h-full w-11 shrink-0 rounded-r-xl border-l border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-50" type="button" onClick={() => setIsOpen((current) => !current)}>
          v
        </button>
      </div>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-12 z-[80] max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {visibleOptions.map((option) => (
            <button
              className={classNames("block w-full truncate rounded-lg px-3 py-2 text-left text-sm font-bold transition", colors.hover, String(option.value) === String(currentValue) ? colors.active : "text-slate-800")}
              key={`${option.value}-${option.label}`}
              title={option.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </button>
          ))}
          {!visibleOptions.length ? <div className="px-3 py-2 text-sm font-bold text-slate-500">No options found.</div> : null}
        </div>
      ) : null}
    </div>
  );
}
