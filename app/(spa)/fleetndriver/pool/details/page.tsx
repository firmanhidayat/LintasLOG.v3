"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AddressForm, { type AddressFormProps } from "@/forms/AddressesForm";
import { getLang, t } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { useI18nReady } from "@/hooks/useI18nReady";

const ADDRESSES_URL = process.env.NEXT_PUBLIC_TMS_USER_ADDRESS_URL ?? "";

type AddressDetailResponse = {
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
  latitude: number;
  longitude: number;
  map_description: string;
};

export default function AddressDetailsPage() {
  const sp = useSearchParams();
  const addressId = sp.get("id") ?? "";
  const router = useRouter();

  const { i18nReady, activeLang } = useI18nReady();

  const [initial, setInitial] = useState<AddressFormProps["initialData"]>();
  const [loading, setLoading] = useState<boolean>(Boolean(addressId));
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!addressId) {
      setLoading(false);
      setErr("");
      setInitial(undefined);
      return;
    }

    let aborted = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const url = `${ADDRESSES_URL}/${addressId}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Language": getLang(),
          },
          credentials: "include",
        });
        if (res.status === 401) {
          goSignIn({ routerReplace: router.replace });
          return;
        }
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);

        const data: AddressDetailResponse = await res.json();
        if (!aborted) setInitial(toInitialValue(data));
      } catch (e) {
        if (!aborted) {
          console.error("[address detail]", e);
          setErr(e instanceof Error ? e.message : "Gagal memuat data");
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [addressId, router.replace]);

  const title = addressId
    ? t("addr.page.editTitle")
    : t("addr.page.createTitle");

  // ⏳ show lightweight skeleton while dictionaries load (prevents flicker)
  if (!i18nReady) {
    return (
      <div className="max-auto" data-lang={activeLang}>
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="rounded-md border p-4 text-sm text-gray-600">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="max-auto" data-lang={activeLang}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>

      {loading ? (
        <div className="rounded-md border p-4 text-sm text-gray-600">
          {t("common.loading")}
        </div>
      ) : err ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : (
        <AddressForm
          type="other"
          mode="edit"
          {...(addressId ? { addressId } : {})}
          initialData={initial}
          onSuccess={() => router.push("/orders/addresses/list")}
        />
      )}
    </div>
  );
}

function isDistrictObj(v: unknown): v is { id?: number; name?: string } {
  return typeof v === "object" && v !== null && ("id" in v || "name" in v);
}

function toInitialValue(
  d: AddressDetailResponse
): AddressFormProps["initialData"] {
  let idCandidate: number | undefined;
  let nameCandidate: string | undefined;

  if (typeof d.district === "string") {
    nameCandidate = d.district;
  } else if (isDistrictObj(d.district)) {
    if (typeof d.district.id === "number") idCandidate = d.district.id;
    nameCandidate = d.district.name ?? d.district_name ?? undefined;
  } else {
    if (typeof d.district_id === "number") idCandidate = d.district_id;
    nameCandidate = d.district_name ?? undefined;
  }

  let district: { id: number; name: string } | null = null;
  if (typeof idCandidate === "number" && idCandidate > 0) {
    district = { id: idCandidate, name: String(nameCandidate ?? "") };
  } else if (nameCandidate) {
    district = null;
  }

  return {
    name: d.name ?? "",
    street: d.street ?? "",
    street2: d.street2 ?? "",
    zip: d.zip ?? "",
    email: d.email ?? "",
    mobile: d.mobile ?? d.phone ?? "",
    district,
    longitude: d.longitude,
    latitude: d.latitude,
    map_description: d.map_description,
  };
}
