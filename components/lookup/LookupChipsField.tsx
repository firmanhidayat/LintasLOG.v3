"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function cn(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}
function toId(v: string | number) {
  return String(v);
}
function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

export type LookupFetcherParams = {
  query: string;
  signal: AbortSignal;
};
export type LookupFetcher<T> = (params: LookupFetcherParams) => Promise<T[]>;

export type LookupChipsFieldProps<T> = {
  label?: string;
  value: T[];
  onChange: (next: T[]) => void;
  fetcher: LookupFetcher<T>;
  getId: (item: T) => string | number;
  getLabel: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean; // default true
  maxChipsShown?: number; // default 50
  allowCreate?: boolean;
  onCreateNew?: (currentQuery: string) => void | Promise<void>;
  modalTitle?: string;
  renderRowRight?: (item: T, checked: boolean) => React.ReactNode;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}
const CHIP_CLASSES = [
  "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 ",
  "bg-sky-500/15 text-sky-800 border-sky-500/30 ",
  "bg-amber-500/15 text-amber-900 border-amber-500/30 ",
  "bg-fuchsia-500/15 text-fuchsia-800 border-fuchsia-500/30 ",
  "bg-indigo-500/15 text-indigo-800 border-indigo-500/30 ",
  "bg-rose-500/15 text-rose-800 border-rose-500/30 ",
  "bg-teal-500/15 text-teal-800 border-teal-500/30 ",
  "bg-lime-500/15 text-lime-900 border-lime-500/30 ",
];

