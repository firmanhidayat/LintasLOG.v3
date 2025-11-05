import {
  AbstractFormController,
  JsonValue,
} from "@/core/AbstractFormController";
import { RecordItem } from "@/types/recorditem";
export type FleetValues = {
  model: RecordItem | null;
  category: RecordItem | null;
  license_plate: string;
  model_year: string;
  vin_sn: string;
  engine_sn: string;
  trailer_hook: boolean;
  tonnage_max: number;
  cbm_volume: number;
  color: string;
  horsepower: number;
  axle: string;
  acquisition_date: string;
  write_off_date: string;
  kir: string;
  kir_expiry: string;
};
export type FleetErrors = Partial<Record<keyof FleetValues, string>>;
export type FleetApiResponse = { id?: string } & {
  [k: string]: JsonValue;
};
export type FleetPayload = {
  model_id: number;
  license_plate: string;
  model_year: string;
  vin_sn: string;
  engine_sn: string;
  trailer_hook: boolean;
  tonnage_max: number;
  cbm_volume: number;
  category_id: number;
  color: string;
  horsepower: number;
  axle: string;
  acquisition_date: string;
  write_off_date: string;
  kir: string;
  kir_expiry: string;
};
const FLEET_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_URL ?? "";
// const MODELS_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_MODELS_URL ?? "";
// const CATEGORIES_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_CATEGORIES_URL ?? "";

function toNumberSafe(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export class FleetFormController extends AbstractFormController<
  FleetValues,
  FleetErrors,
  FleetPayload,
  FleetApiResponse | null
> {
  protected requiredKeys(): (keyof FleetValues)[] {
    return ["model", "license_plate", "category"];
  }
  protected validateCustom(values: FleetValues): FleetErrors {
    const e: FleetErrors = {};
    if (
      !values.category ||
      typeof values.category.id === "undefined" ||
      typeof values.model?.id === "undefined" ||
      !values.license_plate
    ) {
      e.category = "Required";
    }
    return e;
  }
  protected toPayload(values: FleetValues): FleetPayload {
    return {
      model_id: toNumberSafe(values.model?.id) ?? 0,
      category_id: toNumberSafe(values.category?.id) ?? 0,
      license_plate: values.license_plate,
      model_year: values.model_year,
      vin_sn: values.vin_sn,
      engine_sn: values.engine_sn,
      trailer_hook: values.trailer_hook,
      tonnage_max: toNumberSafe(values.tonnage_max) ?? 0,
      cbm_volume: toNumberSafe(values.cbm_volume) ?? 0,
      color: values.color,
      horsepower: values.horsepower,
      axle: values.axle,
      acquisition_date: values.acquisition_date,
      write_off_date: values.write_off_date,
      kir: values.kir,
      kir_expiry: values.kir_expiry,
    };
  }
  protected endpoint(mode: "create" | "edit", id?: string | number): string {
    if (mode === "edit" && id !== undefined && id !== null) {
      return `${FLEET_URL}/${id}`;
    }
    return FLEET_URL;
  }
}
