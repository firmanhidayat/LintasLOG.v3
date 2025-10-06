export interface IdName {
  id: number | string;
  name: string;
}

export interface AddressItem {
  id: number | string;
  name: string;
}

export type JenisOrder = "FTL" | "LTL" | "Project" | "Express";

export interface CreateOrderPayload {
  no_jo?: string;
  customer?: string;
  penerima_nama?: string;
  kota_muat_id: number | string;
  kota_bongkar_id: number | string;
  jenis_order: JenisOrder;
  armada: string;

  // Lokasi Muat/Bongkar
  tgl_muat_utc: string;
  tgl_bongkar_utc: string;
  multi_pickdrop: boolean;
  lokasi_muat_id?: number | string;
  lokasi_bongkar_id?: number | string;

  // Layanan Khusus
  layanan_khusus: string[];
  layanan_lainnya?: string;

  // Informasi Muatan
  muatan_nama: string;
  muatan_jenis: string;
  muatan_deskripsi: string;

  // Dokumen
  dokumen_lampiran?: string[];
  sj_pod_lampiran?: string[];

  profile_timezone?: string;
}
