"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Form, FormActions, FormRow } from "@/components/form/Form";
import { FieldText } from "@/components/form/FieldText";
import {
  FieldAutocomplete,
  AutoItem,
} from "@/components/form/FieldAutoComplete";
import { Alert } from "@/components/feedback/Alert";
import { Button } from "@/components/ui/Button";
import { useDebounced } from "@/hooks/useDebounced";
import { useI18nReady } from "@/hooks/useI18nReady"; // <-- pakai hook i18n ready

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

export default function AddressForm({
  addressId,
  initialValue,
  onSuccess,
  className,
}: AddressFormProps) {
  const { ready: i18nReady, lang: activeLang } = useI18nReady();
  const router = useRouter();

  const [name, setName] = useState(initialValue?.name ?? "");
  const [street, setStreet] = useState(initialValue?.street ?? "");
  const [street2, setStreet2] = useState(initialValue?.street2 ?? "");
  const [zip, setZip] = useState(initialValue?.zip ?? "");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [mobile, setMobile] = useState(initialValue?.mobile ?? "");

  const [districtQuery, setDistrictQuery] = useState(
    initialValue?.district?.name ?? ""
  );

  const [districtSel, setDistrictSel] = useState<AutoItem | null>(
    initialValue?.district ?? null
  );

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

  const initialSnap = useRef({
    name: initialValue?.name ?? "",
    street: initialValue?.street ?? "",
    street2: initialValue?.street2 ?? "",
    zip: initialValue?.zip ?? "",
    email: initialValue?.email ?? "",
    mobile: initialValue?.mobile ?? "",
    districtQuery: initialValue?.district?.name ?? "",
    districtSel: (initialValue?.district ?? null) as AutoItem | null,
  });

  const debouncedQuery = useDebounced(districtQuery, 300);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const streetRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
          headers: { Accept: "application/json" },
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

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 && street.trim().length > 0 && !!districtSel?.id,
    [name, street, districtSel]
  );

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
      else inputRef.current?.focus();
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
          /* ignore */
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
    }
  }

  function onPickDistrict(d: AutoItem) {
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

  if (!i18nReady) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <Form
      onSubmit={handleSubmit}
      className={className}
      aria-busy={submitStatus === "submitting"}
      data-lang={activeLang}
    >
      {/* Name */}
      <FieldText
        inputRef={nameRef}
        value={name}
        onChange={(v) => {
          setName(v);
          if (touched.name)
            setErrors((p) => ({
              ...p,
              name: v.trim() ? undefined : t("addr.validation.nameRequired"),
            }));
        }}
        onBlur={() => markTouched("name")}
        placeholder={t("addr.name.placeholder")}
        ariaLabel={t("addr.name.aria")}
        required
        error={errors.name}
        touched={touched.name}
      />

      <FormRow cols={2}>
        <div className="grid gap-4">
          {/* Street */}
          <FieldText
            inputRef={streetRef}
            label={t("addr.address.label")}
            value={street}
            onChange={(v) => {
              setStreet(v);
              if (touched.street)
                setErrors((p) => ({
                  ...p,
                  street: v.trim()
                    ? undefined
                    : t("addr.validation.streetRequired"),
                }));
            }}
            onBlur={() => markTouched("street")}
            placeholder={t("addr.address.placeholder")}
            error={errors.street}
            touched={touched.street}
            required
          />

          {/* Street 2 */}
          <FieldText
            value={street2}
            onChange={setStreet2}
            placeholder={t("addr.street2.placeholder")}
            ariaLabel={t("addr.street2.aria")}
          />

          {/* District Autocomplete */}
          <FieldAutocomplete
            value={districtQuery}
            onChange={onDistrictInput}
            placeholder={t("addr.district.placeholder")}
            ariaLabel={t("addr.district.aria")}
            options={options}
            loading={loadingOpt}
            open={optOpen}
            setOpen={setOptOpen}
            selected={districtSel}
            onPick={(d) => onPickDistrict(d)}
            error={errors.district}
            touched={touched.district}
            onBlurValidate={() => {
              markTouched("district");
              setErrors((p) => ({
                ...p,
                district: districtSel?.id
                  ? undefined
                  : t("addr.validation.districtRequired"),
              }));
            }}
            inputRef={inputRef} // RefObject<HTMLInputElement>
            listboxId="district-listbox"
          />

          {/* ZIP */}
          <FieldText
            value={zip}
            onChange={setZip}
            placeholder={t("addr.zip.placeholder")}
            ariaLabel={t("addr.zip.aria")}
          />
        </div>

        <div className="grid gap-4">
          {/* Phone */}
          <FieldText
            label={t("addr.phone.label")}
            value={mobile}
            onChange={setMobile}
            placeholder={t("addr.phone.placeholder")}
            type="tel"
          />
          {/* Email */}
          <FieldText
            label={t("addr.email.label")}
            value={email}
            onChange={setEmail}
            placeholder={t("addr.email.placeholder")}
            type="email"
          />
        </div>
      </FormRow>

      {errMsg && <Alert kind="error">{errMsg}</Alert>}

      <FormActions>
        <Button
          type="submit"
          disabled={!canSubmit || submitStatus === "submitting"}
          variant="solid"
        >
          {submitStatus === "submitting"
            ? t("addr.actions.saving")
            : addressId
            ? t("addr.actions.update")
            : t("addr.actions.create")}
        </Button>

        <Button type="button" onClick={handleDiscard} variant="ghost">
          {t("common.discard")}
        </Button>

        {/* Debug text (hidden) */}
        {districtSel?.id ? (
          <span hidden className="text-xs text-gray-500">
            {t("addr.selectedDistrict")}: <b>{districtSel.id}</b>
          </span>
        ) : null}
      </FormActions>
    </Form>
  );
}
