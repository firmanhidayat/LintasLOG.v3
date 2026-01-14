import { AbstractFormController, JsonValue } from "@/core/AbstractFormController";
import { TmsProfile } from "@/types/tms-profile";

export type ProfileValues = TmsProfile;
export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;
export type ProfileApiResponse = { id?: string } & { [k: string]: JsonValue };

export type ProfilePayload = {
  name?: string;
  phone?: string;
  no_ktp?: string;
  street?: string;
  street2?: string;
  zip?: string;
  district_id?: number;
  mobile?: string;
  vat?: string;
  tz: string;
  shipper_transporter_document_attachment_id: number | null;
  has_deliver_telco_medicaldevice_dangergoods?: boolean;
  delivered_telco_medicaldevice_dangergoods?: string;
  image_1920?: string;

  // Multi-select lookup (ids)
  transporter_coverage_area_ids?: number[];
  desired_delivery_category_ids?: number[];
  desired_industry_category_ids?: number[];
  certification_category_ids?: number[];
  
};

const USER_ME_URL = process.env.NEXT_PUBLIC_TMS_USER_PROFILE_URL ?? "";

function toNumberSafe(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function safeNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const it of v) {
    const n = typeof it === "number" ? it : Number(String(it ?? "").trim());
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export class ProfileFormController extends AbstractFormController<
  ProfileValues,
  ProfileErrors,
  ProfilePayload,
  ProfileApiResponse | null
> {
  protected requiredKeys(): (keyof ProfileValues)[] {
    return [
      "name",
      "district_id",
      "street",
      "mobile",
      "has_deliver_telco_medicaldevice_dangergoods",
    ];
  }

  protected validateCustom(values: ProfileValues): ProfileErrors {
    const e: ProfileErrors = {};
    if (!values.name) e.name = "Name is Required";
    if (!values.email) e.email = "Email is Required";
    if (!values.district_id) e.district_id = "District is Required";

    if (values.has_deliver_telco_medicaldevice_dangergoods) {
      const v = String(values.delivered_telco_medicaldevice_dangergoods ?? "").trim();
      if (!v) e.delivered_telco_medicaldevice_dangergoods = "Required";
    }

    return e;
  }

  protected toPayload(values: ProfileValues): ProfilePayload {
    return {
      name: values.name,
      street: values.street,
      street2: values.street2,
      zip: values.zip,
      district_id: toNumberSafe(values.district_id),
      phone: values.phone,
      mobile: values.mobile,
      vat: values.vat,
      tz: values.tz,

      shipper_transporter_document_attachment_id:
        values.shipper_transporter_document_attachment_id,
      has_deliver_telco_medicaldevice_dangergoods: Boolean(
        values.has_deliver_telco_medicaldevice_dangergoods
      ),
      delivered_telco_medicaldevice_dangergoods:
        values.delivered_telco_medicaldevice_dangergoods,
      image_1920: values.image_1920,

      transporter_coverage_area_ids: safeNumberArray(
        values.transporter_coverage_area_ids
      ),
      desired_delivery_category_ids: safeNumberArray(
        values.desired_delivery_category_ids
      ),
      desired_industry_category_ids: safeNumberArray(
        values.desired_industry_category_ids
      ),
      certification_category_ids: safeNumberArray(values.certification_category_ids),
    };
  }

  protected endpoint(mode: "create" | "edit", id?: string | number): string {
    return USER_ME_URL;
  }
}
