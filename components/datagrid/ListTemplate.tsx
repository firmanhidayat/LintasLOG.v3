"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";

export type SortDir = "asc" | "desc";

export type ColumnDef<T> = {
  id: string;
  label: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string;
  sortable?: boolean;
  className?: string;
  isAction?: boolean;
};

export type ListFetchParams = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortDir: SortDir;
};

export type NormalizedList<T> = {
  list: T[];
  totalCount: number;
};

type ConfirmState = {
  open: boolean;
  targetId: string | number | null;
  targetName?: string;
};

type PaginationTheme = {
  maxPageButtons?: number; // default 7
};

// ===================== Hooks & Utils =====================
export function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const tmr = setTimeout(() => setV(value), delay);
    return () => clearTimeout(tmr);
  }, [value, delay]);
  return v;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

export function normalizeListResponse<T = unknown>(
  data: unknown
): NormalizedList<T> {
  if (isArray(data))
    return { list: data as T[], totalCount: (data as T[]).length };

  if (isRecord(data) && isArray((data as Record<string, unknown>).items)) {
    const d = data as { items: T[]; total?: number; count?: number };
    return {
      list: d.items,
      totalCount: Number(d.total ?? d.count ?? d.items.length),
    };
  }

  if (isRecord(data) && isArray((data as Record<string, unknown>).data)) {
    const d = data as { data: T[]; total?: number; count?: number };
    return {
      list: d.data,
      totalCount: Number(d.total ?? d.count ?? d.data.length),
    };
  }

  return { list: [], totalCount: 0 };
}

function compareStrings(a: string, b: string) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function buildQueryUrl(opts: {
  base: string;
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortDir: SortDir;
}) {
  const u = new URL(
    opts.base,
    typeof window !== "undefined" ? window.location.href : undefined
  );
  u.searchParams.set("page", String(opts.page));
  u.searchParams.set("page_size", String(opts.pageSize));

  const s = opts.search.trim();
  if (s) {
    u.searchParams.set("search", s);
    u.searchParams.set("q", s);
    u.searchParams.set("query", s);
  }

  u.searchParams.set("sort", `${opts.sortBy}:${opts.sortDir}`);
  u.searchParams.set("sort_by", opts.sortBy);
  u.searchParams.set("order", opts.sortDir);

  return u.toString();
}

// ===================== Reusable List Template =====================
export function ListTemplate<
  T extends { id?: string | number; name?: string }
