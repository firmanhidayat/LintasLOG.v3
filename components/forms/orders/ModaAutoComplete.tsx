"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FieldText } from "@/components/form/FieldText";
import { getLang, t } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { useDebounced } from "@/hooks/useDebounced";
import { useClickOutside } from "@/hooks/useClickOutside";

const ORDER_MODA_URL = process.env.NEXT_PUBLIC_TMS_OMODA_FORM_URL ?? "";

export type ModaItem = {
  id: string | number;
  name: string;
  code?: string;
};

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function normalizeItem(it: unknown): ModaItem | null {
  if (typeof it === "string") {
    return { id: it, name: it, code: it };
  }
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
      const code =
        typeof it["code"] === "string" ? (it["code"] as string) : undefined;
      return { id: idRaw, name: nameRaw, code };
    }
  }
  return null;
}

function normalizeResults(json: unknown): ModaItem[] {
  if (Array.isArray(json)) {
    return json.map(normalizeItem).filter(Boolean) as ModaItem[];
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
      return arr.map(normalizeItem).filter(Boolean) as ModaItem[];
    }
  }
  return [];
}

export default function ModaAutocomplete({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: ModaItem | null;
  onChange: (v: ModaItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState<string>(value?.name ?? "");
  const [options, setOptions] = useState<ModaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(query, 250);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useClickOutside([inputRef, popRef], () => setOpen(false), open);

  const fetchOptions = useCallback(
    async (q: string) => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        setLoading(true);
        const url = new URL(ORDER_MODA_URL);
        url.searchParams.set("query", q);
        url.searchParams.set("page", "1");
        url.searchParams.set("page_size", "80");

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

        const json: unknown = await res.json();
        const list = normalizeResults(json);
        setOptions(list);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("[ModaAutocomplete] search failed", err);
          setOptions([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [router.replace]
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
  }, [value?.id, value?.name]);

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
          disabled
            ? t("common.disabled") ?? "Nonaktif"
            : placeholder ?? t("orders.search_moda") ?? "Cari moda…"
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
                  title={
                    opt.code && opt.code !== opt.name ? opt.code : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{opt.name}</span>
                    {opt.code && opt.code !== opt.name && (
                      <span className="text-xs text-gray-500">{opt.code}</span>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
