"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProfileFormPage from "@/components/forms/profile/ProfileForm";
import type { ProfileValues } from "@/features/profile/ProfileFormController";
import { RecordItem } from "@/types/recorditem";

const USERME_URL = process.env.NEXT_PUBLIC_TMS_USER_PROFILE_URL ?? "";

export default function ProfileDetailPage() {
  type LookupItem = { id: number; name: string };

  type ExtendedProfileInitialData = Partial<ProfileValues> & {
    transporter_coverage_area_ids?: number[];
    desired_delivery_category_ids?: number[];
    desired_industry_category_ids?: number[];
    certification_category_ids?: number[];

    transporter_coverage_area?: LookupItem[];
    desired_delivery_category?: LookupItem[];
    desired_industry_category?: LookupItem[];
    certification_category?: LookupItem[];
    district: RecordItem;
  };

  function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  }
  function asString(v: unknown): string | undefined {
    return typeof v === "string" ? v : undefined;
  }
  function asNumber(v: unknown): number | undefined {
    const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : undefined;
  }
  function asLookupItems(v: unknown): LookupItem[] {
    if (!Array.isArray(v)) return [];
    const out: LookupItem[] = [];
    for (const it of v) {
      const r = asRecord(it);
      const id = asNumber(r.id);
      if (!id) continue;
      const name = asString(r.name) ?? asString(r.display_name) ?? `ID ${id}`;
      out.push({ id, name });
    }
    return out;
  }
  function asIds(v: unknown): number[] {
    if (!Array.isArray(v)) return [];
    const out: number[] = [];
    for (const it of v) {
      // support: [1,2,3] OR [{id:1}, ...]
      const n =
        typeof it === "number" ? it : asNumber(asRecord(it).id) ?? asNumber(it);
      if (n && Number.isFinite(n)) out.push(n);
    }
    return out;
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const updated = searchParams.get("updated") === "1";
  // const [initialData, setInitialData] = useState<Partial<ProfileValues>>();
  const [initialData, setInitialData] = useState<ExtendedProfileInitialData>();
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

        const rec = asRecord(j);

        const coverageItems = asLookupItems(rec.transporter_coverage_area);
        const deliveryItems = asLookupItems(rec.desired_delivery_category);
        const industryItems = asLookupItems(rec.desired_industry_category);
        const certItems = asLookupItems(rec.certification_category);

        const coverageIds = asIds(rec.transporter_coverage_area_ids);
        const deliveryIds = asIds(rec.desired_delivery_category_ids);
        const industryIds = asIds(rec.desired_industry_category_ids);
        const certIds = asIds(rec.certification_category_ids);

        if (!alive) return;

        setProfileId(j?.id);
        // setInitialData({
        //   name: j?.name ?? null,
        //   email: j?.email ?? null,
        //   phone: j?.phone ?? null,
        //   mobile: j?.mobile ?? null,
        //   no_ktp: j?.no_ktp ?? null,
        //   street: j?.street ?? null,
        //   street2: j?.street2 ?? null,
        //   zip: j?.zip ?? null,
        //   district_id: j?.district_id ?? null,
        //   tz: j?.tz ?? null,
        //   vat: j?.vat ?? null,
        //   tms_user_type: j?.tms_user_type,
        //   transporter_document_upload_instruction:
        //     j?.transporter_document_upload_instruction,
        //   shipper_transporter_document_attachment:
        //     j?.shipper_transporter_document_attachment ?? null,
        //   shipper_transporter_document_attachment_id:
        //     j?.shipper_transporter_document_attachment_id ?? null,
        //   has_deliver_telco_medicaldevice_dangergoods:
        //     j?.has_deliver_telco_medicaldevice_dangergoods ?? false,
        //   district: j?.district ?? null,
        //   delivered_telco_medicaldevice_dangergoods:
        //     j?.delivered_telco_medicaldevice_dangergoods ?? "",
        //   image_128: j?.image_128 ?? null,
        //   transporter_coverage_area: j?.transporter_coverage_area,
        //   desired_delivery_category: j?.desired_delivery_category,
        //   desired_industry_category: j?.desired_industry_category,
        //   certification_category: j?.certification_category,

        //   // image_1920: j?.image_1920 ?? null,
        // });
        setInitialData({
          name: asString(rec.name) ?? "",
          email: asString(rec.email) ?? "",
          phone: asString(rec.phone) ?? "",
          mobile: asString(rec.mobile) ?? "",
          no_ktp: asString(rec.no_ktp) ?? "",
          street: asString(rec.street) ?? "",
          street2: asString(rec.street2) ?? "",
          zip: asString(rec.zip) ?? "",

          district_id: asNumber(rec.district_id) ?? 0,
          district: rec.district as RecordItem,

          tz: asString(rec.tz) ?? "",
          vat: asString(rec.vat) ?? "",

          transporter_verified: Boolean(rec.transporter_verified),
          tms_user_type: asString(rec.tms_user_type) ?? "",
          transporter_document_upload_instruction:
            asString(rec.transporter_document_upload_instruction) ?? "",

          // shipper_transporter_document_attachment:
          //   (rec.shipper_transporter_document_attachment as unknown) ??
          //   undefined,
          // shipper_transporter_document_attachment_id: (() => {
          //   const id = asNumber(rec.shipper_transporter_document_attachment_id);
          //   return id && id > 0 ? id : null;
          // })(),

          has_deliver_telco_medicaldevice_dangergoods: Boolean(
            rec.has_deliver_telco_medicaldevice_dangergoods
          ),
          delivered_telco_medicaldevice_dangergoods:
            asString(rec.delivered_telco_medicaldevice_dangergoods) ?? "",

          image_128: asString(rec.image_128),

          // lookup objects (buat chips UI)
          transporter_coverage_area: coverageItems,
          desired_delivery_category: deliveryItems,
          desired_industry_category: industryItems,
          certification_category: certItems,

          // lookup ids (buat payload submit)
          transporter_coverage_area_ids: coverageIds.length
            ? coverageIds
            : coverageItems.map((x) => x.id),
          desired_delivery_category_ids: deliveryIds.length
            ? deliveryIds
            : deliveryItems.map((x) => x.id),
          desired_industry_category_ids: industryIds.length
            ? industryIds
            : industryItems.map((x) => x.id),
          certification_category_ids: certIds.length
            ? certIds
            : certItems.map((x) => x.id),
            
        });
      } catch (e: unknown) {
        if (alive) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  if (err) return <div className="p-4 text-sm text-red-600">{err}</div>;
  if (!initialData) return <div className="p-4 text-sm">No data</div>;

  return (
    <div className="space-y-3">
      {updated && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Profile berhasil di-update.
        </div>
      )}

      <ProfileFormPage
        mode="edit"
        profileId={profileId ?? 0}
        initialData={initialData}
        onSuccess={() => router.replace(`/maccount/edit?updated=1`)}
      />
    </div>
  );
}
