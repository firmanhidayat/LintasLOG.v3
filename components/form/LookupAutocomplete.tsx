"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/form/FieldInput";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import { goSignIn } from "@/lib/goSignIn";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useDebounced } from "@/hooks/useDebounced";
import type { RecordItem } from "@/types/recorditem";

/** ===== Helpers default normalizer (tetap kompatibel dengan yang lama) ===== */
function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}
export function normalizeItem(it: unknown): RecordItem | null {
  if (typeof it === "string") return { id: it, name: it };
  if (isObj(it)) {
    const idRaw =
      it["id"] ?? it["code"] ?? it["value"] ?? it["key"] ?? it["slug"];
    const nameRaw =
      it["name"] ??
      it["label"] ??
      (typeof idRaw === "string" || typeof idRaw === "number"
        ? String(idRaw)
        : undefined);
    if (
      (typeof idRaw === "string" || typeof idRaw === "number") &&
      typeof nameRaw === "string"
    ) {
      return { id: idRaw, name: nameRaw };
    }
  }
  return null;
}
export function normalizeResults(json: unknown): RecordItem[] {
  if (Array.isArray(json)) {
    return json.map(normalizeItem).filter(Boolean) as RecordItem[];
  }
  if (isObj(json)) {
    const candidates = [
      json["data"],
      json["items"],
      json["result"],
      json["records"],
      json["values"],
    ];
    const arr = candidates.find((x) => Array.isArray(x)) as
      | unknown[]
      | undefined;
    if (Array.isArray(arr)) {
      return arr.map(normalizeItem).filter(Boolean) as RecordItem[];
    }
  }
  return [];
}

/** ===== Types untuk sumber data generic ===== */
type FetcherCtx = { signal: AbortSignal; lang?: string };

export type LookupFetcher = (
  q: string,
  ctx: FetcherCtx
) => Promise<RecordItem[]>;

export type EndpointMethod = "GET" | "POST";

export type LookupEndpointConfig = {
  /** URL endpoint (boleh absolute/relative) */
  url: string;
  /** GET/POST (default GET) */
  method?: EndpointMethod;
  /** Nama query param untuk search (default "query") */
  queryParam?: string;
  /** Extra params di URL (GET) atau body (POST) */
  extraParams?: Record<string, string | number | boolean | null | undefined>;
  /** Nama-nama umum untuk pagination (optional) */
  pageParam?: string; // default "page"
  pageSizeParam?: string; // default "page_size"
  page?: string | number; // default "1"
  pageSize?: string | number; // default "80"
  /** Tambahan headers (mis. Authorization) */
  headers?: Record<string, string>;
  /** Custom mapper bila respons unik (default normalizeResults) */
  mapResults?: (json: unknown) => RecordItem[];
  /** Kalau mau override 401 handling; return true jika kamu sudah handle */
  onUnauthorized?: () => void | boolean;
};

export type LookupAutocompleteProps = {
  label: string;
  value: RecordItem | null;
  onChange: (v: RecordItem | null) => void;
  disabled?: boolean;
  placeholder?: string;

  error?: string;

  /** Pilih salah satu: fetcher custom ATAU endpoint config */
  fetcher?: LookupFetcher;
  endpoint?: LookupEndpointConfig;

  /** Namespace cache biar antar sumber data terisolasi (default: endpoint.url atau "default") */
  cacheNamespace?: string;
  /** Query untuk prefetch saat siap (default: "") */
  prefetchQuery?: string;

  /** Kostumisasi render opsi */
  renderOption?: (opt: RecordItem) => React.ReactNode;
};

