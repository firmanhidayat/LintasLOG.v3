import { RecordItem } from "./recorditem";
import { StatusStep } from "./status-delivery";
import { TmsUserType } from "./tms-profile";

// import type { TmsUserType } from "@/types/tms-profile";

export type OrderAttachmentItem = {
  id: number;
  name: string;
  mimetype: string;
  res_model: string;
  res_id: number;
  access_token: string;
  url: string;
};

export type OrderAttachmentGroup = {
  id: number;
  name: string;
  doc_type: string;
  attachments?: OrderAttachmentItem[];
};

// export type AttachmentItem = {
//   id: number;
//   name: string;
//   url: string;
//   mimetype?: string;
// };

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

// Row type untuk datagrid purchase orders : sisi Transporter
export type POrderRow = {
  id: number | string;
  name?: string;
  dest_city?: { id: number; name: string };
  origin_city?: { id: number; name: string };
  pickup_date_planne?: RoutePayload["etd_date"];
  drop_off_date_planne?: RoutePayload["eta_date"];
  requirement_other?: string;
  amount_total?: number;
  tms_state: string;
  tms_states: StatusStep[];
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

  cargo_type_id: number;
  cargo_name: string;
  cargo_description: string;
  cargo_cbm: number;
  cargo_qty: number;

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
  cargo_type_id: number;
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
    cargo_type: RecordItem;
    cargo_type_id: number;
    
    cargo_name: string;
    cargo_description: string;
    cargo_cbm: number;
    cargo_qty: number;
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
    state: string;

    tms_states?: StatusStep[];
    tms_state?: string;

    origin_city?: CityItem;
    dest_city?: CityItem;

    driver_partner?: RecordItem;
    fleet_vehicle?: RecordItem;

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

    packing_list_attachment?: OrderAttachmentGroup;
    delivery_note_attachment?: OrderAttachmentGroup;
    
    res_id?: number;
    res_model?: string;
    original_res_id?: number;
    original_res_model?: string;

    route_ids?: Array<{
      id?: number;
      is_main_route: boolean;
      origin_address_id: number;
      origin_pic_name?: string;
      origin_pic_phone?: string;
      dest_address_id: number;
      dest_pic_name?: string;
      dest_pic_phone?: string;

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

export type TransporterInitialData = NonNullable<OrdersCreateFormProps["initialData"]> & {
  claim_ids_count?: number | null;
};
export type ShipperInitialData = NonNullable<OrdersCreateFormProps["initialData"]> & {
  reviewed_claim_ids_count?: number | null;
};
export type TransporterOrderProps = Omit<OrdersCreateFormProps, "initialData"> & {
  initialData?: TransporterInitialData | null;
};
export type ShipperOrderProps = Omit<OrdersCreateFormProps, "initialData"> & {
  initialData?: ShipperInitialData | null;
};
export type RoleOrderProps<T extends TmsUserType> = T extends "shipper"
  ? ShipperOrderProps
  : TransporterOrderProps;
// interface TransporterOrderProps extends OrdersCreateFormProps {
//   initialData?: OrdersCreateFormProps["initialData"] & {
//     claim_ids_count?: number | null;
//   };
// }

// interface ShipperOrderProps extends OrdersCreateFormProps {
//   initialData?: OrdersCreateFormProps["initialData"] & {
//     reviewed_claim_ids_count?: number | null;
//   };
// }

// export type RoleOrderProps<T extends TmsUserType> = 
//   T extends "shipper" 
//     ? ShipperOrderProps 
//     : TransporterOrderProps;