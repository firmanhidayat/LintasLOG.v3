"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DriverFormPage from "@/components/forms/DriverForm";
import type { DriverValues } from "@/features/driver/DriverFormController";

const DRIVER_DETAIL_URL = process.env.NEXT_PUBLIC_TMS_DRIVERS_URL ?? "";

type DriverAttachmentGroup = {
  id: number;
  name: string;
  doc_type: string;
  attachments?: {
    id: number;
    name: string;
    mimetype: string;
    res_model: string;
    res_id: number;
    access_token: string;
    url: string;
  }[];
};

type DriverInitialData = Partial<DriverValues> & {
  driver_document_attachment?: DriverAttachmentGroup;
};

export default function DriverDetailPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const driverId = sp.get("id") ?? "";

  const [initialData, setInitialData] = useState<DriverInitialData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${DRIVER_DETAIL_URL}/${encodeURIComponent(driverId)}`,
          {
            headers: { Accept: "application/json" },
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const j = await res.json();
        // const mapped: Partial<DriverValues> = {
        const mapped: DriverInitialData = {
          name: j?.name ?? null,
          no_ktp: j?.no_ktp ?? null,
          mobile: j?.mobile ?? "",
          street: j?.street ?? "",
          street2: j?.street2 ?? "",
          district_id: j?.district.id ?? "",
          district: j?.district ?? null,
          zip: j?.zip ?? "",
          drivers_license: j?.drivers_license ?? "",
          drivers_license_expiry: j?.drivers_license_expiry ?? "",
          login: j?.login ?? "",
          driver_document_attachment_id:
            j?.driver_document_attachment_id ?? null,
          driver_document_attachment: j?.driver_document_attachment ?? null,
        };
        if (alive) setInitialData(mapped);
      } catch (e: unknown) {
        if (alive) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [driverId]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  if (err) return <div className="p-4 text-sm text-red-600">{err}</div>;
  if (!initialData) return <div className="p-4 text-sm">No data</div>;

  return (
    <DriverFormPage
      mode="edit"
      driverId={driverId}
      initialData={initialData}
      onSuccess={() =>
        router.replace(
          `/fleetndriver/driver/details?id=${encodeURIComponent(
            driverId
          )}&updated=1`
        )
      }
    />
  );
}
