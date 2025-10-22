import { StatusStep } from "./status-delivery";

/// Item untuk dropdown city, address, etc.
export interface CityItem {
  id: number | string;
  name: string;
}
/// Item untuk dropdown address
export interface AddressItem {
  id: number | string;
  name: string;
  mobile: string;
}
// Item untuk dropdown order type
export type OrderTypeItem = {
  id: number | string;
  name: string;
  // code?: string;
};
// Item untuk dropdown moda
export type ModaItem = {
  id: number | string;
  name: string;
  // code?: string;
};
// Item untuk dropdown partner/customer
export type PartnerItem = {
  id: number | string;
  name: string;
};

// Row type untuk datagrid orders
export type OrderRow = {
  id: number | string;
  name?: string;
  pickup_date_planne?: RoutePayload["etd_date"];
  origin_city?: { id: number; name: string };
  drop_off_date_planne?: RoutePayload["eta_date"];
  dest_city?: { id: number; name: string };
  requirement_other?: string;
  amount_total?: number;
  states: StatusStep[];
  route_ids: RoutePayload[];
};

// Payload untuk create / edit order
export type RoutePayload = {
  is_main_route: boolean;
  origin_address_id: number;
  origin_pic_name: string;
  origin_pic_phone: string;
  dest_address_id: number;
  dest_pic_name: string;
  dest_pic_phone: string;
  etd_date: string; // "YYYY-MM-DD HH:mm:ss" (UTC)
  eta_date: string; // "YYYY-MM-DD HH:mm:ss" (UTC)
};

// Payload utama untuk API create/edit order
export type ApiPayload = {
  receipt_by: string;
  origin_city_id: number;
  dest_city_id: number;
  order_type_id: string;
  moda_id: string;
  cargo_name: string;
  cargo_description: string;

  requirement_helmet: boolean;
  requirement_apar: boolean;
  requirement_safety_shoes: boolean;
  requirement_vest: boolean;
  requirement_glasses: boolean;
  requirement_gloves: boolean;
  requirement_face_mask: boolean;
  requirement_tarpaulin: boolean;
  requirement_other: string;

  // pickup_date_planne: string; // "YYYY-MM-DD HH:mm:ss" (UTC)
  // drop_off_date_planne: string; // "YYYY-MM-DD HH:mm:ss" (UTC)
  route_ids: RoutePayload[];
};
export type Error422 = {
  detail: Array<{
    loc: Array<string | number>;
    msg: string;
    type: string;
  }>;
};
export interface CreateOrderPayload {
  no_jo?: string;
  customer?: string;
  receipt_by?: string;
  origin_city_id: number | string;
  dest_city_id: number | string;
  order_type_id: OrderTypeItem;
  moda_id: ModaItem;

  etd_date: string;
  eta_date: string;

  multi_pickdrop: boolean;
  // Lokasi Muat/Bongkar
  lokasi_muat_id?: number | string;
  lokasi_bongkar_id?: number | string;

  // Layanan Khusus
  requirement_helmet: boolean;
  requirement_apar: boolean;
  requirement_safety_shoes: boolean;
  requirement_vest: boolean;
  requirement_glasses: boolean;
  requirement_gloves: boolean;
  requirement_face_mask: boolean;
  requirement_tarpaulin: boolean;
  requirement_other: string;

  // Informasi Muatan
  muatan_nama: string;
  muatan_deskripsi: string;

  // Dokumen
  dokumen_lampiran?: string[];
  sj_pod_lampiran?: string[];

  profile_timezone?: string;
}

/** EDIT FORM */
/** ===================== Props & Helpers (Reusable) ===================== */
export type OrdersCreateFormProps = {
  mode?: "create" | "edit";
  orderId?: string | number;
  /** Jika tersedia, form akan prefill dari sini (override fetch) */
  initialData?: Partial<{
    id: number | string;
    name: string; // NO JO
    partner: PartnerItem;
    receipt_by: string;
    origin_city_id: number;
    dest_city_id: number;
    order_type_id: number;
    moda_id: number;
    moda: ModaItem;
    order_type: OrderTypeItem;
    cargo_name: string;
    cargo_description: string;
    requirement_helmet: boolean;
    requirement_apar: boolean;
    requirement_safety_shoes: boolean;
    requirement_vest: boolean;
    requirement_glasses: boolean;
    requirement_gloves: boolean;
    requirement_face_mask: boolean;
    requirement_tarpaulin: boolean;
    requirement_other: string;
    pickup_date_planne: string; // "YYYY-MM-DD HH:mm:ss" or ISO
    drop_off_date_planne: string; // same format

    amount_shipping: string | number;
    amount_shipping_multi_charge: string | number;
    amount_tax: string | number;
    amount_total: string | number;
    states: StatusStep[];

    origin_city?: CityItem;
    dest_city?: CityItem;

    // 🔥 Tambahan (top-level) untuk prefill alamat dari API
    origin_address?: AddressItem;
    dest_address?: AddressItem;

    // readonly
    origin_address_name: string;
    origin_street: string;
    origin_street2: string;
    origin_district?: CityItem;
    origin_zip: string;
    origin_latitude: string;
    origin_longitude: string;
    // readonly
    dest_address_name: string;
    dest_street: string;
    dest_street2: string;
    dest_district?: CityItem;
    dest_zip: string;
    dest_latitude: string;
    dest_longitude: string;

    route_ids?: Array<{
      is_main_route: boolean;
      origin_address_id: number;
      origin_pic_name?: string;
      origin_pic_phone?: string;
      dest_address_id: number;
      dest_pic_name?: string;
      dest_pic_phone?: string;

      // 🔥 Tambahan (per-route) untuk prefill alamat dari API
      origin_address?: AddressItem;
      dest_address?: AddressItem;

      // readonly
      origin_address_name: string;
      origin_street: string;
      origin_street2: string;
      origin_district: CityItem;
      origin_zip: string;
      origin_latitude: string;
      origin_longitude: string;
      // readonly
      dest_address_name: string;
      dest_street: string;
      dest_street2: string;
      dest_district: CityItem;
      dest_zip: string;
      dest_latitude: string;
      dest_longitude: string;

      etd_date?: string;
      eta_date?: string;
    }>;
    idReadOnly?: boolean;
  }>;
  /** Callback opsional setelah sukses submit */
  onSuccess?: (result?: unknown) => void;
};
