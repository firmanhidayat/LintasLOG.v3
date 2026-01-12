"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProfileFormPage from "@/components/forms/profile/ProfileForm";
import type { ProfileValues } from "@/features/profile/ProfileFormController";
const USERME_URL = process.env.NEXT_PUBLIC_TMS_USER_PROFILE_URL ?? "";
export default function ProfileDetailPage() {
  const router = useRouter();
  const [initialData, setInitialData] = useState<Partial<ProfileValues>>();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<number | undefined>();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${USERME_URL}`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const j = await res.json();
        setProfileId(j?.id);
        const mapped: Partial<ProfileValues> = {
          name: j?.name ?? null,
          email: j?.email ?? null,
          phone: j?.phone ?? null,
          mobile: j?.mobile ?? null,
          tz: j?.tz ?? null,
          vat: j?.vat ?? null,
          tms_user_type: j?.tms_user_type,
          transporter_document_upload_instruction: j?.transporter_document_upload_instruction,
          shipper_transporter_document_attachment:
            j?.shipper_transporter_document_attachment ?? null,
          shipper_transporter_document_attachment_id:
            j?.shipper_transporter_document_attachment_id ?? null,
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
  }, [profileId]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  if (err) return <div className="p-4 text-sm text-red-600">{err}</div>;
  if (!initialData) return <div className="p-4 text-sm">No data</div>;

  return (
    <ProfileFormPage
      mode="edit"
      profileId={profileId ?? 0}
      initialData={initialData}
      onSuccess={() => router.replace(`/maccount/edit/?updated=1`)}
    />
  );
}
