"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldText } from "@/components/form/FieldText";
import { t } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { useDebounced } from "@/hooks/useDebounced";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { AddressItem } from "@/types/orders";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

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
  const debounced = useDebounced(query, 250);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useClickOutside([inputRef, popRef], () => setOpen(false), open);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onF = () => !disabled && setOpen(true);
    el.addEventListener("focus", onF);
    return () => el.removeEventListener("focus", onF);
  }, [disabled]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!cityId || !debounced) {
        setOptions([]);
        return;
      }
      try {
        const url = new URL(API_BASE + "/locations/addresses/search");
        url.searchParams.set("city_id", String(cityId));
        url.searchParams.set("query", debounced);
        const res = await fetch(url.toString(), { credentials: "include" });
        if (res.status === 401) {
          goSignIn({ routerReplace: router.replace });
          return;
        }
        if (!res.ok) return;
        const arr = (await res.json()) as AddressItem[];
        if (!ignore) setOptions(arr);
      } catch (err) {
        console.error("[AddressAutocomplete] search failed", err);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [debounced, cityId, router]);

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
      {!disabled && open && options.length > 0 && (
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
