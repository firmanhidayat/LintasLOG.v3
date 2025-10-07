"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FieldText } from "@/components/form/FieldText";
import { t } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { useDebounced } from "@/hooks/useDebounced";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { IdName } from "@/types/orders";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function CityAutocomplete({
  label,
  value,
  onChange,
  required = false,
  error,
}: {
  label: string;
  value: IdName | null;
  onChange: (val: IdName | null) => void;
  required?: boolean;
  error?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState<string>(value?.name ?? "");
  const [options, setOptions] = useState<IdName[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(query, 250);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useClickOutside([inputRef, popRef], () => setOpen(false), open);

  const fetchOptions = useCallback(
    async (q: string) => {
      // Batalkan request sebelumnya jika masih in-flight
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        setLoading(true);
        const url = new URL(API_BASE + "/locations/cities/search");
        // Tetap kirim query meskipun empty string — biar backend bisa kirim daftar default/top N
        url.searchParams.set("query", q);
        const res = await fetch(url.toString(), {
          credentials: "include",
          signal: ac.signal,
        });
        if (res.status === 401) {
          goSignIn({ routerReplace: router.replace });
          return;
        }
        if (!res.ok) {
          setOptions([]);
          return;
        }
        const arr = (await res.json()) as IdName[];
        setOptions(arr ?? []);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("[CityAutocomplete] search failed", err);
          setOptions([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [router.replace]
  );

  // Buka dan load data saat fokus (sesuai requirement)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onFocus = () => {
      setOpen(true);
      // Load dengan query terkini (bisa kosong) supaya dropdown langsung muncul
      void fetchOptions(query.trim());
    };
    el.addEventListener("focus", onFocus);
    return () => el.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOptions]);

  // Pencarian saat user mengetik (debounced)
  useEffect(() => {
    // Selalu fetch, termasuk saat debounced === "" (untuk initial list)
    void fetchOptions(debounced.trim());
  }, [debounced, fetchOptions]);

  // Sinkronkan tampilan input jika value berubah dari luar
  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value?.id, value?.name]);

  return (
    <div className="space-y-1">
      <FieldText
        label={label}
        required={required}
        error={error}
        touched={Boolean(error)}
        value={query}
        onChange={(val) => {
          setQuery(val);
          onChange(null);
          setOpen(true);
        }}
        placeholder={t("common.search_city")}
        inputRef={inputRef}
        onBlur={() => {
          // Jangan tutup di onBlur — sudah di-handle useClickOutside
        }}
      />

      {open && (
        <div ref={popRef} className="relative">
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
            {loading && (
              <li className="px-3 py-2 text-sm text-gray-500">
                {t("common.loading")}…
              </li>
            )}

            {!loading && options.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">
                {t("common.no_results")}
              </li>
            )}

            {!loading &&
              options.length > 0 &&
              options.map((opt) => (
                <li
                  key={String(opt.id)}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setQuery(opt.name);
                    setOpen(false);
                  }}
                >
                  {opt.name}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