export default function LookupAutocomplete({
  label,
  value,
  error,
  onChange,
  disabled,
  placeholder,
  fetcher,
  endpoint,
  cacheNamespace,
  prefetchQuery = "",
  renderOption,
}: LookupAutocompleteProps) {
  const { i18nReady, activeLang } = useI18nReady();
  const router = useRouter();

  const [query, setQuery] = useState<string>(value?.name ?? "");
  const [options, setOptions] = useState<RecordItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const debounced = useDebounced(query, 250);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cache per namespace + query
  const ns =
    cacheNamespace ??
    (endpoint?.url
      ? `ns:${endpoint.url}`
      : fetcher
      ? "ns:fetcher"
      : "ns:default");
  const cacheRef = useRef(new Map<string, Map<string, RecordItem[]>>());
  const lastFetchKey = useRef<string>("");

  useClickOutside([rootRef, inputRef, popRef], () => setOpen(false), open);

  /** Utility: set/get cache */
  const setCache = useCallback(
    (k: string, list: RecordItem[]) => {
      const byNs = cacheRef.current.get(ns) ?? new Map<string, RecordItem[]>();
      byNs.set(k, list);
      cacheRef.current.set(ns, byNs);
    },
    [ns]
  );
  const getCache = useCallback(
    (k: string) => cacheRef.current.get(ns)?.get(k),
    [ns]
  );

  /** ——— Core fetch (ambil dari fetcher atau endpoint) ——— */
  const fetchOptions = useCallback(
    async (q: string) => {
      const k = q.trim();

      // Dedup + cache hit
      const cached = getCache(k);
      if (lastFetchKey.current === k && cached) {
        setOptions(cached);
        setHasFetched(true);
        return;
      }
      lastFetchKey.current = k;

      // Batalkan req sebelumnya
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        setLoading(true);

        let list: RecordItem[] = [];

        if (typeof fetcher === "function") {
          // ===== Custom fetcher =====
          list = await fetcher(k, {
            signal: ac.signal,
            lang: activeLang ?? "en",
          });
        } else if (endpoint?.url) {
          // ===== Endpoint config =====
          const {
            url,
            method = "GET",
            queryParam = "query",
            extraParams,
            pageParam = "page",
            pageSizeParam = "page_size",
            page = 1,
            pageSize = 80,
            headers,
            mapResults: mapFn = normalizeResults,
            onUnauthorized,
          } = endpoint;

          // support relative URL
          const base =
            typeof window !== "undefined"
              ? window.location.origin
              : "http://localhost";
          const u = new URL(url, base);

          const qp = new URLSearchParams();
          qp.set(queryParam, k);
          qp.set(pageParam, String(page));
          qp.set(pageSizeParam, String(pageSize));
          if (extraParams) {
            for (const [kk, vv] of Object.entries(extraParams)) {
              if (vv != null) qp.set(kk, String(vv));
            }
          }

          let res: Response;
          if (method === "GET") {
            // GET: params di URL
            for (const [kk, vv] of qp.entries()) u.searchParams.set(kk, vv);
            res = await fetch(u.toString(), {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "Accept-Language": activeLang ?? "en",
                ...(headers ?? {}),
              },
              credentials: "include",
              signal: ac.signal,
            });
          } else {
            // POST: params di body
            res = await fetch(u.toString(), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "Accept-Language": activeLang ?? "en",
                ...(headers ?? {}),
              },
              credentials: "include",
              body: JSON.stringify(Object.fromEntries(qp.entries())),
              signal: ac.signal,
            });
          }

          if (res.status === 401) {
            // izinkan override handling
            const handled = onUnauthorized?.();
            if (!handled) goSignIn({ routerReplace: router.replace });
            return;
          }
          if (!res.ok) {
            setOptions([]);
            setHasFetched(true);
            return;
          }

          const json: unknown = await res.json();
          list = mapFn(json);
        } else {
          // Tidak ada sumber data -> kosong (tetap tandai fetched agar UI tidak flash)
          setOptions([]);
          setHasFetched(true);
          return;
        }

        setCache(k, list);
        setOptions(list);
        setHasFetched(true);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("[LookupAutocomplete] search failed", err);
          setOptions([]);
          setHasFetched(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetcher, endpoint, activeLang, router.replace, getCache, setCache]
  );

  /** Ketik: fetch saat open + berubah (dengan cache) */
  const debouncedQuery = debounced;
  useEffect(() => {
    if (!open) return;
    const k = debouncedQuery.trim();
    const cached = getCache(k);
    if (cached) {
      setOptions(cached);
      return;
    }
    void fetchOptions(k);
  }, [debouncedQuery, open, fetchOptions, getCache]);

  /** Prefetch default sekali saat siap */
  useEffect(() => {
    if (!i18nReady || disabled) return;
    void fetchOptions(prefetchQuery);
  }, [i18nReady, disabled, prefetchQuery, fetchOptions]);

  /** Cleanup abort saat unmount */
  useEffect(() => () => abortRef.current?.abort(), []);

  /** Sinkronkan tampilan saat value luar berubah */
  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value?.id, value?.name]);

  /** Buka popover, pakai cache bila ada; kalau belum ada, fetch dulu lalu buka */
  const openPopover = useCallback(async () => {
    if (disabled) return;
    const k = (debouncedQuery || "").trim();
    const cached = getCache(k);
    if (cached) {
      setOptions(cached);
      setOpen(true);
      return;
    }
    await fetchOptions(k);
    setOpen(true);
  }, [disabled, debouncedQuery, fetchOptions, getCache]);

  // ---- Skeleton i18n ----
  if (!i18nReady) {
    return (
      <div className="space-y-4" data-lang={activeLang}>
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-64 animate-pulse rounded-lg border bg-slate-100" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <Field.Root
        value={query}
        onChange={(v) => {
          setQuery(v);
          onChange(null);
          setOpen(true);
        }}
        placeholder={
          disabled
            ? t("common.disabled") ?? "Nonaktif"
            : placeholder ?? t("common.search") ?? "Cari…"
        }
        inputRef={inputRef}
        disabled={disabled}
        aria-expanded={open}
        aria-busy={loading}
        data-open={open ? "" : undefined}
        data-options-count={options.length}
        error={error}
      >
        <Field.Label>{label}</Field.Label>
        <Field.Input onFocus={openPopover} />
        <Field.Control>
          {!disabled && open && (
            <div ref={popRef} className="relative">
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
                {loading && (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    {t("common.loading") ?? "Loading…"}
                  </li>
                )}

                {!loading && hasFetched && options.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    {t("common.no_results") ?? "Tidak ada hasil"}
                  </li>
                )}

                {!loading &&
                  options.length > 0 &&
                  options.map((opt) => (
                    <li
                      key={String(opt.id)}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                      onPointerDown={(e) => {
                        e.preventDefault(); // cegah blur
                        onChange(opt);
                        setQuery(opt.name ?? "");
                        setOpen(false);
                      }}
                      title={opt.name ?? undefined}
                    >
                      {renderOption ? (
                        renderOption(opt)
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <span>{opt.name}</span>
                          {opt.name && (
                            <span className="text-xs text-gray-500">
                              {opt.name}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Field.Control>
        <Field.Error></Field.Error>
      </Field.Root>
    </div>
  );
}
