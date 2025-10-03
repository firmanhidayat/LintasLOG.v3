"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { goSignIn } from "@/lib/goSignIn";
import { useRouter } from "next/navigation";

import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type AddressItem = {
  id?: number | string;
  name?: string;
  street?: string;
  street2?: string;
  zip?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  district?: { id?: number; name?: string } | string | null;
  district_id?: number;
  district_name?: string;
};

type SortKey =
  | "name"
  | "street"
  | "street2"
  | "district"
  | "zip"
  | "email"
  | "mobile";

export default function AddressesListPage() {
  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());
  const router = useRouter();

  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setI18nReady(false);
        await loadDictionaries();
      } catch (e) {
        console.error("[i18n] loadDictionaries failed:", e);
      } finally {
        if (!cancelled) setI18nReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [items, setItems] = useState<AddressItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [page, setPage] = useState(1); // 1-based
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const debouncedSearch = useDebounced(search, 400);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<number | string | null>(null);
  const [targetName, setTargetName] = useState<string>("");

  function askDelete(id?: number | string, name?: string) {
    if (id == null) return; // jika tidak ada id, abaikan
    setTargetId(id);
    setTargetName(name ?? "");
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (targetId == null) return;
    try {
      setLoading(true);
      const url = `${API_BASE}/users/me/addresses/${encodeURIComponent(
        String(targetId)
      )}`;
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) {
        goSignIn({
          routerReplace: router.replace,
          // clearAuth, // optional
          // basePath: "/tms", // aktifkan kalau kamu pakai basePath
          // signinPath: "/maccount/signin", // default sudah ini
        });
        return;
      }

      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setItems((prev) =>
        prev.filter((x) => String(x.id ?? "") !== String(targetId))
      );
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("[delete address]", e);
      alert(
        t("common.error") + ": " + (e instanceof Error ? e.message : "Failed")
      );
    } finally {
      setConfirmOpen(false);
      setTargetId(null);
      setTargetName("");
      setLoading(false);
    }
  }

  useEffect(() => {
    let aborted = false;

    async function fetchList() {
      setLoading(true);
      setError("");
      try {
        const url = buildUrl({
          base: `${API_BASE}/users/me/addresses`,
          page,
          page_size: pageSize,
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
          goSignIn({
            routerReplace: router.replace,
            // clearAuth, // optional
            // basePath: "/tms", // kalau pakai
          });
          return;
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);

        const data: unknown = await res.json();
        if (aborted) return;

        const { list, totalCount } = normalizeListResponse<AddressItem>(data);

        const sorted = sortClient(list, sortBy, sortDir);

        setItems(sorted);
        setTotal(totalCount ?? sorted.length);
      } catch (err) {
        if (aborted) return;
        console.error("[addresses list]", err);
        setError(err instanceof Error ? err.message : "Gagal memuat data");
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
  }, [page, pageSize, debouncedSearch, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  function onSort(col: SortKey) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/orders/addresses/create"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t("addresses.create")}
          </Link>
          {/* <h1 className="text-xl font-semibold">{t("addresses.title")}</h1> */}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("addresses.search.placeholder")}
            className="w-60 rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border px-1 py-1 text-sm"
            aria-label={t("addresses.rowsPerPage")}
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
              <th
                scope="col"
                className="w-20 px-3 py-2 text-left font-medium text-gray-700"
              >
                {/* kosong atau bisa pakai t("common.actions") */}
              </th>

              <Th
                label={t("addresses.columns.name")}
                col="name"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <Th
                label={t("addresses.columns.street")}
                col="street"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <Th
                label={t("addresses.columns.street2")}
                col="street2"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <Th
                label={t("addresses.columns.district")}
                col="district"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <Th
                label={t("addresses.columns.zip")}
                col="zip"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <Th
                label={t("addresses.columns.email")}
                col="email"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <Th
                label={t("addresses.columns.phone")}
                col="mobile"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  {t("common.loading")}
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr
                  key={(it.id ?? idx).toString()}
                  className={
                    "border-t  border-gray-100 hover:bg-gray-50/60 " +
                    (idx % 2 === 1 ? "bg-gray-50/40" : "bg-white")
                  }
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      {it.id != null ? (
                        <Link
                          href={`/orders/addresses/details?id=${encodeURIComponent(
                            String(it.id)
                          )}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
                          aria-label="Edit address"
                          title="Edit"
                        >
                          <PencilIcon className="h-3 w-3" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md border opacity-50"
                          title="Edit (unavailable)"
                          disabled
                        >
                          <PencilIcon className="h-3 w-3" />
                        </button>
                      )}

                      {it.id != null ? (
                        <button
                          type="button"
                          onClick={() => askDelete(it.id, it.name)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
                          aria-label="Delete address"
                          title="Delete"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md border opacity-50"
                          title="Delete (unavailable)"
                          disabled
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </Td>

                  <Td>{it.name ?? "-"}</Td>
                  <Td>{it.street ?? "-"}</Td>
                  <Td>{it.street2 ?? "-"}</Td>
                  <Td>{renderDistrict(it)}</Td>
                  <Td>{it.zip ?? "-"}</Td>
                  <Td>{it.email ?? "-"}</Td>
                  <Td>{it.mobile ?? it.phone ?? "-"}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-sm text-gray-600">
          {t("addresses.pagination.summary")
            .replace("{page}", String(page))
            .replace("{pages}", String(totalPages))
            .replace("{total}", String(total))}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            {t("common.prev")}
          </button>
          <span className="select-none px-2 text-sm">{page}</span>
          <button
            className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            {t("common.next")}
          </button>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmOpen}
        name={targetName}
        loading={loading}
        onCancel={() => {
          setConfirmOpen(false);
          setTargetId(null);
          setTargetName("");
        }}
        onOk={confirmDelete}
      />
    </div>
  );
}

function Th({
  label,
  col,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onSort: (c: SortKey) => void;
}) {
  const active = sortBy === col;
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-700"
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 hover:underline"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span className="text-xs text-gray-500">
          {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </button>
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top text-gray-700">{children}</td>;
}

function buildUrl({
  base,
  page,
  page_size,
  search,
  sortBy,
  sortDir,
}: {
  base: string;
  page: number;
  page_size: number;
  search: string;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
}) {
  const u = new URL(base);
  u.searchParams.set("page", String(page));
  u.searchParams.set("page_size", String(page_size));

  if (search.trim()) {
    const s = search.trim();
    u.searchParams.set("search", s);
    u.searchParams.set("q", s);
    u.searchParams.set("query", s);
  }

  u.searchParams.set("sort", `${sortBy}:${sortDir}`);
  u.searchParams.set("sort_by", sortBy);
  u.searchParams.set("order", sortDir);

  return u.toString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function normalizeListResponse<T = unknown>(
  data: unknown
): { list: T[]; totalCount: number } {
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

function sortClient(list: AddressItem[], key: SortKey, dir: "asc" | "desc") {
  const arr = [...list];
  const mul = dir === "asc" ? 1 : -1;
  arr.sort(
    (a, b) => compareStrings(getComparable(a, key), getComparable(b, key)) * mul
  );
  return arr;
}

function compareStrings(a: string, b: string) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function getComparable(it: AddressItem, key: SortKey): string {
  if (key === "district") {
    const d = it.district;
    if (!d) return (it.district_name ?? "").toLowerCase();
    if (typeof d === "string") return d.toLowerCase();
    return String(d.name ?? it.district_name ?? "").toLowerCase();
  }

  const map: Record<Exclude<SortKey, "district">, string | undefined> = {
    name: it.name,
    street: it.street,
    street2: it.street2,
    zip: it.zip,
    email: it.email,
    mobile: it.mobile ?? it.phone,
  };
  const v = map[key as Exclude<SortKey, "district">];
  return (v ?? "").toLowerCase();
}

function renderDistrict(it: AddressItem) {
  const d = it.district;
  if (!d) return it.district_name ?? "-";
  if (typeof d === "string") return d;
  return d?.name ?? it.district_name ?? "-";
}

function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 3.487a2.1 2.1 0 0 1 2.97 2.97L7.5 18.79l-4 1 1-4 12.362-12.303z"
      />
    </svg>
  );
}
function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m4 4v8m6-8v8"
      />
    </svg>
  );
}

function ConfirmDeleteDialog({
  open,
  name,
  onCancel,
  onOk,
  loading,
}: {
  open: boolean;
  name?: string;
  onCancel: () => void;
  onOk: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
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
            disabled={loading}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onOk}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? t("common.loading") : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
