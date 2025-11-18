import {
  AbstractFormController,
  JsonValue,
} from "@/core/AbstractFormController";
import { TmsProfile, TmsProfileCore } from "@/types/tms-profile";
export type ProfileValues = TmsProfile;
export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;
export type ProfileApiResponse = { id?: string } & {
  [k: string]: JsonValue;
};
export type ProfilePayload = TmsProfile;
const USER_ME_URL = process.env.NEXT_PUBLIC_TMS_USER_PROFILE_URL ?? "";

function toNumberSafe(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export class ProfileFormController extends AbstractFormController<
  ProfileValues,
  ProfileErrors,
  ProfilePayload,
  ProfileApiResponse | null
> {
  protected requiredKeys(): (keyof ProfileValues)[] {
    return ["name", "email", "tz"];
  }
  protected validateCustom(values: ProfileValues): ProfileErrors {
    const e: ProfileErrors = {};
    if (!values.name) {
      e.name = "Required";
    }
    if (!values.email) {
      e.email = "Required";
    }
    if (!values.tz) {
      e.tz = "Required";
    }
    return e;
  }
  protected toPayload(values: ProfileValues): ProfilePayload {
    return {
      id: toNumberSafe(values.id)?.toString() ?? "",
      name: values.name,
      email: values.email,
      phone: values.phone,
      mobile: values.mobile,
      vat: values.vat,
      tz: values.tz,
      shipper_transporter_document_attachment:
        values.shipper_transporter_document_attachment,
      shipper_transporter_document_attachment_id:
        values.shipper_transporter_document_attachment_id,
      tms_user_type: values.tms_user_type,
    };
  }
  protected endpoint(mode: "create" | "edit", id?: string | number): string {
    // if (mode === "edit" && id !== undefined && id !== null) {
    //   return `${USER_ME_URL}/${id}`;
    // }
    return USER_ME_URL;
  }
}
