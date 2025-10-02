"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type AddressPayload = {
  name: string;
  street: string;
  street2?: string;
  district_id: number;
  zip?: string;
  email?: string;
  mobile?: string;
};

export type AddressFormProps = {
  addressId?: number | string;
  initialValue?: Partial<{
    name: string;
    street: string;
    street2: string;
    zip: string;
    email: string;
    mobile: string;
    district: { id: number; name: string } | null;
  }>;
  onSuccess?: (data: unknown) => void;
  className?: string;
};

interface DistrictItem {
  id: number;
  name: string;
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AddressForm({
  addressId,
  initialValue,
  onSuccess,
  className,
}: AddressFormProps) {
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
      } finally {
        if (!cancelled) setI18nReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [name, setName] = useState(initialValue?.name ?? "");
  const [street, setStreet] = useState(initialValue?.street ?? "");
  const [street2, setStreet2] = useState(initialValue?.street2 ?? "");
  const [zip, setZip] = useState(initialValue?.zip ?? "");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [mobile, setMobile] = useState(initialValue?.mobile ?? "");

  const [districtQuery, setDistrictQuery] = useState(
    initialValue?.district?.name ?? ""
  );
  const [districtSel, setDistrictSel] = useState<null | {
    id: number;
    name: string;
  }>(initialValue?.district ?? null);

  const [options, setOptions] = useState<DistrictItem[]>([]);
  const [optOpen, setOptOpen] = useState(false);
  const [loadingOpt, setLoadingOpt] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  const [errors, setErrors] = useState<{
    name?: string;
    street?: string;
    district?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    street?: boolean;
    district?: boolean;
  }>({});

  // ⬇️ snapshot nilai awal untuk Discard
  const initialSnap = useRef({
    name: initialValue?.name ?? "",
    street: initialValue?.street ?? "",
    street2: initialValue?.street2 ?? "",
    zip: initialValue?.zip ?? "",
    email: initialValue?.email ?? "",
    mobile: initialValue?.mobile ?? "",
    districtQuery: initialValue?.district?.name ?? "",
    districtSel: initialValue?.district ?? null,
  });

  const debouncedQuery = useDebounced(districtQuery, 300);
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const streetRef = useRef<HTMLInputElement | null>(null);
  const districtInputRef = inputRef; // alias untuk jelas

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q || q.length < 2) {
      setOptions([]);
      return;
    }
    let abort = false;
    (async () => {
      try {
        setLoadingOpt(true);
        const url = `${API_BASE}/locations/districts/search?query=${encodeURIComponent(
          q
        )}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`District search failed: ${res.status}`);
        const data = (await res.json()) as
          | { items?: DistrictItem[] }
          | DistrictItem[];
        const list = Array.isArray(data) ? data : data?.items ?? [];
        if (!abort) setOptions(list);
      } catch (err) {
        console.error("[districts]", err);
        if (!abort) setOptions([]);
      } finally {
        if (!abort) setLoadingOpt(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!optOpen) return;
      const t = e.target as Node;
      if (
        listRef.current &&
        !listRef.current.contains(t) &&
        inputRef.current &&
        !inputRef.current.contains(t)
      ) {
        setOptOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [optOpen]);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 0 && street.trim().length > 0 && !!districtSel?.id
    );
  }, [name, street, districtSel]);

  function validate() {
    const next: { name?: string; street?: string; district?: string } = {};
    if (!name.trim()) next.name = t("addr.validation.nameRequired");
    if (!street.trim()) next.street = t("addr.validation.streetRequired");
    if (!districtSel?.id) next.district = t("addr.validation.districtRequired");
    setErrors(next);
    return next;
  }

  function markTouched(field: "name" | "street" | "district") {
    setTouched((p) => ({ ...p, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v.name || v.street || v.district) {
      if (v.name) nameRef.current?.focus();
      else if (v.street) streetRef.current?.focus();
      else districtInputRef.current?.focus();
      return;
    }

    setSubmitStatus("submitting");
    setErrMsg("");

    const payload: AddressPayload = {
      name: name.trim(),
      street: street.trim(),
      street2: street2.trim() || undefined,
      district_id: districtSel?.id ?? 0,
      zip: zip.trim() || undefined,
      email: email.trim() || undefined,
      mobile: mobile.trim() || undefined,
    };

    const isUpdate = typeof addressId !== "undefined" && addressId !== null;
    const url = isUpdate
      ? `${API_BASE}/users/me/addresses/${addressId}`
      : `${API_BASE}/users/me/addresses`;

    try {
      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let reason = `Request failed: ${res.status}`;
        try {
          const j = await res.json();
          if (typeof j?.message === "string") reason = j.message;
          else if (Array.isArray(j?.detail)) {
            const first = j.detail[0];
            if (first?.msg) reason = first.msg;
          } else if (typeof j?.detail === "string") {
            reason = j.detail;
          }
        } catch {
          // ignore parse error
        }
        throw new Error(reason);
      }

      const data = await res.json();
      setSubmitStatus("success");
      onSuccess?.(data);
    } catch (err: unknown) {
      console.error("[submit]", err);
      setErrMsg(err instanceof Error ? err.message : "Gagal menyimpan data");
      setSubmitStatus("error");
    } finally {
    }
  }

  function onPickDistrict(d: DistrictItem) {
    setDistrictSel({ id: d.id, name: d.name });
    setDistrictQuery(d.name);
    setOptOpen(false);
    setErrors((p) => ({ ...p, district: undefined }));
  }

  function onDistrictInput(v: string) {
    setDistrictQuery(v);
    setDistrictSel(null);
    setOptOpen(true);
  }

  // ⬇️ Handler Discard: reset ke nilai awal (initialValue)
  function handleDiscard() {
    const s = initialSnap.current;
    setName(s.name);
    setStreet(s.street);
    setStreet2(s.street2);
    setZip(s.zip);
    setEmail(s.email);
    setMobile(s.mobile);
    setDistrictQuery(s.districtQuery);
    setDistrictSel(s.districtSel);

    setOptions([]);
    setOptOpen(false);
    setErrors({});
    setTouched({});
    setErrMsg("");
    setSubmitStatus("idle");
    router.push("/orders/addresses/list");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={"space-y-4 " + (className ?? "")}
      aria-busy={submitStatus === "submitting"}
    >
      <div className="grid gap-1">
        <input
          ref={nameRef}
          type="text"
          className={`rounded-md border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 ${
            touched.name && errors.name
              ? "border-red-400 focus:ring-red-200"
              : ""
          }`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (touched.name)
              setErrors((p) => ({
                ...p,
                name: e.target.value.trim()
                  ? undefined
                  : t("addr.validation.nameRequired"),
              }));
          }}
          onBlur={() => markTouched("name")}
          placeholder={t("addr.name.placeholder")}
          aria-label={t("addr.name.aria")}
          aria-invalid={Boolean(touched.name && errors.name)}
          required
        />
        {touched.name && errors.name && (
          <p className="text-xs text-red-600">{errors.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">
              {t("addr.address.label")}
            </label>
            <input
              ref={streetRef}
              type="text"
              className={`rounded-md border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 ${
                touched.street && errors.street
                  ? "border-red-400 focus:ring-red-200"
                  : ""
              }`}
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                if (touched.street)
                  setErrors((p) => ({
                    ...p,
                    street: e.target.value.trim()
                      ? undefined
                      : t("addr.validation.streetRequired"),
                  }));
              }}
              onBlur={() => markTouched("street")}
              placeholder={t("addr.address.placeholder")}
              aria-invalid={Boolean(touched.street && errors.street)}
              required
            />
            {touched.street && errors.street && (
              <p className="text-xs text-red-600">{errors.street}</p>
            )}
          </div>

          <div className="grid gap-1">
            <input
              type="text"
              className="rounded-md border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              value={street2}
              onChange={(e) => setStreet2(e.target.value)}
              placeholder={t("addr.street2.placeholder")}
              aria-label={t("addr.street2.aria")}
            />
          </div>

          <div className="grid gap-1">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className={`w-full rounded-md border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 ${
                  touched.district && errors.district
                    ? "border-red-400 focus:ring-red-200"
                    : ""
                }`}
                value={districtQuery}
                onChange={(e) => {
                  onDistrictInput(e.target.value);
                  if (touched.district) {
                    setErrors((p) => ({
                      ...p,
                      district: undefined,
                    }));
                  }
                }}
                onBlur={() => {
                  markTouched("district");
                  setErrors((p) => ({
                    ...p,
                    district: districtSel?.id
                      ? undefined
                      : t("addr.validation.districtRequired"),
                  }));
                }}
                onFocus={() => districtQuery.length >= 2 && setOptOpen(true)}
                placeholder={t("addr.district.placeholder")}
                aria-label={t("addr.district.aria")}
                aria-autocomplete="list"
                aria-expanded={optOpen}
                aria-controls="district-listbox"
                aria-invalid={Boolean(touched.district && errors.district)}
                required
              />
              {optOpen && (
                <ul
                  id="district-listbox"
                  ref={listRef}
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white shadow"
                >
                  {loadingOpt && (
                    <li className="px-3 py-2 text-sm text-gray-500">
                      {t("common.loading")}
                    </li>
                  )}
                  {!loadingOpt &&
                    options.length === 0 &&
                    districtQuery.length >= 2 && (
                      <li className="px-3 py-2 text-sm text-gray-500">
                        {t("common.noResults")}
                      </li>
                    )}
                  {options.map((d) => (
                    <li
                      key={d.id}
                      role="option"
                      aria-selected={districtSel?.id === d.id}
                      className={
                        "cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 " +
                        (districtSel?.id === d.id ? "bg-gray-50" : "")
                      }
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onPickDistrict(d)}
                      title={d.name}
                    >
                      {d.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {touched.district && errors.district && (
              <p className="text-xs text-red-600">{errors.district}</p>
            )}
          </div>

          <div className="grid gap-1">
            <input
              type="text"
              inputMode="numeric"
              className="rounded-md border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder={t("addr.zip.placeholder")}
              aria-label={t("addr.zip.aria")}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">
              {t("addr.phone.label")}
            </label>
            <input
              type="tel"
              className="rounded-md border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={t("addr.phone.placeholder")}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">
              {t("addr.email.label")}
            </label>
            <input
              type="email"
              className="rounded-md border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("addr.email.placeholder")}
            />
          </div>
        </div>
      </div>

      {errMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={!canSubmit || submitStatus === "submitting"}
          className="inline-flex items-center text-sm gap-2 rounded-md bg-primary px-4 py-2 text-white disabled:opacity-50"
        >
          {submitStatus === "submitting"
            ? t("addr.actions.saving")
            : addressId
            ? t("addr.actions.update")
            : t("addr.actions.create")}
        </button>

        <button
          type="button"
          onClick={handleDiscard}
          className="inline-flex items-center text-sm gap-2 rounded-md bg-primary/10 px-4 py-2 hover:bg-primary/20 text-gray-500"
        >
          {t("common.discard")}
        </button>

        {districtSel?.id ? (
          <span hidden className="text-xs text-gray-500">
            {t("addr.selectedDistrict")}: <b>{districtSel.id}</b>
          </span>
        ) : null}
      </div>
    </form>
  );
}
