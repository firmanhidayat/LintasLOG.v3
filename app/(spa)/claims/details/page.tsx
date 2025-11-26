"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ClaimFormPage from "@/components/forms/ClaimsForm";
import { ClaimValues } from "@/features/claims/ClaimsFormController";
import { useAuth } from "@/components/providers/AuthProvider";
import { TmsUserType } from "@/types/tms-profile";

const CLAIM_DETAIL_URL = process.env.NEXT_PUBLIC_TMS_CLAIMS_URL ?? "";

type ClaimAttachmentGroup = {
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

type ClaimInitialData = Partial<ClaimValues> & {
  document_attachment?: ClaimAttachmentGroup;
};

export default function ClaimsDetailPage() {
  const sp = useSearchParams();
    const router = useRouter();
    const claimId = sp.get("id") ?? "";

    const [initialData, setInitialData] = useState<ClaimInitialData | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const { profile } = useAuth();
        const userType = useMemo(() => {
          if (profile) return profile.tms_user_type;
          return undefined;
        }, [profile]);
        
  
    useEffect(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `${CLAIM_DETAIL_URL}/${encodeURIComponent(claimId)}`,
            {
              headers: { Accept: "application/json" },
              credentials: "include",
            }
          );
          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
          const j = await res.json();
          const mapped: ClaimInitialData = {
            amount: j.amount,
            description: j.description,
            document_attachment: j?.document_attachment,
            state: j?.state,
            purchase_order: j?.purchase_order
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
    }, [claimId]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  if (err) return <div className="p-4 text-sm text-red-600">{err}</div>;
  if (!initialData) return <div className="p-4 text-sm">No data</div>;

  return (
      <ClaimFormPage
        mode="edit"
        userType={userType as TmsUserType}
        claimId={claimId}
      initialData={initialData}
      onSuccess={() =>
        router.replace(
          `/claims/details?id=${encodeURIComponent(
            claimId
          )}&updated=1`
        )
      }
      />
    );
  
}

