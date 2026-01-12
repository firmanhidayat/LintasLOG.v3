import { AbstractFormController } from "@/core/AbstractFormController";
import type { RecordItem } from "@/types/recorditem";

const DRIVER_URL = process.env.NEXT_PUBLIC_TMS_DRIVERS_URL!;
export type DriverAttachmentItem = {
  id: number;
  name?: string;
  mimetype?: string;
  url?: string;
  full_url?: string;
  content_url?: string;
};
export type DriverDocumentAttachment = {
  id: number;
  name?: string;
  attachments?: DriverAttachmentItem[];
};
export type DriverAttachmentFile = {
  id: number;
  name?: string;
  mimetype?: string;
  url?: string;
  full_url?: string;
  content_url?: string;
};
export type DriverAttachmentGroup = {
  id: number;
  name?: string;
  attachments?: DriverAttachmentFile[];
};
export type DriverValues = {
  name: string;
  no_ktp: string;
  mobile: string;
  street: string;
  street2: string;
  district: RecordItem | null;
  district_id: number;
  zip: string;
  drivers_license: string;
  drivers_license_expiry: string;
  login: string;
  password: string;

  // Avatar
  // - image_128 is RAW base64 (small) from BE, used for display only
  // - image_1920 is RAW base64 (full) to be sent on submit ONLY when changed
  image_128?: string;
  image_1920?: string | null;

  driver_document_attachment_id: number | null;
  // driver_document_attachment: DriverAttachmentGroup | null;
};

export type DriverErrors = Partial<Record<keyof DriverValues, string>>;
export type DriverPayload = {
  name: string;
  no_ktp: string;
  mobile: string;
  street: string;
  street2: string;
  district_id: number;
  zip: string;
  drivers_license: string;
  drivers_license_expiry: string;
  login?: string;
  password?: string;
  driver_document_attachment_id?: number | null;
  image_1920?: string | null;
};

export type DriverApiResponse = {
  id?: number | string;
  name?: string;
  mobile?: string;
  login?: string;
  image_128?: string;
  driver_document_attachment_id?: number | null;
  driver_document_attachment?: DriverAttachmentGroup | null;
} | null;

// ===== Controller =====
export class DriverFormController extends AbstractFormController<
  DriverValues,
  DriverErrors,
  DriverPayload,
  DriverApiResponse
> {
  private formMode: "create" | "edit";

  constructor(mode: "create" | "edit", initial: Partial<DriverValues> = {}) {
    super(DriverFormController.mergeInitial(initial));
    this.formMode = mode;
  }

  private static defaultValues(): DriverValues {
    return {
      name: "",
      no_ktp: "",
      mobile: "",
      street: "",
      street2: "",
      district: null,
      district_id: 0,
      zip: "",
      drivers_license: "",
      drivers_license_expiry: "",
      login: "",
      password: "",
      driver_document_attachment_id: null,
      image_128: "",
      // keep undefined so it will be omitted from payload unless changed
      image_1920: undefined,
    };
  }

  private static mergeInitial(partial: Partial<DriverValues>): DriverValues {
    return { ...DriverFormController.defaultValues(), ...partial };
  }

  // ===== Validasi =====
  protected requiredKeys(): (keyof DriverValues)[] {
    const keys: (keyof DriverValues)[] = [
      "name",
      "no_ktp",
      "mobile",
      "district_id",
      "drivers_license",
      "drivers_license_expiry",
    ];
    if (this.formMode === "create") {
      keys.push("login");
      // keys.push("password");
    }
    return keys;
  }

  protected validateCustom(values: DriverValues): DriverErrors {
    const e: DriverErrors = {};
    if (values.no_ktp && values.no_ktp.length < 8) {
      e.no_ktp = "Nomor KTP terlalu pendek";
    }
    if (this.formMode === "create" && !values.login.trim()) {
      e.login = "Required";
    }
    return e;
  }

  // ===== Payload builder =====
  protected toPayload(values: DriverValues): DriverPayload {
    const districtId =
      typeof values.district?.id === "string" ||
      typeof values.district?.id === "number"
        ? Number(values.district.id) || 0
        : 0;

    const payload: DriverPayload = {
      name: values.name,
      no_ktp: values.no_ktp,
      mobile: values.mobile,
      street: values.street,
      street2: values.street2,
      district_id: districtId ?? 0,
      zip: values.zip,
      drivers_license: values.drivers_license,
      drivers_license_expiry: values.drivers_license_expiry,
    };

    if (values.login?.length > 0 && this.formMode !== "edit")
      payload.login = values.login;
    if (values.password?.length > 0 && this.formMode !== "edit")
      payload.password = values.password;

    if (values.driver_document_attachment_id) {
      payload.driver_document_attachment_id =
        values.driver_document_attachment_id;
    }
    if (values.image_1920 !== undefined) {
      payload.image_1920 = values.image_1920;
    }

    return payload;
  }
  protected endpoint(mode: "create" | "edit", id?: string | number): string {
    if (mode === "edit" && id != null) {
      return `${DRIVER_URL}/${id}`;
    }
    return DRIVER_URL;
  }
}
