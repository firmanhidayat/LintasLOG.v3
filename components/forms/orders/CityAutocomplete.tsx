"use client";
import React, { useEffect, useRef, useState } from "react";
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
  const debounced = useDebounced(query, 250);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useClickOutside([inputRef, popRef], () => setOpen(false), open);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onF = () => setOpen(true);
    el.addEventListener("focus", onF);
    return () => el.removeEventListener("focus", onF);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!debounced) {
        setOptions([]);
        return;
      }
      try {
        const url = new URL(API_BASE + "/locations/cities/search");
        url.searchParams.set("query", debounced);
        const res = await fetch(url.toString(), { credentials: "include" });
        if (res.status === 401) {
          goSignIn({ routerReplace: router.replace });
          return;
        }
        if (!res.ok) return;
        const arr = (await res.json()) as IdName[];
        if (!ignore) setOptions(arr);
      } catch (err) {
        console.error("[CityAutocomplete] search failed", err);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [debounced, router]);

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
      />
      {open && options.length > 0 && (
        <div ref={popRef} className="relative">
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
            {options.map((opt) => (
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