>({
  fetchBase,
  deleteBase,
  columns,
  searchPlaceholder,
  rowsPerPageLabel,
  leftHeader,
  getRowName = (row) => row.name ?? "",
  initialPageSize = 10,
  initialSort = {
    by: columns.find((c) => c.sortable)?.id ?? "name",
    dir: "asc" as SortDir,
  },
  paginationTheme = { maxPageButtons: 7 } as PaginationTheme,
  postFetchTransform,
  staticData,
  staticSearch,
}: {
  fetchBase: string;
  deleteBase: string;
  columns: ColumnDef<T>[];
  searchPlaceholder: string;
  rowsPerPageLabel: string;
  leftHeader?: React.ReactNode;
  getRowName?: (row: T) => string;
  initialPageSize?: number;
  initialSort?: { by: string; dir: SortDir };
  paginationTheme?: PaginationTheme;
  postFetchTransform?: (list: T[]) => T[];
  staticData?: T[];
  staticSearch?: (row: T, q: string) => boolean;
}) {
  const router = useRouter();

  // ---- states ----
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(initialSort.by);
  const [sortDir, setSortDir] = useState<SortDir>(initialSort.dir);

  const debouncedSearch = useDebounced(search, 400);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    targetId: null,
  });

  const [localStatic, setLocalStatic] = useState<T[] | null>(null);
  useEffect(() => {
    if (staticData) setLocalStatic(staticData);
  }, [staticData]);

  const sourceItems: T[] = staticData ? localStatic ?? [] : items;

  const filteredItems = useMemo(() => {
    if (!staticData) return sourceItems;
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return sourceItems;
    const pred =
      staticSearch ??
      ((row: T, query: string) =>
        JSON.stringify(row).toLowerCase().includes(query));
    return sourceItems.filter((row) => pred(row, q));
  }, [sourceItems, debouncedSearch, staticData, staticSearch]);

  const sortedItems = useMemo(() => {
    const col = columns.find((c) => c.id === sortBy);
    if (!col || !col.sortable || !col.sortValue) return filteredItems;
    const mul = sortDir === "asc" ? 1 : -1;
    const arr = [...filteredItems];
    arr.sort(
      (a, b) => compareStrings(col.sortValue!(a), col.sortValue!(b)) * mul
    );
    return arr;
  }, [filteredItems, sortBy, sortDir, columns]);

  const effectiveTotal = staticData ? sortedItems.length : total;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const viewItems = useMemo(() => {
    if (!staticData) return sortedItems;
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, staticData, page, pageSize]);

  // ================== Fetch (server mode) ==================
  useEffect(() => {
    if (staticData) return;
    let aborted = false;

    async function fetchList() {
      setLoading(true);
      setError("");
      try {
        const url = buildQueryUrl({
          base: fetchBase,
          page,
          pageSize,
          search: debouncedSearch,
          sortBy,
          sortDir,
        });

        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (res.status === 401) {
          goSignIn({ routerReplace: router.replace });
          return;
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const raw: unknown = await res.json();
        if (aborted) return;

        const { list, totalCount } = normalizeListResponse<T>(raw);
        const finalList = postFetchTransform ? postFetchTransform(list) : list;

        setItems(finalList);
        setTotal(totalCount ?? finalList.length);
      } catch (e) {
        if (aborted) return;
        console.error("[list fetch]", e);
        setError(e instanceof Error ? e.message : "Gagal memuat data");
        setItems([]);
        setTotal(0);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchList();
    return () => {
      aborted = true;
    };
  }, [
    staticData,
    fetchBase,
    page,
    pageSize,
    debouncedSearch,
    sortBy,
    sortDir,
    router.replace,
    postFetchTransform,
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  function onSort(colId: string) {
    if (sortBy === colId) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(colId);
      setSortDir("asc");
    }
  }

  async function handleDelete(id: string | number | null) {
    if (id == null) return;
    try {
      setLoading(true);

      if (staticData) {
        // local-only delete
        setLocalStatic((prev) =>
          prev
            ? prev.filter(
                (x) =>
                  String((x as { id?: string | number }).id ?? "") !==
                  String(id)
              )
            : prev
        );
        return;
      }

      const url = `${deleteBase}/${encodeURIComponent(String(id))}`;
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setItems((prev) =>
        prev.filter(
          (x) => String((x as { id?: string | number }).id ?? "") !== String(id)
        )
      );
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("[delete]", e);
      alert(
        t("common.error") + ": " + (e instanceof Error ? e.message : "Failed")
      );
    } finally {
      setConfirm({ open: false, targetId: null, targetName: "" });
      setLoading(false);
    }
  }

  const pagesToShow = useMemo(() => {
    const maxBtns = paginationTheme.maxPageButtons ?? 7;
    const half = Math.floor(maxBtns / 2);
    let start = Math.max(1, page - half);
    const end = Math.min(totalPages, start + maxBtns - 1);
    if (end - start + 1 < maxBtns) start = Math.max(1, end - maxBtns + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages, paginationTheme.maxPageButtons]);

  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent).detail as {
        id?: string | number;
        name?: string;
      };
      const id = d.id ?? null;
      if (id == null) return;

      const row = (sourceItems || []).find(
        (r) => String((r as { id?: string | number }).id ?? "") === String(id)
      );
      const displayName = d.name ?? (row ? getRowName(row) : undefined);

      setConfirm({ open: true, targetId: id, targetName: displayName });
    }
    window.addEventListener("llog.openDeleteConfirm", onOpen as EventListener);
    return () =>
      window.removeEventListener(
        "llog.openDeleteConfirm",
        onOpen as EventListener
      );
  }, [sourceItems, getRowName]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">{leftHeader}</div>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-60 rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <label className="sr-only">{rowsPerPageLabel}</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border px-1 py-1 text-sm"
            aria-label={rowsPerPageLabel}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-primary/20">
            <tr>
              {columns.map((c) => {
                const active = sortBy === c.id;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    className={`px-3 py-2 text-left font-medium text-xs text-gray-700 ${
                      c.className ?? ""
                    }`}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.id)}
                        className="inline-flex items-center gap-1 hover:underline"
                        aria-label={`Sort by ${c.label}`}
                      >
                        {c.label}
                        <span className="text-xs text-gray-500">
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      </button>
                    ) : (
                      <span>{c.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-4 text-center text-xs text-gray-500"
                >
                  {t("common.loading")}
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-4 text-center text-xs text-red-600"
                >
                  {error}
                </td>
              </tr>
            ) : viewItems.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-4 text-center text-xs text-gray-500"
                >
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              viewItems.map((row, idx) => (
                <tr
                  key={String((row as { id?: string | number }).id ?? idx)}
                  className={
                    "border-t border-gray-100 hover:bg-gray-50/60 " +
                    (idx % 2 === 1 ? "bg-gray-50/40" : "bg-white")
                  }
                >
                  {columns.map((c) => (
                    <td
                      key={c.id}
                      className={`px-2 py-1 align-top font-light text-xs text-gray-700 ${
                        c.className ?? ""
                      }`}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-xs text-gray-600">
          {t("addresses.pagination.summary")
            .replace("{page}", String(page))
            .replace("{pages}", String(totalPages))
            .replace("{total}", String(effectiveTotal))}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            aria-label={t("common.prev")}
          >
            {t("common.prev")}
          </button>

          {pagesToShow[0] > 1 && (
            <>
              <PageBtn
                n={1}
                active={page === 1}
                onClick={() => setPage(1)}
                disabled={loading}
              />
              <span className="px-1 text-xs text-gray-500">…</span>
            </>
          )}

          {pagesToShow.map((n) => (
            <PageBtn
              key={n}
              n={n}
              active={page === n}
              onClick={() => setPage(n)}
              disabled={loading}
            />
          ))}

          {pagesToShow[pagesToShow.length - 1] < totalPages && (
            <>
              <span className="px-1 text-xs text-gray-500">…</span>
              <PageBtn
                n={totalPages}
                active={page === totalPages}
                onClick={() => setPage(totalPages)}
                disabled={loading}
              />
            </>
          )}

          <button
            className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            aria-label={t("common.next")}
          >
            {t("common.next")}
          </button>
        </div>
      </div>

      {/* Confirm Dialog (public handler) */}
      {confirm.open && (
        <ConfirmDeleteDialog
          name={confirm.targetName}
          loading={loading}
          onCancel={() => setConfirm({ open: false, targetId: null })}
          onOk={() => handleDelete(confirm.targetId)}
        />
      )}
    </div>
  );

  function PageBtn({
    n,
    active,
    onClick,
    disabled,
  }: {
    n: number;
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) {
    return (
      <button
        className={`rounded-md border px-2 py-1 text-xs ${
          active ? "bg-primary text-white" : ""
        } disabled:opacity-50`}
        onClick={onClick}
        disabled={disabled}
        aria-current={active ? "page" : undefined}
      >
        {n}
      </button>
    );
  }

  function ConfirmDeleteDialog({
    name,
    onCancel,
    onOk,
    loading: isLoading,
  }: {
    name?: string;
    onCancel: () => void;
    onOk: () => void;
    loading?: boolean;
  }) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
          <h3 className="mb-2 text-base font-semibold text-gray-800">
            {t("common.confirm")}
          </h3>
          <p className="mb-4 text-sm text-gray-700">
            {t("common.areYouSure")}{" "}
            <span className="font-medium">{name || t("addresses.item")}</span>{" "}
            {t("common.toDelete")}?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border px-3 py-1.5 text-sm"
              disabled={isLoading}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={onOk}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? t("common.loading") : "OK"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
