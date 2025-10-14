export interface CityItem {
  id: number | string;
  name: string;
}

export interface AddressItem {
  id: number | string;
  name: string;
}

export type OrderTypeItem = {
  id: number | string;
  name: string;
  // code?: string;
};

export type ModaItem = {
  id: number | string;
  name: string;
  // code?: string;
};
export type PartnerItem = {
  id: number | string;
  name: string;
};

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "On Preparation"
  | "Pickup"
  | "On Delivery"
  | "Received"
  | "On Review"
  | "Done";

export type OrderRow = {
  id: number | string;
  name?: string;
  pickup_date_planne?: RoutePayload["etd_date"];
  origin_city?: { id: number; name: string };
  drop_off_date_planne?: RoutePayload["eta_date"];
  dest_city?: { id: number; name: string };
  requirement_other?: string;
  price?: number;
  status: OrderStatus;
  route_ids: RoutePayload[];
};

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

  // layanan_khusus: string[];
  // layanan_lainnya?: string;

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
    origin_city?: CityItem;
    dest_city?: CityItem;

    // 🔥 Tambahan (top-level) untuk prefill alamat dari API
    origin_address?: AddressItem;
    dest_address?: AddressItem;

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

      etd_date?: string;
      eta_date?: string;
    }>;
    status?: OrderStatus;
  }>;
  /** Callback opsional setelah sukses submit */
  onSuccess?: (result?: unknown) => void;
};
