export interface CityItem {
  id: number | string;
  name: string;
}

export interface AddressItem {
  id: number | string;
  name: string;
}

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
  jo_no?: string;
  pickup_date_planne?: string;
  origin_city?: { id: number; name: string };
  drop_off_date_planne?: string;
  dest_city?: { id: number; name: string };
  special_request?: string;
  price?: number;
  status: OrderStatus;
};

export type JenisOrder = "FTL" | "LTL" | "Project" | "Express";
export type RoutePayload = {
  // pic_name: string;
  // pic_phone: string;
  is_main_route: boolean;
  origin_address_id: number;
  origin_pic_name: string;
  origin_pic_phone: string;
  dest_address_id: number;
  dest_pic_name: string;
  dest_pic_phone: string;
};
export type ApiPayload = {
  receipt_by: string;
  origin_city_id: number;
  dest_city_id: number;
  order_type: JenisOrder;
  moda: string;
  pickup_date_planne: string; // "YYYY-MM-DD HH:mm:ss" (UTC)
  drop_off_date_planne: string; // "YYYY-MM-DD HH:mm:ss" (UTC)
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
  order_type: JenisOrder;
  moda: string;

  // Lokasi Muat/Bongkar
  pickup_date_planne: string;
  drop_off_date_planne: string;

  multi_pickdrop: boolean;
  lokasi_muat_id?: number | string;
  lokasi_bongkar_id?: number | string;

  // Layanan Khusus
  layanan_khusus: string[];
  layanan_lainnya?: string;

  // Informasi Muatan
  muatan_nama: string;
  // muatan_jenis: string;
  muatan_deskripsi: string;

  // Dokumen
  dokumen_lampiran?: string[];
  sj_pod_lampiran?: string[];

  profile_timezone?: string;
}
