"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AddressForm, { type AddressFormProps } from "@/forms/AddressesForm";
import { t } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

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
};

export default function AddressDetailsPage() {
  const sp = useSearchParams();
  const addressId = sp.get("id") ?? "";
  const router = useRouter();

  const [initial, setInitial] = useState<AddressFormProps["initialValue"]>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!addressId) {
      setErr(t("common.idNotFound"));
      setLoading(false);
      return;
    }
    let aborted = false;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const url = `${API_BASE}/users/me/addresses/${addressId}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const data: AddressDetailResponse = await res.json();
        if (aborted) return;
        setInitial(toInitialValue(data));
      } catch (e) {
        if (aborted) return;
        console.error("[address detail]", e);
        setErr(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [addressId]);

  const title = useMemo(() => t("addr.page.editTitle"), []);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          {t("common.back")}
        </button>
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
          addressId={addressId}
          initialValue={initial}
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
): AddressFormProps["initialValue"] {
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
  };
}
