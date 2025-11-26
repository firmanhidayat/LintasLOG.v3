"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import VendorBillsForm from "@/components/forms/VendorBillsForm";
import { BillsValues } from "@/features/vendorbills/VendorBillFormController";

const VB_DETAIL_URL = process.env.NEXT_PUBLIC_TMS_INV_BILL_URL ?? "";

type BillsAttachmentGroup = {
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

type BillsInitialData = Partial<BillsValues> & {
  document_attachment?: BillsAttachmentGroup;
};
export default function VendorBillDetailsPage() {
  const sp = useSearchParams();
      const router = useRouter();
      const billsId = sp.get("id") ?? "";
  
      const [initialData, setInitialData] = useState<BillsInitialData | null>(null);
      const [loading, setLoading] = useState(true);
      const [err, setErr] = useState<string | null>(null);
    
      useEffect(() => {
        let alive = true;
        (async () => {
          setLoading(true);
          try {
            const res = await fetch(
              `${VB_DETAIL_URL}/${encodeURIComponent(billsId)}`,
              {
                headers: { Accept: "application/json" },
                credentials: "include",
              }
            );
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            const j = await res.json();
            const mapped: BillsInitialData = {
              ref: j.ref,
              document_attachment: j?.document_attachment,
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
      }, [billsId]);
  
    if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
    if (err) return <div className="p-4 text-sm text-red-600">{err}</div>;
    if (!initialData) return <div className="p-4 text-sm">No data</div>;
  
    return (
        <VendorBillsForm
          mode="edit"
          billsId={billsId}
        initialData={initialData}
        onSuccess={() =>
          router.replace(
            `/vendorbill/details?id=${encodeURIComponent(
              billsId
            )}&updated=1`
          )
        }
        />
      );
}