function Chip({
  text,
  onRemove,
}: {
  text: string;
  onRemove?: () => void;
}) {
  const idx = hashString(text) % CHIP_CLASSES.length;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
        CHIP_CLASSES[idx]
      )}
    >
      <span className="max-w-[220px] truncate">{text}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-black/5 text-[10px] leading-none hover:bg-brand/100 "
          aria-label={`Remove ${text}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

function LookupModal<T>({
  open,
  title,
  query,
  setQuery,
  items,
  loading,
  error,
  tempSelectedIds,
  toggle,
  onClose,
  onSelect,
  onCreateNew,
  allowCreate,
  getId,
  getLabel,
  renderRowRight,
}: {
  open: boolean;
  title: string;
  query: string;
  setQuery: (v: string) => void;
  items: T[];
  loading: boolean;
  error: string | null;
  tempSelectedIds: Set<string>;
  toggle: (item: T) => void;
  onClose: () => void;
  onSelect: () => void;
  allowCreate: boolean;
  onCreateNew?: () => void;
  getId: (item: T) => string | number;
  getLabel: (item: T) => string;
  renderRowRight?: (item: T, checked: boolean) => React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", escHandler);
    return () => window.removeEventListener("keydown", escHandler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl ">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 ">
            <div className="text-sm font-bold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm hover:bg-brand/100 "
            >
              Close
            </button>
          </div>

          {/* Search */}
          <div className="border-b border-black/10 px-4 py-3 ">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 "
            />
            <div className="mt-2 flex items-center gap-3 text-xs text-black/50 ">
              <span>{loading ? "Loading..." : `${items.length} items`}</span>
              <span>•</span>
              <span>{tempSelectedIds.size} selected</span>
              {error && (
                <>
                  <span>•</span>
                  <span className="text-rose-600 ">{error}</span>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[55vh] overflow-auto">
            <div className="grid grid-cols-[44px_1fr_auto] gap-0 text-xs font-semibold text-black/50 ">
              <div className="px-4 py-2"> </div>
              <div className="px-0 py-2">Display Name</div>
              <div className="px-4 py-2 text-right"> </div>
            </div>

            <div className="border-t border-black/10 " />

            {items.map((it) => {
              const id = toId(getId(it));
              const checked = tempSelectedIds.has(id);
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => toggle(it)}
                  className={cn(
                    "grid w-full grid-cols-[44px_1fr_auto] items-center gap-0 border-b border-black/5 px-0 text-left text-sm hover:bg-black/5 ",
                    checked && "bg-sky-500/10 "
                  )}
                >
                  <div className="flex items-center justify-center px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="h-4 w-4 accent-sky-600"
                    />
                  </div>
                  <div className="py-3 pr-3">
                    <div className="font-semibold">{getLabel(it)}</div>
                  </div>
                  <div className="px-4 py-3 text-right text-xs text-black/50 ">
                    {renderRowRight?.(it, checked)}
                  </div>
                </button>
              );
            })}

            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-black/50 ">
                No data
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between border-t border-black/10 px-4 py-3 ">
            <div className="text-xs text-black/50 ">
              {tempSelectedIds.size} selected
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSelect}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                SELECT
              </button>

              {allowCreate && (
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold hover:bg-brand/100 "
                >
                  NEW
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold hover:bg-brand/100 "
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function LookupChipsField<T>(props: LookupChipsFieldProps<T>) {
  const {
    label = "Tags",
    value,
    onChange,
    fetcher,
    getId,
    getLabel,
    placeholder = "Select...",
    disabled,
    multiple = true,
    maxChipsShown = 50,
    allowCreate = false,
    onCreateNew,
    modalTitle = "Search",
    renderRowRight,
  } = props;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // temp selection (modal)
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());
  const idToItem = useMemo(() => {
    const m = new Map<string, T>();
    for (const it of value) m.set(toId(getId(it)), it);
    return m;
  }, [value, getId]);

  // Open modal => copy current selection to temp
  useEffect(() => {
    if (!open) return;
    setTempSelectedIds(new Set(value.map((v) => toId(getId(v)))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch list
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!open) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    fetcher({ query: debouncedQuery, signal: ac.signal })
      .then((data) => setItems(data))
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Failed to load");
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [open, debouncedQuery, fetcher]);

  const toggle = (item: T) => {
    const id = toId(getId(item));
    setTempSelectedIds((prev) => {
      const next = new Set(prev);

      if (!multiple) {
        next.clear();
        next.add(id);
        return next;
      }

      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const commitSelection = () => {
    // Keep previously selected items (even if not in current results)
    const selected: T[] = [];
    for (const id of tempSelectedIds) {
      const fromCurrent = items.find((x) => toId(getId(x)) === id);
      const fromExisting = idToItem.get(id);
      const it = fromCurrent ?? fromExisting;
      if (it) selected.push(it);
    }
    onChange(selected);
    setOpen(false);
  };

  const removeChip = (id: string) => {
    onChange(value.filter((v) => toId(getId(v)) !== id));
  };

  const chips = value.slice(0, maxChipsShown);
  const hiddenCount = Math.max(0, value.length - chips.length);

  return (
    <div className="w-full">
      {label && <div className="mb-2 text-sm font-bold">{label}</div>}

      <div
        className={cn(
          "rounded-2xl border border-black/10 bg-white p-3",
          disabled && "opacity-60"
        )}
      >
        {/* Chips row */}
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((it) => {
            const id = toId(getId(it));
            return (
              <Chip
                key={id}
                text={getLabel(it)}
                onRemove={disabled ? undefined : () => removeChip(id)}
              />
            );
          })}
          {hiddenCount > 0 && (
            <span className="text-xs text-black/50 ">
              +{hiddenCount} more
            </span>
          )}

          {/* Add button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(true)}
            className={cn(
              "ml-auto inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold hover:bg-brand/100 ",
              value.length === 0 && "ml-0"
            )}
          >
            {value.length === 0 ? placeholder : "Edit"}
            <span className="text-base leading-none">＋</span>
          </button>
        </div>
      </div>

      <LookupModal
        open={open}
        title={modalTitle}
        query={query}
        setQuery={setQuery}
        items={items}
        loading={loading}
        error={error}
        tempSelectedIds={tempSelectedIds}
        toggle={toggle}
        onClose={() => setOpen(false)}
        onSelect={commitSelection}
        allowCreate={allowCreate}
        onCreateNew={
          allowCreate
            ? () => onCreateNew?.(query)
            : undefined
        }
        getId={getId}
        getLabel={getLabel}
        renderRowRight={renderRowRight}
      />
    </div>
  );
}
