"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FieldText } from "@/components/form/FieldText";
import { getLang, t } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { useDebounced } from "@/hooks/useDebounced";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { AddressItem } from "@/types/orders";

const ADDRESSES_URL = process.env.NEXT_PUBLIC_TMS_LOCATIONS_ADDRESSES_URL ?? "";

export default function AddressAutocomplete({
  label,
  cityId,
  value,
  onChange,
  disabled,
}: {
  label: string;
  cityId: number | string | null;
  value: AddressItem | null;
  onChange: (v: AddressItem | null) => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState<string>(value?.name ?? "");
  const [options, setOptions] = useState<AddressItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(query, 250);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useClickOutside([inputRef, popRef], () => setOpen(false), open);

  const fetchOptions = useCallback(
    async (q: string) => {
      // Tetap jaga "logic inti": butuh cityId. Kalau belum ada, kosongkan opsi & stop.
      if (!cityId) {
        setOptions([]);
        return;
      }

      // Batalkan req sebelumnya (race safe)
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        setLoading(true);
        const url = new URL(ADDRESSES_URL);
        url.searchParams.set("city_id", String(cityId));
        url.searchParams.set("query", q);
        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Language": getLang(),
          },
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
        const arr = (await res.json()) as AddressItem[];
        setOptions(arr ?? []);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("[AddressAutocomplete] search failed", err);
          setOptions([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [cityId, router.replace]
  );

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onF = () => {
      if (disabled) return;
      setOpen(true);
      void fetchOptions(query.trim());
    };
    el.addEventListener("focus", onF);
    return () => el.removeEventListener("focus", onF);
  }, [disabled, fetchOptions, query]);

  useEffect(() => {
    void fetchOptions(debounced.trim());
  }, [debounced, fetchOptions]);

  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value?.id, value?.name, cityId]);

  return (
    <div className="space-y-1">
      <FieldText
        label={label}
        value={query}
        onChange={(val) => {
          setQuery(val);
          onChange(null);
          setOpen(true);
        }}
        placeholder={
          disabled ? t("common.select_city_first") : t("common.search_address")
        }
        inputRef={inputRef}
        disabled={disabled}
      />

      {!disabled && open && (
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
                    setQuery(opt.name ?? "");
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
