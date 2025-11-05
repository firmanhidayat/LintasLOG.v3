import { AbstractFormController } from "@/core/AbstractFormController";
import type { RecordItem } from "@/types/recorditem";

const DRIVER_URL = process.env.NEXT_PUBLIC_TMS_DRIVERS_URL!;

// ===== Types =====
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
};

export type DriverApiResponse = {
  id?: number | string;
  name?: string;
  mobile?: string;
  login?: string;
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
    // Gunakan helper untuk district_id aman, tanpa `any`
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

    return payload;
  }

  // ===== Endpoint builder =====
  protected endpoint(mode: "create" | "edit", id?: string | number): string {
    if (mode === "edit" && id != null) {
      return `${DRIVER_URL}/${id}`;
    }
    return DRIVER_URL;
  }
}
