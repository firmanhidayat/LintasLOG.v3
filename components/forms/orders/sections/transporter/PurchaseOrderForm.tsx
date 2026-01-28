"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ExtraStop } from "@/components/forms/orders/sections/ExtraStopCard";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusStep } from "@/types/status-delivery";
import { RecordItem } from "@/types/recorditem";
import {
  AddressItem,
  CityItem,
  ModaItem,
  OrdersCreateFormProps,
  OrderTypeItem,
  PartnerItem,
  RoleOrderProps,
} from "@/types/orders";
import {
  buildDetailUrl,
} from "@/components/shared/Helper";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import StatusDeliveryImage from "@/components/ui/DeliveryState";
import { goSignIn } from "@/lib/goSignIn";
import { getLang, t } from "@/lib/i18n";
import SpecialServicesCard from "@/components/forms/orders/sections/SpecialServicesCard";
import CostDetailsCard from "@/components/forms/orders/sections/CostDetailsCard";
import ShippingDocumentsCard from "@/components/forms/orders/sections/ShippingDocumentsCard";
import Button from "@/components/ui/Button";
import ChatterPanel from "@/components/chat/ChatterPanel";
import React from "react";
import { Field } from "@/components/form/FieldInput";
import LocationInfoCard from "@/components/forms/orders/sections/LocationInfoCard";
import { Modal } from "@/components/forms/orders/OrdersCreateForm";
import { format2comma } from "@/components/forms/orders/sections/CargoInfoCard";
import LookupAutocomplete, {
  normalizeResults,
} from "@/components/form/LookupAutocomplete";
import { IconCar, IconUser } from "@/components/icons/Icon";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { TmsUserType } from "@/types/tms-profile";
import { ClaimItem } from "@/types/claims";
import { fetchOrderClaims_T } from "@/services/claimService";
import { ClaimListModal } from "@/components/claims/ClaimListModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { odooUtcToDatetimeLocalValue } from "@/lib/datetime";

type ExtraStopWithId = ExtraStop & { uid: string };
type ChatImpulseDetail = { active?: boolean; unread?: number };
function useChatImpulseChannel(channel: string = "orders:chat-impulse") {
  const [hasChatImpulse, setHasChatImpulse] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ChatImpulseDetail>).detail;
      const next = Boolean(detail?.active ?? (detail?.unread ?? 0) > 0);
      setHasChatImpulse(next);
    };

    window.addEventListener(channel, handler as EventListener);
    return () => window.removeEventListener(channel, handler as EventListener);
  }, [channel]);

  return { hasChatImpulse, setHasChatImpulse };
}
const genUid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const withUid = (stops: ExtraStop[]): ExtraStopWithId[] =>
  stops.map((s) => ({ ...s, uid: genUid() }));
type RouteItem = NonNullable<
  NonNullable<OrdersCreateFormProps["initialData"]>["route_ids"]
>[number];
function normalizeKey(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "");
}
function extractApiSteps(
  d: NonNullable<OrdersCreateFormProps["initialData"]>
): StatusStep[] {
  const items = (d.tms_states ?? []) as StatusStep[];
  return items.map((it): StatusStep => {
    if (typeof it === "string") {
      return { key: normalizeKey(it), label: it, is_current: false };
    }
    const key = normalizeKey(it.key ?? it.label);
    const label = it.label ?? it.key ?? "";
    return { key, label, is_current: Boolean(it.is_current) };
  });
}
// --- RecordItem sanitizer & guard ---
const isValidRecordItem = (v: unknown): v is RecordItem => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const id = Number(o.id);
  const nameRaw = o.name;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  // valid jika punya name bukan "false" atau punya id > 0
  if (name && name.toLowerCase() !== "false") return true;
  return Number.isFinite(id) && id > 0;
};

const toRecordItem = (v: unknown): RecordItem | null => {
  if (!isValidRecordItem(v)) return null;
  const o = v as Record<string, unknown>;
  const idNum = Number(o.id);
  const nameRaw = typeof o.name === "string" ? o.name.trim() : "";
  const fallbackName = String(
    o.display_name ?? o.label ?? o.license_plate ?? o.plate_no ?? o.code ?? ""
  );
  const name =
    nameRaw && nameRaw.toLowerCase() !== "false" ? nameRaw : fallbackName;

  // cukup id & name saja agar aman
  return {
    id: Number.isFinite(idNum) && idNum > 0 ? idNum : (o.id as number),
    name,
  } as RecordItem;
};

/** ===== Downloadable files helper (Surat Jalan / POD) ===== */
type DownloadableFile = {
  id?: string | number;
  name: string;
  url: string;
  size?: number;
  createdAt?: string;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const safeArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const pickString = (...vals: unknown[]): string => {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

const normalizeDocHint = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "");

const TMS_FILE_BASE =
  process.env.NEXT_PUBLIC_TMS_FILE_BASE_URL ??
  process.env.NEXT_PUBLIC_TMS_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "";

function resolveUrlMaybe(url: string): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (url.startsWith("/") && TMS_FILE_BASE) {
    return `${TMS_FILE_BASE.replace(/\/$/, "")}${url}`;
  }
  return url;
}

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  if (n >= gb) return `${(n / gb).toFixed(2)} GB`;
  if (n >= mb) return `${(n / mb).toFixed(2)} MB`;
  if (n >= kb) return `${(n / kb).toFixed(1)} KB`;
  return `${n} B`;
}

function extractSuratJalanDownloads(data: unknown): DownloadableFile[] {
  if (!isPlainObject(data)) return [];

  const keyHints = [
    "suratjalan",
    "surat_jalan",
    "sjpod",
    "sj_pod",
    "deliverynote",
    "delivery_note",
    "pod",
  ].map(normalizeDocHint);

  // Kumpulkan kandidat dari berbagai kemungkinan struktur payload
  const candidates: Array<{ raw: unknown; strong: boolean }> = [];

  // 1) Field langsung yang biasanya menyimpan lampiran Surat Jalan / POD
  for (const [k, v] of Object.entries(data)) {
    const nk = normalizeDocHint(k);
    const strong = keyHints.some((h) => nk.includes(h));
    if (!strong) continue;

    if (Array.isArray(v)) {
      for (const it of v) candidates.push({ raw: it, strong: true });
      continue;
    }
    if (isPlainObject(v)) {
      const att = (v as Record<string, unknown>).attachments;
      if (Array.isArray(att)) {
        for (const it of att) candidates.push({ raw: it, strong: true });
      } else {
        candidates.push({ raw: v, strong: true });
      }
    }
  }

  // 2) Container umum yang sering dipakai API untuk attachment group
  const commonContainers: unknown[] = [
    (data as Record<string, unknown>).document_attachment,
    (data as Record<string, unknown>).document_attachments,
    (data as Record<string, unknown>).shipping_document_attachment,
    (data as Record<string, unknown>).shipping_documents,
    (data as Record<string, unknown>).document_attachment_group,
  ];

  for (const c of commonContainers) {
    if (Array.isArray(c)) {
      for (const it of c) candidates.push({ raw: it, strong: false });
      continue;
    }
    if (
      isPlainObject(c) &&
      Array.isArray((c as Record<string, unknown>).attachments)
    ) {
      for (const it of (c as { attachments: unknown[] }).attachments)
        candidates.push({ raw: it, strong: false });
    }
  }

  // 3) Terkadang tersimpan di level route
  const routes = safeArray<Record<string, unknown>>(
    (data as Record<string, unknown>).route_ids
  );
  for (const r of routes) {
    if (!isPlainObject(r)) continue;
    const maybe =
      (r as Record<string, unknown>).document_attachment ??
      (r as Record<string, unknown>).attachments ??
      (r as Record<string, unknown>).shipping_documents;
    if (Array.isArray(maybe)) {
      for (const it of maybe) candidates.push({ raw: it, strong: false });
    } else if (
      isPlainObject(maybe) &&
      Array.isArray((maybe as Record<string, unknown>).attachments)
    ) {
      for (const it of (maybe as { attachments: unknown[] }).attachments)
        candidates.push({ raw: it, strong: false });
    }
  }

  const out: DownloadableFile[] = [];
  const seen = new Set<string>();

  for (const { raw, strong } of candidates) {
    if (!isPlainObject(raw)) continue;
    const o = raw as Record<string, unknown>;

    // URL: bisa url langsung atau base64 (Odoo: datas)
    const url =
      resolveUrlMaybe(
        pickString(
          o.url,
          o.download_url,
          o.file_url,
          o.public_url,
          o.attachment_url
        )
      ) ||
      ((): string => {
        const datas = pickString(o.datas, o.data, o.base64, o.content_base64);
        if (!datas) return "";
        if (datas.startsWith("data:")) return datas;
        const mime =
          pickString(o.mimetype, o.mime_type, o.content_type) ||
          "application/octet-stream";
        return `data:${mime};base64,${datas}`;
      })();

    if (!url) continue;

    const name =
      pickString(
        o.name,
        o.filename,
        o.file_name,
        o.display_name,
        o.original_name
      ) || `File_${String(o.id ?? "") || String(out.length + 1)}`;

    const docType = normalizeDocHint(
      o.doc_type ?? o.document_type ?? o.type ?? o.category ?? o.tag
    );
    const nameKey = normalizeDocHint(name);

    const looksLikeSuratJalan =
      strong ||
      (docType
        ? keyHints.some((h) => docType.includes(h))
        : keyHints.some((h) => nameKey.includes(h)));

    if (!looksLikeSuratJalan) continue;

    const id = (o.id as string | number | undefined) ?? undefined;
    const size =
      (typeof o.file_size === "number" ? o.file_size : undefined) ??
      (typeof o.size === "number" ? o.size : undefined);
    const createdAt = pickString(o.create_date, o.created_at, o.date);

    const k = `${String(id ?? "")}|${url}`;
    if (seen.has(k)) continue;
    seen.add(k);

    out.push({ id, name, url, size, createdAt });
  }

  return out;
}

function prefillFromInitial(
  data: NonNullable<OrdersCreateFormProps["initialData"]>,
  userTz: string = "Asia/Jakarta"
) {
  const tz = userTz;
  // claim_ids_count?: number | null | 0; // ini untuk Transporter
  // reviewed_claim_ids_count? : number | null | 0; // ini untuk Shipper

  let claimCount = 0;
  if ("claim_ids_count" in data) {
    const v = (data as { claim_ids_count?: unknown }).claim_ids_count;
    if (typeof v === "number") {
      claimCount = v;
    } else if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) claimCount = n;
    }
  }

  const form = {
    driver_partner: toRecordItem(data.driver_partner),
    fleet_vehicle: toRecordItem(data.fleet_vehicle),
    states: data.tms_states ? extractApiSteps(data) : ([] as StatusStep[]),
    noJo: data.name ?? "",
    customer: (data.partner as PartnerItem)?.name ?? "",
    namaPenerima: data.receipt_by ?? "",
    jenisOrder:
      data.order_type ??
      (data.order_type_id
        ? ({ id: data.order_type_id } as OrderTypeItem)
        : null),
    armada:
      data.moda ?? (data.moda_id ? ({ id: data.moda_id } as ModaItem) : null),
    kotaMuat:
      data.origin_city ??
      (data.origin_city_id ? ({ id: data.origin_city_id } as CityItem) : null),
    kotaBongkar:
      data.dest_city ??
      (data.dest_city_id ? ({ id: data.dest_city_id } as CityItem) : null),
    tglMuat: odooUtcToDatetimeLocalValue(data.pickup_date_planne, tz, "08:00"),
    tglBongkar: odooUtcToDatetimeLocalValue(data.drop_off_date_planne, tz, "17:00"),
    lokMuat: null as AddressItem | null,
    lokBongkar: null as AddressItem | null,

    origin_address_name: "",
    origin_street: "",
    origin_street2: "",
    origin_district_name: "",
    origin_zip: "",
    origin_latitude: "",
    origin_longitude: "",
    dest_address_name: "",
    dest_street: "",
    dest_street2: "",
    dest_district_name: "",
    dest_zip: "",
    dest_latitude: "",
    dest_longitude: "",
    delivery_note_uri: "",

    muatanNama: data.cargo_name ?? "",
    muatanDeskripsi: data.cargo_description ?? "",
    jenisMuatan:
      data.cargo_type ??
      (data.cargo_type_id ? ({ id: data.cargo_type_id } as RecordItem) : null),

    cargoCBM: data.cargo_cbm,
    cargoQTY: data.cargo_qty,
    cargo_type_id: data.cargo_type_id,
    cargo_type: data.cargo_type,

    requirement_helmet: Boolean(data.requirement_helmet),
    requirement_apar: Boolean(data.requirement_apar),
    requirement_safety_shoes: Boolean(data.requirement_safety_shoes),
    requirement_vest: Boolean(data.requirement_vest),
    requirement_glasses: Boolean(data.requirement_glasses),
    requirement_gloves: Boolean(data.requirement_gloves),
    requirement_face_mask: Boolean(data.requirement_face_mask),
    requirement_tarpaulin: Boolean(data.requirement_tarpaulin),
    requirement_other: data.requirement_other ?? "",
    amount_shipping: data.amount_shipping ?? "",
    amount_shipping_multi_charge: data.amount_shipping_multi_charge ?? "",
    amount_tax: data.amount_tax ?? "",
    amount_total: data.amount_total ?? "",
    picMuatNama: "",
    picMuatTelepon: "",
    picBongkarNama: "",
    picBongkarTelepon: "",
    extraStops: [] as ExtraStop[],
    isReadOnly: false,
    claim_ids_count: claimCount,
    res_id: data.res_id,
    res_model: data.res_model,
    original_res_id: data.original_res_id,
    original_res_model: data.original_res_model,
  };

  const routes: RouteItem[] = Array.isArray(data.route_ids)
    ? (data.route_ids as RouteItem[])
    : ([] as RouteItem[]);

  function addrFromRoute(
    r: RouteItem | undefined,
    which: "origin" | "dest"
  ): AddressItem | null {
    if (!r) return null;
    const obj = which === "origin" ? r.origin_address : r.dest_address;
    if (obj && (obj as AddressItem).id) return obj as AddressItem;
    const id = which === "origin" ? r.origin_address_id : r.dest_address_id;
    return id ? ({ id } as AddressItem) : null;
  }
  const main = routes.find((r) => r.is_main_route);

  form.tglMuat = odooUtcToDatetimeLocalValue(main?.etd_date ?? null, tz) || form.tglMuat;
  form.tglBongkar = odooUtcToDatetimeLocalValue(main?.eta_date ?? null, tz) || form.tglBongkar;
  form.lokMuat = addrFromRoute(main, "origin");
  form.lokBongkar = addrFromRoute(main, "dest");
  form.picMuatNama = main?.origin_pic_name ?? "";
  form.picMuatTelepon = main?.origin_pic_phone ?? "";
  form.picBongkarNama = main?.dest_pic_name ?? "";
  form.picBongkarTelepon = main?.dest_pic_phone ?? "";

  form.origin_address_name = main?.origin_address_name ?? "";
  form.origin_street = main?.origin_street ?? "";
  form.origin_street2 = main?.origin_street2 ?? "";
  form.origin_district_name = main?.origin_district.name ?? "";
  form.origin_zip = main?.origin_zip ?? "";
  form.origin_latitude = main?.origin_latitude ?? "";
  form.origin_longitude = main?.origin_longitude ?? "";

  form.dest_address_name = main?.dest_address_name ?? "";
  form.dest_street = main?.dest_street ?? "";
  form.dest_street2 = main?.dest_street2 ?? "";
  form.dest_district_name = main?.dest_district.name ?? "";
  form.dest_zip = main?.dest_zip ?? "";
  form.dest_latitude = main?.dest_latitude ?? main?.dest_latitude ?? "";
  form.dest_longitude = main?.dest_longitude ?? "";
  form.delivery_note_uri = main?.delivery_note_uri ?? "";

  if (!form.lokMuat)
    form.lokMuat = (data.origin_address as AddressItem) ?? null;
  if (!form.lokBongkar)
    form.lokBongkar = (data.dest_address as AddressItem) ?? null;

  form.amount_shipping = data.amount_shipping ?? "";
  form.amount_shipping_multi_charge = data.amount_shipping_multi_charge ?? "";
  form.amount_tax = data.amount_tax ?? "";
  form.amount_total = data.amount_total ?? "";

  const extras: RouteItem[] = routes.filter((r) => !r.is_main_route);
  form.extraStops = extras.map(
    (r): ExtraStop => ({
      id: r.id,
      lokMuat: addrFromRoute(r, "origin"),
      lokBongkar: addrFromRoute(r, "dest"),
      originPicName: r.origin_pic_name ?? "",
      originPicPhone: r.origin_pic_phone ?? "",
      destPicName: r.dest_pic_name ?? "",
      destPicPhone: r.dest_pic_phone ?? "",
      // tglETDMuat: odooUtcToDatetimeLocalValue(r.etd_date ?? r.pickup_date_planne ?? null, tz, "08:00") || "",
      // tglETABongkar: odooUtcToDatetimeLocalValue(r.eta_date ?? r.drop_off_date_planne ?? null, tz, "17:00") || "",
      tglETDMuat: odooUtcToDatetimeLocalValue(r.etd_date ?? null, tz, "08:00") || "",
      tglETABongkar: odooUtcToDatetimeLocalValue(r.eta_date  ?? null, tz, "17:00") || "",
      originAddressName: r.origin_address_name ?? "",
      originStreet: r.origin_street ?? "",
      originStreet2: r.origin_street2 ?? "",
      originDistrictName: r.origin_district.name ?? "",
      originZipCode: r.origin_zip ?? "",
      originLatitude: r.origin_latitude ?? "",
      originLongitude: r.origin_longitude ?? "",

      destAddressName: r.dest_address_name ?? "",
      destStreet: r.dest_street ?? "",
      destStreet2: r.dest_street2 ?? "",
      destDistrictName: r.dest_district.name ?? "",
      destZipCode: r.dest_zip ?? "",
      destLatitude: r.dest_latitude ?? "",
      destLongitude: r.dest_longitude ?? "",
      delivery_note_uri: r.delivery_note_uri ?? "",
    })
  );

  console.log("Prefill form:", form);
  console.log("Prefill extraStops:", form.extraStops);
  
  const current = data.states?.find((s) => s.is_current);
  form.isReadOnly = current
    ? !["draft", "pending"].includes(current.key)
    : false;
  return form;
}

// export default function PurchaseOrderForm({
//   mode = "edit",
//   orderId,
//   initialData,
//   onSuccess,
// }: OrdersCreateFormProps) {
export default function PurchaseOrderForm<T extends TmsUserType>({
  mode = "edit",
  orderId,
  initialData,
  onSuccess,
  userType,
}: RoleOrderProps<T> & { userType: T }) {
  const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!;
  const CHATTERS_ENDPOINT_BASE = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL!;
  const AUTOSET_STATUSES = new Set(["pickup", "delivery", "received"]);
  const AUTOSET_TMS_STATE_FOR_BTNCLAIM = new Set([
    "accept",
    "preparation",
    "pickup",
    "delivery",
    "received",
  ]);
  const { profile } = useAuth();
  // const profileTimezone = (profile as any)?.tz || "Asia/Jakarta";
  const currentProfileName = useMemo(() => {
      if (profile) return profile.name;
      return undefined;
    }, [profile]);

  console.log("Current Profile Name:", currentProfileName);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const qsId = searchParams?.get("id") ?? null;
  const effectiveOrderId = useMemo<string | number | undefined>(() => {
    return orderId ?? qsId ?? undefined;
  }, [orderId, qsId]);
  const { hasChatImpulse, setHasChatImpulse } = useChatImpulseChannel();
  const [noJO, setNoJO] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [namaPenerima, setNamaPenerima] = useState<string>("");
  const [kotaMuat, setKotaMuat] = useState<CityItem | null>(null);
  const [kotaBongkar, setKotaBongkar] = useState<CityItem | null>(null);
  const [jenisOrder, setJenisOrder] = useState<OrderTypeItem | null>(null);
  const [armada, setArmada] = useState<ModaItem | null>(null);
  const [tglMuat, setTglMuat] = useState<string>("");
  const [tglBongkar, setTglBongkar] = useState<string>("");
  const [lokMuat, setLokMuat] = useState<AddressItem | null>(null);
  const [lokBongkar, setLokBongkar] = useState<AddressItem | null>(null);
  const [originAddressName, setOriginAddressName] = useState<string>("");
  const [originStreet, setOriginStreet] = useState<string>("");
  const [originStreet2, setOriginStreet2] = useState<string>("");
  const [originDistrictName, setOriginDistrictName] = useState<string>("");
  const [originZipCode, setOriginZipCode] = useState<string>("");
  const [originLatitude, setOriginLatitude] = useState<string>("");
  const [originLongitude, setOriginLongitude] = useState<string>("");
  const [destAddressName, setDestAddressName] = useState<string>("");
  const [destStreet, setDestStreet] = useState<string>("");
  const [destStreet2, setDestStreet2] = useState<string>("");
  const [destDistrictName, setDestDistrictName] = useState<string>("");
  const [destZipCode, setDestZipCode] = useState<string>("");
  const [destLatitude, setDestLatitude] = useState<string>("");
  const [destLongitude, setDestLongitude] = useState<string>("");
  const [deliveryNoteUri, setSetDeliveryNoteUri] = useState<string>("");
  const [picMuatNama, setPicMuatNama] = useState<string>("");
  const [picMuatTelepon, setPicMuatTelepon] = useState<string>("");
  const [picBongkarNama, setPicBongkarNama] = useState<string>("");
  const [picBongkarTelepon, setPicBongkarTelepon] = useState<string>("");
  const [multiPickupDrop, setMultiPickupDrop] = useState<boolean>(false);
  const [claimIdsCount, setClaimIdsCount] = useState<number>(0);
  const [extraStops, setExtraStops] = useState<ExtraStopWithId[]>(() =>
    (
      [
        {
          lokMuat: null,
          lokBongkar: null,
          originPicName: "",
          originPicPhone: "",
          destPicName: "",
          destPicPhone: "",
          tglETDMuat: "",
          tglETABongkar: "",
          originAddressName: "",
          originStreet: "",
          originStreet2: "",
          originDistrictName: "",
          originZipCode: "",
          originLatitude: "",
          originLongitude: "",
          destAddressName: "",
          destStreet: "",
          destStreet2: "",
          destDistrictName: "",
          destZipCode: "",
          destLatitude: "",
          destLongitude: "",
          delivery_note_uri: "",
        },
        {
          lokMuat: null,
          lokBongkar: null,
          originPicName: "",
          originPicPhone: "",
          destPicName: "",
          destPicPhone: "",
          tglETDMuat: "",
          tglETABongkar: "",
          originAddressName: "",
          originStreet: "",
          originStreet2: "",
          originDistrictName: "",
          originZipCode: "",
          originLatitude: "",
          originLongitude: "",
          destAddressName: "",
          destStreet: "",
          destStreet2: "",
          destDistrictName: "",
          destZipCode: "",
          destLatitude: "",
          destLongitude: "",
          delivery_note_uri: "",
        },
      ] as ExtraStop[]
    ).map((s) => ({ ...s, uid: genUid() }))
  );
  const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
  const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);
  const [sjPodDownloads, setSjPodDownloads] = useState<DownloadableFile[]>([]);

  const [biayaKirimLabel, setAmountShipping] = useState<number | string>();
  const [biayaLayananTambahanLabel, setAmountShippingMultiCharge] = useState<
    number | string
  >("");
  const [taxLabel, setAmountTax] = useState<number | string>("");
  const [totalHargaLabel, setAmountTotal] = useState<number | string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstErrorRef = useRef<HTMLDivElement | null>(null);
  const extraRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [statusCurrent, setStatusCurrent] = useState<string | undefined>("");
  const [steps, setSteps] = useState<StatusStep[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(
    mode === "edit" && !initialData ? true : false
  );
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  /** ===== NEW: Dialog state & helpers ===== */
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");
  function openSuccessDialog(message?: string) {
    setDlgKind("success");
    setDlgTitle(t("common.saved") ?? "Berhasil disimpan");
    setDlgMsg(message ?? t("common.saved_desc") ?? "Data berhasil disimpan.");
    setDlgOpen(true);
  }
  function openErrorDialog(err: unknown, title?: string) {
    const msg =
      (typeof err === "object" &&
        err !== null &&
        // @ts-expect-error best-effort
        (err.detail?.[0]?.msg || err.message || err.error)) ||
      String(err);
    setDlgKind("error");
    setDlgTitle(title || (t("common.failed_save") ?? "Gagal menyimpan"));
    setDlgMsg(
      <pre className="whitespace-pre-wrap text-xs text-red-700">{msg}</pre>
    );
    setDlgOpen(true);
  }

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = React.useTransition();

  const canShowClaims = mode === "edit";
  const canShowListClaims = claimIdsCount > 0;

  const [claimsModalOpen, setClaimsModalOpen] = useState(false);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const fetchClaims = async () => {
    if (!effectiveOrderId) return;

    setClaimsLoading(true);
    try {
      const claimsData = await fetchOrderClaims_T(effectiveOrderId);
      setClaims(claimsData.items);
    } catch (error) {
      console.error("Failed to fetch claims:", error);
      openErrorDialog(error, "Failed to load claims");
    } finally {
      setClaimsLoading(false);
    }
  };

  function onHandleShowClaimListButton() {
    setClaimsModalOpen(true);
    fetchClaims();
  }

  function onHandleClaimButton() {
    localStorage.removeItem("order-id");
    localStorage.setItem("order-id", String(effectiveOrderId));
    console.log(localStorage);
    router.push("/claims/create/");
  }

  const hydrateFromPrefill = React.useCallback(
    (f: ReturnType<typeof prefillFromInitial>) => {
      setNamaPenerima(f.namaPenerima);
      setJenisOrder(f.jenisOrder);
      setArmada(f.armada);
      setKotaMuat(f.kotaMuat);
      setKotaBongkar(f.kotaBongkar);
      setTglMuat(f.tglMuat);
      setTglBongkar(f.tglBongkar);
      setLokMuat(f.lokMuat);
      setLokBongkar(f.lokBongkar);
      setPicMuatNama(f.picMuatNama);
      setPicMuatTelepon(f.picMuatTelepon);
      setPicBongkarNama(f.picBongkarNama);
      setPicBongkarTelepon(f.picBongkarTelepon);

      setOriginAddressName(f.origin_address_name);
      setOriginStreet(f.origin_street);
      setOriginStreet2(f.origin_street2);
      setOriginDistrictName(f.origin_district_name);
      setOriginZipCode(f.origin_zip);
      setOriginLatitude(f.origin_latitude);
      setOriginLongitude(f.origin_longitude);

      setDestAddressName(f.dest_address_name);
      setDestStreet(f.dest_street);
      setDestStreet2(f.dest_street2);
      setDestDistrictName(f.dest_district_name);
      setDestZipCode(f.dest_zip);
      setDestLatitude(f.dest_latitude);
      setDestLongitude(f.dest_longitude);

      setSetDeliveryNoteUri(f.delivery_note_uri);

      setMuatanNama(f.muatanNama);
      setMuatanDeskripsi(f.muatanDeskripsi);
      setJenisMuatan(f.cargo_type ?? null);
      setCargoCBMText(format2comma(f.cargoCBM));
      setJumlahMuatanText(format2comma(f.cargoQTY));

      setCustomer(f.customer);
      setNoJO(f.noJo);

      setLayananLainnya(f.requirement_other);
      setLayananKhusus((ls) => ({
        ...ls,
        Helm: f.requirement_helmet,
        APAR: f.requirement_apar,
        "Safety Shoes": f.requirement_safety_shoes,
        Rompi: f.requirement_vest,
        "Kaca mata": f.requirement_glasses,
        "Sarung tangan": f.requirement_gloves,
        Masker: f.requirement_face_mask,
        Terpal: f.requirement_tarpaulin,
      }));

      setAmountShipping(f.amount_shipping);
      setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
      setAmountTax(f.amount_tax);
      setAmountTotal(f.amount_total);

      if (f.extraStops.length > 0) {
        setMultiPickupDrop(true);
        setExtraStops(withUid(f.extraStops));
      } else {
        setMultiPickupDrop(false);
      }

      setVehicles(toRecordItem(f.fleet_vehicle));
      setDrivers(toRecordItem(f.driver_partner));
      setFleet(toRecordItem(f.fleet_vehicle));
      setDriver(toRecordItem(f.driver_partner));

      setSteps(f.states);
      setStatusCurrent(f.states.find((s) => s.is_current)?.key);
      setIsReadOnly(f.isReadOnly);
    },
    []
  );

  const softReloadDetail = React.useCallback(async () => {
    if (!DETAIL_URL_TPL || !effectiveOrderId) return;
    setIsRefreshing(true);
    try {
      const url = buildDetailUrl(DETAIL_URL_TPL, effectiveOrderId);
      const res = await fetch(url, {
        headers: { "Accept-Language": getLang() },
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as OrdersCreateFormProps["initialData"];
      if (!json) return;
      const f = prefillFromInitial(json);
      setSjPodDownloads(extractSuratJalanDownloads(json));
      startTransition(() => {
        hydrateFromPrefill(f);
      });
    } catch (e) {
      console.error("[PurchaseOrder] soft reload failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [DETAIL_URL_TPL, effectiveOrderId, router.replace, hydrateFromPrefill]);

  async function onHandleStartToPrepare() {
    if (!effectiveOrderId) {
      openErrorDialog(
        "ID Purchase Order tidak ditemukan.",
        "Data tidak lengkap"
      );
      return;
    }
    try {
      setAcceptLoading(true);
      const url = buildPOrderActionUrl(effectiveOrderId, "preparation");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getLang(),
        },
        credentials: "include",
      });
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setIsReadOnly(true);
      onSuccess?.();
      // router.refresh?.();
      await softReloadDetail();
      openSuccessDialog();
    } catch (e) {
      console.error("[PurchaseOrder] accept error:", e);
      openErrorDialog(e);
    } finally {
      setAcceptLoading(false);
    }
  }
  async function onHandleSelectFleetNDriver() {
    if (!effectiveOrderId) {
      openErrorDialog(
        "ID Purchase Order tidak ditemukan.",
        "Data tidak lengkap"
      );
      return;
    }
    try {
      setAcceptLoading(true);
      const url = buildPOrderActionUrl(effectiveOrderId, "fleet-and-driver");
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          fleet_vehicle_id: Number(vehicles?.id) || vehicles?.id,
          driver_partner_id: Number(drivers?.id) || drivers?.id,
        }),
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getLang(),
        },
        credentials: "include",
      });
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setIsReadOnly(true);
      onSuccess?.();
      // router.refresh?.();
      await softReloadDetail();
      openSuccessDialog();
    } catch (e) {
      console.error("[PurchaseOrder] accept error:", e);
      openErrorDialog(e);
    } finally {
      setAcceptLoading(false);
    }
  }
  async function handleAccept() {
    if (!effectiveOrderId) {
      openErrorDialog(
        "ID Purchase Order tidak ditemukan.",
        "Data tidak lengkap"
      );
      return;
    }
    try {
      setAcceptLoading(true);
      const url = buildPOrderActionUrl(effectiveOrderId, "accept");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getLang(),
        },
        credentials: "include",
      });
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setIsReadOnly(true);
      onSuccess?.();
      // router.refresh?.();
      await softReloadDetail();
      openSuccessDialog();
    } catch (e) {
      console.error("[PurchaseOrder] accept error:", e);
      openErrorDialog(e);
    } finally {
      setAcceptLoading(false);
    }
  }
  async function handleReject() {
    if (!effectiveOrderId) {
      openErrorDialog(
        "ID Purchase Order tidak ditemukan.",
        "Data tidak lengkap"
      );
      return;
    }
    const r = reason.trim();
    if (!r) {
      openErrorDialog("Mohon isi alasan penolakan.", "Validasi");
      return;
    }
    try {
      setRejectLoading(true);
      const url = buildPOrderActionUrl(effectiveOrderId, "reject");
      console.log(JSON.stringify({ tms_reject_reason: r }));

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getLang(),
        },
        credentials: "include",
        body: JSON.stringify({ tms_reject_reason: r }),
      });
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setReasonOpen(false);
      setReason("");
      setIsReadOnly(true);
      onSuccess?.();
      // router.refresh?.();
      await softReloadDetail();
      openSuccessDialog();
    } catch (e) {
      console.error("[PurchaseOrder] reject error:", e);
      openErrorDialog(e);
    } finally {
      setRejectLoading(false);
    }
  }

  const [chatterResModel, setChatterResModel] = useState<string>("");
  const [chatterResId, setChatterResId] = useState<string | number | undefined>(
    undefined
  );
  // const chatCtx = useMemo(() => {
  //   const fallbackId = effectiveOrderId ?? null;
  //   const d = initialData as unknown;

  //   if (!d || typeof d !== "object" || Array.isArray(d)) {
  //     return {
  //       resModel: null as string | null,
  //       resId: fallbackId as string | number | null,
  //     };
  //   }

  //   const o = d as Record<string, unknown>;
  //   const resModelRaw = o["res_model"] ?? o["resModel"];
  //   const resModel =
  //     typeof resModelRaw === "string" ? String(resModelRaw).trim() : null;

  //   const ridRaw = o["res_id"] ?? o["resId"] ?? o["id"];
  //   const rid =
  //     typeof ridRaw === "string" || typeof ridRaw === "number"
  //       ? (ridRaw as string | number)
  //       : (fallbackId as string | number | null);

  //   return {
  //     resModel: resModel && resModel.length ? resModel : null,
  //     resId: rid ?? null,
  //   };
  // }, [initialData, effectiveOrderId]);

  // const canShowChat =
  //   Boolean(chatCtx.resModel) &&
  //   chatCtx.resId != null &&
  //   String(chatCtx.resId).trim() !== "";

  const chatAnchorRef = useRef<HTMLDivElement | null>(null);

  const layananPreset = [
    "Helm",
    "APAR",
    "Safety Shoes",
    "Rompi",
    "Kaca mata",
    "Sarung tangan",
    "Masker",
    "Terpal",
  ] as const;
  type Layanan = (typeof layananPreset)[number];
  const [layananKhusus, setLayananKhusus] = useState<Record<Layanan, boolean>>(
    () =>
      Object.fromEntries(layananPreset.map((k) => [k, false])) as Record<
        Layanan,
        boolean
      >
  );
  const [layananLainnya, setLayananLainnya] = useState<string>("");
  const [muatanNama, setMuatanNama] = useState<string>("");
  const [muatanDeskripsi, setMuatanDeskripsi] = useState<string>("");
  const [jenisMuatan, setJenisMuatan] = useState<RecordItem | null>(null);
  const [cargoCBMText, setCargoCBMText] = useState<string>("");
  const [jumlahMuatanText, setJumlahMuatanText] = useState<string>("");
  const [urlCandidateFleet, setUrlCandidateFleet] = useState<string>("");
  const [urlCandidateDriver, setUrlCandidateDriver] = useState<string>("");
  const [vehicles, setVehicles] = useState<RecordItem | null>(null);
  const [drivers, setDrivers] = useState<RecordItem | null>(null);
  const [uVehicle, setFleet] = useState<RecordItem | null>(null);
  const [uDriver, setDriver] = useState<RecordItem | null>(null);
  const [fdOpen, setFdOpen] = useState(false);

  type KV = ReadonlyArray<readonly [label: string, value: string]>;
  const InfoGrid: React.FC<{ items: KV }> = ({ items }) => (
    <dl className="min-w-0 max-w-full overflow-hidden grid grid-cols-[auto,1fr] md:grid-cols-[auto,1fr,auto,1fr] gap-x-3 gap-y-1 text-sm">
      {items.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-gray-500 whitespace-nowrap pr-2">{label}</dt>
          <dd className="font-medium min-w-0 break-words whitespace-pre-wrap">
            {value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );

  type FdTab = "fleet" | "driver";
  const [fdTab, setFdTab] = useState<FdTab>("fleet");
  /** For Fleet and Driver Dialog */
  type JsonObject = Record<string, unknown>;
  const [fleetInfo, setFleetInfo] = useState<JsonObject | null>(null);
  const [driverInfo, setDriverInfo] = useState<JsonObject | null>(null);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [driverLoading, setDriverLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);
  const [driverError, setDriverError] = useState<string | null>(null);

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  const errorMessage = (e: unknown): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    if (isRecord(e) && typeof e.message === "string") return String(e.message);
    try {
      return JSON.stringify(e);
    } catch {
      return "Unknown error";
    }
  };

  const firstErrorKey = useMemo(() => {
    const order = ["namaPenerima", "lokBongkar"] as const;
    return order.find((k) => errors[k]);
  }, [errors]);

  useEffect(() => {
    if (!initialData) return;
    const f = prefillFromInitial(initialData);
    setSjPodDownloads(extractSuratJalanDownloads(initialData));

    setChatterResModel(
      typeof f.res_model === "string" ? f.res_model : String(f.res_model ?? "")
    );
    setChatterResId(
      typeof f.res_id === "string" || typeof f.res_id === "number"
        ? f.res_id
        : undefined
    );

    setNamaPenerima(f.namaPenerima);
    setJenisOrder(f.jenisOrder);
    setArmada(f.armada);
    setKotaMuat(f.kotaMuat);
    setKotaBongkar(f.kotaBongkar);
    setTglMuat(f.tglMuat);
    setTglBongkar(f.tglBongkar);
    setLokMuat(f.lokMuat);
    setLokBongkar(f.lokBongkar);
    setPicMuatNama(f.picMuatNama);
    setPicMuatTelepon(f.picMuatTelepon);
    setPicBongkarNama(f.picBongkarNama);
    setPicBongkarTelepon(f.picBongkarTelepon);
    setSetDeliveryNoteUri(f.delivery_note_uri);
    setMuatanNama(f.muatanNama);
    setMuatanDeskripsi(f.muatanDeskripsi);
    setJenisMuatan(f.cargo_type ?? null);
    setJenisOrder(f.jenisOrder);
    setArmada(f.armada);
    setCustomer(f.customer);
    setNoJO(f.noJo);
    setLayananLainnya(f.requirement_other);
    setLayananKhusus((ls) => ({
      ...ls,
      Helm: f.requirement_helmet,
      APAR: f.requirement_apar,
      "Safety Shoes": f.requirement_safety_shoes,
      Rompi: f.requirement_vest,
      "Kaca mata": f.requirement_glasses,
      "Sarung tangan": f.requirement_gloves,
      Masker: f.requirement_face_mask,
      Terpal: f.requirement_tarpaulin,
    }));
    setAmountShipping(f.amount_shipping);
    setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
    setAmountTax(f.amount_tax);
    setAmountTotal(f.amount_total);
    if (f.extraStops.length > 0) {
      setMultiPickupDrop(true);
      setExtraStops(withUid(f.extraStops));
    }

    setVehicles(f.fleet_vehicle);
    setDrivers(f.driver_partner);
    setFleet(f.fleet_vehicle);
    setDriver(f.driver_partner);

    if (userType === "transporter") {
      setClaimIdsCount(Number(f.claim_ids_count ?? 0));
    }

    setSteps(f.states);
    setStatusCurrent(f.states.find((s) => s.is_current)?.key);
    setLoadingDetail(false);
  }, [initialData, userType]);

  useEffect(() => {
    if (mode !== "edit" || initialData) return;
    if (!effectiveOrderId) {
      setLoadingDetail(false);
      return;
    }
    if (!DETAIL_URL_TPL) {
      setLoadingDetail(false);
      return;
    }
    const url = buildDetailUrl(DETAIL_URL_TPL, effectiveOrderId);
    const abort = new AbortController();
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await fetch(url, {
          headers: { "Accept-Language": getLang() },
          credentials: "include",
          signal: abort.signal,
        });
        if (res.status === 401) {
          goSignIn({ routerReplace: router.replace });
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as OrdersCreateFormProps["initialData"];
        if (json) {
          console.log("JSON DISINI: ", json);
          const f = prefillFromInitial(json);
          setSjPodDownloads(extractSuratJalanDownloads(json));
          console.log("f prefillFromInit: ", f);

          setFleet(f?.fleet_vehicle);
          setDriver(f?.driver_partner);

          setNamaPenerima(f.namaPenerima);
          setJenisOrder(f.jenisOrder);
          setArmada(f.armada);
          setKotaMuat(f.kotaMuat);
          setKotaBongkar(f.kotaBongkar);
          setTglMuat(f.tglMuat);
          setTglBongkar(f.tglBongkar);
          setLokMuat(f.lokMuat);
          setLokBongkar(f.lokBongkar);
          setPicMuatNama(f.picMuatNama);
          setPicMuatTelepon(f.picMuatTelepon);
          setPicBongkarNama(f.picBongkarNama);
          setPicBongkarTelepon(f.picBongkarTelepon);
          setOriginAddressName(f.origin_address_name);
          setOriginStreet(f.origin_street);
          setOriginStreet2(f.origin_street2);
          setOriginDistrictName(f.origin_district_name);
          setOriginZipCode(f.origin_zip);
          setOriginLatitude(f.origin_latitude);
          setOriginLongitude(f.origin_longitude);
          setCargoCBMText(format2comma(f.cargoCBM));
          setJumlahMuatanText(format2comma(f.cargoQTY));
          setDestAddressName(f.dest_address_name);
          setDestStreet(f.dest_street);
          setDestStreet2(f.dest_street2);
          setDestDistrictName(f.dest_district_name);
          setDestZipCode(f.dest_zip);
          setDestLatitude(f.dest_latitude);
          setDestLongitude(f.dest_longitude);
          setSetDeliveryNoteUri(f.delivery_note_uri);
          setMuatanNama(f.muatanNama);
          setMuatanDeskripsi(f.muatanDeskripsi);
          setJenisOrder(f.jenisOrder);
          setArmada(f.armada);
          setJenisMuatan(f.cargo_type ?? null);
          setCustomer(f.customer);
          setNoJO(f.noJo);
          setAmountShipping(f.amount_shipping);
          setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
          setAmountTax(f.amount_tax);
          setAmountTotal(f.amount_total);
          setLayananLainnya(f.requirement_other);

          setChatterResModel(
            typeof f.res_model === "string"
              ? f.res_model
              : String(f.res_model ?? "")
          );
          setChatterResId(
            typeof f.res_id === "string" || typeof f.res_id === "number"
              ? f.res_id
              : undefined
          );

          if (userType === "transporter") {
            setClaimIdsCount(Number(f?.claim_ids_count ?? 0));
          }

          setLayananKhusus((ls) => ({
            ...ls,
            Helm: f.requirement_helmet,
            APAR: f.requirement_apar,
            "Safety Shoes": f.requirement_safety_shoes,
            Rompi: f.requirement_vest,
            "Kaca mata": f.requirement_glasses,
            "Sarung tangan": f.requirement_gloves,
            Masker: f.requirement_face_mask,
            Terpal: f.requirement_tarpaulin,
          }));
          if (f.extraStops.length > 0) {
            setMultiPickupDrop(true);
            setExtraStops(withUid(f.extraStops));
          }
          setSteps(f.states);
          setStatusCurrent(f.states.find((s) => s.is_current)?.key);
          setIsReadOnly(f.isReadOnly);
        }
      } catch (err) {
        console.error("[OrderDetail] fetch error:", err);
      } finally {
        setLoadingDetail(false);
      }
    })();
    return () => abort.abort();
  }, [mode, effectiveOrderId, initialData, router.replace, userType]);

  // for candidate Fleet and Driver
  useEffect(() => {
    if (statusCurrent?.toLowerCase() === "preparation" && effectiveOrderId) {
      setUrlCandidateFleet(
        buildLookupUrlCandidate(effectiveOrderId, "candidate-fleets")
      );
      setUrlCandidateDriver(
        buildLookupUrlCandidate(effectiveOrderId, "candidate-drivers")
      );
    }
  }, [statusCurrent, effectiveOrderId]);

  useEffect(() => {
    const s = (statusCurrent ?? "").trim().toLowerCase();
    if (mode === "edit" && (AUTOSET_STATUSES.has(s) || s === "preparation")) {
      const d = toRecordItem(uDriver);
      const v = toRecordItem(uVehicle);
      if (d) setDrivers(d); // hanya set kalau valid
      if (v) setVehicles(v); // hanya set kalau valid
    }
  }, [mode, statusCurrent, uDriver, uVehicle]);

  function buildPOrderActionUrl(
    id: string | number,
    action: "accept" | "reject" | "preparation" | "fleet-and-driver"
  ): string {
    const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
    return `${base}/${action}`;
  }

  function buildLookupUrlCandidate(
    id: string | number,
    action: "candidate-fleets" | "candidate-drivers"
  ): string {
    const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
    return `${base}/${action}`;
  }

  function safeLabel(x: unknown, fallback: string) {
    const r = toRecordItem(x);
    if (!r) return fallback;
    const nm = String(r.name ?? "").trim();
    if (nm && nm.toLowerCase() !== "false") return nm;
    return r.id ? `${fallback} #${r.id}` : fallback;
  }

  // Primitive guard
  const isPrimitive = (v: unknown): v is string | number | boolean =>
    typeof v === "string" || typeof v === "number" || typeof v === "boolean";
  const fmtValue = (v: unknown): string => {
    if (v === null || v === undefined) return "-";
    if (isPrimitive(v)) {
      if (typeof v === "boolean") return v ? "Ya" : "Tidak";
      const s = String(v).trim();
      return s.length ? s : "-";
    }
    if (Array.isArray(v)) {
      const parts = v.map(fmtValue).filter((s) => s !== "-");
      return parts.length ? parts.join(", ") : "-";
    }
    if (isRecord(v)) {
      // Urutan kunci yang umum dipakai oleh API (ambil yang pertama tersedia)
      const keyOrder = [
        "display_name",
        "name",
        "label",
        "full_name",
        "model",
        "type",
        "description",
        "value",
        "code",
        "license_plate",
        "plate",
        "plate_no",
        "nopol",
        "id",
      ] as const;
      for (const k of keyOrder) {
        if (k in v) {
          const s = fmtValue((v as Record<string, unknown>)[k]);
          if (s !== "-") return s;
        }
      }
      // Fallback: gabungkan leaf primitives yang ada
      const acc: string[] = [];
      for (const [_, val] of Object.entries(v)) {
        const s = fmtValue(val);
        if (s !== "-") acc.push(s);
      }
      return acc.length ? acc.join(", ") : "-";
    }
    return "-";
  };

  function pick(
    obj: JsonObject | null | undefined,
    keys: string[],
    fallback = "-"
  ): string {
    for (const k of keys) {
      if (!obj) break;
      if (k in obj) {
        const s = fmtValue(obj[k]);
        if (s !== "-") return s;
      }
    }
    return fallback;
  }

  useEffect(() => {
    if (!fdOpen) return;
    const fId = Number(vehicles?.id);
    const dId = Number(drivers?.id);
    const fleetsTpl = process.env.NEXT_PUBLIC_TMS_FLEETS_URL || "";
    const driversTpl = process.env.NEXT_PUBLIC_TMS_DRIVERS_URL || "";
    const abort = new AbortController();

    (async () => {
      // Fleet
      if (fleetsTpl && Number.isFinite(fId) && fId > 0) {
        try {
          setFleetLoading(true);
          setFleetError(null);
          const res = await fetch(buildDetailUrl(fleetsTpl, fId), {
            credentials: "include",
            headers: { "Accept-Language": getLang() },
            signal: abort.signal,
          });
          if (!res.ok) throw new Error(await res.text());
          // setFleetInfo(await res.json());
          {
            const data: unknown = await res.json();
            setFleetInfo(isRecord(data) ? (data as JsonObject) : null);
          }
        } catch (e: unknown) {
          setFleetError(errorMessage(e));
          setFleetInfo(null);
        } finally {
          setFleetLoading(false);
        }
      } else {
        setFleetInfo(null);
        setFleetError(null);
      }

      // Driver
      if (driversTpl && Number.isFinite(dId) && dId > 0) {
        try {
          setDriverLoading(true);
          setDriverError(null);
          const res = await fetch(buildDetailUrl(driversTpl, dId), {
            credentials: "include",
            headers: { "Accept-Language": getLang() },
            signal: abort.signal,
          });
          if (!res.ok) throw new Error(await res.text());
          // setDriverInfo(await res.json());
          {
            const data: unknown = await res.json();
            setDriverInfo(isRecord(data) ? (data as JsonObject) : null);
          }
        } catch (e: unknown) {
          setDriverError(errorMessage(e));
          setDriverInfo(null);
        } finally {
          setDriverLoading(false);
        }
      } else {
        setDriverInfo(null);
        setDriverError(null);
      }
    })();

    return () => abort.abort();
  }, [fdOpen, vehicles?.id, drivers?.id]);

  console.log(statusCurrent);
  console.log("chatterResModel:", chatterResModel);
  console.log("chatterResId:", chatterResId);

  return (
    <div className="space-y-4 ">
      {steps.length > 0 && (
        <Card className="sticky top-14 z-30">
          <CardBody>
            <StatusDeliveryImage
              showTruck={false}
              steps={steps}
              width={1200}
              height={90}
            />
          </CardBody>
        </Card>
      )}
      <Card className="!border-0">
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* ===== Left Column ===== */}
            <div className="md:basis-2/3  min-w-0 space-y-4">
              <Card>
                <CardHeader>
                  <h4 className="text-3xl font-semibold text-gray-800">
                    {t("orders.create.info_order")}
                  </h4>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field.Root value={noJO || ""} onChange={() => {}} disabled>
                      <Field.Label>{t("orders.no_jo")}</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-full" />
                      </Field.Control>
                    </Field.Root>
                    <Field.Root
                      value={customer || ""}
                      onChange={() => {}}
                      disabled
                    >
                      <Field.Label>{t("orders.customer")}</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-full" />
                      </Field.Control>
                    </Field.Root>
                    <Field.Root
                      value={lokMuat?.name || ""}
                      onChange={() => {}}
                      disabled
                    >
                      <Field.Label>{t("orders.lokasi_muat")}</Field.Label>
                      <Field.Control>
                        <Field.Textarea
                          className="w-full"
                          rows={4}
                          readOnly={isReadOnly}
                        />
                      </Field.Control>
                    </Field.Root>
                    <Field.Root
                      value={lokBongkar?.name || ""}
                      onChange={() => {}}
                      disabled
                    >
                      <Field.Label>{t("orders.lokasi_bongkar")}</Field.Label>
                      <Field.Control>
                        <Field.Textarea
                          className="w-full"
                          rows={4}
                          readOnly={isReadOnly}
                        />
                      </Field.Control>
                    </Field.Root>

                    <Field.Root
                      value={armada?.name || ""}
                      onChange={() => {}}
                      disabled
                    >
                      <Field.Label>{t("orders.armada")}</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-full" />
                      </Field.Control>
                    </Field.Root>
                  </div>
                </CardBody>
              </Card>

              <LocationInfoCard
                isReadOnly={true}
                tglMuat={tglMuat}
                setTglMuat={setTglMuat}
                tglBongkar={tglBongkar}
                setTglBongkar={setTglBongkar}
                kotaMuat={kotaMuat}
                kotaBongkar={kotaBongkar}
                lokMuat={lokMuat}
                setLokMuat={setLokMuat}
                lokBongkar={lokBongkar}
                setLokBongkar={setLokBongkar}
                picMuatNama={picMuatNama}
                setPicMuatNama={setPicMuatNama}
                picMuatTelepon={picMuatTelepon}
                setPicMuatTelepon={setPicMuatTelepon}
                picBongkarNama={picBongkarNama}
                setPicBongkarNama={setPicBongkarNama}
                picBongkarTelepon={picBongkarTelepon}
                setPicBongkarTelepon={setPicBongkarTelepon}
                originAddressName={originAddressName}
                originStreet={originStreet}
                originStreet2={originStreet2}
                originDistrictName={originDistrictName}
                originZipCode={originZipCode}
                originLatitude={originLatitude}
                originLongitude={originLongitude}
                destAddressName={destAddressName}
                destStreet={destStreet}
                destStreet2={destStreet2}
                destDistrictName={destDistrictName}
                destZipCode={destZipCode}
                destLatitude={destLatitude}
                destLongitude={destLongitude}
                deliveryNoteUri={deliveryNoteUri}
                multiPickupDrop={multiPickupDrop}
                setMultiPickupDrop={setMultiPickupDrop}
                extraStops={extraStops}
                setExtraStops={setExtraStops}
                errors={errors}
                firstErrorKey={firstErrorKey}
                firstErrorRef={firstErrorRef}
                extraRefs={extraRefs}

              />

              <SpecialServicesCard
                isReadOnly={true}
                layananPreset={layananPreset}
                layananKhusus={layananKhusus}
                setLayananKhusus={setLayananKhusus}
                layananLainnya={layananLainnya}
                setLayananLainnya={setLayananLainnya}
              />
            </div>

            {/* ===== Right Column ===== */}
            <div className="md:basis-1/3  min-w-0 space-y-4">
              {statusCurrent?.toLowerCase() === "preparation" && (
                <Card className="bg-primary/60">
                  <CardHeader>
                    <h4 className="text-3xl font-semibold text-gray-800">
                      Fleet and Driver
                    </h4>
                  </CardHeader>
                  <CardBody>
                    {urlCandidateFleet && (
                      <LookupAutocomplete
                        label={"Fleet"}
                        placeholder={t("common.search_fleet")}
                        value={vehicles as RecordItem | null}
                        onChange={(v) => setVehicles(toRecordItem(v))}
                        endpoint={{
                          url: urlCandidateFleet,
                          method: "GET",
                          queryParam: "query",
                          pageParam: "page",
                          pageSizeParam: "page_size",
                          page: 1,
                          pageSize: 50,
                          mapResults: normalizeResults,
                        }}
                        cacheNamespace="fleet-candidate"
                        prefetchQuery=""
                      />
                    )}
                    {urlCandidateDriver && (
                      <LookupAutocomplete
                        label={"Driver"}
                        placeholder={t("common.search_driver")}
                        value={drivers as RecordItem | null}
                        onChange={(v) => setDrivers(toRecordItem(v))}
                        endpoint={{
                          url: urlCandidateDriver,
                          method: "GET",
                          queryParam: "query",
                          pageParam: "page",
                          pageSizeParam: "page_size",
                          page: 1,
                          pageSize: 50,
                          mapResults: normalizeResults,
                        }}
                        cacheNamespace="driver-candidate"
                        prefetchQuery=""
                      />
                    )}
                  </CardBody>
                  <CardFooter>
                    <Button
                      type="button"
                      variant="solid"
                      onClick={onHandleSelectFleetNDriver}
                      disabled={acceptLoading}
                    >
                      {acceptLoading ? "sending..." : "Submit"}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {mode === "edit" &&
                AUTOSET_STATUSES.has(
                  (statusCurrent ?? "").trim().toLowerCase()
                ) && (
                  <Card className="bg-primary/60">
                    <CardHeader>
                      <h4 className="text-3xl font-semibold text-gray-800">
                        Fleet and Driver
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <Field.Root
                        value={safeLabel(vehicles, "Fleet")}
                        onChange={() => {}}
                        disabled
                      >
                        <Field.Label>Fleet</Field.Label>
                        <Field.Input className="w-full"></Field.Input>
                      </Field.Root>
                      <Field.Root
                        value={safeLabel(drivers, "Driver")}
                        onChange={() => {}}
                        disabled
                      >
                        <Field.Label>Driver</Field.Label>
                        <Field.Input className="w-full"></Field.Input>
                      </Field.Root>
                    </CardBody>
                    <CardFooter>
                      <Button variant="ghost" onClick={() => setFdOpen(true)}>
                        Detail
                      </Button>
                    </CardFooter>
                  </Card>
                )}

              <Card>
                <CardHeader>
                  <h4 className="text-3xl font-semibold text-gray-800">
                    {t("orders.info_muatan")}
                  </h4>
                </CardHeader>
                <CardBody>
                  <Field.Root value={muatanNama} onChange={() => {}} disabled>
                    <Field.Label>{t("orders.muatan_nama")}</Field.Label>
                    <Field.Input className="w-full"></Field.Input>
                  </Field.Root>

                  <Field.Root value={cargoCBMText} onChange={() => {}} disabled>
                    <Field.Label>Dimensi CBM</Field.Label>
                    <Field.Input className="w-full"></Field.Input>
                  </Field.Root>

                  <Field.Root
                    value={jenisMuatan?.name ?? ""}
                    onChange={() => {}}
                    disabled
                  >
                    <Field.Label>{t("orders.jenis_cargo")}</Field.Label>
                    <Field.Input className="w-full"></Field.Input>
                  </Field.Root>

                  <Field.Root
                    value={jumlahMuatanText}
                    onChange={() => {}}
                    disabled
                  >
                    <Field.Label>Jumlah Muatan</Field.Label>
                    <Field.Input className="w-full"></Field.Input>
                  </Field.Root>

                  <Field.Root
                    value={muatanDeskripsi ?? ""}
                    onChange={() => {}}
                    disabled
                  >
                    <Field.Label>{t("orders.muatan_deskripsi")}</Field.Label>
                    <Field.Control>
                      <Field.Textarea
                        className="w-full"
                        rows={4}
                        readOnly={isReadOnly}
                      />
                    </Field.Control>
                  </Field.Root>
                </CardBody>
              </Card>

              <CostDetailsCard
                isShowNotes={false}
                biayaKirimLabel={biayaKirimLabel}
                biayaLayananTambahanLabel={biayaLayananTambahanLabel}
                taxLabel={taxLabel}
                totalHargaLabel={totalHargaLabel}
              />

              <ShippingDocumentsCard
                dokumenFiles={dokumenFiles}
                setDokumenFiles={setDokumenFiles}
                sjPodFiles={sjPodFiles}
                setSjPodFiles={setSjPodFiles}
              />

              {sjPodDownloads.length > 0 && (
                <Card className="border border-gray-200 bg-white">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xl font-semibold text-gray-800">
                        Surat Jalan (Existing)
                      </h4>
                      <span className="text-xs text-gray-500">
                        {sjPodDownloads.length} file
                      </span>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <ul className="space-y-2">
                      {sjPodDownloads.map((f) => (
                        <li
                          key={`${String(f.id ?? "")}|${f.url}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{f.name}</div>
                            {(f.size || f.createdAt) && (
                              <div className="text-xs text-gray-500">
                                {f.size ? fmtBytes(f.size) : ""}
                                {f.size && f.createdAt ? " • " : ""}
                                {f.createdAt ? f.createdAt : ""}
                              </div>
                            )}
                          </div>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-sm font-semibold text-primary hover:underline"
                          >
                            Download
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* === Bottom Action Bar === */}
            <div
              className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70"
              role="region"
              aria-label="Form actions"
            >
              <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-2">
                {/* LEFT: Chat / Broadcast */}
                <div className="flex items-center gap-2">
                  {(isRefreshing || isPending) && (
                    <span
                      className="text-xs text-gray-500 select-none"
                      aria-live="polite"
                    >
                      Updating…
                    </span>
                  )}

                  {/* {canShowChat && (
                    <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      chatAnchorRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                      setHasChatImpulse(false);
                    }}
                    className={`relative pr-8 ${
                      hasChatImpulse ? "motion-safe:animate-pulse" : ""
                    }`}
                    aria-label={
                      t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
                    }
                    title={
                      t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
                    }
                  >
                    {t("orders.chat_broadcast") ?? "Chat / Broadcast Message"}
                    {hasChatImpulse && (
                      <span className="pointer-events-none absolute right-2 top-2 inline-flex">
                        <span className="motion-safe:animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                      </span>
                    )}
                    </Button>
                  )} */}

                  {canShowClaims &&
                    AUTOSET_TMS_STATE_FOR_BTNCLAIM.has(
                      (statusCurrent ?? "").trim().toLowerCase()
                    ) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onHandleClaimButton}
                      >
                        Create Claim
                      </Button>
                    )}

                  {canShowListClaims && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onHandleShowClaimListButton}
                    >
                      {`Claims (${claimIdsCount})`}
                    </Button>
                  )}
                </div>

                {/* RIGHT: Reject & Accept */}
                {statusCurrent?.toLowerCase() === "rfq" && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setReasonOpen(true);
                      }}
                    >
                      {t("common.reject")}
                    </Button>

                    <Button
                      hidden={isReadOnly}
                      onClick={handleAccept}
                      disabled={acceptLoading}
                      variant="solid"
                    >
                      {acceptLoading
                        ? t("common.sending") ?? "Mengirim…"
                        : t("common.accept")}
                    </Button>
                  </div>
                )}
                {statusCurrent?.toLowerCase() === "accept" && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        onHandleStartToPrepare();
                      }}
                    >
                      Start to Preparation
                    </Button>
                  </div>
                )}
                {/* {statusCurrent?.toLowerCase() === "preparation" && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        onHandleStartToPrepare();
                      }}
                    >
                      Select Fleet and Driver
                    </Button>
                  </div>
                )} */}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {/* <div ref={chatAnchorRef} className="scroll-mt-24" /> */}
          {/* {canShowChat && ( */}
          <ChatterPanel
            resModel={chatterResModel}
            resId={chatterResId ?? null}
            endpointBase={CHATTERS_ENDPOINT_BASE}
            onRead={() => setHasChatImpulse(false)}
            className="w-full"
            currentAuthorName={currentProfileName}
          />
          {/* )} */}
        </CardBody>
      </Card>

      {/* === Reject Confirmation Dialog === */}
      <Modal open={reasonOpen} onClose={() => setReasonOpen(false)}>
        <div className="space-y-3 p-5">
          <h4 className="text-lg font-semibold text-gray-800"></h4>
          <Field.Root value={reason} onChange={setReason}>
            <Field.Label>Masukkan alasan Anda menolak</Field.Label>
            <Field.Textarea rows={5}></Field.Textarea>
            <Field.Error></Field.Error>
            <Field.Control></Field.Control>
          </Field.Root>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handleReject}
              disabled={rejectLoading || !reason.trim()}
            >
              {rejectLoading ? t("common.sending") ?? "Mengirim…" : "Ya"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setReasonOpen(false);
                setReason("");
              }}
            >
              Tidak
            </Button>
          </div>
        </div>
      </Modal>
      {/* === Fleet & Driver Detail Dialog (wide + responsive tabs) === */}
      <Modal open={fdOpen} onClose={() => setFdOpen(false)}>
        <div className="box-border w-full max-w-full sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-[1000px] max-h-[80vh] overflow-y-auto overflow-x-hidden p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 min-w-0">
            <h4 className="text-lg font-semibold text-gray-800 truncate">
              Fleet &amp; Driver
            </h4>
            {/* Segmented tabs hanya tampil di mobile; di desktop kita tampilkan 2 kolom */}
            <div className="md:hidden inline-flex shrink-0 rounded-lg border border-gray-200 p-1 bg-gray-50">
              <button
                type="button"
                onClick={() => setFdTab("fleet")}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  fdTab === "fleet"
                    ? "bg-white shadow font-semibold"
                    : "text-gray-600"
                }`}
              >
                Fleet
              </button>
              <button
                type="button"
                onClick={() => setFdTab("driver")}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  fdTab === "driver"
                    ? "bg-white shadow font-semibold"
                    : "text-gray-600"
                }`}
              >
                Driver
              </button>
            </div>
          </div>

          {/* Grid 2 kolom di desktop; di mobile tampilkan salah satu via tabs */}
          <div className="min-w-0 grid md:grid-cols-2 gap-6">
            {/* ===== Fleet panel ===== */}
            <section
              className={`${
                fdTab === "fleet" ? "" : "hidden md:block"
              } min-w-0`}
            >
              <div className="flex items-start gap-3 mb-2">
                <IconCar className="mt-0.5 h-7 w-7 text-gray-700 shrink-0" />
                <div className="min-w-0 max-w-full">
                  <div className="font-semibold text-gray-900">
                    {safeLabel(vehicles, "Fleet")}
                  </div>
                  <p className="text-xs text-gray-500">
                    Informasi unit kendaraan
                  </p>
                </div>
              </div>
              {fleetLoading ? (
                <div className="text-sm text-gray-500">
                  Memuat detail fleet…
                </div>
              ) : fleetError ? (
                <div className="text-sm text-red-600">
                  Gagal memuat detail fleet. {fleetError}
                </div>
              ) : Number(vehicles?.id) > 0 && fleetInfo ? (
                <InfoGrid
                  items={
                    [
                      [
                        "No. Polisi",
                        pick(fleetInfo, [
                          "license_plate",
                          "plate_no",
                          "nopol",
                          "plate",
                        ]),
                      ],
                      [
                        "Tipe / Model",
                        pick(fleetInfo, ["vehicle_type", "type", "model"]),
                      ],
                      ["Merek", pick(fleetInfo, ["brand", "merk", "make"])],
                      ["Tahun", pick(fleetInfo, ["year"])],
                      ["Warna", pick(fleetInfo, ["color"])],
                      [
                        "Kapasitas (kg)",
                        pick(fleetInfo, ["capacity_kg", "payload_kg"]),
                      ],
                      [
                        "Kapasitas (CBM)",
                        pick(fleetInfo, ["capacity_cbm", "cbm"]),
                      ],
                      ["Status", pick(fleetInfo, ["status", "state"])],
                    ] as const
                  }
                />
              ) : (
                <div className="text-sm text-gray-500">
                  Detail fleet tidak tersedia.
                </div>
              )}
            </section>

            {/* ===== Driver panel ===== */}
            <section
              className={`${
                fdTab === "driver" ? "" : "hidden md:block"
              } min-w-0`}
            >
              <div className="flex items-start gap-3 mb-2">
                <IconUser className="mt-0.5 h-7 w-7 text-gray-700 shrink-0" />
                <div className="min-w-0 max-w-full">
                  <div className="font-semibold text-gray-900">
                    {safeLabel(drivers, "Driver")}
                  </div>
                  <p className="text-xs text-gray-500">Informasi pengemudi</p>
                </div>
              </div>
              {driverLoading ? (
                <div className="text-sm text-gray-500">
                  Memuat detail driver…
                </div>
              ) : driverError ? (
                <div className="text-sm text-red-600">
                  Gagal memuat detail driver. {driverError}
                </div>
              ) : Number(drivers?.id) > 0 && driverInfo ? (
                <InfoGrid
                  items={
                    [
                      ["Nama", pick(driverInfo, ["name"])],
                      ["Mobile", pick(driverInfo, ["mobile", "phone"])],
                      ["Email", pick(driverInfo, ["email"])],
                      [
                        "No. SIM",
                        pick(driverInfo, [
                          "drivers_license",
                          "sim_no",
                          "license_no",
                        ]),
                      ],
                      [
                        "Masa Berlaku SIM",
                        pick(driverInfo, [
                          "drivers_license_expiry",
                          "sim_expiry",
                        ]),
                      ],
                      ["NIK/KTP", pick(driverInfo, ["no_ktp", "nik"])],
                      ["Status", pick(driverInfo, ["status", "state"])],
                      ["Tipe User", pick(driverInfo, ["tms_user_type"])],
                    ] as const
                  }
                />
              ) : (
                <div className="text-sm text-gray-500">
                  Detail driver tidak tersedia.
                </div>
              )}
            </section>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setFdOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      <ClaimListModal
        open={claimsModalOpen}
        onClose={() => setClaimsModalOpen(false)}
        claims={claims}
        loading={claimsLoading}
      />

      <ModalDialog
        open={dlgOpen}
        kind={dlgKind}
        title={dlgTitle}
        message={dlgMsg}
        onClose={() => setDlgOpen(false)}
      />
    </div>
  );
}

// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { ExtraStop } from "@/components/forms/orders/sections/ExtraStopCard";
// import { useEffect, useMemo, useRef, useState } from "react";
// import { StatusStep } from "@/types/status-delivery";
// import { RecordItem } from "@/types/recorditem";
// import {
//   AddressItem,
//   CityItem,
//   ModaItem,
//   OrdersCreateFormProps,
//   OrderTypeItem,
//   PartnerItem,
//   RoleOrderProps,
// } from "@/types/orders";
// import {
//   apiToLocalIsoMinute,
//   buildDetailUrl,
// } from "@/components/shared/Helper";
// import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
// import StatusDeliveryImage from "@/components/ui/DeliveryState";
// import { goSignIn } from "@/lib/goSignIn";
// import { getLang, t } from "@/lib/i18n";
// import SpecialServicesCard from "@/components/forms/orders/sections/SpecialServicesCard";
// import CostDetailsCard from "@/components/forms/orders/sections/CostDetailsCard";
// import ShippingDocumentsCard from "@/components/forms/orders/sections/ShippingDocumentsCard";
// import Button from "@/components/ui/Button";
// import ChatterPanel from "@/components/chat/ChatterPanel";
// import React from "react";
// import { Field } from "@/components/form/FieldInput";
// import LocationInfoCard from "@/components/forms/orders/sections/LocationInfoCard";
// import { Modal } from "@/components/forms/orders/OrdersCreateForm";
// import { format2comma } from "@/components/forms/orders/sections/CargoInfoCard";
// import LookupAutocomplete, {
//   normalizeResults,
// } from "@/components/form/LookupAutocomplete";
// import { IconCar, IconUser } from "@/components/icons/Icon";
// import { ModalDialog } from "@/components/ui/ModalDialog";
// import { TmsUserType } from "@/types/tms-profile";
// import { ClaimItem } from "@/types/claims";
// import { fetchOrderClaims_T } from "@/services/claimService";
// import { ClaimListModal } from "@/components/claims/ClaimListModal";
// import { useAuth } from "@/components/providers/AuthProvider";

// type ExtraStopWithId = ExtraStop & { uid: string };
// type ChatImpulseDetail = { active?: boolean; unread?: number };
// function useChatImpulseChannel(channel: string = "orders:chat-impulse") {
//   const [hasChatImpulse, setHasChatImpulse] = React.useState(false);
//   React.useEffect(() => {
//     if (typeof window === "undefined") return;

//     const handler = (e: Event) => {
//       const detail = (e as CustomEvent<ChatImpulseDetail>).detail;
//       const next = Boolean(detail?.active ?? (detail?.unread ?? 0) > 0);
//       setHasChatImpulse(next);
//     };

//     window.addEventListener(channel, handler as EventListener);
//     return () => window.removeEventListener(channel, handler as EventListener);
//   }, [channel]);

//   return { hasChatImpulse, setHasChatImpulse };
// }
// const genUid = (): string =>
//   typeof crypto !== "undefined" && "randomUUID" in crypto
//     ? crypto.randomUUID()
//     : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
// const withUid = (stops: ExtraStop[]): ExtraStopWithId[] =>
//   stops.map((s) => ({ ...s, uid: genUid() }));
// type RouteItem = NonNullable<
//   NonNullable<OrdersCreateFormProps["initialData"]>["route_ids"]
// >[number];
// function normalizeKey(s: unknown): string {
//   return String(s ?? "")
//     .toLowerCase()
//     .trim()
//     .replace(/[\s_-]+/g, "");
// }
// function extractApiSteps(
//   d: NonNullable<OrdersCreateFormProps["initialData"]>
// ): StatusStep[] {
//   const items = (d.tms_states ?? []) as StatusStep[];
//   return items.map((it): StatusStep => {
//     if (typeof it === "string") {
//       return { key: normalizeKey(it), label: it, is_current: false };
//     }
//     const key = normalizeKey(it.key ?? it.label);
//     const label = it.label ?? it.key ?? "";
//     return { key, label, is_current: Boolean(it.is_current) };
//   });
// }
// // --- RecordItem sanitizer & guard ---
// const isValidRecordItem = (v: unknown): v is RecordItem => {
//   if (!v || typeof v !== "object" || Array.isArray(v)) return false;
//   const o = v as Record<string, unknown>;
//   const id = Number(o.id);
//   const nameRaw = o.name;
//   const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
//   // valid jika punya name bukan "false" atau punya id > 0
//   if (name && name.toLowerCase() !== "false") return true;
//   return Number.isFinite(id) && id > 0;
// };

// const toRecordItem = (v: unknown): RecordItem | null => {
//   if (!isValidRecordItem(v)) return null;
//   const o = v as Record<string, unknown>;
//   const idNum = Number(o.id);
//   const nameRaw = typeof o.name === "string" ? o.name.trim() : "";
//   const fallbackName = String(
//     o.display_name ?? o.label ?? o.license_plate ?? o.plate_no ?? o.code ?? ""
//   );
//   const name =
//     nameRaw && nameRaw.toLowerCase() !== "false" ? nameRaw : fallbackName;

//   // cukup id & name saja agar aman
//   return {
//     id: Number.isFinite(idNum) && idNum > 0 ? idNum : (o.id as number),
//     name,
//   } as RecordItem;
// };

// function prefillFromInitial(
//   data: NonNullable<OrdersCreateFormProps["initialData"]>
// ) {
//   // claim_ids_count?: number | null | 0; // ini untuk Transporter
//   // reviewed_claim_ids_count? : number | null | 0; // ini untuk Shipper

//   let claimCount = 0;
//   if ("claim_ids_count" in data) {
//     const v = (data as { claim_ids_count?: unknown }).claim_ids_count;
//     if (typeof v === "number") {
//       claimCount = v;
//     } else if (typeof v === "string") {
//       const n = Number(v);
//       if (Number.isFinite(n)) claimCount = n;
//     }
//   }

//   const form = {
//     driver_partner: toRecordItem(data.driver_partner),
//     fleet_vehicle: toRecordItem(data.fleet_vehicle),
//     states: data.tms_states ? extractApiSteps(data) : ([] as StatusStep[]),
//     noJo: data.name ?? "",
//     customer: (data.partner as PartnerItem)?.name ?? "",
//     namaPenerima: data.receipt_by ?? "",
//     jenisOrder:
//       data.order_type ??
//       (data.order_type_id
//         ? ({ id: data.order_type_id } as OrderTypeItem)
//         : null),
//     armada:
//       data.moda ?? (data.moda_id ? ({ id: data.moda_id } as ModaItem) : null),
//     kotaMuat:
//       data.origin_city ??
//       (data.origin_city_id ? ({ id: data.origin_city_id } as CityItem) : null),
//     kotaBongkar:
//       data.dest_city ??
//       (data.dest_city_id ? ({ id: data.dest_city_id } as CityItem) : null),
//     tglMuat: apiToLocalIsoMinute(data.pickup_date_planne, "08:00"),
//     tglBongkar: apiToLocalIsoMinute(data.drop_off_date_planne, "08:00"),
//     lokMuat: null as AddressItem | null,
//     lokBongkar: null as AddressItem | null,

//     origin_address_name: "",
//     origin_street: "",
//     origin_street2: "",
//     origin_district_name: "",
//     origin_zip: "",
//     origin_latitude: "",
//     origin_longitude: "",
//     dest_address_name: "",
//     dest_street: "",
//     dest_street2: "",
//     dest_district_name: "",
//     dest_zip: "",
//     dest_latitude: "",
//     dest_longitude: "",

//     muatanNama: data.cargo_name ?? "",
//     muatanDeskripsi: data.cargo_description ?? "",
//     jenisMuatan:
//       data.cargo_type ??
//       (data.cargo_type_id ? ({ id: data.cargo_type_id } as RecordItem) : null),

//     cargoCBM: data.cargo_cbm,
//     cargoQTY: data.cargo_qty,
//     cargo_type_id: data.cargo_type_id,
//     cargo_type: data.cargo_type,

//     requirement_helmet: Boolean(data.requirement_helmet),
//     requirement_apar: Boolean(data.requirement_apar),
//     requirement_safety_shoes: Boolean(data.requirement_safety_shoes),
//     requirement_vest: Boolean(data.requirement_vest),
//     requirement_glasses: Boolean(data.requirement_glasses),
//     requirement_gloves: Boolean(data.requirement_gloves),
//     requirement_face_mask: Boolean(data.requirement_face_mask),
//     requirement_tarpaulin: Boolean(data.requirement_tarpaulin),
//     requirement_other: data.requirement_other ?? "",
//     amount_shipping: data.amount_shipping ?? "",
//     amount_shipping_multi_charge: data.amount_shipping_multi_charge ?? "",
//     amount_tax: data.amount_tax ?? "",
//     amount_total: data.amount_total ?? "",
//     picMuatNama: "",
//     picMuatTelepon: "",
//     picBongkarNama: "",
//     picBongkarTelepon: "",
//     extraStops: [] as ExtraStop[],
//     isReadOnly: false,
//     claim_ids_count: claimCount,
//     res_id: data.res_id,
//     res_model: data.res_model,
//     original_res_id: data.original_res_id,
//     original_res_model: data.original_res_model,
//   };

//   const routes: RouteItem[] = Array.isArray(data.route_ids)
//     ? (data.route_ids as RouteItem[])
//     : ([] as RouteItem[]);

//   function addrFromRoute(
//     r: RouteItem | undefined,
//     which: "origin" | "dest"
//   ): AddressItem | null {
//     if (!r) return null;
//     const obj = which === "origin" ? r.origin_address : r.dest_address;
//     if (obj && (obj as AddressItem).id) return obj as AddressItem;
//     const id = which === "origin" ? r.origin_address_id : r.dest_address_id;
//     return id ? ({ id } as AddressItem) : null;
//   }
//   const main = routes.find((r) => r.is_main_route);

//   form.tglMuat = apiToLocalIsoMinute(main?.etd_date) || form.tglMuat;
//   form.tglBongkar = apiToLocalIsoMinute(main?.eta_date) || form.tglBongkar;
//   form.lokMuat = addrFromRoute(main, "origin");
//   form.lokBongkar = addrFromRoute(main, "dest");
//   form.picMuatNama = main?.origin_pic_name ?? "";
//   form.picMuatTelepon = main?.origin_pic_phone ?? "";
//   form.picBongkarNama = main?.dest_pic_name ?? "";
//   form.picBongkarTelepon = main?.dest_pic_phone ?? "";

//   form.origin_address_name = main?.origin_address_name ?? "";
//   form.origin_street = main?.origin_street ?? "";
//   form.origin_street2 = main?.origin_street2 ?? "";
//   form.origin_district_name = main?.origin_district.name ?? "";
//   form.origin_zip = main?.origin_zip ?? "";
//   form.origin_latitude = main?.origin_latitude ?? "";
//   form.origin_longitude = main?.origin_longitude ?? "";

//   form.dest_address_name = main?.dest_address_name ?? "";
//   form.dest_street = main?.dest_street ?? "";
//   form.dest_street2 = main?.dest_street2 ?? "";
//   form.dest_district_name = main?.dest_district.name ?? "";
//   form.dest_zip = main?.dest_zip ?? "";
//   form.dest_latitude = main?.dest_latitude ?? main?.dest_latitude ?? "";
//   form.dest_longitude = main?.dest_longitude ?? "";

//   if (!form.lokMuat)
//     form.lokMuat = (data.origin_address as AddressItem) ?? null;
//   if (!form.lokBongkar)
//     form.lokBongkar = (data.dest_address as AddressItem) ?? null;

//   form.amount_shipping = data.amount_shipping ?? "";
//   form.amount_shipping_multi_charge = data.amount_shipping_multi_charge ?? "";
//   form.amount_tax = data.amount_tax ?? "";
//   form.amount_total = data.amount_total ?? "";

//   const extras: RouteItem[] = routes.filter((r) => !r.is_main_route);
//   form.extraStops = extras.map(
//     (r): ExtraStop => ({
//       id: r.id,
//       lokMuat: addrFromRoute(r, "origin"),
//       lokBongkar: addrFromRoute(r, "dest"),
//       originPicName: r.origin_pic_name ?? "",
//       originPicPhone: r.origin_pic_phone ?? "",
//       destPicName: r.dest_pic_name ?? "",
//       destPicPhone: r.dest_pic_phone ?? "",
//       tglETDMuat: apiToLocalIsoMinute(r.etd_date) ?? r.etd_date ?? "",
//       tglETABongkar: apiToLocalIsoMinute(r.eta_date) ?? r.eta_date ?? "",
//       originAddressName: r.origin_address_name ?? "",
//       originStreet: r.origin_street ?? "",
//       originStreet2: r.origin_street2 ?? "",
//       originDistrictName: r.origin_district.name ?? "",
//       originZipCode: r.origin_zip ?? "",
//       originLatitude: r.origin_latitude ?? "",
//       originLongitude: r.origin_longitude ?? "",

//       destAddressName: r.dest_address_name ?? "",
//       destStreet: r.dest_street ?? "",
//       destStreet2: r.dest_street2 ?? "",
//       destDistrictName: r.dest_district.name ?? "",
//       destZipCode: r.dest_zip ?? "",
//       destLatitude: r.dest_latitude ?? "",
//       destLongitude: r.dest_longitude ?? "",
//     })
//   );

//   const current = data.states?.find((s) => s.is_current);
//   form.isReadOnly = current
//     ? !["draft", "pending"].includes(current.key)
//     : false;
//   return form;
// }

// // export default function PurchaseOrderForm({
// //   mode = "edit",
// //   orderId,
// //   initialData,
// //   onSuccess,
// // }: OrdersCreateFormProps) {
// export default function PurchaseOrderForm<T extends TmsUserType>({
//   mode = "edit",
//   orderId,
//   initialData,
//   onSuccess,
//   userType,
// }: RoleOrderProps<T> & { userType: T }) {
//   const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!;
//   const CHATTERS_ENDPOINT_BASE = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL!;
//   const AUTOSET_STATUSES = new Set(["pickup", "delivery", "received"]);
//   const AUTOSET_TMS_STATE_FOR_BTNCLAIM = new Set([
//     "accept",
//     "preparation",
//     "pickup",
//     "delivery",
//     "received",
//   ]);
//   const { profile } = useAuth();
//   const currentProfileName = useMemo(() => {
//       if (profile) return profile.name;
//       return undefined;
//     }, [profile]);

//   console.log("Current Profile Name:", currentProfileName);
  
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const qsId = searchParams?.get("id") ?? null;
//   const effectiveOrderId = useMemo<string | number | undefined>(() => {
//     return orderId ?? qsId ?? undefined;
//   }, [orderId, qsId]);
//   const { hasChatImpulse, setHasChatImpulse } = useChatImpulseChannel();
//   const [noJO, setNoJO] = useState<string>("");
//   const [customer, setCustomer] = useState<string>("");
//   const [namaPenerima, setNamaPenerima] = useState<string>("");
//   const [kotaMuat, setKotaMuat] = useState<CityItem | null>(null);
//   const [kotaBongkar, setKotaBongkar] = useState<CityItem | null>(null);
//   const [jenisOrder, setJenisOrder] = useState<OrderTypeItem | null>(null);
//   const [armada, setArmada] = useState<ModaItem | null>(null);
//   const [tglMuat, setTglMuat] = useState<string>("");
//   const [tglBongkar, setTglBongkar] = useState<string>("");
//   const [lokMuat, setLokMuat] = useState<AddressItem | null>(null);
//   const [lokBongkar, setLokBongkar] = useState<AddressItem | null>(null);
//   const [originAddressName, setOriginAddressName] = useState<string>("");
//   const [originStreet, setOriginStreet] = useState<string>("");
//   const [originStreet2, setOriginStreet2] = useState<string>("");
//   const [originDistrictName, setOriginDistrictName] = useState<string>("");
//   const [originZipCode, setOriginZipCode] = useState<string>("");
//   const [originLatitude, setOriginLatitude] = useState<string>("");
//   const [originLongitude, setOriginLongitude] = useState<string>("");
//   const [destAddressName, setDestAddressName] = useState<string>("");
//   const [destStreet, setDestStreet] = useState<string>("");
//   const [destStreet2, setDestStreet2] = useState<string>("");
//   const [destDistrictName, setDestDistrictName] = useState<string>("");
//   const [destZipCode, setDestZipCode] = useState<string>("");
//   const [destLatitude, setDestLatitude] = useState<string>("");
//   const [destLongitude, setDestLongitude] = useState<string>("");
//   const [picMuatNama, setPicMuatNama] = useState<string>("");
//   const [picMuatTelepon, setPicMuatTelepon] = useState<string>("");
//   const [picBongkarNama, setPicBongkarNama] = useState<string>("");
//   const [picBongkarTelepon, setPicBongkarTelepon] = useState<string>("");
//   const [multiPickupDrop, setMultiPickupDrop] = useState<boolean>(false);
//   const [claimIdsCount, setClaimIdsCount] = useState<number>(0);
//   const [extraStops, setExtraStops] = useState<ExtraStopWithId[]>(() =>
//     (
//       [
//         {
//           lokMuat: null,
//           lokBongkar: null,
//           originPicName: "",
//           originPicPhone: "",
//           destPicName: "",
//           destPicPhone: "",
//           tglETDMuat: "",
//           tglETABongkar: "",
//           originAddressName: "",
//           originStreet: "",
//           originStreet2: "",
//           originDistrictName: "",
//           originZipCode: "",
//           originLatitude: "",
//           originLongitude: "",
//           destAddressName: "",
//           destStreet: "",
//           destStreet2: "",
//           destDistrictName: "",
//           destZipCode: "",
//           destLatitude: "",
//           destLongitude: "",
//         },
//         {
//           lokMuat: null,
//           lokBongkar: null,
//           originPicName: "",
//           originPicPhone: "",
//           destPicName: "",
//           destPicPhone: "",
//           tglETDMuat: "",
//           tglETABongkar: "",
//           originAddressName: "",
//           originStreet: "",
//           originStreet2: "",
//           originDistrictName: "",
//           originZipCode: "",
//           originLatitude: "",
//           originLongitude: "",
//           destAddressName: "",
//           destStreet: "",
//           destStreet2: "",
//           destDistrictName: "",
//           destZipCode: "",
//           destLatitude: "",
//           destLongitude: "",
//         },
//       ] as ExtraStop[]
//     ).map((s) => ({ ...s, uid: genUid() }))
//   );
//   const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
//   const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);
//   const [biayaKirimLabel, setAmountShipping] = useState<number | string>();
//   const [biayaLayananTambahanLabel, setAmountShippingMultiCharge] = useState<
//     number | string
//   >("");
//   const [taxLabel, setAmountTax] = useState<number | string>("");
//   const [totalHargaLabel, setAmountTotal] = useState<number | string>("");
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const firstErrorRef = useRef<HTMLDivElement | null>(null);
//   const extraRefs = useRef<Record<string, HTMLDivElement | null>>({});
//   const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
//   const [statusCurrent, setStatusCurrent] = useState<string | undefined>("");
//   const [steps, setSteps] = useState<StatusStep[]>([]);
//   const [loadingDetail, setLoadingDetail] = useState<boolean>(
//     mode === "edit" && !initialData ? true : false
//   );
//   const [reasonOpen, setReasonOpen] = useState(false);
//   const [reason, setReason] = useState<string>("");
//   const [acceptLoading, setAcceptLoading] = useState(false);
//   const [rejectLoading, setRejectLoading] = useState(false);
//   /** ===== NEW: Dialog state & helpers ===== */
//   const [dlgOpen, setDlgOpen] = useState(false);
//   const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
//   const [dlgTitle, setDlgTitle] = useState("");
//   const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");
//   function openSuccessDialog(message?: string) {
//     setDlgKind("success");
//     setDlgTitle(t("common.saved") ?? "Berhasil disimpan");
//     setDlgMsg(message ?? t("common.saved_desc") ?? "Data berhasil disimpan.");
//     setDlgOpen(true);
//   }
//   function openErrorDialog(err: unknown, title?: string) {
//     const msg =
//       (typeof err === "object" &&
//         err !== null &&
//         // @ts-expect-error best-effort
//         (err.detail?.[0]?.msg || err.message || err.error)) ||
//       String(err);
//     setDlgKind("error");
//     setDlgTitle(title || (t("common.failed_save") ?? "Gagal menyimpan"));
//     setDlgMsg(
//       <pre className="whitespace-pre-wrap text-xs text-red-700">{msg}</pre>
//     );
//     setDlgOpen(true);
//   }

//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [isPending, startTransition] = React.useTransition();

//   const canShowClaims = mode === "edit";
//   const canShowListClaims = claimIdsCount > 0;

//   const [claimsModalOpen, setClaimsModalOpen] = useState(false);
//   const [claims, setClaims] = useState<ClaimItem[]>([]);
//   const [claimsLoading, setClaimsLoading] = useState(false);
//   const fetchClaims = async () => {
//     if (!effectiveOrderId) return;

//     setClaimsLoading(true);
//     try {
//       const claimsData = await fetchOrderClaims_T(effectiveOrderId);
//       setClaims(claimsData.items);
//     } catch (error) {
//       console.error("Failed to fetch claims:", error);
//       openErrorDialog(error, "Failed to load claims");
//     } finally {
//       setClaimsLoading(false);
//     }
//   };

//   function onHandleShowClaimListButton() {
//     setClaimsModalOpen(true);
//     fetchClaims();
//   }

//   function onHandleClaimButton() {
//     localStorage.removeItem("order-id");
//     localStorage.setItem("order-id", String(effectiveOrderId));
//     console.log(localStorage);
//     router.push("/claims/create/");
//   }

//   const hydrateFromPrefill = React.useCallback(
//     (f: ReturnType<typeof prefillFromInitial>) => {
//       setNamaPenerima(f.namaPenerima);
//       setJenisOrder(f.jenisOrder);
//       setArmada(f.armada);
//       setKotaMuat(f.kotaMuat);
//       setKotaBongkar(f.kotaBongkar);
//       setTglMuat(f.tglMuat);
//       setTglBongkar(f.tglBongkar);
//       setLokMuat(f.lokMuat);
//       setLokBongkar(f.lokBongkar);
//       setPicMuatNama(f.picMuatNama);
//       setPicMuatTelepon(f.picMuatTelepon);
//       setPicBongkarNama(f.picBongkarNama);
//       setPicBongkarTelepon(f.picBongkarTelepon);

//       setOriginAddressName(f.origin_address_name);
//       setOriginStreet(f.origin_street);
//       setOriginStreet2(f.origin_street2);
//       setOriginDistrictName(f.origin_district_name);
//       setOriginZipCode(f.origin_zip);
//       setOriginLatitude(f.origin_latitude);
//       setOriginLongitude(f.origin_longitude);

//       setDestAddressName(f.dest_address_name);
//       setDestStreet(f.dest_street);
//       setDestStreet2(f.dest_street2);
//       setDestDistrictName(f.dest_district_name);
//       setDestZipCode(f.dest_zip);
//       setDestLatitude(f.dest_latitude);
//       setDestLongitude(f.dest_longitude);

//       setMuatanNama(f.muatanNama);
//       setMuatanDeskripsi(f.muatanDeskripsi);
//       setJenisMuatan(f.cargo_type ?? null);
//       setCargoCBMText(format2comma(f.cargoCBM));
//       setJumlahMuatanText(format2comma(f.cargoQTY));

//       setCustomer(f.customer);
//       setNoJO(f.noJo);

//       setLayananLainnya(f.requirement_other);
//       setLayananKhusus((ls) => ({
//         ...ls,
//         Helm: f.requirement_helmet,
//         APAR: f.requirement_apar,
//         "Safety Shoes": f.requirement_safety_shoes,
//         Rompi: f.requirement_vest,
//         "Kaca mata": f.requirement_glasses,
//         "Sarung tangan": f.requirement_gloves,
//         Masker: f.requirement_face_mask,
//         Terpal: f.requirement_tarpaulin,
//       }));

//       setAmountShipping(f.amount_shipping);
//       setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
//       setAmountTax(f.amount_tax);
//       setAmountTotal(f.amount_total);

//       if (f.extraStops.length > 0) {
//         setMultiPickupDrop(true);
//         setExtraStops(withUid(f.extraStops));
//       } else {
//         setMultiPickupDrop(false);
//       }

//       setVehicles(toRecordItem(f.fleet_vehicle));
//       setDrivers(toRecordItem(f.driver_partner));
//       setFleet(toRecordItem(f.fleet_vehicle));
//       setDriver(toRecordItem(f.driver_partner));

//       setSteps(f.states);
//       setStatusCurrent(f.states.find((s) => s.is_current)?.key);
//       setIsReadOnly(f.isReadOnly);
//     },
//     []
//   );

//   const softReloadDetail = React.useCallback(async () => {
//     if (!DETAIL_URL_TPL || !effectiveOrderId) return;
//     setIsRefreshing(true);
//     try {
//       const url = buildDetailUrl(DETAIL_URL_TPL, effectiveOrderId);
//       const res = await fetch(url, {
//         headers: { "Accept-Language": getLang() },
//         credentials: "include",
//         cache: "no-store",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       const json = (await res.json()) as OrdersCreateFormProps["initialData"];
//       if (!json) return;
//       const f = prefillFromInitial(json);
//       startTransition(() => {
//         hydrateFromPrefill(f);
//       });
//     } catch (e) {
//       console.error("[PurchaseOrder] soft reload failed:", e);
//     } finally {
//       setIsRefreshing(false);
//     }
//   }, [DETAIL_URL_TPL, effectiveOrderId, router.replace, hydrateFromPrefill]);

//   async function onHandleStartToPrepare() {
//     if (!effectiveOrderId) {
//       openErrorDialog(
//         "ID Purchase Order tidak ditemukan.",
//         "Data tidak lengkap"
//       );
//       return;
//     }
//     try {
//       setAcceptLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "preparation");
//       const res = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       setIsReadOnly(true);
//       onSuccess?.();
//       // router.refresh?.();
//       await softReloadDetail();
//       openSuccessDialog();
//     } catch (e) {
//       console.error("[PurchaseOrder] accept error:", e);
//       openErrorDialog(e);
//     } finally {
//       setAcceptLoading(false);
//     }
//   }
//   async function onHandleSelectFleetNDriver() {
//     if (!effectiveOrderId) {
//       openErrorDialog(
//         "ID Purchase Order tidak ditemukan.",
//         "Data tidak lengkap"
//       );
//       return;
//     }
//     try {
//       setAcceptLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "fleet-and-driver");
//       const res = await fetch(url, {
//         method: "POST",
//         body: JSON.stringify({
//           fleet_vehicle_id: Number(vehicles?.id) || vehicles?.id,
//           driver_partner_id: Number(drivers?.id) || drivers?.id,
//         }),
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       setIsReadOnly(true);
//       onSuccess?.();
//       // router.refresh?.();
//       await softReloadDetail();
//       openSuccessDialog();
//     } catch (e) {
//       console.error("[PurchaseOrder] accept error:", e);
//       openErrorDialog(e);
//     } finally {
//       setAcceptLoading(false);
//     }
//   }
//   async function handleAccept() {
//     if (!effectiveOrderId) {
//       openErrorDialog(
//         "ID Purchase Order tidak ditemukan.",
//         "Data tidak lengkap"
//       );
//       return;
//     }
//     try {
//       setAcceptLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "accept");
//       const res = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       setIsReadOnly(true);
//       onSuccess?.();
//       // router.refresh?.();
//       await softReloadDetail();
//       openSuccessDialog();
//     } catch (e) {
//       console.error("[PurchaseOrder] accept error:", e);
//       openErrorDialog(e);
//     } finally {
//       setAcceptLoading(false);
//     }
//   }
//   async function handleReject() {
//     if (!effectiveOrderId) {
//       openErrorDialog(
//         "ID Purchase Order tidak ditemukan.",
//         "Data tidak lengkap"
//       );
//       return;
//     }
//     const r = reason.trim();
//     if (!r) {
//       openErrorDialog("Mohon isi alasan penolakan.", "Validasi");
//       return;
//     }
//     try {
//       setRejectLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "reject");
//       console.log(JSON.stringify({ tms_reject_reason: r }));

//       const res = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//         body: JSON.stringify({ tms_reject_reason: r }),
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       setReasonOpen(false);
//       setReason("");
//       setIsReadOnly(true);
//       onSuccess?.();
//       // router.refresh?.();
//       await softReloadDetail();
//       openSuccessDialog();
//     } catch (e) {
//       console.error("[PurchaseOrder] reject error:", e);
//       openErrorDialog(e);
//     } finally {
//       setRejectLoading(false);
//     }
//   }

//   const [chatterResModel, setChatterResModel] = useState<string>("");
//   const [chatterResId, setChatterResId] = useState<string | number | undefined>(
//     undefined
//   );
//   // const chatCtx = useMemo(() => {
//   //   const fallbackId = effectiveOrderId ?? null;
//   //   const d = initialData as unknown;

//   //   if (!d || typeof d !== "object" || Array.isArray(d)) {
//   //     return {
//   //       resModel: null as string | null,
//   //       resId: fallbackId as string | number | null,
//   //     };
//   //   }

//   //   const o = d as Record<string, unknown>;
//   //   const resModelRaw = o["res_model"] ?? o["resModel"];
//   //   const resModel =
//   //     typeof resModelRaw === "string" ? String(resModelRaw).trim() : null;

//   //   const ridRaw = o["res_id"] ?? o["resId"] ?? o["id"];
//   //   const rid =
//   //     typeof ridRaw === "string" || typeof ridRaw === "number"
//   //       ? (ridRaw as string | number)
//   //       : (fallbackId as string | number | null);

//   //   return {
//   //     resModel: resModel && resModel.length ? resModel : null,
//   //     resId: rid ?? null,
//   //   };
//   // }, [initialData, effectiveOrderId]);

//   // const canShowChat =
//   //   Boolean(chatCtx.resModel) &&
//   //   chatCtx.resId != null &&
//   //   String(chatCtx.resId).trim() !== "";

//   const chatAnchorRef = useRef<HTMLDivElement | null>(null);

//   const layananPreset = [
//     "Helm",
//     "APAR",
//     "Safety Shoes",
//     "Rompi",
//     "Kaca mata",
//     "Sarung tangan",
//     "Masker",
//     "Terpal",
//   ] as const;
//   type Layanan = (typeof layananPreset)[number];
//   const [layananKhusus, setLayananKhusus] = useState<Record<Layanan, boolean>>(
//     () =>
//       Object.fromEntries(layananPreset.map((k) => [k, false])) as Record<
//         Layanan,
//         boolean
//       >
//   );
//   const [layananLainnya, setLayananLainnya] = useState<string>("");
//   const [muatanNama, setMuatanNama] = useState<string>("");
//   const [muatanDeskripsi, setMuatanDeskripsi] = useState<string>("");
//   const [jenisMuatan, setJenisMuatan] = useState<RecordItem | null>(null);
//   const [cargoCBMText, setCargoCBMText] = useState<string>("");
//   const [jumlahMuatanText, setJumlahMuatanText] = useState<string>("");
//   const [urlCandidateFleet, setUrlCandidateFleet] = useState<string>("");
//   const [urlCandidateDriver, setUrlCandidateDriver] = useState<string>("");
//   const [vehicles, setVehicles] = useState<RecordItem | null>(null);
//   const [drivers, setDrivers] = useState<RecordItem | null>(null);
//   const [uVehicle, setFleet] = useState<RecordItem | null>(null);
//   const [uDriver, setDriver] = useState<RecordItem | null>(null);
//   const [fdOpen, setFdOpen] = useState(false);

//   type KV = ReadonlyArray<readonly [label: string, value: string]>;
//   const InfoGrid: React.FC<{ items: KV }> = ({ items }) => (
//     <dl className="min-w-0 max-w-full overflow-hidden grid grid-cols-[auto,1fr] md:grid-cols-[auto,1fr,auto,1fr] gap-x-3 gap-y-1 text-sm">
//       {items.map(([label, value]) => (
//         <React.Fragment key={label}>
//           <dt className="text-gray-500 whitespace-nowrap pr-2">{label}</dt>
//           <dd className="font-medium min-w-0 break-words whitespace-pre-wrap">
//             {value}
//           </dd>
//         </React.Fragment>
//       ))}
//     </dl>
//   );

//   type FdTab = "fleet" | "driver";
//   const [fdTab, setFdTab] = useState<FdTab>("fleet");
//   /** For Fleet and Driver Dialog */
//   type JsonObject = Record<string, unknown>;
//   const [fleetInfo, setFleetInfo] = useState<JsonObject | null>(null);
//   const [driverInfo, setDriverInfo] = useState<JsonObject | null>(null);
//   const [fleetLoading, setFleetLoading] = useState(false);
//   const [driverLoading, setDriverLoading] = useState(false);
//   const [fleetError, setFleetError] = useState<string | null>(null);
//   const [driverError, setDriverError] = useState<string | null>(null);

//   const isRecord = (v: unknown): v is Record<string, unknown> =>
//     typeof v === "object" && v !== null && !Array.isArray(v);

//   const errorMessage = (e: unknown): string => {
//     if (e instanceof Error) return e.message;
//     if (typeof e === "string") return e;
//     if (isRecord(e) && typeof e.message === "string") return String(e.message);
//     try {
//       return JSON.stringify(e);
//     } catch {
//       return "Unknown error";
//     }
//   };

//   const firstErrorKey = useMemo(() => {
//     const order = ["namaPenerima", "lokBongkar"] as const;
//     return order.find((k) => errors[k]);
//   }, [errors]);

//   useEffect(() => {
//     if (!initialData) return;
//     const f = prefillFromInitial(initialData);

//     setChatterResModel(
//       typeof f.res_model === "string" ? f.res_model : String(f.res_model ?? "")
//     );
//     setChatterResId(
//       typeof f.res_id === "string" || typeof f.res_id === "number"
//         ? f.res_id
//         : undefined
//     );

//     setNamaPenerima(f.namaPenerima);
//     setJenisOrder(f.jenisOrder);
//     setArmada(f.armada);
//     setKotaMuat(f.kotaMuat);
//     setKotaBongkar(f.kotaBongkar);
//     setTglMuat(f.tglMuat);
//     setTglBongkar(f.tglBongkar);
//     setLokMuat(f.lokMuat);
//     setLokBongkar(f.lokBongkar);
//     setPicMuatNama(f.picMuatNama);
//     setPicMuatTelepon(f.picMuatTelepon);
//     setPicBongkarNama(f.picBongkarNama);
//     setPicBongkarTelepon(f.picBongkarTelepon);
//     setMuatanNama(f.muatanNama);
//     setMuatanDeskripsi(f.muatanDeskripsi);
//     setJenisMuatan(f.cargo_type ?? null);
//     setJenisOrder(f.jenisOrder);
//     setArmada(f.armada);
//     setCustomer(f.customer);
//     setNoJO(f.noJo);
//     setLayananLainnya(f.requirement_other);
//     setLayananKhusus((ls) => ({
//       ...ls,
//       Helm: f.requirement_helmet,
//       APAR: f.requirement_apar,
//       "Safety Shoes": f.requirement_safety_shoes,
//       Rompi: f.requirement_vest,
//       "Kaca mata": f.requirement_glasses,
//       "Sarung tangan": f.requirement_gloves,
//       Masker: f.requirement_face_mask,
//       Terpal: f.requirement_tarpaulin,
//     }));
//     setAmountShipping(f.amount_shipping);
//     setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
//     setAmountTax(f.amount_tax);
//     setAmountTotal(f.amount_total);
//     if (f.extraStops.length > 0) {
//       setMultiPickupDrop(true);
//       setExtraStops(withUid(f.extraStops));
//     }

//     setVehicles(f.fleet_vehicle);
//     setDrivers(f.driver_partner);
//     setFleet(f.fleet_vehicle);
//     setDriver(f.driver_partner);

//     if (userType === "transporter") {
//       setClaimIdsCount(Number(f.claim_ids_count ?? 0));
//     }

//     setSteps(f.states);
//     setStatusCurrent(f.states.find((s) => s.is_current)?.key);
//     setLoadingDetail(false);
//   }, [initialData, userType]);

//   useEffect(() => {
//     if (mode !== "edit" || initialData) return;
//     if (!effectiveOrderId) {
//       setLoadingDetail(false);
//       return;
//     }
//     if (!DETAIL_URL_TPL) {
//       setLoadingDetail(false);
//       return;
//     }
//     const url = buildDetailUrl(DETAIL_URL_TPL, effectiveOrderId);
//     const abort = new AbortController();
//     (async () => {
//       try {
//         setLoadingDetail(true);
//         const res = await fetch(url, {
//           headers: { "Accept-Language": getLang() },
//           credentials: "include",
//           signal: abort.signal,
//         });
//         if (res.status === 401) {
//           goSignIn({ routerReplace: router.replace });
//           return;
//         }
//         if (!res.ok) throw new Error(await res.text());
//         const json = (await res.json()) as OrdersCreateFormProps["initialData"];
//         if (json) {
//           console.log("JSON DISINI: ", json);
//           const f = prefillFromInitial(json);
//           console.log("f prefillFromInit: ", f);

//           setFleet(f?.fleet_vehicle);
//           setDriver(f?.driver_partner);

//           setNamaPenerima(f.namaPenerima);
//           setJenisOrder(f.jenisOrder);
//           setArmada(f.armada);
//           setKotaMuat(f.kotaMuat);
//           setKotaBongkar(f.kotaBongkar);
//           setTglMuat(f.tglMuat);
//           setTglBongkar(f.tglBongkar);
//           setLokMuat(f.lokMuat);
//           setLokBongkar(f.lokBongkar);
//           setPicMuatNama(f.picMuatNama);
//           setPicMuatTelepon(f.picMuatTelepon);
//           setPicBongkarNama(f.picBongkarNama);
//           setPicBongkarTelepon(f.picBongkarTelepon);
//           setOriginAddressName(f.origin_address_name);
//           setOriginStreet(f.origin_street);
//           setOriginStreet2(f.origin_street2);
//           setOriginDistrictName(f.origin_district_name);
//           setOriginZipCode(f.origin_zip);
//           setOriginLatitude(f.origin_latitude);
//           setOriginLongitude(f.origin_longitude);
//           setCargoCBMText(format2comma(f.cargoCBM));
//           setJumlahMuatanText(format2comma(f.cargoQTY));
//           setDestAddressName(f.dest_address_name);
//           setDestStreet(f.dest_street);
//           setDestStreet2(f.dest_street2);
//           setDestDistrictName(f.dest_district_name);
//           setDestZipCode(f.dest_zip);
//           setDestLatitude(f.dest_latitude);
//           setDestLongitude(f.dest_longitude);
//           setMuatanNama(f.muatanNama);
//           setMuatanDeskripsi(f.muatanDeskripsi);
//           setJenisOrder(f.jenisOrder);
//           setArmada(f.armada);
//           setJenisMuatan(f.cargo_type ?? null);
//           setCustomer(f.customer);
//           setNoJO(f.noJo);
//           setAmountShipping(f.amount_shipping);
//           setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
//           setAmountTax(f.amount_tax);
//           setAmountTotal(f.amount_total);
//           setLayananLainnya(f.requirement_other);

//           setChatterResModel(
//             typeof f.res_model === "string"
//               ? f.res_model
//               : String(f.res_model ?? "")
//           );
//           setChatterResId(
//             typeof f.res_id === "string" || typeof f.res_id === "number"
//               ? f.res_id
//               : undefined
//           );

//           if (userType === "transporter") {
//             setClaimIdsCount(Number(f?.claim_ids_count ?? 0));
//           }

//           setLayananKhusus((ls) => ({
//             ...ls,
//             Helm: f.requirement_helmet,
//             APAR: f.requirement_apar,
//             "Safety Shoes": f.requirement_safety_shoes,
//             Rompi: f.requirement_vest,
//             "Kaca mata": f.requirement_glasses,
//             "Sarung tangan": f.requirement_gloves,
//             Masker: f.requirement_face_mask,
//             Terpal: f.requirement_tarpaulin,
//           }));
//           if (f.extraStops.length > 0) {
//             setMultiPickupDrop(true);
//             setExtraStops(withUid(f.extraStops));
//           }
//           setSteps(f.states);
//           setStatusCurrent(f.states.find((s) => s.is_current)?.key);
//           setIsReadOnly(f.isReadOnly);
//         }
//       } catch (err) {
//         console.error("[OrderDetail] fetch error:", err);
//       } finally {
//         setLoadingDetail(false);
//       }
//     })();
//     return () => abort.abort();
//   }, [mode, effectiveOrderId, initialData, router.replace, userType]);

//   // for candidate Fleet and Driver
//   useEffect(() => {
//     if (statusCurrent?.toLowerCase() === "preparation" && effectiveOrderId) {
//       setUrlCandidateFleet(
//         buildLookupUrlCandidate(effectiveOrderId, "candidate-fleets")
//       );
//       setUrlCandidateDriver(
//         buildLookupUrlCandidate(effectiveOrderId, "candidate-drivers")
//       );
//     }
//   }, [statusCurrent, effectiveOrderId]);

//   useEffect(() => {
//     const s = (statusCurrent ?? "").trim().toLowerCase();
//     if (mode === "edit" && (AUTOSET_STATUSES.has(s) || s === "preparation")) {
//       const d = toRecordItem(uDriver);
//       const v = toRecordItem(uVehicle);
//       if (d) setDrivers(d); // hanya set kalau valid
//       if (v) setVehicles(v); // hanya set kalau valid
//     }
//   }, [mode, statusCurrent, uDriver, uVehicle]);

//   function buildPOrderActionUrl(
//     id: string | number,
//     action: "accept" | "reject" | "preparation" | "fleet-and-driver"
//   ): string {
//     const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
//     return `${base}/${action}`;
//   }

//   function buildLookupUrlCandidate(
//     id: string | number,
//     action: "candidate-fleets" | "candidate-drivers"
//   ): string {
//     const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
//     return `${base}/${action}`;
//   }

//   function safeLabel(x: unknown, fallback: string) {
//     const r = toRecordItem(x);
//     if (!r) return fallback;
//     const nm = String(r.name ?? "").trim();
//     if (nm && nm.toLowerCase() !== "false") return nm;
//     return r.id ? `${fallback} #${r.id}` : fallback;
//   }

//   // Primitive guard
//   const isPrimitive = (v: unknown): v is string | number | boolean =>
//     typeof v === "string" || typeof v === "number" || typeof v === "boolean";
//   const fmtValue = (v: unknown): string => {
//     if (v === null || v === undefined) return "-";
//     if (isPrimitive(v)) {
//       if (typeof v === "boolean") return v ? "Ya" : "Tidak";
//       const s = String(v).trim();
//       return s.length ? s : "-";
//     }
//     if (Array.isArray(v)) {
//       const parts = v.map(fmtValue).filter((s) => s !== "-");
//       return parts.length ? parts.join(", ") : "-";
//     }
//     if (isRecord(v)) {
//       // Urutan kunci yang umum dipakai oleh API (ambil yang pertama tersedia)
//       const keyOrder = [
//         "display_name",
//         "name",
//         "label",
//         "full_name",
//         "model",
//         "type",
//         "description",
//         "value",
//         "code",
//         "license_plate",
//         "plate",
//         "plate_no",
//         "nopol",
//         "id",
//       ] as const;
//       for (const k of keyOrder) {
//         if (k in v) {
//           const s = fmtValue((v as Record<string, unknown>)[k]);
//           if (s !== "-") return s;
//         }
//       }
//       // Fallback: gabungkan leaf primitives yang ada
//       const acc: string[] = [];
//       for (const [_, val] of Object.entries(v)) {
//         const s = fmtValue(val);
//         if (s !== "-") acc.push(s);
//       }
//       return acc.length ? acc.join(", ") : "-";
//     }
//     return "-";
//   };

//   function pick(
//     obj: JsonObject | null | undefined,
//     keys: string[],
//     fallback = "-"
//   ): string {
//     for (const k of keys) {
//       if (!obj) break;
//       if (k in obj) {
//         const s = fmtValue(obj[k]);
//         if (s !== "-") return s;
//       }
//     }
//     return fallback;
//   }

//   useEffect(() => {
//     if (!fdOpen) return;
//     const fId = Number(vehicles?.id);
//     const dId = Number(drivers?.id);
//     const fleetsTpl = process.env.NEXT_PUBLIC_TMS_FLEETS_URL || "";
//     const driversTpl = process.env.NEXT_PUBLIC_TMS_DRIVERS_URL || "";
//     const abort = new AbortController();

//     (async () => {
//       // Fleet
//       if (fleetsTpl && Number.isFinite(fId) && fId > 0) {
//         try {
//           setFleetLoading(true);
//           setFleetError(null);
//           const res = await fetch(buildDetailUrl(fleetsTpl, fId), {
//             credentials: "include",
//             headers: { "Accept-Language": getLang() },
//             signal: abort.signal,
//           });
//           if (!res.ok) throw new Error(await res.text());
//           // setFleetInfo(await res.json());
//           {
//             const data: unknown = await res.json();
//             setFleetInfo(isRecord(data) ? (data as JsonObject) : null);
//           }
//         } catch (e: unknown) {
//           setFleetError(errorMessage(e));
//           setFleetInfo(null);
//         } finally {
//           setFleetLoading(false);
//         }
//       } else {
//         setFleetInfo(null);
//         setFleetError(null);
//       }

//       // Driver
//       if (driversTpl && Number.isFinite(dId) && dId > 0) {
//         try {
//           setDriverLoading(true);
//           setDriverError(null);
//           const res = await fetch(buildDetailUrl(driversTpl, dId), {
//             credentials: "include",
//             headers: { "Accept-Language": getLang() },
//             signal: abort.signal,
//           });
//           if (!res.ok) throw new Error(await res.text());
//           // setDriverInfo(await res.json());
//           {
//             const data: unknown = await res.json();
//             setDriverInfo(isRecord(data) ? (data as JsonObject) : null);
//           }
//         } catch (e: unknown) {
//           setDriverError(errorMessage(e));
//           setDriverInfo(null);
//         } finally {
//           setDriverLoading(false);
//         }
//       } else {
//         setDriverInfo(null);
//         setDriverError(null);
//       }
//     })();

//     return () => abort.abort();
//   }, [fdOpen, vehicles?.id, drivers?.id]);

//   console.log(statusCurrent);
//   console.log("chatterResModel:", chatterResModel);
//   console.log("chatterResId:", chatterResId);

//   return (
//     <div className="space-y-4 ">
//       {steps.length > 0 && (
//         <Card className="sticky top-14 z-30">
//           <CardBody>
//             <StatusDeliveryImage
//               showTruck={false}
//               steps={steps}
//               width={1200}
//               height={90}
//             />
//           </CardBody>
//         </Card>
//       )}
//       <Card className="!border-0">
//         <CardBody>
//           <div className="flex flex-col sm:flex-row gap-6">
//             {/* ===== Left Column ===== */}
//             <div className="md:basis-2/3  min-w-0 space-y-4">
//               <Card>
//                 <CardHeader>
//                   <h4 className="text-3xl font-semibold text-gray-800">
//                     {t("orders.create.info_order")}
//                   </h4>
//                 </CardHeader>
//                 <CardBody>
//                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                     <Field.Root value={noJO || ""} onChange={() => {}} disabled>
//                       <Field.Label>{t("orders.no_jo")}</Field.Label>
//                       <Field.Control>
//                         <Field.Input className="w-full" />
//                       </Field.Control>
//                     </Field.Root>
//                     <Field.Root
//                       value={customer || ""}
//                       onChange={() => {}}
//                       disabled
//                     >
//                       <Field.Label>{t("orders.customer")}</Field.Label>
//                       <Field.Control>
//                         <Field.Input className="w-full" />
//                       </Field.Control>
//                     </Field.Root>
//                     <Field.Root
//                       value={lokMuat?.name || ""}
//                       onChange={() => {}}
//                       disabled
//                     >
//                       <Field.Label>{t("orders.lokasi_muat")}</Field.Label>
//                       <Field.Control>
//                         <Field.Textarea
//                           className="w-full"
//                           rows={4}
//                           readOnly={isReadOnly}
//                         />
//                       </Field.Control>
//                     </Field.Root>
//                     <Field.Root
//                       value={lokBongkar?.name || ""}
//                       onChange={() => {}}
//                       disabled
//                     >
//                       <Field.Label>{t("orders.lokasi_bongkar")}</Field.Label>
//                       <Field.Control>
//                         <Field.Textarea
//                           className="w-full"
//                           rows={4}
//                           readOnly={isReadOnly}
//                         />
//                       </Field.Control>
//                     </Field.Root>

//                     <Field.Root
//                       value={armada?.name || ""}
//                       onChange={() => {}}
//                       disabled
//                     >
//                       <Field.Label>{t("orders.armada")}</Field.Label>
//                       <Field.Control>
//                         <Field.Input className="w-full" />
//                       </Field.Control>
//                     </Field.Root>
//                   </div>
//                 </CardBody>
//               </Card>

//               <LocationInfoCard
//                 isReadOnly={true}
//                 tglMuat={tglMuat}
//                 setTglMuat={setTglMuat}
//                 tglBongkar={tglBongkar}
//                 setTglBongkar={setTglBongkar}
//                 kotaMuat={kotaMuat}
//                 kotaBongkar={kotaBongkar}
//                 lokMuat={lokMuat}
//                 setLokMuat={setLokMuat}
//                 lokBongkar={lokBongkar}
//                 setLokBongkar={setLokBongkar}
//                 picMuatNama={picMuatNama}
//                 setPicMuatNama={setPicMuatNama}
//                 picMuatTelepon={picMuatTelepon}
//                 setPicMuatTelepon={setPicMuatTelepon}
//                 picBongkarNama={picBongkarNama}
//                 setPicBongkarNama={setPicBongkarNama}
//                 picBongkarTelepon={picBongkarTelepon}
//                 setPicBongkarTelepon={setPicBongkarTelepon}
//                 originAddressName={originAddressName}
//                 originStreet={originStreet}
//                 originStreet2={originStreet2}
//                 originDistrictName={originDistrictName}
//                 originZipCode={originZipCode}
//                 originLatitude={originLatitude}
//                 originLongitude={originLongitude}
//                 destAddressName={destAddressName}
//                 destStreet={destStreet}
//                 destStreet2={destStreet2}
//                 destDistrictName={destDistrictName}
//                 destZipCode={destZipCode}
//                 destLatitude={destLatitude}
//                 destLongitude={destLongitude}
//                 multiPickupDrop={multiPickupDrop}
//                 setMultiPickupDrop={setMultiPickupDrop}
//                 extraStops={extraStops}
//                 setExtraStops={setExtraStops}
//                 errors={errors}
//                 firstErrorKey={firstErrorKey}
//                 firstErrorRef={firstErrorRef}
//                 extraRefs={extraRefs}
//               />

//               <SpecialServicesCard
//                 isReadOnly={true}
//                 layananPreset={layananPreset}
//                 layananKhusus={layananKhusus}
//                 setLayananKhusus={setLayananKhusus}
//                 layananLainnya={layananLainnya}
//                 setLayananLainnya={setLayananLainnya}
//               />
//             </div>

//             {/* ===== Right Column ===== */}
//             <div className="md:basis-1/3  min-w-0 space-y-4">
//               {statusCurrent?.toLowerCase() === "preparation" && (
//                 <Card className="bg-primary/60">
//                   <CardHeader>
//                     <h4 className="text-3xl font-semibold text-gray-800">
//                       Fleet and Driver
//                     </h4>
//                   </CardHeader>
//                   <CardBody>
//                     {urlCandidateFleet && (
//                       <LookupAutocomplete
//                         label={"Fleet"}
//                         placeholder={t("common.search_fleet")}
//                         value={vehicles as RecordItem | null}
//                         onChange={(v) => setVehicles(toRecordItem(v))}
//                         endpoint={{
//                           url: urlCandidateFleet,
//                           method: "GET",
//                           queryParam: "query",
//                           pageParam: "page",
//                           pageSizeParam: "page_size",
//                           page: 1,
//                           pageSize: 50,
//                           mapResults: normalizeResults,
//                         }}
//                         cacheNamespace="fleet-candidate"
//                         prefetchQuery=""
//                       />
//                     )}
//                     {urlCandidateDriver && (
//                       <LookupAutocomplete
//                         label={"Driver"}
//                         placeholder={t("common.search_driver")}
//                         value={drivers as RecordItem | null}
//                         onChange={(v) => setDrivers(toRecordItem(v))}
//                         endpoint={{
//                           url: urlCandidateDriver,
//                           method: "GET",
//                           queryParam: "query",
//                           pageParam: "page",
//                           pageSizeParam: "page_size",
//                           page: 1,
//                           pageSize: 50,
//                           mapResults: normalizeResults,
//                         }}
//                         cacheNamespace="driver-candidate"
//                         prefetchQuery=""
//                       />
//                     )}
//                   </CardBody>
//                   <CardFooter>
//                     <Button
//                       type="button"
//                       variant="solid"
//                       onClick={onHandleSelectFleetNDriver}
//                       disabled={acceptLoading}
//                     >
//                       {acceptLoading ? "sending..." : "Submit"}
//                     </Button>
//                   </CardFooter>
//                 </Card>
//               )}

//               {mode === "edit" &&
//                 AUTOSET_STATUSES.has(
//                   (statusCurrent ?? "").trim().toLowerCase()
//                 ) && (
//                   <Card className="bg-primary/60">
//                     <CardHeader>
//                       <h4 className="text-3xl font-semibold text-gray-800">
//                         Fleet and Driver
//                       </h4>
//                     </CardHeader>
//                     <CardBody>
//                       <Field.Root
//                         value={safeLabel(vehicles, "Fleet")}
//                         onChange={() => {}}
//                         disabled
//                       >
//                         <Field.Label>Fleet</Field.Label>
//                         <Field.Input className="w-full"></Field.Input>
//                       </Field.Root>
//                       <Field.Root
//                         value={safeLabel(drivers, "Driver")}
//                         onChange={() => {}}
//                         disabled
//                       >
//                         <Field.Label>Driver</Field.Label>
//                         <Field.Input className="w-full"></Field.Input>
//                       </Field.Root>
//                     </CardBody>
//                     <CardFooter>
//                       <Button variant="ghost" onClick={() => setFdOpen(true)}>
//                         Detail
//                       </Button>
//                     </CardFooter>
//                   </Card>
//                 )}

//               <Card>
//                 <CardHeader>
//                   <h4 className="text-3xl font-semibold text-gray-800">
//                     {t("orders.info_muatan")}
//                   </h4>
//                 </CardHeader>
//                 <CardBody>
//                   <Field.Root value={muatanNama} onChange={() => {}} disabled>
//                     <Field.Label>{t("orders.muatan_nama")}</Field.Label>
//                     <Field.Input className="w-full"></Field.Input>
//                   </Field.Root>

//                   <Field.Root value={cargoCBMText} onChange={() => {}} disabled>
//                     <Field.Label>Dimensi CBM</Field.Label>
//                     <Field.Input className="w-full"></Field.Input>
//                   </Field.Root>

//                   <Field.Root
//                     value={jenisMuatan?.name ?? ""}
//                     onChange={() => {}}
//                     disabled
//                   >
//                     <Field.Label>{t("orders.jenis_cargo")}</Field.Label>
//                     <Field.Input className="w-full"></Field.Input>
//                   </Field.Root>

//                   <Field.Root
//                     value={jumlahMuatanText}
//                     onChange={() => {}}
//                     disabled
//                   >
//                     <Field.Label>Jumlah Muatan</Field.Label>
//                     <Field.Input className="w-full"></Field.Input>
//                   </Field.Root>

//                   <Field.Root
//                     value={muatanDeskripsi ?? ""}
//                     onChange={() => {}}
//                     disabled
//                   >
//                     <Field.Label>{t("orders.muatan_deskripsi")}</Field.Label>
//                     <Field.Control>
//                       <Field.Textarea
//                         className="w-full"
//                         rows={4}
//                         readOnly={isReadOnly}
//                       />
//                     </Field.Control>
//                   </Field.Root>
//                 </CardBody>
//               </Card>

//               <CostDetailsCard
//                 isShowNotes={false}
//                 biayaKirimLabel={biayaKirimLabel}
//                 biayaLayananTambahanLabel={biayaLayananTambahanLabel}
//                 taxLabel={taxLabel}
//                 totalHargaLabel={totalHargaLabel}
//               />

//               <ShippingDocumentsCard
//                 dokumenFiles={dokumenFiles}
//                 setDokumenFiles={setDokumenFiles}
//                 sjPodFiles={sjPodFiles}
//                 setSjPodFiles={setSjPodFiles}
//               />
//             </div>

//             {/* === Bottom Action Bar === */}
//             <div
//               className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70"
//               role="region"
//               aria-label="Form actions"
//             >
//               <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-2">
//                 {/* LEFT: Chat / Broadcast */}
//                 <div className="flex items-center gap-2">
//                   {(isRefreshing || isPending) && (
//                     <span
//                       className="text-xs text-gray-500 select-none"
//                       aria-live="polite"
//                     >
//                       Updating…
//                     </span>
//                   )}

//                   {/* {canShowChat && (
//                     <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() => {
//                       chatAnchorRef.current?.scrollIntoView({
//                         behavior: "smooth",
//                         block: "start",
//                       });
//                       setHasChatImpulse(false);
//                     }}
//                     className={`relative pr-8 ${
//                       hasChatImpulse ? "motion-safe:animate-pulse" : ""
//                     }`}
//                     aria-label={
//                       t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
//                     }
//                     title={
//                       t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
//                     }
//                   >
//                     {t("orders.chat_broadcast") ?? "Chat / Broadcast Message"}
//                     {hasChatImpulse && (
//                       <span className="pointer-events-none absolute right-2 top-2 inline-flex">
//                         <span className="motion-safe:animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
//                         <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
//                       </span>
//                     )}
//                     </Button>
//                   )} */}

//                   {canShowClaims &&
//                     AUTOSET_TMS_STATE_FOR_BTNCLAIM.has(
//                       (statusCurrent ?? "").trim().toLowerCase()
//                     ) && (
//                       <Button
//                         type="button"
//                         variant="outline"
//                         onClick={onHandleClaimButton}
//                       >
//                         Create Claim
//                       </Button>
//                     )}

//                   {canShowListClaims && (
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={onHandleShowClaimListButton}
//                     >
//                       {`Claims (${claimIdsCount})`}
//                     </Button>
//                   )}
//                 </div>

//                 {/* RIGHT: Reject & Accept */}
//                 {statusCurrent?.toLowerCase() === "rfq" && (
//                   <div className="flex items-center gap-2">
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={() => {
//                         setReasonOpen(true);
//                       }}
//                     >
//                       {t("common.reject")}
//                     </Button>

//                     <Button
//                       hidden={isReadOnly}
//                       onClick={handleAccept}
//                       disabled={acceptLoading}
//                       variant="solid"
//                     >
//                       {acceptLoading
//                         ? t("common.sending") ?? "Mengirim…"
//                         : t("common.accept")}
//                     </Button>
//                   </div>
//                 )}
//                 {statusCurrent?.toLowerCase() === "accept" && (
//                   <div className="flex items-center gap-2">
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={() => {
//                         onHandleStartToPrepare();
//                       }}
//                     >
//                       Start to Preparation
//                     </Button>
//                   </div>
//                 )}
//                 {/* {statusCurrent?.toLowerCase() === "preparation" && (
//                   <div className="flex items-center gap-2">
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={() => {
//                         onHandleStartToPrepare();
//                       }}
//                     >
//                       Select Fleet and Driver
//                     </Button>
//                   </div>
//                 )} */}
//               </div>
//             </div>
//           </div>
//         </CardBody>
//       </Card>

//       <Card>
//         <CardBody>
//           {/* <div ref={chatAnchorRef} className="scroll-mt-24" /> */}
//           {/* {canShowChat && ( */}
//           <ChatterPanel
//             resModel={chatterResModel}
//             resId={chatterResId ?? null}
//             endpointBase={CHATTERS_ENDPOINT_BASE}
//             onRead={() => setHasChatImpulse(false)}
//             className="w-full"
//             currentAuthorName={currentProfileName}
//           />
//           {/* )} */}
//         </CardBody>
//       </Card>

//       {/* === Reject Confirmation Dialog === */}
//       <Modal open={reasonOpen} onClose={() => setReasonOpen(false)}>
//         <div className="space-y-3 p-5">
//           <h4 className="text-lg font-semibold text-gray-800"></h4>
//           <Field.Root value={reason} onChange={setReason}>
//             <Field.Label>Masukkan alasan Anda menolak</Field.Label>
//             <Field.Textarea rows={5}></Field.Textarea>
//             <Field.Error></Field.Error>
//             <Field.Control></Field.Control>
//           </Field.Root>
//           <div className="flex items-center gap-2">
//             <Button
//               variant="primary"
//               onClick={handleReject}
//               disabled={rejectLoading || !reason.trim()}
//             >
//               {rejectLoading ? t("common.sending") ?? "Mengirim…" : "Ya"}
//             </Button>
//             <Button
//               variant="outline"
//               onClick={() => {
//                 setReasonOpen(false);
//                 setReason("");
//               }}
//             >
//               Tidak
//             </Button>
//           </div>
//         </div>
//       </Modal>
//       {/* === Fleet & Driver Detail Dialog (wide + responsive tabs) === */}
//       <Modal open={fdOpen} onClose={() => setFdOpen(false)}>
//         <div className="box-border w-full max-w-full sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-[1000px] max-h-[80vh] overflow-y-auto overflow-x-hidden p-5 space-y-4">
//           <div className="flex items-center justify-between flex-wrap gap-3 min-w-0">
//             <h4 className="text-lg font-semibold text-gray-800 truncate">
//               Fleet &amp; Driver
//             </h4>
//             {/* Segmented tabs hanya tampil di mobile; di desktop kita tampilkan 2 kolom */}
//             <div className="md:hidden inline-flex shrink-0 rounded-lg border border-gray-200 p-1 bg-gray-50">
//               <button
//                 type="button"
//                 onClick={() => setFdTab("fleet")}
//                 className={`px-3 py-1.5 text-sm rounded-md ${
//                   fdTab === "fleet"
//                     ? "bg-white shadow font-semibold"
//                     : "text-gray-600"
//                 }`}
//               >
//                 Fleet
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setFdTab("driver")}
//                 className={`px-3 py-1.5 text-sm rounded-md ${
//                   fdTab === "driver"
//                     ? "bg-white shadow font-semibold"
//                     : "text-gray-600"
//                 }`}
//               >
//                 Driver
//               </button>
//             </div>
//           </div>

//           {/* Grid 2 kolom di desktop; di mobile tampilkan salah satu via tabs */}
//           <div className="min-w-0 grid md:grid-cols-2 gap-6">
//             {/* ===== Fleet panel ===== */}
//             <section
//               className={`${
//                 fdTab === "fleet" ? "" : "hidden md:block"
//               } min-w-0`}
//             >
//               <div className="flex items-start gap-3 mb-2">
//                 <IconCar className="mt-0.5 h-7 w-7 text-gray-700 shrink-0" />
//                 <div className="min-w-0 max-w-full">
//                   <div className="font-semibold text-gray-900">
//                     {safeLabel(vehicles, "Fleet")}
//                   </div>
//                   <p className="text-xs text-gray-500">
//                     Informasi unit kendaraan
//                   </p>
//                 </div>
//               </div>
//               {fleetLoading ? (
//                 <div className="text-sm text-gray-500">
//                   Memuat detail fleet…
//                 </div>
//               ) : fleetError ? (
//                 <div className="text-sm text-red-600">
//                   Gagal memuat detail fleet. {fleetError}
//                 </div>
//               ) : Number(vehicles?.id) > 0 && fleetInfo ? (
//                 <InfoGrid
//                   items={
//                     [
//                       [
//                         "No. Polisi",
//                         pick(fleetInfo, [
//                           "license_plate",
//                           "plate_no",
//                           "nopol",
//                           "plate",
//                         ]),
//                       ],
//                       [
//                         "Tipe / Model",
//                         pick(fleetInfo, ["vehicle_type", "type", "model"]),
//                       ],
//                       ["Merek", pick(fleetInfo, ["brand", "merk", "make"])],
//                       ["Tahun", pick(fleetInfo, ["year"])],
//                       ["Warna", pick(fleetInfo, ["color"])],
//                       [
//                         "Kapasitas (kg)",
//                         pick(fleetInfo, ["capacity_kg", "payload_kg"]),
//                       ],
//                       [
//                         "Kapasitas (CBM)",
//                         pick(fleetInfo, ["capacity_cbm", "cbm"]),
//                       ],
//                       ["Status", pick(fleetInfo, ["status", "state"])],
//                     ] as const
//                   }
//                 />
//               ) : (
//                 <div className="text-sm text-gray-500">
//                   Detail fleet tidak tersedia.
//                 </div>
//               )}
//             </section>

//             {/* ===== Driver panel ===== */}
//             <section
//               className={`${
//                 fdTab === "driver" ? "" : "hidden md:block"
//               } min-w-0`}
//             >
//               <div className="flex items-start gap-3 mb-2">
//                 <IconUser className="mt-0.5 h-7 w-7 text-gray-700 shrink-0" />
//                 <div className="min-w-0 max-w-full">
//                   <div className="font-semibold text-gray-900">
//                     {safeLabel(drivers, "Driver")}
//                   </div>
//                   <p className="text-xs text-gray-500">Informasi pengemudi</p>
//                 </div>
//               </div>
//               {driverLoading ? (
//                 <div className="text-sm text-gray-500">
//                   Memuat detail driver…
//                 </div>
//               ) : driverError ? (
//                 <div className="text-sm text-red-600">
//                   Gagal memuat detail driver. {driverError}
//                 </div>
//               ) : Number(drivers?.id) > 0 && driverInfo ? (
//                 <InfoGrid
//                   items={
//                     [
//                       ["Nama", pick(driverInfo, ["name"])],
//                       ["Mobile", pick(driverInfo, ["mobile", "phone"])],
//                       ["Email", pick(driverInfo, ["email"])],
//                       [
//                         "No. SIM",
//                         pick(driverInfo, [
//                           "drivers_license",
//                           "sim_no",
//                           "license_no",
//                         ]),
//                       ],
//                       [
//                         "Masa Berlaku SIM",
//                         pick(driverInfo, [
//                           "drivers_license_expiry",
//                           "sim_expiry",
//                         ]),
//                       ],
//                       ["NIK/KTP", pick(driverInfo, ["no_ktp", "nik"])],
//                       ["Status", pick(driverInfo, ["status", "state"])],
//                       ["Tipe User", pick(driverInfo, ["tms_user_type"])],
//                     ] as const
//                   }
//                 />
//               ) : (
//                 <div className="text-sm text-gray-500">
//                   Detail driver tidak tersedia.
//                 </div>
//               )}
//             </section>
//           </div>

//           <div className="flex justify-end pt-2">
//             <Button variant="primary" onClick={() => setFdOpen(false)}>
//               Tutup
//             </Button>
//           </div>
//         </div>
//       </Modal>

//       <ClaimListModal
//         open={claimsModalOpen}
//         onClose={() => setClaimsModalOpen(false)}
//         claims={claims}
//         loading={claimsLoading}
//       />

//       <ModalDialog
//         open={dlgOpen}
//         kind={dlgKind}
//         title={dlgTitle}
//         message={dlgMsg}
//         onClose={() => setDlgOpen(false)}
//       />
//     </div>
//   );
// }


// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { ExtraStop } from "@/components/forms/orders/sections/ExtraStopCard";
// import { useEffect, useMemo, useRef, useState } from "react";
// import { StatusStep } from "@/types/status-delivery";
// import { RecordItem } from "@/types/recorditem";
// import {
//   AddressItem,
//   CityItem,
//   ModaItem,
//   OrdersCreateFormProps,
//   OrderTypeItem,
//   PartnerItem,
//   RoleOrderProps,
// } from "@/types/orders";
// import {
//   apiToLocalIsoMinute,
//   buildDetailUrl,
// } from "@/components/shared/Helper";
// import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
// import StatusDeliveryImage from "@/components/ui/DeliveryState";
// import { goSignIn } from "@/lib/goSignIn";
// import { getLang, t } from "@/lib/i18n";
// import SpecialServicesCard from "@/components/forms/orders/sections/SpecialServicesCard";
// import CostDetailsCard from "@/components/forms/orders/sections/CostDetailsCard";
// import ShippingDocumentsCard from "@/components/forms/orders/sections/ShippingDocumentsCard";
// import Button from "@/components/ui/Button";
// import ChatterPanel from "@/components/chat/ChatterPanel";
// import React from "react";
// import { Field } from "@/components/form/FieldInput";
// import LocationInfoCard from "@/components/forms/orders/sections/LocationInfoCard";
// import { Modal } from "@/components/forms/orders/OrdersCreateForm";
// import { format2comma } from "@/components/forms/orders/sections/CargoInfoCard";
// import LookupAutocomplete, {
//   normalizeResults,
// } from "@/components/form/LookupAutocomplete";
// import { IconCar, IconUser } from "@/components/icons/Icon";
// import { ModalDialog } from "@/components/ui/ModalDialog";
// import { TmsUserType } from "@/types/tms-profile";
// import { ClaimItem } from "@/types/claims";
// import { fetchOrderClaims_T } from "@/services/claimService";
// import { ClaimListModal } from "@/components/claims/ClaimListModal";
// import { useAuth } from "@/components/providers/AuthProvider";

// type ExtraStopWithId = ExtraStop & { uid: string };
// type ChatImpulseDetail = { active?: boolean; unread?: number };
// function useChatImpulseChannel(channel: string = "orders:chat-impulse") {
//   const [hasChatImpulse, setHasChatImpulse] = React.useState(false);
//   React.useEffect(() => {
//     if (typeof window === "undefined") return;

//     const handler = (e: Event) => {
//       const detail = (e as CustomEvent<ChatImpulseDetail>).detail;
//       const next = Boolean(detail?.active ?? (detail?.unread ?? 0) > 0);
//       setHasChatImpulse(next);
//     };

//     window.addEventListener(channel, handler as EventListener);
//     return () => window.removeEventListener(channel, handler as EventListener);
//   }, [channel]);

//   return { hasChatImpulse, setHasChatImpulse };
// }
// const genUid = (): string =>
//   typeof crypto !== "undefined" && "randomUUID" in crypto
//     ? crypto.randomUUID()
//     : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
// const withUid = (stops: ExtraStop[]): ExtraStopWithId[] =>
//   stops.map((s) => ({ ...s, uid: genUid() }));
// type RouteItem = NonNullable<
//   NonNullable<OrdersCreateFormProps["initialData"]>["route_ids"]
// >[number];
// function normalizeKey(s: unknown): string {
//   return String(s ?? "")
//     .toLowerCase()
//     .trim()
//     .replace(/[\s_-]+/g, "");
// }
// function extractApiSteps(
//   d: NonNullable<OrdersCreateFormProps["initialData"]>
// ): StatusStep[] {
//   const items = (d.tms_states ?? []) as StatusStep[];
//   return items.map((it): StatusStep => {
//     if (typeof it === "string") {
//       return { key: normalizeKey(it), label: it, is_current: false };
//     }
//     const key = normalizeKey(it.key ?? it.label);
//     const label = it.label ?? it.key ?? "";
//     return { key, label, is_current: Boolean(it.is_current) };
//   });
// }
// // --- RecordItem sanitizer & guard ---
// const isValidRecordItem = (v: unknown): v is RecordItem => {
//   if (!v || typeof v !== "object" || Array.isArray(v)) return false;
//   const o = v as Record<string, unknown>;
//   const id = Number(o.id);
//   const nameRaw = o.name;
//   const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
//   // valid jika punya name bukan "false" atau punya id > 0
//   if (name && name.toLowerCase() !== "false") return true;
//   return Number.isFinite(id) && id > 0;
// };

// const toRecordItem = (v: unknown): RecordItem | null => {
//   if (!isValidRecordItem(v)) return null;
//   const o = v as Record<string, unknown>;
//   const idNum = Number(o.id);
//   const nameRaw = typeof o.name === "string" ? o.name.trim() : "";
//   const fallbackName = String(
//     o.display_name ?? o.label ?? o.license_plate ?? o.plate_no ?? o.code ?? ""
//   );
//   const name =
//     nameRaw && nameRaw.toLowerCase() !== "false" ? nameRaw : fallbackName;

//   // cukup id & name saja agar aman
//   return {
//     id: Number.isFinite(idNum) && idNum > 0 ? idNum : (o.id as number),
//     name,
//   } as RecordItem;
// };

// /** ===== Downloadable files helper (Surat Jalan / POD) ===== */
// type DownloadableFile = {
//   id?: string | number;
//   name: string;
//   url: string;
//   size?: number;
//   createdAt?: string;
// };

// const isPlainObject = (v: unknown): v is Record<string, unknown> =>
//   typeof v === "object" && v !== null && !Array.isArray(v);

// const safeArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// const pickString = (...vals: unknown[]): string => {
//   for (const v of vals) {
//     if (typeof v === "string" && v.trim()) return v.trim();
//   }
//   return "";
// };

// const normalizeDocHint = (v: unknown): string =>
//   String(v ?? "")
//     .toLowerCase()
//     .trim()
//     .replace(/[\s_-]+/g, "");

// const TMS_FILE_BASE =
//   process.env.NEXT_PUBLIC_TMS_FILE_BASE_URL ??
//   process.env.NEXT_PUBLIC_TMS_BASE_URL ??
//   process.env.NEXT_PUBLIC_API_BASE_URL ??
//   "";

// function resolveUrlMaybe(url: string): string {
//   if (!url) return "";
//   if (
//     url.startsWith("http://") ||
//     url.startsWith("https://") ||
//     url.startsWith("data:") ||
//     url.startsWith("blob:")
//   ) {
//     return url;
//   }
//   if (url.startsWith("/") && TMS_FILE_BASE) {
//     return `${TMS_FILE_BASE.replace(/\/$/, "")}${url}`;
//   }
//   return url;
// }

// function fmtBytes(n: number): string {
//   if (!Number.isFinite(n) || n <= 0) return "";
//   const kb = 1024;
//   const mb = kb * 1024;
//   const gb = mb * 1024;
//   if (n >= gb) return `${(n / gb).toFixed(2)} GB`;
//   if (n >= mb) return `${(n / mb).toFixed(2)} MB`;
//   if (n >= kb) return `${(n / kb).toFixed(1)} KB`;
//   return `${n} B`;
// }

// function extractSuratJalanDownloads(data: unknown): DownloadableFile[] {
//   if (!isPlainObject(data)) return [];

//   const keyHints = [
//     "suratjalan",
//     "surat_jalan",
//     "sjpod",
//     "sj_pod",
//     "deliverynote",
//     "delivery_note",
//     "pod",
//   ].map(normalizeDocHint);

//   // Kumpulkan kandidat dari berbagai kemungkinan struktur payload
//   const candidates: Array<{ raw: unknown; strong: boolean }> = [];

//   // 1) Field langsung yang biasanya menyimpan lampiran Surat Jalan / POD
//   for (const [k, v] of Object.entries(data)) {
//     const nk = normalizeDocHint(k);
//     const strong = keyHints.some((h) => nk.includes(h));
//     if (!strong) continue;

//     if (Array.isArray(v)) {
//       for (const it of v) candidates.push({ raw: it, strong: true });
//       continue;
//     }
//     if (isPlainObject(v)) {
//       const att = (v as Record<string, unknown>).attachments;
//       if (Array.isArray(att)) {
//         for (const it of att) candidates.push({ raw: it, strong: true });
//       } else {
//         candidates.push({ raw: v, strong: true });
//       }
//     }
//   }

//   // 2) Container umum yang sering dipakai API untuk attachment group
//   const commonContainers: unknown[] = [
//     (data as Record<string, unknown>).document_attachment,
//     (data as Record<string, unknown>).document_attachments,
//     (data as Record<string, unknown>).shipping_document_attachment,
//     (data as Record<string, unknown>).shipping_documents,
//     (data as Record<string, unknown>).document_attachment_group,
//   ];

//   for (const c of commonContainers) {
//     if (Array.isArray(c)) {
//       for (const it of c) candidates.push({ raw: it, strong: false });
//       continue;
//     }
//     if (
//       isPlainObject(c) &&
//       Array.isArray((c as Record<string, unknown>).attachments)
//     ) {
//       for (const it of (c as { attachments: unknown[] }).attachments)
//         candidates.push({ raw: it, strong: false });
//     }
//   }

//   // 3) Terkadang tersimpan di level route
//   const routes = safeArray<Record<string, unknown>>(
//     (data as Record<string, unknown>).route_ids
//   );
//   for (const r of routes) {
//     if (!isPlainObject(r)) continue;
//     const maybe =
//       (r as Record<string, unknown>).document_attachment ??
//       (r as Record<string, unknown>).attachments ??
//       (r as Record<string, unknown>).shipping_documents;
//     if (Array.isArray(maybe)) {
//       for (const it of maybe) candidates.push({ raw: it, strong: false });
//     } else if (
//       isPlainObject(maybe) &&
//       Array.isArray((maybe as Record<string, unknown>).attachments)
//     ) {
//       for (const it of (maybe as { attachments: unknown[] }).attachments)
//         candidates.push({ raw: it, strong: false });
//     }
//   }

//   const out: DownloadableFile[] = [];
//   const seen = new Set<string>();

//   for (const { raw, strong } of candidates) {
//     if (!isPlainObject(raw)) continue;
//     const o = raw as Record<string, unknown>;

//     // URL: bisa url langsung atau base64 (Odoo: datas)
//     const url =
//       resolveUrlMaybe(
//         pickString(
//           o.url,
//           o.download_url,
//           o.file_url,
//           o.public_url,
//           o.attachment_url
//         )
//       ) ||
//       ((): string => {
//         const datas = pickString(o.datas, o.data, o.base64, o.content_base64);
//         if (!datas) return "";
//         if (datas.startsWith("data:")) return datas;
//         const mime =
//           pickString(o.mimetype, o.mime_type, o.content_type) ||
//           "application/octet-stream";
//         return `data:${mime};base64,${datas}`;
//       })();

//     if (!url) continue;

//     const name =
//       pickString(
//         o.name,
//         o.filename,
//         o.file_name,
//         o.display_name,
//         o.original_name
//       ) || `File_${String(o.id ?? "") || String(out.length + 1)}`;

//     const docType = normalizeDocHint(
//       o.doc_type ?? o.document_type ?? o.type ?? o.category ?? o.tag
//     );
//     const nameKey = normalizeDocHint(name);

//     const looksLikeSuratJalan =
//       strong ||
//       (docType
//         ? keyHints.some((h) => docType.includes(h))
//         : keyHints.some((h) => nameKey.includes(h)));

//     if (!looksLikeSuratJalan) continue;

//     const id = (o.id as string | number | undefined) ?? undefined;
//     const size =
//       (typeof o.file_size === "number" ? o.file_size : undefined) ??
//       (typeof o.size === "number" ? o.size : undefined);
//     const createdAt = pickString(o.create_date, o.created_at, o.date);

//     const k = `${String(id ?? "")}|${url}`;
//     if (seen.has(k)) continue;
//     seen.add(k);

//     out.push({ id, name, url, size, createdAt });
//   }

//   return out;
// }

// function prefillFromInitial(
//   data: NonNullable<OrdersCreateFormProps["initialData"]>
// ) {
//   // claim_ids_count?: number | null | 0; // ini untuk Transporter
//   // reviewed_claim_ids_count? : number | null | 0; // ini untuk Shipper

//   let claimCount = 0;
//   if ("claim_ids_count" in data) {
//     const v = (data as { claim_ids_count?: unknown }).claim_ids_count;
//     if (typeof v === "number") {
//       claimCount = v;
//     } else if (typeof v === "string") {
//       const n = Number(v);
//       if (Number.isFinite(n)) claimCount = n;
//     }
//   }

//   const form = {
//     driver_partner: toRecordItem(data.driver_partner),
//     fleet_vehicle: toRecordItem(data.fleet_vehicle),
//     states: data.tms_states ? extractApiSteps(data) : ([] as StatusStep[]),
//     noJo: data.name ?? "",
//     customer: (data.partner as PartnerItem)?.name ?? "",
//     namaPenerima: data.receipt_by ?? "",
//     jenisOrder:
//       data.order_type ??
//       (data.order_type_id
//         ? ({ id: data.order_type_id } as OrderTypeItem)
//         : null),
//     armada:
//       data.moda ?? (data.moda_id ? ({ id: data.moda_id } as ModaItem) : null),
//     kotaMuat:
//       data.origin_city ??
//       (data.origin_city_id ? ({ id: data.origin_city_id } as CityItem) : null),
//     kotaBongkar:
//       data.dest_city ??
//       (data.dest_city_id ? ({ id: data.dest_city_id } as CityItem) : null),
//     tglMuat: apiToLocalIsoMinute(data.pickup_date_planne, "08:00"),
//     tglBongkar: apiToLocalIsoMinute(data.drop_off_date_planne, "08:00"),
//     lokMuat: null as AddressItem | null,
//     lokBongkar: null as AddressItem | null,

//     origin_address_name: "",
//     origin_street: "",
//     origin_street2: "",
//     origin_district_name: "",
//     origin_zip: "",
//     origin_latitude: "",
//     origin_longitude: "",
//     dest_address_name: "",
//     dest_street: "",
//     dest_street2: "",
//     dest_district_name: "",
//     dest_zip: "",
//     dest_latitude: "",
//     dest_longitude: "",
//     delivery_note_uri: "",

//     muatanNama: data.cargo_name ?? "",
//     muatanDeskripsi: data.cargo_description ?? "",
//     jenisMuatan:
//       data.cargo_type ??
//       (data.cargo_type_id ? ({ id: data.cargo_type_id } as RecordItem) : null),

//     cargoCBM: data.cargo_cbm,
//     cargoQTY: data.cargo_qty,
//     cargo_type_id: data.cargo_type_id,
//     cargo_type: data.cargo_type,

//     requirement_helmet: Boolean(data.requirement_helmet),
//     requirement_apar: Boolean(data.requirement_apar),
//     requirement_safety_shoes: Boolean(data.requirement_safety_shoes),
//     requirement_vest: Boolean(data.requirement_vest),
//     requirement_glasses: Boolean(data.requirement_glasses),
//     requirement_gloves: Boolean(data.requirement_gloves),
//     requirement_face_mask: Boolean(data.requirement_face_mask),
//     requirement_tarpaulin: Boolean(data.requirement_tarpaulin),
//     requirement_other: data.requirement_other ?? "",
//     amount_shipping: data.amount_shipping ?? "",
//     amount_shipping_multi_charge: data.amount_shipping_multi_charge ?? "",
//     amount_tax: data.amount_tax ?? "",
//     amount_total: data.amount_total ?? "",
//     picMuatNama: "",
//     picMuatTelepon: "",
//     picBongkarNama: "",
//     picBongkarTelepon: "",
//     extraStops: [] as ExtraStop[],
//     isReadOnly: false,
//     claim_ids_count: claimCount,
//     res_id: data.res_id,
//     res_model: data.res_model,
//     original_res_id: data.original_res_id,
//     original_res_model: data.original_res_model,
//   };

//   const routes: RouteItem[] = Array.isArray(data.route_ids)
//     ? (data.route_ids as RouteItem[])
//     : ([] as RouteItem[]);

//   function addrFromRoute(
//     r: RouteItem | undefined,
//     which: "origin" | "dest"
//   ): AddressItem | null {
//     if (!r) return null;
//     const obj = which === "origin" ? r.origin_address : r.dest_address;
//     if (obj && (obj as AddressItem).id) return obj as AddressItem;
//     const id = which === "origin" ? r.origin_address_id : r.dest_address_id;
//     return id ? ({ id } as AddressItem) : null;
//   }
//   const main = routes.find((r) => r.is_main_route);

//   form.tglMuat = apiToLocalIsoMinute(main?.etd_date) || form.tglMuat;
//   form.tglBongkar = apiToLocalIsoMinute(main?.eta_date) || form.tglBongkar;
//   form.lokMuat = addrFromRoute(main, "origin");
//   form.lokBongkar = addrFromRoute(main, "dest");
//   form.picMuatNama = main?.origin_pic_name ?? "";
//   form.picMuatTelepon = main?.origin_pic_phone ?? "";
//   form.picBongkarNama = main?.dest_pic_name ?? "";
//   form.picBongkarTelepon = main?.dest_pic_phone ?? "";

//   form.origin_address_name = main?.origin_address_name ?? "";
//   form.origin_street = main?.origin_street ?? "";
//   form.origin_street2 = main?.origin_street2 ?? "";
//   form.origin_district_name = main?.origin_district.name ?? "";
//   form.origin_zip = main?.origin_zip ?? "";
//   form.origin_latitude = main?.origin_latitude ?? "";
//   form.origin_longitude = main?.origin_longitude ?? "";

//   form.dest_address_name = main?.dest_address_name ?? "";
//   form.dest_street = main?.dest_street ?? "";
//   form.dest_street2 = main?.dest_street2 ?? "";
//   form.dest_district_name = main?.dest_district.name ?? "";
//   form.dest_zip = main?.dest_zip ?? "";
//   form.dest_latitude = main?.dest_latitude ?? main?.dest_latitude ?? "";
//   form.dest_longitude = main?.dest_longitude ?? "";
//   form.delivery_note_uri = main?.delivery_note_uri ?? "";

//   if (!form.lokMuat)
//     form.lokMuat = (data.origin_address as AddressItem) ?? null;
//   if (!form.lokBongkar)
//     form.lokBongkar = (data.dest_address as AddressItem) ?? null;

//   form.amount_shipping = data.amount_shipping ?? "";
//   form.amount_shipping_multi_charge = data.amount_shipping_multi_charge ?? "";
//   form.amount_tax = data.amount_tax ?? "";
//   form.amount_total = data.amount_total ?? "";

//   const extras: RouteItem[] = routes.filter((r) => !r.is_main_route);
//   form.extraStops = extras.map(
//     (r): ExtraStop => ({
//       id: r.id,
//       lokMuat: addrFromRoute(r, "origin"),
//       lokBongkar: addrFromRoute(r, "dest"),
//       originPicName: r.origin_pic_name ?? "",
//       originPicPhone: r.origin_pic_phone ?? "",
//       destPicName: r.dest_pic_name ?? "",
//       destPicPhone: r.dest_pic_phone ?? "",
//       tglETDMuat: apiToLocalIsoMinute(r.etd_date) ?? r.etd_date ?? "",
//       tglETABongkar: apiToLocalIsoMinute(r.eta_date) ?? r.eta_date ?? "",
//       originAddressName: r.origin_address_name ?? "",
//       originStreet: r.origin_street ?? "",
//       originStreet2: r.origin_street2 ?? "",
//       originDistrictName: r.origin_district.name ?? "",
//       originZipCode: r.origin_zip ?? "",
//       originLatitude: r.origin_latitude ?? "",
//       originLongitude: r.origin_longitude ?? "",

//       destAddressName: r.dest_address_name ?? "",
//       destStreet: r.dest_street ?? "",
//       destStreet2: r.dest_street2 ?? "",
//       destDistrictName: r.dest_district.name ?? "",
//       destZipCode: r.dest_zip ?? "",
//       destLatitude: r.dest_latitude ?? "",
//       destLongitude: r.dest_longitude ?? "",
//       delivery_note_uri: r.delivery_note_uri ?? "",
//     })
//   );

//   console.log("Prefill form:", form);
//   console.log("Prefill extraStops:", form.extraStops);
  
//   const current = data.states?.find((s) => s.is_current);
//   form.isReadOnly = current
//     ? !["draft", "pending"].includes(current.key)
//     : false;
//   return form;
// }

// // export default function PurchaseOrderForm({
// //   mode = "edit",
// //   orderId,
// //   initialData,
// //   onSuccess,
// // }: OrdersCreateFormProps) {
// export default function PurchaseOrderForm<T extends TmsUserType>({
//   mode = "edit",
//   orderId,
//   initialData,
//   onSuccess,
//   userType,
// }: RoleOrderProps<T> & { userType: T }) {
//   const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!;
//   const CHATTERS_ENDPOINT_BASE = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL!;
//   const AUTOSET_STATUSES = new Set(["pickup", "delivery", "received"]);
//   const AUTOSET_TMS_STATE_FOR_BTNCLAIM = new Set([
//     "accept",
//     "preparation",
//     "pickup",
//     "delivery",
//     "received",
//   ]);
//   const { profile } = useAuth();
//   const currentProfileName = useMemo(() => {
//       if (profile) return profile.name;
//       return undefined;
//     }, [profile]);

//   console.log("Current Profile Name:", currentProfileName);
  
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const qsId = searchParams?.get("id") ?? null;
//   const effectiveOrderId = useMemo<string | number | undefined>(() => {
//     return orderId ?? qsId ?? undefined;
//   }, [orderId, qsId]);
//   const { hasChatImpulse, setHasChatImpulse } = useChatImpulseChannel();
//   const [noJO, setNoJO] = useState<string>("");
//   const [customer, setCustomer] = useState<string>("");
//   const [namaPenerima, setNamaPenerima] = useState<string>("");
//   const [kotaMuat, setKotaMuat] = useState<CityItem | null>(null);
//   const [kotaBongkar, setKotaBongkar] = useState<CityItem | null>(null);
//   const [jenisOrder, setJenisOrder] = useState<OrderTypeItem | null>(null);
//   const [armada, setArmada] = useState<ModaItem | null>(null);
//   const [tglMuat, setTglMuat] = useState<string>("");
//   const [tglBongkar, setTglBongkar] = useState<string>("");
//   const [lokMuat, setLokMuat] = useState<AddressItem | null>(null);
//   const [lokBongkar, setLokBongkar] = useState<AddressItem | null>(null);
//   const [originAddressName, setOriginAddressName] = useState<string>("");
//   const [originStreet, setOriginStreet] = useState<string>("");
//   const [originStreet2, setOriginStreet2] = useState<string>("");
//   const [originDistrictName, setOriginDistrictName] = useState<string>("");
//   const [originZipCode, setOriginZipCode] = useState<string>("");
//   const [originLatitude, setOriginLatitude] = useState<string>("");
//   const [originLongitude, setOriginLongitude] = useState<string>("");
//   const [destAddressName, setDestAddressName] = useState<string>("");
//   const [destStreet, setDestStreet] = useState<string>("");
//   const [destStreet2, setDestStreet2] = useState<string>("");
//   const [destDistrictName, setDestDistrictName] = useState<string>("");
//   const [destZipCode, setDestZipCode] = useState<string>("");
//   const [destLatitude, setDestLatitude] = useState<string>("");
//   const [destLongitude, setDestLongitude] = useState<string>("");
//   const [deliveryNoteUri, setSetDeliveryNoteUri] = useState<string>("");
//   const [picMuatNama, setPicMuatNama] = useState<string>("");
//   const [picMuatTelepon, setPicMuatTelepon] = useState<string>("");
//   const [picBongkarNama, setPicBongkarNama] = useState<string>("");
//   const [picBongkarTelepon, setPicBongkarTelepon] = useState<string>("");
//   const [multiPickupDrop, setMultiPickupDrop] = useState<boolean>(false);
//   const [claimIdsCount, setClaimIdsCount] = useState<number>(0);
//   const [extraStops, setExtraStops] = useState<ExtraStopWithId[]>(() =>
//     (
//       [
//         {
//           lokMuat: null,
//           lokBongkar: null,
//           originPicName: "",
//           originPicPhone: "",
//           destPicName: "",
//           destPicPhone: "",
//           tglETDMuat: "",
//           tglETABongkar: "",
//           originAddressName: "",
//           originStreet: "",
//           originStreet2: "",
//           originDistrictName: "",
//           originZipCode: "",
//           originLatitude: "",
//           originLongitude: "",
//           destAddressName: "",
//           destStreet: "",
//           destStreet2: "",
//           destDistrictName: "",
//           destZipCode: "",
//           destLatitude: "",
//           destLongitude: "",
//           delivery_note_uri: "",
//         },
//         {
//           lokMuat: null,
//           lokBongkar: null,
//           originPicName: "",
//           originPicPhone: "",
//           destPicName: "",
//           destPicPhone: "",
//           tglETDMuat: "",
//           tglETABongkar: "",
//           originAddressName: "",
//           originStreet: "",
//           originStreet2: "",
//           originDistrictName: "",
//           originZipCode: "",
//           originLatitude: "",
//           originLongitude: "",
//           destAddressName: "",
//           destStreet: "",
//           destStreet2: "",
//           destDistrictName: "",
//           destZipCode: "",
//           destLatitude: "",
//           destLongitude: "",
//           delivery_note_uri: "",
//         },
//       ] as ExtraStop[]
//     ).map((s) => ({ ...s, uid: genUid() }))
//   );
//   const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
//   const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);
//   const [sjPodDownloads, setSjPodDownloads] = useState<DownloadableFile[]>([]);

//   const [biayaKirimLabel, setAmountShipping] = useState<number | string>();
//   const [biayaLayananTambahanLabel, setAmountShippingMultiCharge] = useState<
//     number | string
//   >("");
//   const [taxLabel, setAmountTax] = useState<number | string>("");
//   const [totalHargaLabel, setAmountTotal] = useState<number | string>("");
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const firstErrorRef = useRef<HTMLDivElement | null>(null);
//   const extraRefs = useRef<Record<string, HTMLDivElement | null>>({});
//   const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
//   const [statusCurrent, setStatusCurrent] = useState<string | undefined>("");
//   const [steps, setSteps] = useState<StatusStep[]>([]);
//   const [loadingDetail, setLoadingDetail] = useState<boolean>(
//     mode === "edit" && !initialData ? true : false
//   );
//   const [reasonOpen, setReasonOpen] = useState(false);
//   const [reason, setReason] = useState<string>("");
//   const [acceptLoading, setAcceptLoading] = useState(false);
//   const [rejectLoading, setRejectLoading] = useState(false);
//   /** ===== NEW: Dialog state & helpers ===== */
//   const [dlgOpen, setDlgOpen] = useState(false);
//   const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
//   const [dlgTitle, setDlgTitle] = useState("");
//   const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");
//   function openSuccessDialog(message?: string) {
//     setDlgKind("success");
//     setDlgTitle(t("common.saved") ?? "Berhasil disimpan");
//     setDlgMsg(message ?? t("common.saved_desc") ?? "Data berhasil disimpan.");
//     setDlgOpen(true);
//   }
//   function openErrorDialog(err: unknown, title?: string) {
//     const msg =
//       (typeof err === "object" &&
//         err !== null &&
//         // @ts-expect-error best-effort
//         (err.detail?.[0]?.msg || err.message || err.error)) ||
//       String(err);
//     setDlgKind("error");
//     setDlgTitle(title || (t("common.failed_save") ?? "Gagal menyimpan"));
//     setDlgMsg(
//       <pre className="whitespace-pre-wrap text-xs text-red-700">{msg}</pre>
//     );
//     setDlgOpen(true);
//   }

//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [isPending, startTransition] = React.useTransition();

//   const canShowClaims = mode === "edit";
//   const canShowListClaims = claimIdsCount > 0;

//   const [claimsModalOpen, setClaimsModalOpen] = useState(false);
//   const [claims, setClaims] = useState<ClaimItem[]>([]);
//   const [claimsLoading, setClaimsLoading] = useState(false);
//   const fetchClaims = async () => {
//     if (!effectiveOrderId) return;

//     setClaimsLoading(true);
//     try {
//       const claimsData = await fetchOrderClaims_T(effectiveOrderId);
//       setClaims(claimsData.items);
//     } catch (error) {
//       console.error("Failed to fetch claims:", error);
//       openErrorDialog(error, "Failed to load claims");
//     } finally {
//       setClaimsLoading(false);
//     }
//   };

//   function onHandleShowClaimListButton() {
//     setClaimsModalOpen(true);
//     fetchClaims();
//   }

//   function onHandleClaimButton() {
//     localStorage.removeItem("order-id");
//     localStorage.setItem("order-id", String(effectiveOrderId));
//     console.log(localStorage);
//     router.push("/claims/create/");
//   }

//   const hydrateFromPrefill = React.useCallback(
//     (f: ReturnType<typeof prefillFromInitial>) => {
//       setNamaPenerima(f.namaPenerima);
//       setJenisOrder(f.jenisOrder);
//       setArmada(f.armada);
//       setKotaMuat(f.kotaMuat);
//       setKotaBongkar(f.kotaBongkar);
//       setTglMuat(f.tglMuat);
//       setTglBongkar(f.tglBongkar);
//       setLokMuat(f.lokMuat);
//       setLokBongkar(f.lokBongkar);
//       setPicMuatNama(f.picMuatNama);
//       setPicMuatTelepon(f.picMuatTelepon);
//       setPicBongkarNama(f.picBongkarNama);
//       setPicBongkarTelepon(f.picBongkarTelepon);

//       setOriginAddressName(f.origin_address_name);
//       setOriginStreet(f.origin_street);
//       setOriginStreet2(f.origin_street2);
//       setOriginDistrictName(f.origin_district_name);
//       setOriginZipCode(f.origin_zip);
//       setOriginLatitude(f.origin_latitude);
//       setOriginLongitude(f.origin_longitude);

//       setDestAddressName(f.dest_address_name);
//       setDestStreet(f.dest_street);
//       setDestStreet2(f.dest_street2);
//       setDestDistrictName(f.dest_district_name);
//       setDestZipCode(f.dest_zip);
//       setDestLatitude(f.dest_latitude);
//       setDestLongitude(f.dest_longitude);

//       setSetDeliveryNoteUri(f.delivery_note_uri);

//       setMuatanNama(f.muatanNama);
//       setMuatanDeskripsi(f.muatanDeskripsi);
//       setJenisMuatan(f.cargo_type ?? null);
//       setCargoCBMText(format2comma(f.cargoCBM));
//       setJumlahMuatanText(format2comma(f.cargoQTY));

//       setCustomer(f.customer);
//       setNoJO(f.noJo);

//       setLayananLainnya(f.requirement_other);
//       setLayananKhusus((ls) => ({
//         ...ls,
//         Helm: f.requirement_helmet,
//         APAR: f.requirement_apar,
//         "Safety Shoes": f.requirement_safety_shoes,
//         Rompi: f.requirement_vest,
//         "Kaca mata": f.requirement_glasses,
//         "Sarung tangan": f.requirement_gloves,
//         Masker: f.requirement_face_mask,
//         Terpal: f.requirement_tarpaulin,
//       }));

//       setAmountShipping(f.amount_shipping);
//       setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
//       setAmountTax(f.amount_tax);
//       setAmountTotal(f.amount_total);

//       if (f.extraStops.length > 0) {
//         setMultiPickupDrop(true);
//         setExtraStops(withUid(f.extraStops));
//       } else {
//         setMultiPickupDrop(false);
//       }

//       setVehicles(toRecordItem(f.fleet_vehicle));
//       setDrivers(toRecordItem(f.driver_partner));
//       setFleet(toRecordItem(f.fleet_vehicle));
//       setDriver(toRecordItem(f.driver_partner));

//       setSteps(f.states);
//       setStatusCurrent(f.states.find((s) => s.is_current)?.key);
//       setIsReadOnly(f.isReadOnly);
//     },
//     []
//   );

//   const softReloadDetail = React.useCallback(async () => {
//     if (!DETAIL_URL_TPL || !effectiveOrderId) return;
//     setIsRefreshing(true);
//     try {
//       const url = buildDetailUrl(DETAIL_URL_TPL, effectiveOrderId);
//       const res = await fetch(url, {
//         headers: { "Accept-Language": getLang() },
//         credentials: "include",
//         cache: "no-store",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       const json = (await res.json()) as OrdersCreateFormProps["initialData"];
//       if (!json) return;
//       const f = prefillFromInitial(json);
//       setSjPodDownloads(extractSuratJalanDownloads(json));
//       startTransition(() => {
//         hydrateFromPrefill(f);
//       });
//     } catch (e) {
//       console.error("[PurchaseOrder] soft reload failed:", e);
//     } finally {
//       setIsRefreshing(false);
//     }
//   }, [DETAIL_URL_TPL, effectiveOrderId, router.replace, hydrateFromPrefill]);

//   async function onHandleStartToPrepare() {
//     if (!effectiveOrderId) {
//       openErrorDialog(
//         "ID Purchase Order tidak ditemukan.",
//         "Data tidak lengkap"
//       );
//       return;
//     }
//     try {
//       setAcceptLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "preparation");
//       const res = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       setIsReadOnly(true);
//       onSuccess?.();
//       // router.refresh?.();
//       await softReloadDetail();
//       openSuccessDialog();
//     } catch (e) {
//       console.error("[PurchaseOrder] accept error:", e);
//       openErrorDialog(e);
//     } finally {
//       setAcceptLoading(false);
//     }
//   }
//   async function onHandleSelectFleetNDriver() {
//     if (!effectiveOrderId) {
//       openErrorDialog(
//         "ID Purchase Order tidak ditemukan.",
//         "Data tidak lengkap"
//       );
//       return;
//     }
//     try {
//       setAcceptLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "fleet-and-driver");
//       const res = await fetch(url, {
//         method: "POST",
//         body: JSON.stringify({
//           fleet_vehicle_id: Number(vehicles?.id) || vehicles?.id,
//           driver_partner_id: Number(drivers?.id) || drivers?.id,
//         }),
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       setIsReadOnly(true);
//       onSuccess?.();
//       // router.refresh?.();
//       await softReloadDetail();
//       openSuccessDialog();
//     } catch (e) {
//       console.error("[PurchaseOrder] accept error:", e);
//       openErrorDialog(e);
//     } finally {
//       setAcceptLoading(false);
//     }
//   }
//   async function handleAccept() {
//     if (!effectiveOrderId) {
//       openErrorDialog(
//         "ID Purchase Order tidak ditemukan.",
//         "Data tidak lengkap"
//       );
//       return;
//     }
//     try {
//       setAcceptLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "accept");
//       const res = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       setIsReadOnly(true);
//       onSuccess?.();
//       // router.refresh?.();
//       await softReloadDetail();
//       openSuccessDialog();
//     } catch (e) {
//       console.error("[PurchaseOrder] accept error:", e);
//       openErrorDialog(e);
//     } finally {
//       setAcceptLoading(false);
//     }
//   }
//   async function handleReject() {
//     if (!effectiveOrderId) {
//       openErrorDialog(
//         "ID Purchase Order tidak ditemukan.",
//         "Data tidak lengkap"
//       );
//       return;
//     }
//     const r = reason.trim();
//     if (!r) {
//       openErrorDialog("Mohon isi alasan penolakan.", "Validasi");
//       return;
//     }
//     try {
//       setRejectLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "reject");
//       console.log(JSON.stringify({ tms_reject_reason: r }));

//       const res = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//         body: JSON.stringify({ tms_reject_reason: r }),
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) throw new Error(await res.text());
//       setReasonOpen(false);
//       setReason("");
//       setIsReadOnly(true);
//       onSuccess?.();
//       // router.refresh?.();
//       await softReloadDetail();
//       openSuccessDialog();
//     } catch (e) {
//       console.error("[PurchaseOrder] reject error:", e);
//       openErrorDialog(e);
//     } finally {
//       setRejectLoading(false);
//     }
//   }

//   const [chatterResModel, setChatterResModel] = useState<string>("");
//   const [chatterResId, setChatterResId] = useState<string | number | undefined>(
//     undefined
//   );
//   // const chatCtx = useMemo(() => {
//   //   const fallbackId = effectiveOrderId ?? null;
//   //   const d = initialData as unknown;

//   //   if (!d || typeof d !== "object" || Array.isArray(d)) {
//   //     return {
//   //       resModel: null as string | null,
//   //       resId: fallbackId as string | number | null,
//   //     };
//   //   }

//   //   const o = d as Record<string, unknown>;
//   //   const resModelRaw = o["res_model"] ?? o["resModel"];
//   //   const resModel =
//   //     typeof resModelRaw === "string" ? String(resModelRaw).trim() : null;

//   //   const ridRaw = o["res_id"] ?? o["resId"] ?? o["id"];
//   //   const rid =
//   //     typeof ridRaw === "string" || typeof ridRaw === "number"
//   //       ? (ridRaw as string | number)
//   //       : (fallbackId as string | number | null);

//   //   return {
//   //     resModel: resModel && resModel.length ? resModel : null,
//   //     resId: rid ?? null,
//   //   };
//   // }, [initialData, effectiveOrderId]);

//   // const canShowChat =
//   //   Boolean(chatCtx.resModel) &&
//   //   chatCtx.resId != null &&
//   //   String(chatCtx.resId).trim() !== "";

//   const chatAnchorRef = useRef<HTMLDivElement | null>(null);

//   const layananPreset = [
//     "Helm",
//     "APAR",
//     "Safety Shoes",
//     "Rompi",
//     "Kaca mata",
//     "Sarung tangan",
//     "Masker",
//     "Terpal",
//   ] as const;
//   type Layanan = (typeof layananPreset)[number];
//   const [layananKhusus, setLayananKhusus] = useState<Record<Layanan, boolean>>(
//     () =>
//       Object.fromEntries(layananPreset.map((k) => [k, false])) as Record<
//         Layanan,
//         boolean
//       >
//   );
//   const [layananLainnya, setLayananLainnya] = useState<string>("");
//   const [muatanNama, setMuatanNama] = useState<string>("");
//   const [muatanDeskripsi, setMuatanDeskripsi] = useState<string>("");
//   const [jenisMuatan, setJenisMuatan] = useState<RecordItem | null>(null);
//   const [cargoCBMText, setCargoCBMText] = useState<string>("");
//   const [jumlahMuatanText, setJumlahMuatanText] = useState<string>("");
//   const [urlCandidateFleet, setUrlCandidateFleet] = useState<string>("");
//   const [urlCandidateDriver, setUrlCandidateDriver] = useState<string>("");
//   const [vehicles, setVehicles] = useState<RecordItem | null>(null);
//   const [drivers, setDrivers] = useState<RecordItem | null>(null);
//   const [uVehicle, setFleet] = useState<RecordItem | null>(null);
//   const [uDriver, setDriver] = useState<RecordItem | null>(null);
//   const [fdOpen, setFdOpen] = useState(false);

//   type KV = ReadonlyArray<readonly [label: string, value: string]>;
//   const InfoGrid: React.FC<{ items: KV }> = ({ items }) => (
//     <dl className="min-w-0 max-w-full overflow-hidden grid grid-cols-[auto,1fr] md:grid-cols-[auto,1fr,auto,1fr] gap-x-3 gap-y-1 text-sm">
//       {items.map(([label, value]) => (
//         <React.Fragment key={label}>
//           <dt className="text-gray-500 whitespace-nowrap pr-2">{label}</dt>
//           <dd className="font-medium min-w-0 break-words whitespace-pre-wrap">
//             {value}
//           </dd>
//         </React.Fragment>
//       ))}
//     </dl>
//   );

//   type FdTab = "fleet" | "driver";
//   const [fdTab, setFdTab] = useState<FdTab>("fleet");
//   /** For Fleet and Driver Dialog */
//   type JsonObject = Record<string, unknown>;
//   const [fleetInfo, setFleetInfo] = useState<JsonObject | null>(null);
//   const [driverInfo, setDriverInfo] = useState<JsonObject | null>(null);
//   const [fleetLoading, setFleetLoading] = useState(false);
//   const [driverLoading, setDriverLoading] = useState(false);
//   const [fleetError, setFleetError] = useState<string | null>(null);
//   const [driverError, setDriverError] = useState<string | null>(null);

//   const isRecord = (v: unknown): v is Record<string, unknown> =>
//     typeof v === "object" && v !== null && !Array.isArray(v);

//   const errorMessage = (e: unknown): string => {
//     if (e instanceof Error) return e.message;
//     if (typeof e === "string") return e;
//     if (isRecord(e) && typeof e.message === "string") return String(e.message);
//     try {
//       return JSON.stringify(e);
//     } catch {
//       return "Unknown error";
//     }
//   };

//   const firstErrorKey = useMemo(() => {
//     const order = ["namaPenerima", "lokBongkar"] as const;
//     return order.find((k) => errors[k]);
//   }, [errors]);

//   useEffect(() => {
//     if (!initialData) return;
//     const f = prefillFromInitial(initialData);
//     setSjPodDownloads(extractSuratJalanDownloads(initialData));

//     setChatterResModel(
//       typeof f.res_model === "string" ? f.res_model : String(f.res_model ?? "")
//     );
//     setChatterResId(
//       typeof f.res_id === "string" || typeof f.res_id === "number"
//         ? f.res_id
//         : undefined
//     );

//     setNamaPenerima(f.namaPenerima);
//     setJenisOrder(f.jenisOrder);
//     setArmada(f.armada);
//     setKotaMuat(f.kotaMuat);
//     setKotaBongkar(f.kotaBongkar);
//     setTglMuat(f.tglMuat);
//     setTglBongkar(f.tglBongkar);
//     setLokMuat(f.lokMuat);
//     setLokBongkar(f.lokBongkar);
//     setPicMuatNama(f.picMuatNama);
//     setPicMuatTelepon(f.picMuatTelepon);
//     setPicBongkarNama(f.picBongkarNama);
//     setPicBongkarTelepon(f.picBongkarTelepon);
//     setSetDeliveryNoteUri(f.delivery_note_uri);
//     setMuatanNama(f.muatanNama);
//     setMuatanDeskripsi(f.muatanDeskripsi);
//     setJenisMuatan(f.cargo_type ?? null);
//     setJenisOrder(f.jenisOrder);
//     setArmada(f.armada);
//     setCustomer(f.customer);
//     setNoJO(f.noJo);
//     setLayananLainnya(f.requirement_other);
//     setLayananKhusus((ls) => ({
//       ...ls,
//       Helm: f.requirement_helmet,
//       APAR: f.requirement_apar,
//       "Safety Shoes": f.requirement_safety_shoes,
//       Rompi: f.requirement_vest,
//       "Kaca mata": f.requirement_glasses,
//       "Sarung tangan": f.requirement_gloves,
//       Masker: f.requirement_face_mask,
//       Terpal: f.requirement_tarpaulin,
//     }));
//     setAmountShipping(f.amount_shipping);
//     setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
//     setAmountTax(f.amount_tax);
//     setAmountTotal(f.amount_total);
//     if (f.extraStops.length > 0) {
//       setMultiPickupDrop(true);
//       setExtraStops(withUid(f.extraStops));
//     }

//     setVehicles(f.fleet_vehicle);
//     setDrivers(f.driver_partner);
//     setFleet(f.fleet_vehicle);
//     setDriver(f.driver_partner);

//     if (userType === "transporter") {
//       setClaimIdsCount(Number(f.claim_ids_count ?? 0));
//     }

//     setSteps(f.states);
//     setStatusCurrent(f.states.find((s) => s.is_current)?.key);
//     setLoadingDetail(false);
//   }, [initialData, userType]);

//   useEffect(() => {
//     if (mode !== "edit" || initialData) return;
//     if (!effectiveOrderId) {
//       setLoadingDetail(false);
//       return;
//     }
//     if (!DETAIL_URL_TPL) {
//       setLoadingDetail(false);
//       return;
//     }
//     const url = buildDetailUrl(DETAIL_URL_TPL, effectiveOrderId);
//     const abort = new AbortController();
//     (async () => {
//       try {
//         setLoadingDetail(true);
//         const res = await fetch(url, {
//           headers: { "Accept-Language": getLang() },
//           credentials: "include",
//           signal: abort.signal,
//         });
//         if (res.status === 401) {
//           goSignIn({ routerReplace: router.replace });
//           return;
//         }
//         if (!res.ok) throw new Error(await res.text());
//         const json = (await res.json()) as OrdersCreateFormProps["initialData"];
//         if (json) {
//           console.log("JSON DISINI: ", json);
//           const f = prefillFromInitial(json);
//           setSjPodDownloads(extractSuratJalanDownloads(json));
//           console.log("f prefillFromInit: ", f);

//           setFleet(f?.fleet_vehicle);
//           setDriver(f?.driver_partner);

//           setNamaPenerima(f.namaPenerima);
//           setJenisOrder(f.jenisOrder);
//           setArmada(f.armada);
//           setKotaMuat(f.kotaMuat);
//           setKotaBongkar(f.kotaBongkar);
//           setTglMuat(f.tglMuat);
//           setTglBongkar(f.tglBongkar);
//           setLokMuat(f.lokMuat);
//           setLokBongkar(f.lokBongkar);
//           setPicMuatNama(f.picMuatNama);
//           setPicMuatTelepon(f.picMuatTelepon);
//           setPicBongkarNama(f.picBongkarNama);
//           setPicBongkarTelepon(f.picBongkarTelepon);
//           setOriginAddressName(f.origin_address_name);
//           setOriginStreet(f.origin_street);
//           setOriginStreet2(f.origin_street2);
//           setOriginDistrictName(f.origin_district_name);
//           setOriginZipCode(f.origin_zip);
//           setOriginLatitude(f.origin_latitude);
//           setOriginLongitude(f.origin_longitude);
//           setCargoCBMText(format2comma(f.cargoCBM));
//           setJumlahMuatanText(format2comma(f.cargoQTY));
//           setDestAddressName(f.dest_address_name);
//           setDestStreet(f.dest_street);
//           setDestStreet2(f.dest_street2);
//           setDestDistrictName(f.dest_district_name);
//           setDestZipCode(f.dest_zip);
//           setDestLatitude(f.dest_latitude);
//           setDestLongitude(f.dest_longitude);
//           setSetDeliveryNoteUri(f.delivery_note_uri);
//           setMuatanNama(f.muatanNama);
//           setMuatanDeskripsi(f.muatanDeskripsi);
//           setJenisOrder(f.jenisOrder);
//           setArmada(f.armada);
//           setJenisMuatan(f.cargo_type ?? null);
//           setCustomer(f.customer);
//           setNoJO(f.noJo);
//           setAmountShipping(f.amount_shipping);
//           setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
//           setAmountTax(f.amount_tax);
//           setAmountTotal(f.amount_total);
//           setLayananLainnya(f.requirement_other);

//           setChatterResModel(
//             typeof f.res_model === "string"
//               ? f.res_model
//               : String(f.res_model ?? "")
//           );
//           setChatterResId(
//             typeof f.res_id === "string" || typeof f.res_id === "number"
//               ? f.res_id
//               : undefined
//           );

//           if (userType === "transporter") {
//             setClaimIdsCount(Number(f?.claim_ids_count ?? 0));
//           }

//           setLayananKhusus((ls) => ({
//             ...ls,
//             Helm: f.requirement_helmet,
//             APAR: f.requirement_apar,
//             "Safety Shoes": f.requirement_safety_shoes,
//             Rompi: f.requirement_vest,
//             "Kaca mata": f.requirement_glasses,
//             "Sarung tangan": f.requirement_gloves,
//             Masker: f.requirement_face_mask,
//             Terpal: f.requirement_tarpaulin,
//           }));
//           if (f.extraStops.length > 0) {
//             setMultiPickupDrop(true);
//             setExtraStops(withUid(f.extraStops));
//           }
//           setSteps(f.states);
//           setStatusCurrent(f.states.find((s) => s.is_current)?.key);
//           setIsReadOnly(f.isReadOnly);
//         }
//       } catch (err) {
//         console.error("[OrderDetail] fetch error:", err);
//       } finally {
//         setLoadingDetail(false);
//       }
//     })();
//     return () => abort.abort();
//   }, [mode, effectiveOrderId, initialData, router.replace, userType]);

//   // for candidate Fleet and Driver
//   useEffect(() => {
//     if (statusCurrent?.toLowerCase() === "preparation" && effectiveOrderId) {
//       setUrlCandidateFleet(
//         buildLookupUrlCandidate(effectiveOrderId, "candidate-fleets")
//       );
//       setUrlCandidateDriver(
//         buildLookupUrlCandidate(effectiveOrderId, "candidate-drivers")
//       );
//     }
//   }, [statusCurrent, effectiveOrderId]);

//   useEffect(() => {
//     const s = (statusCurrent ?? "").trim().toLowerCase();
//     if (mode === "edit" && (AUTOSET_STATUSES.has(s) || s === "preparation")) {
//       const d = toRecordItem(uDriver);
//       const v = toRecordItem(uVehicle);
//       if (d) setDrivers(d); // hanya set kalau valid
//       if (v) setVehicles(v); // hanya set kalau valid
//     }
//   }, [mode, statusCurrent, uDriver, uVehicle]);

//   function buildPOrderActionUrl(
//     id: string | number,
//     action: "accept" | "reject" | "preparation" | "fleet-and-driver"
//   ): string {
//     const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
//     return `${base}/${action}`;
//   }

//   function buildLookupUrlCandidate(
//     id: string | number,
//     action: "candidate-fleets" | "candidate-drivers"
//   ): string {
//     const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
//     return `${base}/${action}`;
//   }

//   function safeLabel(x: unknown, fallback: string) {
//     const r = toRecordItem(x);
//     if (!r) return fallback;
//     const nm = String(r.name ?? "").trim();
//     if (nm && nm.toLowerCase() !== "false") return nm;
//     return r.id ? `${fallback} #${r.id}` : fallback;
//   }

//   // Primitive guard
//   const isPrimitive = (v: unknown): v is string | number | boolean =>
//     typeof v === "string" || typeof v === "number" || typeof v === "boolean";
//   const fmtValue = (v: unknown): string => {
//     if (v === null || v === undefined) return "-";
//     if (isPrimitive(v)) {
//       if (typeof v === "boolean") return v ? "Ya" : "Tidak";
//       const s = String(v).trim();
//       return s.length ? s : "-";
//     }
//     if (Array.isArray(v)) {
//       const parts = v.map(fmtValue).filter((s) => s !== "-");
//       return parts.length ? parts.join(", ") : "-";
//     }
//     if (isRecord(v)) {
//       // Urutan kunci yang umum dipakai oleh API (ambil yang pertama tersedia)
//       const keyOrder = [
//         "display_name",
//         "name",
//         "label",
//         "full_name",
//         "model",
//         "type",
//         "description",
//         "value",
//         "code",
//         "license_plate",
//         "plate",
//         "plate_no",
//         "nopol",
//         "id",
//       ] as const;
//       for (const k of keyOrder) {
//         if (k in v) {
//           const s = fmtValue((v as Record<string, unknown>)[k]);
//           if (s !== "-") return s;
//         }
//       }
//       // Fallback: gabungkan leaf primitives yang ada
//       const acc: string[] = [];
//       for (const [_, val] of Object.entries(v)) {
//         const s = fmtValue(val);
//         if (s !== "-") acc.push(s);
//       }
//       return acc.length ? acc.join(", ") : "-";
//     }
//     return "-";
//   };

//   function pick(
//     obj: JsonObject | null | undefined,
//     keys: string[],
//     fallback = "-"
//   ): string {
//     for (const k of keys) {
//       if (!obj) break;
//       if (k in obj) {
//         const s = fmtValue(obj[k]);
//         if (s !== "-") return s;
//       }
//     }
//     return fallback;
//   }

//   useEffect(() => {
//     if (!fdOpen) return;
//     const fId = Number(vehicles?.id);
//     const dId = Number(drivers?.id);
//     const fleetsTpl = process.env.NEXT_PUBLIC_TMS_FLEETS_URL || "";
//     const driversTpl = process.env.NEXT_PUBLIC_TMS_DRIVERS_URL || "";
//     const abort = new AbortController();

//     (async () => {
//       // Fleet
//       if (fleetsTpl && Number.isFinite(fId) && fId > 0) {
//         try {
//           setFleetLoading(true);
//           setFleetError(null);
//           const res = await fetch(buildDetailUrl(fleetsTpl, fId), {
//             credentials: "include",
//             headers: { "Accept-Language": getLang() },
//             signal: abort.signal,
//           });
//           if (!res.ok) throw new Error(await res.text());
//           // setFleetInfo(await res.json());
//           {
//             const data: unknown = await res.json();
//             setFleetInfo(isRecord(data) ? (data as JsonObject) : null);
//           }
//         } catch (e: unknown) {
//           setFleetError(errorMessage(e));
//           setFleetInfo(null);
//         } finally {
//           setFleetLoading(false);
//         }
//       } else {
//         setFleetInfo(null);
//         setFleetError(null);
//       }

//       // Driver
//       if (driversTpl && Number.isFinite(dId) && dId > 0) {
//         try {
//           setDriverLoading(true);
//           setDriverError(null);
//           const res = await fetch(buildDetailUrl(driversTpl, dId), {
//             credentials: "include",
//             headers: { "Accept-Language": getLang() },
//             signal: abort.signal,
//           });
//           if (!res.ok) throw new Error(await res.text());
//           // setDriverInfo(await res.json());
//           {
//             const data: unknown = await res.json();
//             setDriverInfo(isRecord(data) ? (data as JsonObject) : null);
//           }
//         } catch (e: unknown) {
//           setDriverError(errorMessage(e));
//           setDriverInfo(null);
//         } finally {
//           setDriverLoading(false);
//         }
//       } else {
//         setDriverInfo(null);
//         setDriverError(null);
//       }
//     })();

//     return () => abort.abort();
//   }, [fdOpen, vehicles?.id, drivers?.id]);

//   console.log(statusCurrent);
//   console.log("chatterResModel:", chatterResModel);
//   console.log("chatterResId:", chatterResId);

//   return (
//     <div className="space-y-4 ">
//       {steps.length > 0 && (
//         <Card className="sticky top-14 z-30">
//           <CardBody>
//             <StatusDeliveryImage
//               showTruck={false}
//               steps={steps}
//               width={1200}
//               height={90}
//             />
//           </CardBody>
//         </Card>
//       )}
//       <Card className="!border-0">
//         <CardBody>
//           <div className="flex flex-col sm:flex-row gap-6">
//             {/* ===== Left Column ===== */}
//             <div className="md:basis-2/3  min-w-0 space-y-4">
//               <Card>
//                 <CardHeader>
//                   <h4 className="text-3xl font-semibold text-gray-800">
//                     {t("orders.create.info_order")}
//                   </h4>
//                 </CardHeader>
//                 <CardBody>
//                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                     <Field.Root value={noJO || ""} onChange={() => {}} disabled>
//                       <Field.Label>{t("orders.no_jo")}</Field.Label>
//                       <Field.Control>
//                         <Field.Input className="w-full" />
//                       </Field.Control>
//                     </Field.Root>
//                     <Field.Root
//                       value={customer || ""}
//                       onChange={() => {}}
//                       disabled
//                     >
//                       <Field.Label>{t("orders.customer")}</Field.Label>
//                       <Field.Control>
//                         <Field.Input className="w-full" />
//                       </Field.Control>
//                     </Field.Root>
//                     <Field.Root
//                       value={lokMuat?.name || ""}
//                       onChange={() => {}}
//                       disabled
//                     >
//                       <Field.Label>{t("orders.lokasi_muat")}</Field.Label>
//                       <Field.Control>
//                         <Field.Textarea
//                           className="w-full"
//                           rows={4}
//                           readOnly={isReadOnly}
//                         />
//                       </Field.Control>
//                     </Field.Root>
//                     <Field.Root
//                       value={lokBongkar?.name || ""}
//                       onChange={() => {}}
//                       disabled
//                     >
//                       <Field.Label>{t("orders.lokasi_bongkar")}</Field.Label>
//                       <Field.Control>
//                         <Field.Textarea
//                           className="w-full"
//                           rows={4}
//                           readOnly={isReadOnly}
//                         />
//                       </Field.Control>
//                     </Field.Root>

//                     <Field.Root
//                       value={armada?.name || ""}
//                       onChange={() => {}}
//                       disabled
//                     >
//                       <Field.Label>{t("orders.armada")}</Field.Label>
//                       <Field.Control>
//                         <Field.Input className="w-full" />
//                       </Field.Control>
//                     </Field.Root>
//                   </div>
//                 </CardBody>
//               </Card>

//               <LocationInfoCard
//                 isReadOnly={true}
//                 tglMuat={tglMuat}
//                 setTglMuat={setTglMuat}
//                 tglBongkar={tglBongkar}
//                 setTglBongkar={setTglBongkar}
//                 kotaMuat={kotaMuat}
//                 kotaBongkar={kotaBongkar}
//                 lokMuat={lokMuat}
//                 setLokMuat={setLokMuat}
//                 lokBongkar={lokBongkar}
//                 setLokBongkar={setLokBongkar}
//                 picMuatNama={picMuatNama}
//                 setPicMuatNama={setPicMuatNama}
//                 picMuatTelepon={picMuatTelepon}
//                 setPicMuatTelepon={setPicMuatTelepon}
//                 picBongkarNama={picBongkarNama}
//                 setPicBongkarNama={setPicBongkarNama}
//                 picBongkarTelepon={picBongkarTelepon}
//                 setPicBongkarTelepon={setPicBongkarTelepon}
//                 originAddressName={originAddressName}
//                 originStreet={originStreet}
//                 originStreet2={originStreet2}
//                 originDistrictName={originDistrictName}
//                 originZipCode={originZipCode}
//                 originLatitude={originLatitude}
//                 originLongitude={originLongitude}
//                 destAddressName={destAddressName}
//                 destStreet={destStreet}
//                 destStreet2={destStreet2}
//                 destDistrictName={destDistrictName}
//                 destZipCode={destZipCode}
//                 destLatitude={destLatitude}
//                 destLongitude={destLongitude}
//                 deliveryNoteUri={deliveryNoteUri}
//                 multiPickupDrop={multiPickupDrop}
//                 setMultiPickupDrop={setMultiPickupDrop}
//                 extraStops={extraStops}
//                 setExtraStops={setExtraStops}
//                 errors={errors}
//                 firstErrorKey={firstErrorKey}
//                 firstErrorRef={firstErrorRef}
//                 extraRefs={extraRefs}

//               />

//               <SpecialServicesCard
//                 isReadOnly={true}
//                 layananPreset={layananPreset}
//                 layananKhusus={layananKhusus}
//                 setLayananKhusus={setLayananKhusus}
//                 layananLainnya={layananLainnya}
//                 setLayananLainnya={setLayananLainnya}
//               />
//             </div>

//             {/* ===== Right Column ===== */}
//             <div className="md:basis-1/3  min-w-0 space-y-4">
//               {statusCurrent?.toLowerCase() === "preparation" && (
//                 <Card className="bg-primary/60">
//                   <CardHeader>
//                     <h4 className="text-3xl font-semibold text-gray-800">
//                       Fleet and Driver
//                     </h4>
//                   </CardHeader>
//                   <CardBody>
//                     {urlCandidateFleet && (
//                       <LookupAutocomplete
//                         label={"Fleet"}
//                         placeholder={t("common.search_fleet")}
//                         value={vehicles as RecordItem | null}
//                         onChange={(v) => setVehicles(toRecordItem(v))}
//                         endpoint={{
//                           url: urlCandidateFleet,
//                           method: "GET",
//                           queryParam: "query",
//                           pageParam: "page",
//                           pageSizeParam: "page_size",
//                           page: 1,
//                           pageSize: 50,
//                           mapResults: normalizeResults,
//                         }}
//                         cacheNamespace="fleet-candidate"
//                         prefetchQuery=""
//                       />
//                     )}
//                     {urlCandidateDriver && (
//                       <LookupAutocomplete
//                         label={"Driver"}
//                         placeholder={t("common.search_driver")}
//                         value={drivers as RecordItem | null}
//                         onChange={(v) => setDrivers(toRecordItem(v))}
//                         endpoint={{
//                           url: urlCandidateDriver,
//                           method: "GET",
//                           queryParam: "query",
//                           pageParam: "page",
//                           pageSizeParam: "page_size",
//                           page: 1,
//                           pageSize: 50,
//                           mapResults: normalizeResults,
//                         }}
//                         cacheNamespace="driver-candidate"
//                         prefetchQuery=""
//                       />
//                     )}
//                   </CardBody>
//                   <CardFooter>
//                     <Button
//                       type="button"
//                       variant="solid"
//                       onClick={onHandleSelectFleetNDriver}
//                       disabled={acceptLoading}
//                     >
//                       {acceptLoading ? "sending..." : "Submit"}
//                     </Button>
//                   </CardFooter>
//                 </Card>
//               )}

//               {mode === "edit" &&
//                 AUTOSET_STATUSES.has(
//                   (statusCurrent ?? "").trim().toLowerCase()
//                 ) && (
//                   <Card className="bg-primary/60">
//                     <CardHeader>
//                       <h4 className="text-3xl font-semibold text-gray-800">
//                         Fleet and Driver
//                       </h4>
//                     </CardHeader>
//                     <CardBody>
//                       <Field.Root
//                         value={safeLabel(vehicles, "Fleet")}
//                         onChange={() => {}}
//                         disabled
//                       >
//                         <Field.Label>Fleet</Field.Label>
//                         <Field.Input className="w-full"></Field.Input>
//                       </Field.Root>
//                       <Field.Root
//                         value={safeLabel(drivers, "Driver")}
//                         onChange={() => {}}
//                         disabled
//                       >
//                         <Field.Label>Driver</Field.Label>
//                         <Field.Input className="w-full"></Field.Input>
//                       </Field.Root>
//                     </CardBody>
//                     <CardFooter>
//                       <Button variant="ghost" onClick={() => setFdOpen(true)}>
//                         Detail
//                       </Button>
//                     </CardFooter>
//                   </Card>
//                 )}

//               <Card>
//                 <CardHeader>
//                   <h4 className="text-3xl font-semibold text-gray-800">
//                     {t("orders.info_muatan")}
//                   </h4>
//                 </CardHeader>
//                 <CardBody>
//                   <Field.Root value={muatanNama} onChange={() => {}} disabled>
//                     <Field.Label>{t("orders.muatan_nama")}</Field.Label>
//                     <Field.Input className="w-full"></Field.Input>
//                   </Field.Root>

//                   <Field.Root value={cargoCBMText} onChange={() => {}} disabled>
//                     <Field.Label>Dimensi CBM</Field.Label>
//                     <Field.Input className="w-full"></Field.Input>
//                   </Field.Root>

//                   <Field.Root
//                     value={jenisMuatan?.name ?? ""}
//                     onChange={() => {}}
//                     disabled
//                   >
//                     <Field.Label>{t("orders.jenis_cargo")}</Field.Label>
//                     <Field.Input className="w-full"></Field.Input>
//                   </Field.Root>

//                   <Field.Root
//                     value={jumlahMuatanText}
//                     onChange={() => {}}
//                     disabled
//                   >
//                     <Field.Label>Jumlah Muatan</Field.Label>
//                     <Field.Input className="w-full"></Field.Input>
//                   </Field.Root>

//                   <Field.Root
//                     value={muatanDeskripsi ?? ""}
//                     onChange={() => {}}
//                     disabled
//                   >
//                     <Field.Label>{t("orders.muatan_deskripsi")}</Field.Label>
//                     <Field.Control>
//                       <Field.Textarea
//                         className="w-full"
//                         rows={4}
//                         readOnly={isReadOnly}
//                       />
//                     </Field.Control>
//                   </Field.Root>
//                 </CardBody>
//               </Card>

//               <CostDetailsCard
//                 isShowNotes={false}
//                 biayaKirimLabel={biayaKirimLabel}
//                 biayaLayananTambahanLabel={biayaLayananTambahanLabel}
//                 taxLabel={taxLabel}
//                 totalHargaLabel={totalHargaLabel}
//               />

//               <ShippingDocumentsCard
//                 dokumenFiles={dokumenFiles}
//                 setDokumenFiles={setDokumenFiles}
//                 sjPodFiles={sjPodFiles}
//                 setSjPodFiles={setSjPodFiles}
//               />

//               {sjPodDownloads.length > 0 && (
//                 <Card className="border border-gray-200 bg-white">
//                   <CardHeader>
//                     <div className="flex items-center justify-between gap-3">
//                       <h4 className="text-xl font-semibold text-gray-800">
//                         Surat Jalan (Existing)
//                       </h4>
//                       <span className="text-xs text-gray-500">
//                         {sjPodDownloads.length} file
//                       </span>
//                     </div>
//                   </CardHeader>
//                   <CardBody>
//                     <ul className="space-y-2">
//                       {sjPodDownloads.map((f) => (
//                         <li
//                           key={`${String(f.id ?? "")}|${f.url}`}
//                           className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
//                         >
//                           <div className="min-w-0">
//                             <div className="font-medium truncate">{f.name}</div>
//                             {(f.size || f.createdAt) && (
//                               <div className="text-xs text-gray-500">
//                                 {f.size ? fmtBytes(f.size) : ""}
//                                 {f.size && f.createdAt ? " • " : ""}
//                                 {f.createdAt ? f.createdAt : ""}
//                               </div>
//                             )}
//                           </div>
//                           <a
//                             href={f.url}
//                             target="_blank"
//                             rel="noreferrer"
//                             className="shrink-0 text-sm font-semibold text-primary hover:underline"
//                           >
//                             Download
//                           </a>
//                         </li>
//                       ))}
//                     </ul>
//                   </CardBody>
//                 </Card>
//               )}
//             </div>

//             {/* === Bottom Action Bar === */}
//             <div
//               className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70"
//               role="region"
//               aria-label="Form actions"
//             >
//               <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-2">
//                 {/* LEFT: Chat / Broadcast */}
//                 <div className="flex items-center gap-2">
//                   {(isRefreshing || isPending) && (
//                     <span
//                       className="text-xs text-gray-500 select-none"
//                       aria-live="polite"
//                     >
//                       Updating…
//                     </span>
//                   )}

//                   {/* {canShowChat && (
//                     <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() => {
//                       chatAnchorRef.current?.scrollIntoView({
//                         behavior: "smooth",
//                         block: "start",
//                       });
//                       setHasChatImpulse(false);
//                     }}
//                     className={`relative pr-8 ${
//                       hasChatImpulse ? "motion-safe:animate-pulse" : ""
//                     }`}
//                     aria-label={
//                       t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
//                     }
//                     title={
//                       t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
//                     }
//                   >
//                     {t("orders.chat_broadcast") ?? "Chat / Broadcast Message"}
//                     {hasChatImpulse && (
//                       <span className="pointer-events-none absolute right-2 top-2 inline-flex">
//                         <span className="motion-safe:animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
//                         <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
//                       </span>
//                     )}
//                     </Button>
//                   )} */}

//                   {canShowClaims &&
//                     AUTOSET_TMS_STATE_FOR_BTNCLAIM.has(
//                       (statusCurrent ?? "").trim().toLowerCase()
//                     ) && (
//                       <Button
//                         type="button"
//                         variant="outline"
//                         onClick={onHandleClaimButton}
//                       >
//                         Create Claim
//                       </Button>
//                     )}

//                   {canShowListClaims && (
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={onHandleShowClaimListButton}
//                     >
//                       {`Claims (${claimIdsCount})`}
//                     </Button>
//                   )}
//                 </div>

//                 {/* RIGHT: Reject & Accept */}
//                 {statusCurrent?.toLowerCase() === "rfq" && (
//                   <div className="flex items-center gap-2">
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={() => {
//                         setReasonOpen(true);
//                       }}
//                     >
//                       {t("common.reject")}
//                     </Button>

//                     <Button
//                       hidden={isReadOnly}
//                       onClick={handleAccept}
//                       disabled={acceptLoading}
//                       variant="solid"
//                     >
//                       {acceptLoading
//                         ? t("common.sending") ?? "Mengirim…"
//                         : t("common.accept")}
//                     </Button>
//                   </div>
//                 )}
//                 {statusCurrent?.toLowerCase() === "accept" && (
//                   <div className="flex items-center gap-2">
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={() => {
//                         onHandleStartToPrepare();
//                       }}
//                     >
//                       Start to Preparation
//                     </Button>
//                   </div>
//                 )}
//                 {/* {statusCurrent?.toLowerCase() === "preparation" && (
//                   <div className="flex items-center gap-2">
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={() => {
//                         onHandleStartToPrepare();
//                       }}
//                     >
//                       Select Fleet and Driver
//                     </Button>
//                   </div>
//                 )} */}
//               </div>
//             </div>
//           </div>
//         </CardBody>
//       </Card>

//       <Card>
//         <CardBody>
//           {/* <div ref={chatAnchorRef} className="scroll-mt-24" /> */}
//           {/* {canShowChat && ( */}
//           <ChatterPanel
//             resModel={chatterResModel}
//             resId={chatterResId ?? null}
//             endpointBase={CHATTERS_ENDPOINT_BASE}
//             onRead={() => setHasChatImpulse(false)}
//             className="w-full"
//             currentAuthorName={currentProfileName}
//           />
//           {/* )} */}
//         </CardBody>
//       </Card>

//       {/* === Reject Confirmation Dialog === */}
//       <Modal open={reasonOpen} onClose={() => setReasonOpen(false)}>
//         <div className="space-y-3 p-5">
//           <h4 className="text-lg font-semibold text-gray-800"></h4>
//           <Field.Root value={reason} onChange={setReason}>
//             <Field.Label>Masukkan alasan Anda menolak</Field.Label>
//             <Field.Textarea rows={5}></Field.Textarea>
//             <Field.Error></Field.Error>
//             <Field.Control></Field.Control>
//           </Field.Root>
//           <div className="flex items-center gap-2">
//             <Button
//               variant="primary"
//               onClick={handleReject}
//               disabled={rejectLoading || !reason.trim()}
//             >
//               {rejectLoading ? t("common.sending") ?? "Mengirim…" : "Ya"}
//             </Button>
//             <Button
//               variant="outline"
//               onClick={() => {
//                 setReasonOpen(false);
//                 setReason("");
//               }}
//             >
//               Tidak
//             </Button>
//           </div>
//         </div>
//       </Modal>
//       {/* === Fleet & Driver Detail Dialog (wide + responsive tabs) === */}
//       <Modal open={fdOpen} onClose={() => setFdOpen(false)}>
//         <div className="box-border w-full max-w-full sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-[1000px] max-h-[80vh] overflow-y-auto overflow-x-hidden p-5 space-y-4">
//           <div className="flex items-center justify-between flex-wrap gap-3 min-w-0">
//             <h4 className="text-lg font-semibold text-gray-800 truncate">
//               Fleet &amp; Driver
//             </h4>
//             {/* Segmented tabs hanya tampil di mobile; di desktop kita tampilkan 2 kolom */}
//             <div className="md:hidden inline-flex shrink-0 rounded-lg border border-gray-200 p-1 bg-gray-50">
//               <button
//                 type="button"
//                 onClick={() => setFdTab("fleet")}
//                 className={`px-3 py-1.5 text-sm rounded-md ${
//                   fdTab === "fleet"
//                     ? "bg-white shadow font-semibold"
//                     : "text-gray-600"
//                 }`}
//               >
//                 Fleet
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setFdTab("driver")}
//                 className={`px-3 py-1.5 text-sm rounded-md ${
//                   fdTab === "driver"
//                     ? "bg-white shadow font-semibold"
//                     : "text-gray-600"
//                 }`}
//               >
//                 Driver
//               </button>
//             </div>
//           </div>

//           {/* Grid 2 kolom di desktop; di mobile tampilkan salah satu via tabs */}
//           <div className="min-w-0 grid md:grid-cols-2 gap-6">
//             {/* ===== Fleet panel ===== */}
//             <section
//               className={`${
//                 fdTab === "fleet" ? "" : "hidden md:block"
//               } min-w-0`}
//             >
//               <div className="flex items-start gap-3 mb-2">
//                 <IconCar className="mt-0.5 h-7 w-7 text-gray-700 shrink-0" />
//                 <div className="min-w-0 max-w-full">
//                   <div className="font-semibold text-gray-900">
//                     {safeLabel(vehicles, "Fleet")}
//                   </div>
//                   <p className="text-xs text-gray-500">
//                     Informasi unit kendaraan
//                   </p>
//                 </div>
//               </div>
//               {fleetLoading ? (
//                 <div className="text-sm text-gray-500">
//                   Memuat detail fleet…
//                 </div>
//               ) : fleetError ? (
//                 <div className="text-sm text-red-600">
//                   Gagal memuat detail fleet. {fleetError}
//                 </div>
//               ) : Number(vehicles?.id) > 0 && fleetInfo ? (
//                 <InfoGrid
//                   items={
//                     [
//                       [
//                         "No. Polisi",
//                         pick(fleetInfo, [
//                           "license_plate",
//                           "plate_no",
//                           "nopol",
//                           "plate",
//                         ]),
//                       ],
//                       [
//                         "Tipe / Model",
//                         pick(fleetInfo, ["vehicle_type", "type", "model"]),
//                       ],
//                       ["Merek", pick(fleetInfo, ["brand", "merk", "make"])],
//                       ["Tahun", pick(fleetInfo, ["year"])],
//                       ["Warna", pick(fleetInfo, ["color"])],
//                       [
//                         "Kapasitas (kg)",
//                         pick(fleetInfo, ["capacity_kg", "payload_kg"]),
//                       ],
//                       [
//                         "Kapasitas (CBM)",
//                         pick(fleetInfo, ["capacity_cbm", "cbm"]),
//                       ],
//                       ["Status", pick(fleetInfo, ["status", "state"])],
//                     ] as const
//                   }
//                 />
//               ) : (
//                 <div className="text-sm text-gray-500">
//                   Detail fleet tidak tersedia.
//                 </div>
//               )}
//             </section>

//             {/* ===== Driver panel ===== */}
//             <section
//               className={`${
//                 fdTab === "driver" ? "" : "hidden md:block"
//               } min-w-0`}
//             >
//               <div className="flex items-start gap-3 mb-2">
//                 <IconUser className="mt-0.5 h-7 w-7 text-gray-700 shrink-0" />
//                 <div className="min-w-0 max-w-full">
//                   <div className="font-semibold text-gray-900">
//                     {safeLabel(drivers, "Driver")}
//                   </div>
//                   <p className="text-xs text-gray-500">Informasi pengemudi</p>
//                 </div>
//               </div>
//               {driverLoading ? (
//                 <div className="text-sm text-gray-500">
//                   Memuat detail driver…
//                 </div>
//               ) : driverError ? (
//                 <div className="text-sm text-red-600">
//                   Gagal memuat detail driver. {driverError}
//                 </div>
//               ) : Number(drivers?.id) > 0 && driverInfo ? (
//                 <InfoGrid
//                   items={
//                     [
//                       ["Nama", pick(driverInfo, ["name"])],
//                       ["Mobile", pick(driverInfo, ["mobile", "phone"])],
//                       ["Email", pick(driverInfo, ["email"])],
//                       [
//                         "No. SIM",
//                         pick(driverInfo, [
//                           "drivers_license",
//                           "sim_no",
//                           "license_no",
//                         ]),
//                       ],
//                       [
//                         "Masa Berlaku SIM",
//                         pick(driverInfo, [
//                           "drivers_license_expiry",
//                           "sim_expiry",
//                         ]),
//                       ],
//                       ["NIK/KTP", pick(driverInfo, ["no_ktp", "nik"])],
//                       ["Status", pick(driverInfo, ["status", "state"])],
//                       ["Tipe User", pick(driverInfo, ["tms_user_type"])],
//                     ] as const
//                   }
//                 />
//               ) : (
//                 <div className="text-sm text-gray-500">
//                   Detail driver tidak tersedia.
//                 </div>
//               )}
//             </section>
//           </div>

//           <div className="flex justify-end pt-2">
//             <Button variant="primary" onClick={() => setFdOpen(false)}>
//               Tutup
//             </Button>
//           </div>
//         </div>
//       </Modal>

//       <ClaimListModal
//         open={claimsModalOpen}
//         onClose={() => setClaimsModalOpen(false)}
//         claims={claims}
//         loading={claimsLoading}
//       />

//       <ModalDialog
//         open={dlgOpen}
//         kind={dlgKind}
//         title={dlgTitle}
//         message={dlgMsg}
//         onClose={() => setDlgOpen(false)}
//       />
//     </div>
//   );
// }

// // "use client";
// // import { useRouter, useSearchParams } from "next/navigation";
// // import { ExtraStop } from "@/components/forms/orders/sections/ExtraStopCard";
// // import { useEffect, useMemo, useRef, useState } from "react";
// // import { StatusStep } from "@/types/status-delivery";
// // import { RecordItem } from "@/types/recorditem";
// // import {
// //   AddressItem,
// //   CityItem,
// //   ModaItem,
// //   OrdersCreateFormProps,
// //   OrderTypeItem,
// //   PartnerItem,
// //   RoleOrderProps,
// // } from "@/types/orders";
// // import {
// //   apiToLocalIsoMinute,
// //   buildDetailUrl,
// // } from "@/components/shared/Helper";
// // import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
// // import StatusDeliveryImage from "@/components/ui/DeliveryState";
// // import { goSignIn } from "@/lib/goSignIn";
// // import { getLang, t } from "@/lib/i18n";
// // import SpecialServicesCard from "@/components/forms/orders/sections/SpecialServicesCard";
// // import CostDetailsCard from "@/components/forms/orders/sections/CostDetailsCard";
// // import ShippingDocumentsCard from "@/components/forms/orders/sections/ShippingDocumentsCard";
// // import Button from "@/components/ui/Button";
// // import ChatterPanel from "@/components/chat/ChatterPanel";
// // import React from "react";
// // import { Field } from "@/components/form/FieldInput";
// // import LocationInfoCard from "@/components/forms/orders/sections/LocationInfoCard";
// // import { Modal } from "@/components/forms/orders/OrdersCreateForm";
// // import { format2comma } from "@/components/forms/orders/sections/CargoInfoCard";
// // import LookupAutocomplete, {
// //   normalizeResults,
// // } from "@/components/form/LookupAutocomplete";
// // import { IconCar, IconUser } from "@/components/icons/Icon";
// // import { ModalDialog } from "@/components/ui/ModalDialog";
// // import { TmsUserType } from "@/types/tms-profile";
// // import { ClaimItem } from "@/types/claims";
// // import { fetchOrderClaims_T } from "@/services/claimService";
// // import { ClaimListModal } from "@/components/claims/ClaimListModal";
// // import { useAuth } from "@/components/providers/AuthProvider";

// // type ExtraStopWithId = ExtraStop & { uid: string };
// // type ChatImpulseDetail = { active?: boolean; unread?: number };
// // function useChatImpulseChannel(channel: string = "orders:chat-impulse") {
// //   const [hasChatImpulse, setHasChatImpulse] = React.useState(false);
// //   React.useEffect(() => {
// //     if (typeof window === "undefined") return;

// //     const handler = (e: Event) => {
// //       const detail = (e as CustomEvent<ChatImpulseDetail>).detail;
// //       const next = Boolean(detail?.active ?? (detail?.unread ?? 0) > 0);
// //       setHasChatImpulse(next);
// //     };

// //     window.addEventListener(channel, handler as EventListener);
// //     return () => window.removeEventListener(channel, handler as EventListener);
// //   }, [channel]);

// //   return { hasChatImpulse, setHasChatImpulse };
// // }
// // const genUid = (): string =>
// //   typeof crypto !== "undefined" && "randomUUID" in crypto
// //     ? crypto.randomUUID()
// //     : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
// // const withUid = (stops: ExtraStop[]): ExtraStopWithId[] =>
// //   stops.map((s) => ({ ...s, uid: genUid() }));
// // type RouteItem = NonNullable<
// //   NonNullable<OrdersCreateFormProps["initialData"]>["route_ids"]
// // >[number];
// // function normalizeKey(s: unknown): string {
// //   return String(s ?? "")
// //     .toLowerCase()
// //     .trim()
// //     .replace(/[\s_-]+/g, "");
// // }
// // function extractApiSteps(
// //   d: NonNullable<OrdersCreateFormProps["initialData"]>
// // ): StatusStep[] {
// //   const items = (d.tms_states ?? []) as StatusStep[];
// //   return items.map((it): StatusStep => {
// //     if (typeof it === "string") {
// //       return { key: normalizeKey(it), label: it, is_current: false };
// //     }
// //     const key = normalizeKey(it.key ?? it.label);
// //     const label = it.label ?? it.key ?? "";
// //     return { key, label, is_current: Boolean(it.is_current) };
// //   });
// // }
// // // --- RecordItem sanitizer & guard ---
// // const isValidRecordItem = (v: unknown): v is RecordItem => {
// //   if (!v || typeof v !== "object" || Array.isArray(v)) return false;
// //   const o = v as Record<string, unknown>;
// //   const id = Number(o.id);
// //   const nameRaw = o.name;
// //   const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
// //   // valid jika punya name bukan "false" atau punya id > 0
// //   if (name && name.toLowerCase() !== "false") return true;
// //   return Number.isFinite(id) && id > 0;
// // };

// // const toRecordItem = (v: unknown): RecordItem | null => {
// //   if (!isValidRecordItem(v)) return null;
// //   const o = v as Record<string, unknown>;
// //   const idNum = Number(o.id);
// //   const nameRaw = typeof o.name === "string" ? o.name.trim() : "";
// //   const fallbackName = String(
// //     o.display_name ?? o.label ?? o.license_plate ?? o.plate_no ?? o.code ?? ""
// //   );
// //   const name =
// //     nameRaw && nameRaw.toLowerCase() !== "false" ? nameRaw : fallbackName;

// //   // cukup id & name saja agar aman
// //   return {
// //     id: Number.isFinite(idNum) && idNum > 0 ? idNum : (o.id as number),
// //     name,
// //   } as RecordItem;
// // };

// // function prefillFromInitial(
// //   data: NonNullable<OrdersCreateFormProps["initialData"]>
// // ) {
// //   // claim_ids_count?: number | null | 0; // ini untuk Transporter
// //   // reviewed_claim_ids_count? : number | null | 0; // ini untuk Shipper

// //   let claimCount = 0;
// //   if ("claim_ids_count" in data) {
// //     const v = (data as { claim_ids_count?: unknown }).claim_ids_count;
// //     if (typeof v === "number") {
// //       claimCount = v;
// //     } else if (typeof v === "string") {
// //       const n = Number(v);
// //       if (Number.isFinite(n)) claimCount = n;
// //     }
// //   }

// //   const form = {
// //     driver_partner: toRecordItem(data.driver_partner),
// //     fleet_vehicle: toRecordItem(data.fleet_vehicle),
// //     states: data.tms_states ? extractApiSteps(data) : ([] as StatusStep[]),
// //     noJo: data.name ?? "",
// //     customer: (data.partner as PartnerItem)?.name ?? "",
// //     namaPenerima: data.receipt_by ?? "",
// //     jenisOrder:
// //       data.order_type ??
// //       (data.order_type_id
// //         ? ({ id: data.order_type_id } as OrderTypeItem)
// //         : null),
// //     armada:
// //       data.moda ?? (data.moda_id ? ({ id: data.moda_id } as ModaItem) : null),
// //     kotaMuat:
// //       data.origin_city ??
// //       (data.origin_city_id ? ({ id: data.origin_city_id } as CityItem) : null),
// //     kotaBongkar:
// //       data.dest_city ??
// //       (data.dest_city_id ? ({ id: data.dest_city_id } as CityItem) : null),
// //     tglMuat: apiToLocalIsoMinute(data.pickup_date_planne, "08:00"),
// //     tglBongkar: apiToLocalIsoMinute(data.drop_off_date_planne, "08:00"),
// //     lokMuat: null as AddressItem | null,
// //     lokBongkar: null as AddressItem | null,

// //     origin_address_name: "",
// //     origin_street: "",
// //     origin_street2: "",
// //     origin_district_name: "",
// //     origin_zip: "",
// //     origin_latitude: "",
// //     origin_longitude: "",
// //     dest_address_name: "",
// //     dest_street: "",
// //     dest_street2: "",
// //     dest_district_name: "",
// //     dest_zip: "",
// //     dest_latitude: "",
// //     dest_longitude: "",

// //     muatanNama: data.cargo_name ?? "",
// //     muatanDeskripsi: data.cargo_description ?? "",
// //     jenisMuatan:
// //       data.cargo_type ??
// //       (data.cargo_type_id ? ({ id: data.cargo_type_id } as RecordItem) : null),

// //     cargoCBM: data.cargo_cbm,
// //     cargoQTY: data.cargo_qty,
// //     cargo_type_id: data.cargo_type_id,
// //     cargo_type: data.cargo_type,

// //     requirement_helmet: Boolean(data.requirement_helmet),
// //     requirement_apar: Boolean(data.requirement_apar),
// //     requirement_safety_shoes: Boolean(data.requirement_safety_shoes),
// //     requirement_vest: Boolean(data.requirement_vest),
// //     requirement_glasses: Boolean(data.requirement_glasses),
// //     requirement_gloves: Boolean(data.requirement_gloves),
// //     requirement_face_mask: Boolean(data.requirement_face_mask),
// //     requirement_tarpaulin: Boolean(data.requirement_tarpaulin),
// //     requirement_other: data.requirement_other ?? "",
// //     amount_shipping: data.amount_shipping ?? "",
// //     amount_shipping_multi_charge: data.amount_shipping_multi_charge ?? "",
// //     amount_tax: data.amount_tax ?? "",
// //     amount_total: data.amount_total ?? "",
// //     picMuatNama: "",
// //     picMuatTelepon: "",
// //     picBongkarNama: "",
// //     picBongkarTelepon: "",
// //     extraStops: [] as ExtraStop[],
// //     isReadOnly: false,
// //     claim_ids_count: claimCount,
// //     res_id: data.res_id,
// //     res_model: data.res_model,
// //     original_res_id: data.original_res_id,
// //     original_res_model: data.original_res_model,
// //   };

// //   const routes: RouteItem[] = Array.isArray(data.route_ids)
// //     ? (data.route_ids as RouteItem[])
// //     : ([] as RouteItem[]);

// //   function addrFromRoute(
// //     r: RouteItem | undefined,
// //     which: "origin" | "dest"
// //   ): AddressItem | null {
// //     if (!r) return null;
// //     const obj = which === "origin" ? r.origin_address : r.dest_address;
// //     if (obj && (obj as AddressItem).id) return obj as AddressItem;
// //     const id = which === "origin" ? r.origin_address_id : r.dest_address_id;
// //     return id ? ({ id } as AddressItem) : null;
// //   }
// //   const main = routes.find((r) => r.is_main_route);

// //   form.tglMuat = apiToLocalIsoMinute(main?.etd_date) || form.tglMuat;
// //   form.tglBongkar = apiToLocalIsoMinute(main?.eta_date) || form.tglBongkar;
// //   form.lokMuat = addrFromRoute(main, "origin");
// //   form.lokBongkar = addrFromRoute(main, "dest");
// //   form.picMuatNama = main?.origin_pic_name ?? "";
// //   form.picMuatTelepon = main?.origin_pic_phone ?? "";
// //   form.picBongkarNama = main?.dest_pic_name ?? "";
// //   form.picBongkarTelepon = main?.dest_pic_phone ?? "";

// //   form.origin_address_name = main?.origin_address_name ?? "";
// //   form.origin_street = main?.origin_street ?? "";
// //   form.origin_street2 = main?.origin_street2 ?? "";
// //   form.origin_district_name = main?.origin_district.name ?? "";
// //   form.origin_zip = main?.origin_zip ?? "";
// //   form.origin_latitude = main?.origin_latitude ?? "";
// //   form.origin_longitude = main?.origin_longitude ?? "";

// //   form.dest_address_name = main?.dest_address_name ?? "";
// //   form.dest_street = main?.dest_street ?? "";
// //   form.dest_street2 = main?.dest_street2 ?? "";
// //   form.dest_district_name = main?.dest_district.name ?? "";
// //   form.dest_zip = main?.dest_zip ?? "";
// //   form.dest_latitude = main?.dest_latitude ?? main?.dest_latitude ?? "";
// //   form.dest_longitude = main?.dest_longitude ?? "";

// //   if (!form.lokMuat)
// //     form.lokMuat = (data.origin_address as AddressItem) ?? null;
// //   if (!form.lokBongkar)
// //     form.lokBongkar = (data.dest_address as AddressItem) ?? null;

// //   form.amount_shipping = data.amount_shipping ?? "";
// //   form.amount_shipping_multi_charge = data.amount_shipping_multi_charge ?? "";
// //   form.amount_tax = data.amount_tax ?? "";
// //   form.amount_total = data.amount_total ?? "";

// //   const extras: RouteItem[] = routes.filter((r) => !r.is_main_route);
// //   form.extraStops = extras.map(
// //     (r): ExtraStop => ({
// //       id: r.id,
// //       lokMuat: addrFromRoute(r, "origin"),
// //       lokBongkar: addrFromRoute(r, "dest"),
// //       originPicName: r.origin_pic_name ?? "",
// //       originPicPhone: r.origin_pic_phone ?? "",
// //       destPicName: r.dest_pic_name ?? "",
// //       destPicPhone: r.dest_pic_phone ?? "",
// //       tglETDMuat: apiToLocalIsoMinute(r.etd_date) ?? r.etd_date ?? "",
// //       tglETABongkar: apiToLocalIsoMinute(r.eta_date) ?? r.eta_date ?? "",
// //       originAddressName: r.origin_address_name ?? "",
// //       originStreet: r.origin_street ?? "",
// //       originStreet2: r.origin_street2 ?? "",
// //       originDistrictName: r.origin_district.name ?? "",
// //       originZipCode: r.origin_zip ?? "",
// //       originLatitude: r.origin_latitude ?? "",
// //       originLongitude: r.origin_longitude ?? "",

// //       destAddressName: r.dest_address_name ?? "",
// //       destStreet: r.dest_street ?? "",
// //       destStreet2: r.dest_street2 ?? "",
// //       destDistrictName: r.dest_district.name ?? "",
// //       destZipCode: r.dest_zip ?? "",
// //       destLatitude: r.dest_latitude ?? "",
// //       destLongitude: r.dest_longitude ?? "",
// //     })
// //   );

// //   const current = data.states?.find((s) => s.is_current);
// //   form.isReadOnly = current
// //     ? !["draft", "pending"].includes(current.key)
// //     : false;
// //   return form;
// // }

// // // export default function PurchaseOrderForm({
// // //   mode = "edit",
// // //   orderId,
// // //   initialData,
// // //   onSuccess,
// // // }: OrdersCreateFormProps) {
// // export default function PurchaseOrderForm<T extends TmsUserType>({
// //   mode = "edit",
// //   orderId,
// //   initialData,
// //   onSuccess,
// //   userType,
// // }: RoleOrderProps<T> & { userType: T }) {
// //   const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!;
// //   const CHATTERS_ENDPOINT_BASE = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL!;
// //   const AUTOSET_STATUSES = new Set(["pickup", "delivery", "received"]);
// //   const AUTOSET_TMS_STATE_FOR_BTNCLAIM = new Set([
// //     "accept",
// //     "preparation",
// //     "pickup",
// //     "delivery",
// //     "received",
// //   ]);
// //   const { profile } = useAuth();
// //   const currentProfileName = useMemo(() => {
// //       if (profile) return profile.name;
// //       return undefined;
// //     }, [profile]);

// //   console.log("Current Profile Name:", currentProfileName);
  
// //   const router = useRouter();
// //   const searchParams = useSearchParams();
// //   const qsId = searchParams?.get("id") ?? null;
// //   const effectiveOrderId = useMemo<string | number | undefined>(() => {
// //     return orderId ?? qsId ?? undefined;
// //   }, [orderId, qsId]);
// //   const { hasChatImpulse, setHasChatImpulse } = useChatImpulseChannel();
// //   const [noJO, setNoJO] = useState<string>("");
// //   const [customer, setCustomer] = useState<string>("");
// //   const [namaPenerima, setNamaPenerima] = useState<string>("");
// //   const [kotaMuat, setKotaMuat] = useState<CityItem | null>(null);
// //   const [kotaBongkar, setKotaBongkar] = useState<CityItem | null>(null);
// //   const [jenisOrder, setJenisOrder] = useState<OrderTypeItem | null>(null);
// //   const [armada, setArmada] = useState<ModaItem | null>(null);
// //   const [tglMuat, setTglMuat] = useState<string>("");
// //   const [tglBongkar, setTglBongkar] = useState<string>("");
// //   const [lokMuat, setLokMuat] = useState<AddressItem | null>(null);
// //   const [lokBongkar, setLokBongkar] = useState<AddressItem | null>(null);
// //   const [originAddressName, setOriginAddressName] = useState<string>("");
// //   const [originStreet, setOriginStreet] = useState<string>("");
// //   const [originStreet2, setOriginStreet2] = useState<string>("");
// //   const [originDistrictName, setOriginDistrictName] = useState<string>("");
// //   const [originZipCode, setOriginZipCode] = useState<string>("");
// //   const [originLatitude, setOriginLatitude] = useState<string>("");
// //   const [originLongitude, setOriginLongitude] = useState<string>("");
// //   const [destAddressName, setDestAddressName] = useState<string>("");
// //   const [destStreet, setDestStreet] = useState<string>("");
// //   const [destStreet2, setDestStreet2] = useState<string>("");
// //   const [destDistrictName, setDestDistrictName] = useState<string>("");
// //   const [destZipCode, setDestZipCode] = useState<string>("");
// //   const [destLatitude, setDestLatitude] = useState<string>("");
// //   const [destLongitude, setDestLongitude] = useState<string>("");
// //   const [picMuatNama, setPicMuatNama] = useState<string>("");
// //   const [picMuatTelepon, setPicMuatTelepon] = useState<string>("");
// //   const [picBongkarNama, setPicBongkarNama] = useState<string>("");
// //   const [picBongkarTelepon, setPicBongkarTelepon] = useState<string>("");
// //   const [multiPickupDrop, setMultiPickupDrop] = useState<boolean>(false);
// //   const [claimIdsCount, setClaimIdsCount] = useState<number>(0);
// //   const [extraStops, setExtraStops] = useState<ExtraStopWithId[]>(() =>
// //     (
// //       [
// //         {
// //           lokMuat: null,
// //           lokBongkar: null,
// //           originPicName: "",
// //           originPicPhone: "",
// //           destPicName: "",
// //           destPicPhone: "",
// //           tglETDMuat: "",
// //           tglETABongkar: "",
// //           originAddressName: "",
// //           originStreet: "",
// //           originStreet2: "",
// //           originDistrictName: "",
// //           originZipCode: "",
// //           originLatitude: "",
// //           originLongitude: "",
// //           destAddressName: "",
// //           destStreet: "",
// //           destStreet2: "",
// //           destDistrictName: "",
// //           destZipCode: "",
// //           destLatitude: "",
// //           destLongitude: "",
// //         },
// //         {
// //           lokMuat: null,
// //           lokBongkar: null,
// //           originPicName: "",
// //           originPicPhone: "",
// //           destPicName: "",
// //           destPicPhone: "",
// //           tglETDMuat: "",
// //           tglETABongkar: "",
// //           originAddressName: "",
// //           originStreet: "",
// //           originStreet2: "",
// //           originDistrictName: "",
// //           originZipCode: "",
// //           originLatitude: "",
// //           originLongitude: "",
// //           destAddressName: "",
// //           destStreet: "",
// //           destStreet2: "",
// //           destDistrictName: "",
// //           destZipCode: "",
// //           destLatitude: "",
// //           destLongitude: "",
// //         },
// //       ] as ExtraStop[]
// //     ).map((s) => ({ ...s, uid: genUid() }))
// //   );
// //   const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
// //   const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);
// //   const [biayaKirimLabel, setAmountShipping] = useState<number | string>();
// //   const [biayaLayananTambahanLabel, setAmountShippingMultiCharge] = useState<
// //     number | string
// //   >("");
// //   const [taxLabel, setAmountTax] = useState<number | string>("");
// //   const [totalHargaLabel, setAmountTotal] = useState<number | string>("");
// //   const [errors, setErrors] = useState<Record<string, string>>({});
// //   const firstErrorRef = useRef<HTMLDivElement | null>(null);
// //   const extraRefs = useRef<Record<string, HTMLDivElement | null>>({});
// //   const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
// //   const [statusCurrent, setStatusCurrent] = useState<string | undefined>("");
// //   const [steps, setSteps] = useState<StatusStep[]>([]);
// //   const [loadingDetail, setLoadingDetail] = useState<boolean>(
// //     mode === "edit" && !initialData ? true : false
// //   );
// //   const [reasonOpen, setReasonOpen] = useState(false);
// //   const [reason, setReason] = useState<string>("");
// //   const [acceptLoading, setAcceptLoading] = useState(false);
// //   const [rejectLoading, setRejectLoading] = useState(false);
// //   /** ===== NEW: Dialog state & helpers ===== */
// //   const [dlgOpen, setDlgOpen] = useState(false);
// //   const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
// //   const [dlgTitle, setDlgTitle] = useState("");
// //   const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");
// //   function openSuccessDialog(message?: string) {
// //     setDlgKind("success");
// //     setDlgTitle(t("common.saved") ?? "Berhasil disimpan");
// //     setDlgMsg(message ?? t("common.saved_desc") ?? "Data berhasil disimpan.");
// //     setDlgOpen(true);
// //   }
// //   function openErrorDialog(err: unknown, title?: string) {
// //     const msg =
// //       (typeof err === "object" &&
// //         err !== null &&
// //         // @ts-expect-error best-effort
// //         (err.detail?.[0]?.msg || err.message || err.error)) ||
// //       String(err);
// //     setDlgKind("error");
// //     setDlgTitle(title || (t("common.failed_save") ?? "Gagal menyimpan"));
// //     setDlgMsg(
// //       <pre className="whitespace-pre-wrap text-xs text-red-700">{msg}</pre>
// //     );
// //     setDlgOpen(true);
// //   }

// //   const [isRefreshing, setIsRefreshing] = useState(false);
// //   const [isPending, startTransition] = React.useTransition();

// //   const canShowClaims = mode === "edit";
// //   const canShowListClaims = claimIdsCount > 0;

// //   const [claimsModalOpen, setClaimsModalOpen] = useState(false);
// //   const [claims, setClaims] = useState<ClaimItem[]>([]);
// //   const [claimsLoading, setClaimsLoading] = useState(false);
// //   const fetchClaims = async () => {
// //     if (!effectiveOrderId) return;

// //     setClaimsLoading(true);
// //     try {
// //       const claimsData = await fetchOrderClaims_T(effectiveOrderId);
// //       setClaims(claimsData.items);
// //     } catch (error) {
// //       console.error("Failed to fetch claims:", error);
// //       openErrorDialog(error, "Failed to load claims");
// //     } finally {
// //       setClaimsLoading(false);
// //     }
// //   };

// //   function onHandleShowClaimListButton() {
// //     setClaimsModalOpen(true);
// //     fetchClaims();
// //   }

// //   function onHandleClaimButton() {
// //     localStorage.removeItem("order-id");
// //     localStorage.setItem("order-id", String(effectiveOrderId));
// //     console.log(localStorage);
// //     router.push("/claims/create/");
// //   }

// //   const hydrateFromPrefill = React.useCallback(
// //     (f: ReturnType<typeof prefillFromInitial>) => {
// //       setNamaPenerima(f.namaPenerima);
// //       setJenisOrder(f.jenisOrder);
// //       setArmada(f.armada);
// //       setKotaMuat(f.kotaMuat);
// //       setKotaBongkar(f.kotaBongkar);
// //       setTglMuat(f.tglMuat);
// //       setTglBongkar(f.tglBongkar);
// //       setLokMuat(f.lokMuat);
// //       setLokBongkar(f.lokBongkar);
// //       setPicMuatNama(f.picMuatNama);
// //       setPicMuatTelepon(f.picMuatTelepon);
// //       setPicBongkarNama(f.picBongkarNama);
// //       setPicBongkarTelepon(f.picBongkarTelepon);

// //       setOriginAddressName(f.origin_address_name);
// //       setOriginStreet(f.origin_street);
// //       setOriginStreet2(f.origin_street2);
// //       setOriginDistrictName(f.origin_district_name);
// //       setOriginZipCode(f.origin_zip);
// //       setOriginLatitude(f.origin_latitude);
// //       setOriginLongitude(f.origin_longitude);

// //       setDestAddressName(f.dest_address_name);
// //       setDestStreet(f.dest_street);
// //       setDestStreet2(f.dest_street2);
// //       setDestDistrictName(f.dest_district_name);
// //       setDestZipCode(f.dest_zip);
// //       setDestLatitude(f.dest_latitude);
// //       setDestLongitude(f.dest_longitude);

// //       setMuatanNama(f.muatanNama);
// //       setMuatanDeskripsi(f.muatanDeskripsi);
// //       setJenisMuatan(f.cargo_type ?? null);
// //       setCargoCBMText(format2comma(f.cargoCBM));
// //       setJumlahMuatanText(format2comma(f.cargoQTY));

// //       setCustomer(f.customer);
// //       setNoJO(f.noJo);

// //       setLayananLainnya(f.requirement_other);
// //       setLayananKhusus((ls) => ({
// //         ...ls,
// //         Helm: f.requirement_helmet,
// //         APAR: f.requirement_apar,
// //         "Safety Shoes": f.requirement_safety_shoes,
// //         Rompi: f.requirement_vest,
// //         "Kaca mata": f.requirement_glasses,
// //         "Sarung tangan": f.requirement_gloves,
// //         Masker: f.requirement_face_mask,
// //         Terpal: f.requirement_tarpaulin,
// //       }));

// //       setAmountShipping(f.amount_shipping);
// //       setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
// //       setAmountTax(f.amount_tax);
// //       setAmountTotal(f.amount_total);

// //       if (f.extraStops.length > 0) {
// //         setMultiPickupDrop(true);
// //         setExtraStops(withUid(f.extraStops));
// //       } else {
// //         setMultiPickupDrop(false);
// //       }

// //       setVehicles(toRecordItem(f.fleet_vehicle));
// //       setDrivers(toRecordItem(f.driver_partner));
// //       setFleet(toRecordItem(f.fleet_vehicle));
// //       setDriver(toRecordItem(f.driver_partner));

// //       setSteps(f.states);
// //       setStatusCurrent(f.states.find((s) => s.is_current)?.key);
// //       setIsReadOnly(f.isReadOnly);
// //     },
// //     []
// //   );

// //   const softReloadDetail = React.useCallback(async () => {
// //     if (!DETAIL_URL_TPL || !effectiveOrderId) return;
// //     setIsRefreshing(true);
// //     try {
// //       const url = buildDetailUrl(DETAIL_URL_TPL, effectiveOrderId);
// //       const res = await fetch(url, {
// //         headers: { "Accept-Language": getLang() },
// //         credentials: "include",
// //         cache: "no-store",
// //       });
// //       if (res.status === 401) {
// //         goSignIn({ routerReplace: router.replace });
// //         return;
// //       }
// //       if (!res.ok) throw new Error(await res.text());
// //       const json = (await res.json()) as OrdersCreateFormProps["initialData"];
// //       if (!json) return;
// //       const f = prefillFromInitial(json);
// //       startTransition(() => {
// //         hydrateFromPrefill(f);
// //       });
// //     } catch (e) {
// //       console.error("[PurchaseOrder] soft reload failed:", e);
// //     } finally {
// //       setIsRefreshing(false);
// //     }
// //   }, [DETAIL_URL_TPL, effectiveOrderId, router.replace, hydrateFromPrefill]);

// //   async function onHandleStartToPrepare() {
// //     if (!effectiveOrderId) {
// //       openErrorDialog(
// //         "ID Purchase Order tidak ditemukan.",
// //         "Data tidak lengkap"
// //       );
// //       return;
// //     }
// //     try {
// //       setAcceptLoading(true);
// //       const url = buildPOrderActionUrl(effectiveOrderId, "preparation");
// //       const res = await fetch(url, {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           "Accept-Language": getLang(),
// //         },
// //         credentials: "include",
// //       });
// //       if (res.status === 401) {
// //         goSignIn({ routerReplace: router.replace });
// //         return;
// //       }
// //       if (!res.ok) throw new Error(await res.text());
// //       setIsReadOnly(true);
// //       onSuccess?.();
// //       // router.refresh?.();
// //       await softReloadDetail();
// //       openSuccessDialog();
// //     } catch (e) {
// //       console.error("[PurchaseOrder] accept error:", e);
// //       openErrorDialog(e);
// //     } finally {
// //       setAcceptLoading(false);
// //     }
// //   }
// //   async function onHandleSelectFleetNDriver() {
// //     if (!effectiveOrderId) {
// //       openErrorDialog(
// //         "ID Purchase Order tidak ditemukan.",
// //         "Data tidak lengkap"
// //       );
// //       return;
// //     }
// //     try {
// //       setAcceptLoading(true);
// //       const url = buildPOrderActionUrl(effectiveOrderId, "fleet-and-driver");
// //       const res = await fetch(url, {
// //         method: "POST",
// //         body: JSON.stringify({
// //           fleet_vehicle_id: Number(vehicles?.id) || vehicles?.id,
// //           driver_partner_id: Number(drivers?.id) || drivers?.id,
// //         }),
// //         headers: {
// //           "Content-Type": "application/json",
// //           "Accept-Language": getLang(),
// //         },
// //         credentials: "include",
// //       });
// //       if (res.status === 401) {
// //         goSignIn({ routerReplace: router.replace });
// //         return;
// //       }
// //       if (!res.ok) throw new Error(await res.text());
// //       setIsReadOnly(true);
// //       onSuccess?.();
// //       // router.refresh?.();
// //       await softReloadDetail();
// //       openSuccessDialog();
// //     } catch (e) {
// //       console.error("[PurchaseOrder] accept error:", e);
// //       openErrorDialog(e);
// //     } finally {
// //       setAcceptLoading(false);
// //     }
// //   }
// //   async function handleAccept() {
// //     if (!effectiveOrderId) {
// //       openErrorDialog(
// //         "ID Purchase Order tidak ditemukan.",
// //         "Data tidak lengkap"
// //       );
// //       return;
// //     }
// //     try {
// //       setAcceptLoading(true);
// //       const url = buildPOrderActionUrl(effectiveOrderId, "accept");
// //       const res = await fetch(url, {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           "Accept-Language": getLang(),
// //         },
// //         credentials: "include",
// //       });
// //       if (res.status === 401) {
// //         goSignIn({ routerReplace: router.replace });
// //         return;
// //       }
// //       if (!res.ok) throw new Error(await res.text());
// //       setIsReadOnly(true);
// //       onSuccess?.();
// //       // router.refresh?.();
// //       await softReloadDetail();
// //       openSuccessDialog();
// //     } catch (e) {
// //       console.error("[PurchaseOrder] accept error:", e);
// //       openErrorDialog(e);
// //     } finally {
// //       setAcceptLoading(false);
// //     }
// //   }
// //   async function handleReject() {
// //     if (!effectiveOrderId) {
// //       openErrorDialog(
// //         "ID Purchase Order tidak ditemukan.",
// //         "Data tidak lengkap"
// //       );
// //       return;
// //     }
// //     const r = reason.trim();
// //     if (!r) {
// //       openErrorDialog("Mohon isi alasan penolakan.", "Validasi");
// //       return;
// //     }
// //     try {
// //       setRejectLoading(true);
// //       const url = buildPOrderActionUrl(effectiveOrderId, "reject");
// //       console.log(JSON.stringify({ tms_reject_reason: r }));

// //       const res = await fetch(url, {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           "Accept-Language": getLang(),
// //         },
// //         credentials: "include",
// //         body: JSON.stringify({ tms_reject_reason: r }),
// //       });
// //       if (res.status === 401) {
// //         goSignIn({ routerReplace: router.replace });
// //         return;
// //       }
// //       if (!res.ok) throw new Error(await res.text());
// //       setReasonOpen(false);
// //       setReason("");
// //       setIsReadOnly(true);
// //       onSuccess?.();
// //       // router.refresh?.();
// //       await softReloadDetail();
// //       openSuccessDialog();
// //     } catch (e) {
// //       console.error("[PurchaseOrder] reject error:", e);
// //       openErrorDialog(e);
// //     } finally {
// //       setRejectLoading(false);
// //     }
// //   }

// //   const [chatterResModel, setChatterResModel] = useState<string>("");
// //   const [chatterResId, setChatterResId] = useState<string | number | undefined>(
// //     undefined
// //   );
// //   // const chatCtx = useMemo(() => {
// //   //   const fallbackId = effectiveOrderId ?? null;
// //   //   const d = initialData as unknown;

// //   //   if (!d || typeof d !== "object" || Array.isArray(d)) {
// //   //     return {
// //   //       resModel: null as string | null,
// //   //       resId: fallbackId as string | number | null,
// //   //     };
// //   //   }

// //   //   const o = d as Record<string, unknown>;
// //   //   const resModelRaw = o["res_model"] ?? o["resModel"];
// //   //   const resModel =
// //   //     typeof resModelRaw === "string" ? String(resModelRaw).trim() : null;

// //   //   const ridRaw = o["res_id"] ?? o["resId"] ?? o["id"];
// //   //   const rid =
// //   //     typeof ridRaw === "string" || typeof ridRaw === "number"
// //   //       ? (ridRaw as string | number)
// //   //       : (fallbackId as string | number | null);

// //   //   return {
// //   //     resModel: resModel && resModel.length ? resModel : null,
// //   //     resId: rid ?? null,
// //   //   };
// //   // }, [initialData, effectiveOrderId]);

// //   // const canShowChat =
// //   //   Boolean(chatCtx.resModel) &&
// //   //   chatCtx.resId != null &&
// //   //   String(chatCtx.resId).trim() !== "";

// //   const chatAnchorRef = useRef<HTMLDivElement | null>(null);

// //   const layananPreset = [
// //     "Helm",
// //     "APAR",
// //     "Safety Shoes",
// //     "Rompi",
// //     "Kaca mata",
// //     "Sarung tangan",
// //     "Masker",
// //     "Terpal",
// //   ] as const;
// //   type Layanan = (typeof layananPreset)[number];
// //   const [layananKhusus, setLayananKhusus] = useState<Record<Layanan, boolean>>(
// //     () =>
// //       Object.fromEntries(layananPreset.map((k) => [k, false])) as Record<
// //         Layanan,
// //         boolean
// //       >
// //   );
// //   const [layananLainnya, setLayananLainnya] = useState<string>("");
// //   const [muatanNama, setMuatanNama] = useState<string>("");
// //   const [muatanDeskripsi, setMuatanDeskripsi] = useState<string>("");
// //   const [jenisMuatan, setJenisMuatan] = useState<RecordItem | null>(null);
// //   const [cargoCBMText, setCargoCBMText] = useState<string>("");
// //   const [jumlahMuatanText, setJumlahMuatanText] = useState<string>("");
// //   const [urlCandidateFleet, setUrlCandidateFleet] = useState<string>("");
// //   const [urlCandidateDriver, setUrlCandidateDriver] = useState<string>("");
// //   const [vehicles, setVehicles] = useState<RecordItem | null>(null);
// //   const [drivers, setDrivers] = useState<RecordItem | null>(null);
// //   const [uVehicle, setFleet] = useState<RecordItem | null>(null);
// //   const [uDriver, setDriver] = useState<RecordItem | null>(null);
// //   const [fdOpen, setFdOpen] = useState(false);

// //   type KV = ReadonlyArray<readonly [label: string, value: string]>;
// //   const InfoGrid: React.FC<{ items: KV }> = ({ items }) => (
// //     <dl className="min-w-0 max-w-full overflow-hidden grid grid-cols-[auto,1fr] md:grid-cols-[auto,1fr,auto,1fr] gap-x-3 gap-y-1 text-sm">
// //       {items.map(([label, value]) => (
// //         <React.Fragment key={label}>
// //           <dt className="text-gray-500 whitespace-nowrap pr-2">{label}</dt>
// //           <dd className="font-medium min-w-0 break-words whitespace-pre-wrap">
// //             {value}
// //           </dd>
// //         </React.Fragment>
// //       ))}
// //     </dl>
// //   );

// //   type FdTab = "fleet" | "driver";
// //   const [fdTab, setFdTab] = useState<FdTab>("fleet");
// //   /** For Fleet and Driver Dialog */
// //   type JsonObject = Record<string, unknown>;
// //   const [fleetInfo, setFleetInfo] = useState<JsonObject | null>(null);
// //   const [driverInfo, setDriverInfo] = useState<JsonObject | null>(null);
// //   const [fleetLoading, setFleetLoading] = useState(false);
// //   const [driverLoading, setDriverLoading] = useState(false);
// //   const [fleetError, setFleetError] = useState<string | null>(null);
// //   const [driverError, setDriverError] = useState<string | null>(null);

// //   const isRecord = (v: unknown): v is Record<string, unknown> =>
// //     typeof v === "object" && v !== null && !Array.isArray(v);

// //   const errorMessage = (e: unknown): string => {
// //     if (e instanceof Error) return e.message;
// //     if (typeof e === "string") return e;
// //     if (isRecord(e) && typeof e.message === "string") return String(e.message);
// //     try {
// //       return JSON.stringify(e);
// //     } catch {
// //       return "Unknown error";
// //     }
// //   };

// //   const firstErrorKey = useMemo(() => {
// //     const order = ["namaPenerima", "lokBongkar"] as const;
// //     return order.find((k) => errors[k]);
// //   }, [errors]);

// //   useEffect(() => {
// //     if (!initialData) return;
// //     const f = prefillFromInitial(initialData);

// //     setChatterResModel(
// //       typeof f.res_model === "string" ? f.res_model : String(f.res_model ?? "")
// //     );
// //     setChatterResId(
// //       typeof f.res_id === "string" || typeof f.res_id === "number"
// //         ? f.res_id
// //         : undefined
// //     );

// //     setNamaPenerima(f.namaPenerima);
// //     setJenisOrder(f.jenisOrder);
// //     setArmada(f.armada);
// //     setKotaMuat(f.kotaMuat);
// //     setKotaBongkar(f.kotaBongkar);
// //     setTglMuat(f.tglMuat);
// //     setTglBongkar(f.tglBongkar);
// //     setLokMuat(f.lokMuat);
// //     setLokBongkar(f.lokBongkar);
// //     setPicMuatNama(f.picMuatNama);
// //     setPicMuatTelepon(f.picMuatTelepon);
// //     setPicBongkarNama(f.picBongkarNama);
// //     setPicBongkarTelepon(f.picBongkarTelepon);
// //     setMuatanNama(f.muatanNama);
// //     setMuatanDeskripsi(f.muatanDeskripsi);
// //     setJenisMuatan(f.cargo_type ?? null);
// //     setJenisOrder(f.jenisOrder);
// //     setArmada(f.armada);
// //     setCustomer(f.customer);
// //     setNoJO(f.noJo);
// //     setLayananLainnya(f.requirement_other);
// //     setLayananKhusus((ls) => ({
// //       ...ls,
// //       Helm: f.requirement_helmet,
// //       APAR: f.requirement_apar,
// //       "Safety Shoes": f.requirement_safety_shoes,
// //       Rompi: f.requirement_vest,
// //       "Kaca mata": f.requirement_glasses,
// //       "Sarung tangan": f.requirement_gloves,
// //       Masker: f.requirement_face_mask,
// //       Terpal: f.requirement_tarpaulin,
// //     }));
// //     setAmountShipping(f.amount_shipping);
// //     setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
// //     setAmountTax(f.amount_tax);
// //     setAmountTotal(f.amount_total);
// //     if (f.extraStops.length > 0) {
// //       setMultiPickupDrop(true);
// //       setExtraStops(withUid(f.extraStops));
// //     }

// //     setVehicles(f.fleet_vehicle);
// //     setDrivers(f.driver_partner);
// //     setFleet(f.fleet_vehicle);
// //     setDriver(f.driver_partner);

// //     if (userType === "transporter") {
// //       setClaimIdsCount(Number(f.claim_ids_count ?? 0));
// //     }

// //     setSteps(f.states);
// //     setStatusCurrent(f.states.find((s) => s.is_current)?.key);
// //     setLoadingDetail(false);
// //   }, [initialData, userType]);

// //   useEffect(() => {
// //     if (mode !== "edit" || initialData) return;
// //     if (!effectiveOrderId) {
// //       setLoadingDetail(false);
// //       return;
// //     }
// //     if (!DETAIL_URL_TPL) {
// //       setLoadingDetail(false);
// //       return;
// //     }
// //     const url = buildDetailUrl(DETAIL_URL_TPL, effectiveOrderId);
// //     const abort = new AbortController();
// //     (async () => {
// //       try {
// //         setLoadingDetail(true);
// //         const res = await fetch(url, {
// //           headers: { "Accept-Language": getLang() },
// //           credentials: "include",
// //           signal: abort.signal,
// //         });
// //         if (res.status === 401) {
// //           goSignIn({ routerReplace: router.replace });
// //           return;
// //         }
// //         if (!res.ok) throw new Error(await res.text());
// //         const json = (await res.json()) as OrdersCreateFormProps["initialData"];
// //         if (json) {
// //           console.log("JSON DISINI: ", json);
// //           const f = prefillFromInitial(json);
// //           console.log("f prefillFromInit: ", f);

// //           setFleet(f?.fleet_vehicle);
// //           setDriver(f?.driver_partner);

// //           setNamaPenerima(f.namaPenerima);
// //           setJenisOrder(f.jenisOrder);
// //           setArmada(f.armada);
// //           setKotaMuat(f.kotaMuat);
// //           setKotaBongkar(f.kotaBongkar);
// //           setTglMuat(f.tglMuat);
// //           setTglBongkar(f.tglBongkar);
// //           setLokMuat(f.lokMuat);
// //           setLokBongkar(f.lokBongkar);
// //           setPicMuatNama(f.picMuatNama);
// //           setPicMuatTelepon(f.picMuatTelepon);
// //           setPicBongkarNama(f.picBongkarNama);
// //           setPicBongkarTelepon(f.picBongkarTelepon);
// //           setOriginAddressName(f.origin_address_name);
// //           setOriginStreet(f.origin_street);
// //           setOriginStreet2(f.origin_street2);
// //           setOriginDistrictName(f.origin_district_name);
// //           setOriginZipCode(f.origin_zip);
// //           setOriginLatitude(f.origin_latitude);
// //           setOriginLongitude(f.origin_longitude);
// //           setCargoCBMText(format2comma(f.cargoCBM));
// //           setJumlahMuatanText(format2comma(f.cargoQTY));
// //           setDestAddressName(f.dest_address_name);
// //           setDestStreet(f.dest_street);
// //           setDestStreet2(f.dest_street2);
// //           setDestDistrictName(f.dest_district_name);
// //           setDestZipCode(f.dest_zip);
// //           setDestLatitude(f.dest_latitude);
// //           setDestLongitude(f.dest_longitude);
// //           setMuatanNama(f.muatanNama);
// //           setMuatanDeskripsi(f.muatanDeskripsi);
// //           setJenisOrder(f.jenisOrder);
// //           setArmada(f.armada);
// //           setJenisMuatan(f.cargo_type ?? null);
// //           setCustomer(f.customer);
// //           setNoJO(f.noJo);
// //           setAmountShipping(f.amount_shipping);
// //           setAmountShippingMultiCharge(f.amount_shipping_multi_charge);
// //           setAmountTax(f.amount_tax);
// //           setAmountTotal(f.amount_total);
// //           setLayananLainnya(f.requirement_other);

// //           setChatterResModel(
// //             typeof f.res_model === "string"
// //               ? f.res_model
// //               : String(f.res_model ?? "")
// //           );
// //           setChatterResId(
// //             typeof f.res_id === "string" || typeof f.res_id === "number"
// //               ? f.res_id
// //               : undefined
// //           );

// //           if (userType === "transporter") {
// //             setClaimIdsCount(Number(f?.claim_ids_count ?? 0));
// //           }

// //           setLayananKhusus((ls) => ({
// //             ...ls,
// //             Helm: f.requirement_helmet,
// //             APAR: f.requirement_apar,
// //             "Safety Shoes": f.requirement_safety_shoes,
// //             Rompi: f.requirement_vest,
// //             "Kaca mata": f.requirement_glasses,
// //             "Sarung tangan": f.requirement_gloves,
// //             Masker: f.requirement_face_mask,
// //             Terpal: f.requirement_tarpaulin,
// //           }));
// //           if (f.extraStops.length > 0) {
// //             setMultiPickupDrop(true);
// //             setExtraStops(withUid(f.extraStops));
// //           }
// //           setSteps(f.states);
// //           setStatusCurrent(f.states.find((s) => s.is_current)?.key);
// //           setIsReadOnly(f.isReadOnly);
// //         }
// //       } catch (err) {
// //         console.error("[OrderDetail] fetch error:", err);
// //       } finally {
// //         setLoadingDetail(false);
// //       }
// //     })();
// //     return () => abort.abort();
// //   }, [mode, effectiveOrderId, initialData, router.replace, userType]);

// //   // for candidate Fleet and Driver
// //   useEffect(() => {
// //     if (statusCurrent?.toLowerCase() === "preparation" && effectiveOrderId) {
// //       setUrlCandidateFleet(
// //         buildLookupUrlCandidate(effectiveOrderId, "candidate-fleets")
// //       );
// //       setUrlCandidateDriver(
// //         buildLookupUrlCandidate(effectiveOrderId, "candidate-drivers")
// //       );
// //     }
// //   }, [statusCurrent, effectiveOrderId]);

// //   useEffect(() => {
// //     const s = (statusCurrent ?? "").trim().toLowerCase();
// //     if (mode === "edit" && (AUTOSET_STATUSES.has(s) || s === "preparation")) {
// //       const d = toRecordItem(uDriver);
// //       const v = toRecordItem(uVehicle);
// //       if (d) setDrivers(d); // hanya set kalau valid
// //       if (v) setVehicles(v); // hanya set kalau valid
// //     }
// //   }, [mode, statusCurrent, uDriver, uVehicle]);

// //   function buildPOrderActionUrl(
// //     id: string | number,
// //     action: "accept" | "reject" | "preparation" | "fleet-and-driver"
// //   ): string {
// //     const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
// //     return `${base}/${action}`;
// //   }

// //   function buildLookupUrlCandidate(
// //     id: string | number,
// //     action: "candidate-fleets" | "candidate-drivers"
// //   ): string {
// //     const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
// //     return `${base}/${action}`;
// //   }

// //   function safeLabel(x: unknown, fallback: string) {
// //     const r = toRecordItem(x);
// //     if (!r) return fallback;
// //     const nm = String(r.name ?? "").trim();
// //     if (nm && nm.toLowerCase() !== "false") return nm;
// //     return r.id ? `${fallback} #${r.id}` : fallback;
// //   }

// //   // Primitive guard
// //   const isPrimitive = (v: unknown): v is string | number | boolean =>
// //     typeof v === "string" || typeof v === "number" || typeof v === "boolean";
// //   const fmtValue = (v: unknown): string => {
// //     if (v === null || v === undefined) return "-";
// //     if (isPrimitive(v)) {
// //       if (typeof v === "boolean") return v ? "Ya" : "Tidak";
// //       const s = String(v).trim();
// //       return s.length ? s : "-";
// //     }
// //     if (Array.isArray(v)) {
// //       const parts = v.map(fmtValue).filter((s) => s !== "-");
// //       return parts.length ? parts.join(", ") : "-";
// //     }
// //     if (isRecord(v)) {
// //       // Urutan kunci yang umum dipakai oleh API (ambil yang pertama tersedia)
// //       const keyOrder = [
// //         "display_name",
// //         "name",
// //         "label",
// //         "full_name",
// //         "model",
// //         "type",
// //         "description",
// //         "value",
// //         "code",
// //         "license_plate",
// //         "plate",
// //         "plate_no",
// //         "nopol",
// //         "id",
// //       ] as const;
// //       for (const k of keyOrder) {
// //         if (k in v) {
// //           const s = fmtValue((v as Record<string, unknown>)[k]);
// //           if (s !== "-") return s;
// //         }
// //       }
// //       // Fallback: gabungkan leaf primitives yang ada
// //       const acc: string[] = [];
// //       for (const [_, val] of Object.entries(v)) {
// //         const s = fmtValue(val);
// //         if (s !== "-") acc.push(s);
// //       }
// //       return acc.length ? acc.join(", ") : "-";
// //     }
// //     return "-";
// //   };

// //   function pick(
// //     obj: JsonObject | null | undefined,
// //     keys: string[],
// //     fallback = "-"
// //   ): string {
// //     for (const k of keys) {
// //       if (!obj) break;
// //       if (k in obj) {
// //         const s = fmtValue(obj[k]);
// //         if (s !== "-") return s;
// //       }
// //     }
// //     return fallback;
// //   }

// //   useEffect(() => {
// //     if (!fdOpen) return;
// //     const fId = Number(vehicles?.id);
// //     const dId = Number(drivers?.id);
// //     const fleetsTpl = process.env.NEXT_PUBLIC_TMS_FLEETS_URL || "";
// //     const driversTpl = process.env.NEXT_PUBLIC_TMS_DRIVERS_URL || "";
// //     const abort = new AbortController();

// //     (async () => {
// //       // Fleet
// //       if (fleetsTpl && Number.isFinite(fId) && fId > 0) {
// //         try {
// //           setFleetLoading(true);
// //           setFleetError(null);
// //           const res = await fetch(buildDetailUrl(fleetsTpl, fId), {
// //             credentials: "include",
// //             headers: { "Accept-Language": getLang() },
// //             signal: abort.signal,
// //           });
// //           if (!res.ok) throw new Error(await res.text());
// //           // setFleetInfo(await res.json());
// //           {
// //             const data: unknown = await res.json();
// //             setFleetInfo(isRecord(data) ? (data as JsonObject) : null);
// //           }
// //         } catch (e: unknown) {
// //           setFleetError(errorMessage(e));
// //           setFleetInfo(null);
// //         } finally {
// //           setFleetLoading(false);
// //         }
// //       } else {
// //         setFleetInfo(null);
// //         setFleetError(null);
// //       }

// //       // Driver
// //       if (driversTpl && Number.isFinite(dId) && dId > 0) {
// //         try {
// //           setDriverLoading(true);
// //           setDriverError(null);
// //           const res = await fetch(buildDetailUrl(driversTpl, dId), {
// //             credentials: "include",
// //             headers: { "Accept-Language": getLang() },
// //             signal: abort.signal,
// //           });
// //           if (!res.ok) throw new Error(await res.text());
// //           // setDriverInfo(await res.json());
// //           {
// //             const data: unknown = await res.json();
// //             setDriverInfo(isRecord(data) ? (data as JsonObject) : null);
// //           }
// //         } catch (e: unknown) {
// //           setDriverError(errorMessage(e));
// //           setDriverInfo(null);
// //         } finally {
// //           setDriverLoading(false);
// //         }
// //       } else {
// //         setDriverInfo(null);
// //         setDriverError(null);
// //       }
// //     })();

// //     return () => abort.abort();
// //   }, [fdOpen, vehicles?.id, drivers?.id]);

// //   console.log(statusCurrent);
// //   console.log("chatterResModel:", chatterResModel);
// //   console.log("chatterResId:", chatterResId);

// //   return (
// //     <div className="space-y-4 ">
// //       {steps.length > 0 && (
// //         <Card className="sticky top-14 z-30">
// //           <CardBody>
// //             <StatusDeliveryImage
// //               showTruck={false}
// //               steps={steps}
// //               width={1200}
// //               height={90}
// //             />
// //           </CardBody>
// //         </Card>
// //       )}
// //       <Card className="!border-0">
// //         <CardBody>
// //           <div className="flex flex-col sm:flex-row gap-6">
// //             {/* ===== Left Column ===== */}
// //             <div className="md:basis-2/3  min-w-0 space-y-4">
// //               <Card>
// //                 <CardHeader>
// //                   <h4 className="text-3xl font-semibold text-gray-800">
// //                     {t("orders.create.info_order")}
// //                   </h4>
// //                 </CardHeader>
// //                 <CardBody>
// //                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
// //                     <Field.Root value={noJO || ""} onChange={() => {}} disabled>
// //                       <Field.Label>{t("orders.no_jo")}</Field.Label>
// //                       <Field.Control>
// //                         <Field.Input className="w-full" />
// //                       </Field.Control>
// //                     </Field.Root>
// //                     <Field.Root
// //                       value={customer || ""}
// //                       onChange={() => {}}
// //                       disabled
// //                     >
// //                       <Field.Label>{t("orders.customer")}</Field.Label>
// //                       <Field.Control>
// //                         <Field.Input className="w-full" />
// //                       </Field.Control>
// //                     </Field.Root>
// //                     <Field.Root
// //                       value={lokMuat?.name || ""}
// //                       onChange={() => {}}
// //                       disabled
// //                     >
// //                       <Field.Label>{t("orders.lokasi_muat")}</Field.Label>
// //                       <Field.Control>
// //                         <Field.Textarea
// //                           className="w-full"
// //                           rows={4}
// //                           readOnly={isReadOnly}
// //                         />
// //                       </Field.Control>
// //                     </Field.Root>
// //                     <Field.Root
// //                       value={lokBongkar?.name || ""}
// //                       onChange={() => {}}
// //                       disabled
// //                     >
// //                       <Field.Label>{t("orders.lokasi_bongkar")}</Field.Label>
// //                       <Field.Control>
// //                         <Field.Textarea
// //                           className="w-full"
// //                           rows={4}
// //                           readOnly={isReadOnly}
// //                         />
// //                       </Field.Control>
// //                     </Field.Root>

// //                     <Field.Root
// //                       value={armada?.name || ""}
// //                       onChange={() => {}}
// //                       disabled
// //                     >
// //                       <Field.Label>{t("orders.armada")}</Field.Label>
// //                       <Field.Control>
// //                         <Field.Input className="w-full" />
// //                       </Field.Control>
// //                     </Field.Root>
// //                   </div>
// //                 </CardBody>
// //               </Card>

// //               <LocationInfoCard
// //                 isReadOnly={true}
// //                 tglMuat={tglMuat}
// //                 setTglMuat={setTglMuat}
// //                 tglBongkar={tglBongkar}
// //                 setTglBongkar={setTglBongkar}
// //                 kotaMuat={kotaMuat}
// //                 kotaBongkar={kotaBongkar}
// //                 lokMuat={lokMuat}
// //                 setLokMuat={setLokMuat}
// //                 lokBongkar={lokBongkar}
// //                 setLokBongkar={setLokBongkar}
// //                 picMuatNama={picMuatNama}
// //                 setPicMuatNama={setPicMuatNama}
// //                 picMuatTelepon={picMuatTelepon}
// //                 setPicMuatTelepon={setPicMuatTelepon}
// //                 picBongkarNama={picBongkarNama}
// //                 setPicBongkarNama={setPicBongkarNama}
// //                 picBongkarTelepon={picBongkarTelepon}
// //                 setPicBongkarTelepon={setPicBongkarTelepon}
// //                 originAddressName={originAddressName}
// //                 originStreet={originStreet}
// //                 originStreet2={originStreet2}
// //                 originDistrictName={originDistrictName}
// //                 originZipCode={originZipCode}
// //                 originLatitude={originLatitude}
// //                 originLongitude={originLongitude}
// //                 destAddressName={destAddressName}
// //                 destStreet={destStreet}
// //                 destStreet2={destStreet2}
// //                 destDistrictName={destDistrictName}
// //                 destZipCode={destZipCode}
// //                 destLatitude={destLatitude}
// //                 destLongitude={destLongitude}
// //                 multiPickupDrop={multiPickupDrop}
// //                 setMultiPickupDrop={setMultiPickupDrop}
// //                 extraStops={extraStops}
// //                 setExtraStops={setExtraStops}
// //                 errors={errors}
// //                 firstErrorKey={firstErrorKey}
// //                 firstErrorRef={firstErrorRef}
// //                 extraRefs={extraRefs}
// //               />

// //               <SpecialServicesCard
// //                 isReadOnly={true}
// //                 layananPreset={layananPreset}
// //                 layananKhusus={layananKhusus}
// //                 setLayananKhusus={setLayananKhusus}
// //                 layananLainnya={layananLainnya}
// //                 setLayananLainnya={setLayananLainnya}
// //               />
// //             </div>

// //             {/* ===== Right Column ===== */}
// //             <div className="md:basis-1/3  min-w-0 space-y-4">
// //               {statusCurrent?.toLowerCase() === "preparation" && (
// //                 <Card className="bg-primary/60">
// //                   <CardHeader>
// //                     <h4 className="text-3xl font-semibold text-gray-800">
// //                       Fleet and Driver
// //                     </h4>
// //                   </CardHeader>
// //                   <CardBody>
// //                     {urlCandidateFleet && (
// //                       <LookupAutocomplete
// //                         label={"Fleet"}
// //                         placeholder={t("common.search_fleet")}
// //                         value={vehicles as RecordItem | null}
// //                         onChange={(v) => setVehicles(toRecordItem(v))}
// //                         endpoint={{
// //                           url: urlCandidateFleet,
// //                           method: "GET",
// //                           queryParam: "query",
// //                           pageParam: "page",
// //                           pageSizeParam: "page_size",
// //                           page: 1,
// //                           pageSize: 50,
// //                           mapResults: normalizeResults,
// //                         }}
// //                         cacheNamespace="fleet-candidate"
// //                         prefetchQuery=""
// //                       />
// //                     )}
// //                     {urlCandidateDriver && (
// //                       <LookupAutocomplete
// //                         label={"Driver"}
// //                         placeholder={t("common.search_driver")}
// //                         value={drivers as RecordItem | null}
// //                         onChange={(v) => setDrivers(toRecordItem(v))}
// //                         endpoint={{
// //                           url: urlCandidateDriver,
// //                           method: "GET",
// //                           queryParam: "query",
// //                           pageParam: "page",
// //                           pageSizeParam: "page_size",
// //                           page: 1,
// //                           pageSize: 50,
// //                           mapResults: normalizeResults,
// //                         }}
// //                         cacheNamespace="driver-candidate"
// //                         prefetchQuery=""
// //                       />
// //                     )}
// //                   </CardBody>
// //                   <CardFooter>
// //                     <Button
// //                       type="button"
// //                       variant="solid"
// //                       onClick={onHandleSelectFleetNDriver}
// //                       disabled={acceptLoading}
// //                     >
// //                       {acceptLoading ? "sending..." : "Submit"}
// //                     </Button>
// //                   </CardFooter>
// //                 </Card>
// //               )}

// //               {mode === "edit" &&
// //                 AUTOSET_STATUSES.has(
// //                   (statusCurrent ?? "").trim().toLowerCase()
// //                 ) && (
// //                   <Card className="bg-primary/60">
// //                     <CardHeader>
// //                       <h4 className="text-3xl font-semibold text-gray-800">
// //                         Fleet and Driver
// //                       </h4>
// //                     </CardHeader>
// //                     <CardBody>
// //                       <Field.Root
// //                         value={safeLabel(vehicles, "Fleet")}
// //                         onChange={() => {}}
// //                         disabled
// //                       >
// //                         <Field.Label>Fleet</Field.Label>
// //                         <Field.Input className="w-full"></Field.Input>
// //                       </Field.Root>
// //                       <Field.Root
// //                         value={safeLabel(drivers, "Driver")}
// //                         onChange={() => {}}
// //                         disabled
// //                       >
// //                         <Field.Label>Driver</Field.Label>
// //                         <Field.Input className="w-full"></Field.Input>
// //                       </Field.Root>
// //                     </CardBody>
// //                     <CardFooter>
// //                       <Button variant="ghost" onClick={() => setFdOpen(true)}>
// //                         Detail
// //                       </Button>
// //                     </CardFooter>
// //                   </Card>
// //                 )}

// //               <Card>
// //                 <CardHeader>
// //                   <h4 className="text-3xl font-semibold text-gray-800">
// //                     {t("orders.info_muatan")}
// //                   </h4>
// //                 </CardHeader>
// //                 <CardBody>
// //                   <Field.Root value={muatanNama} onChange={() => {}} disabled>
// //                     <Field.Label>{t("orders.muatan_nama")}</Field.Label>
// //                     <Field.Input className="w-full"></Field.Input>
// //                   </Field.Root>

// //                   <Field.Root value={cargoCBMText} onChange={() => {}} disabled>
// //                     <Field.Label>Dimensi CBM</Field.Label>
// //                     <Field.Input className="w-full"></Field.Input>
// //                   </Field.Root>

// //                   <Field.Root
// //                     value={jenisMuatan?.name ?? ""}
// //                     onChange={() => {}}
// //                     disabled
// //                   >
// //                     <Field.Label>{t("orders.jenis_cargo")}</Field.Label>
// //                     <Field.Input className="w-full"></Field.Input>
// //                   </Field.Root>

// //                   <Field.Root
// //                     value={jumlahMuatanText}
// //                     onChange={() => {}}
// //                     disabled
// //                   >
// //                     <Field.Label>Jumlah Muatan</Field.Label>
// //                     <Field.Input className="w-full"></Field.Input>
// //                   </Field.Root>

// //                   <Field.Root
// //                     value={muatanDeskripsi ?? ""}
// //                     onChange={() => {}}
// //                     disabled
// //                   >
// //                     <Field.Label>{t("orders.muatan_deskripsi")}</Field.Label>
// //                     <Field.Control>
// //                       <Field.Textarea
// //                         className="w-full"
// //                         rows={4}
// //                         readOnly={isReadOnly}
// //                       />
// //                     </Field.Control>
// //                   </Field.Root>
// //                 </CardBody>
// //               </Card>

// //               <CostDetailsCard
// //                 isShowNotes={false}
// //                 biayaKirimLabel={biayaKirimLabel}
// //                 biayaLayananTambahanLabel={biayaLayananTambahanLabel}
// //                 taxLabel={taxLabel}
// //                 totalHargaLabel={totalHargaLabel}
// //               />

// //               <ShippingDocumentsCard
// //                 dokumenFiles={dokumenFiles}
// //                 setDokumenFiles={setDokumenFiles}
// //                 sjPodFiles={sjPodFiles}
// //                 setSjPodFiles={setSjPodFiles}
// //               />
// //             </div>

// //             {/* === Bottom Action Bar === */}
// //             <div
// //               className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70"
// //               role="region"
// //               aria-label="Form actions"
// //             >
// //               <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-2">
// //                 {/* LEFT: Chat / Broadcast */}
// //                 <div className="flex items-center gap-2">
// //                   {(isRefreshing || isPending) && (
// //                     <span
// //                       className="text-xs text-gray-500 select-none"
// //                       aria-live="polite"
// //                     >
// //                       Updating…
// //                     </span>
// //                   )}

// //                   {/* {canShowChat && (
// //                     <Button
// //                     type="button"
// //                     variant="outline"
// //                     onClick={() => {
// //                       chatAnchorRef.current?.scrollIntoView({
// //                         behavior: "smooth",
// //                         block: "start",
// //                       });
// //                       setHasChatImpulse(false);
// //                     }}
// //                     className={`relative pr-8 ${
// //                       hasChatImpulse ? "motion-safe:animate-pulse" : ""
// //                     }`}
// //                     aria-label={
// //                       t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
// //                     }
// //                     title={
// //                       t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
// //                     }
// //                   >
// //                     {t("orders.chat_broadcast") ?? "Chat / Broadcast Message"}
// //                     {hasChatImpulse && (
// //                       <span className="pointer-events-none absolute right-2 top-2 inline-flex">
// //                         <span className="motion-safe:animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
// //                         <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
// //                       </span>
// //                     )}
// //                     </Button>
// //                   )} */}

// //                   {canShowClaims &&
// //                     AUTOSET_TMS_STATE_FOR_BTNCLAIM.has(
// //                       (statusCurrent ?? "").trim().toLowerCase()
// //                     ) && (
// //                       <Button
// //                         type="button"
// //                         variant="outline"
// //                         onClick={onHandleClaimButton}
// //                       >
// //                         Create Claim
// //                       </Button>
// //                     )}

// //                   {canShowListClaims && (
// //                     <Button
// //                       type="button"
// //                       variant="ghost"
// //                       onClick={onHandleShowClaimListButton}
// //                     >
// //                       {`Claims (${claimIdsCount})`}
// //                     </Button>
// //                   )}
// //                 </div>

// //                 {/* RIGHT: Reject & Accept */}
// //                 {statusCurrent?.toLowerCase() === "rfq" && (
// //                   <div className="flex items-center gap-2">
// //                     <Button
// //                       type="button"
// //                       variant="ghost"
// //                       onClick={() => {
// //                         setReasonOpen(true);
// //                       }}
// //                     >
// //                       {t("common.reject")}
// //                     </Button>

// //                     <Button
// //                       hidden={isReadOnly}
// //                       onClick={handleAccept}
// //                       disabled={acceptLoading}
// //                       variant="solid"
// //                     >
// //                       {acceptLoading
// //                         ? t("common.sending") ?? "Mengirim…"
// //                         : t("common.accept")}
// //                     </Button>
// //                   </div>
// //                 )}
// //                 {statusCurrent?.toLowerCase() === "accept" && (
// //                   <div className="flex items-center gap-2">
// //                     <Button
// //                       type="button"
// //                       variant="ghost"
// //                       onClick={() => {
// //                         onHandleStartToPrepare();
// //                       }}
// //                     >
// //                       Start to Preparation
// //                     </Button>
// //                   </div>
// //                 )}
// //                 {/* {statusCurrent?.toLowerCase() === "preparation" && (
// //                   <div className="flex items-center gap-2">
// //                     <Button
// //                       type="button"
// //                       variant="ghost"
// //                       onClick={() => {
// //                         onHandleStartToPrepare();
// //                       }}
// //                     >
// //                       Select Fleet and Driver
// //                     </Button>
// //                   </div>
// //                 )} */}
// //               </div>
// //             </div>
// //           </div>
// //         </CardBody>
// //       </Card>

// //       <Card>
// //         <CardBody>
// //           {/* <div ref={chatAnchorRef} className="scroll-mt-24" /> */}
// //           {/* {canShowChat && ( */}
// //           <ChatterPanel
// //             resModel={chatterResModel}
// //             resId={chatterResId ?? null}
// //             endpointBase={CHATTERS_ENDPOINT_BASE}
// //             onRead={() => setHasChatImpulse(false)}
// //             className="w-full"
// //             currentAuthorName={currentProfileName}
// //           />
// //           {/* )} */}
// //         </CardBody>
// //       </Card>

// //       {/* === Reject Confirmation Dialog === */}
// //       <Modal open={reasonOpen} onClose={() => setReasonOpen(false)}>
// //         <div className="space-y-3 p-5">
// //           <h4 className="text-lg font-semibold text-gray-800"></h4>
// //           <Field.Root value={reason} onChange={setReason}>
// //             <Field.Label>Masukkan alasan Anda menolak</Field.Label>
// //             <Field.Textarea rows={5}></Field.Textarea>
// //             <Field.Error></Field.Error>
// //             <Field.Control></Field.Control>
// //           </Field.Root>
// //           <div className="flex items-center gap-2">
// //             <Button
// //               variant="primary"
// //               onClick={handleReject}
// //               disabled={rejectLoading || !reason.trim()}
// //             >
// //               {rejectLoading ? t("common.sending") ?? "Mengirim…" : "Ya"}
// //             </Button>
// //             <Button
// //               variant="outline"
// //               onClick={() => {
// //                 setReasonOpen(false);
// //                 setReason("");
// //               }}
// //             >
// //               Tidak
// //             </Button>
// //           </div>
// //         </div>
// //       </Modal>
// //       {/* === Fleet & Driver Detail Dialog (wide + responsive tabs) === */}
// //       <Modal open={fdOpen} onClose={() => setFdOpen(false)}>
// //         <div className="box-border w-full max-w-full sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-[1000px] max-h-[80vh] overflow-y-auto overflow-x-hidden p-5 space-y-4">
// //           <div className="flex items-center justify-between flex-wrap gap-3 min-w-0">
// //             <h4 className="text-lg font-semibold text-gray-800 truncate">
// //               Fleet &amp; Driver
// //             </h4>
// //             {/* Segmented tabs hanya tampil di mobile; di desktop kita tampilkan 2 kolom */}
// //             <div className="md:hidden inline-flex shrink-0 rounded-lg border border-gray-200 p-1 bg-gray-50">
// //               <button
// //                 type="button"
// //                 onClick={() => setFdTab("fleet")}
// //                 className={`px-3 py-1.5 text-sm rounded-md ${
// //                   fdTab === "fleet"
// //                     ? "bg-white shadow font-semibold"
// //                     : "text-gray-600"
// //                 }`}
// //               >
// //                 Fleet
// //               </button>
// //               <button
// //                 type="button"
// //                 onClick={() => setFdTab("driver")}
// //                 className={`px-3 py-1.5 text-sm rounded-md ${
// //                   fdTab === "driver"
// //                     ? "bg-white shadow font-semibold"
// //                     : "text-gray-600"
// //                 }`}
// //               >
// //                 Driver
// //               </button>
// //             </div>
// //           </div>

// //           {/* Grid 2 kolom di desktop; di mobile tampilkan salah satu via tabs */}
// //           <div className="min-w-0 grid md:grid-cols-2 gap-6">
// //             {/* ===== Fleet panel ===== */}
// //             <section
// //               className={`${
// //                 fdTab === "fleet" ? "" : "hidden md:block"
// //               } min-w-0`}
// //             >
// //               <div className="flex items-start gap-3 mb-2">
// //                 <IconCar className="mt-0.5 h-7 w-7 text-gray-700 shrink-0" />
// //                 <div className="min-w-0 max-w-full">
// //                   <div className="font-semibold text-gray-900">
// //                     {safeLabel(vehicles, "Fleet")}
// //                   </div>
// //                   <p className="text-xs text-gray-500">
// //                     Informasi unit kendaraan
// //                   </p>
// //                 </div>
// //               </div>
// //               {fleetLoading ? (
// //                 <div className="text-sm text-gray-500">
// //                   Memuat detail fleet…
// //                 </div>
// //               ) : fleetError ? (
// //                 <div className="text-sm text-red-600">
// //                   Gagal memuat detail fleet. {fleetError}
// //                 </div>
// //               ) : Number(vehicles?.id) > 0 && fleetInfo ? (
// //                 <InfoGrid
// //                   items={
// //                     [
// //                       [
// //                         "No. Polisi",
// //                         pick(fleetInfo, [
// //                           "license_plate",
// //                           "plate_no",
// //                           "nopol",
// //                           "plate",
// //                         ]),
// //                       ],
// //                       [
// //                         "Tipe / Model",
// //                         pick(fleetInfo, ["vehicle_type", "type", "model"]),
// //                       ],
// //                       ["Merek", pick(fleetInfo, ["brand", "merk", "make"])],
// //                       ["Tahun", pick(fleetInfo, ["year"])],
// //                       ["Warna", pick(fleetInfo, ["color"])],
// //                       [
// //                         "Kapasitas (kg)",
// //                         pick(fleetInfo, ["capacity_kg", "payload_kg"]),
// //                       ],
// //                       [
// //                         "Kapasitas (CBM)",
// //                         pick(fleetInfo, ["capacity_cbm", "cbm"]),
// //                       ],
// //                       ["Status", pick(fleetInfo, ["status", "state"])],
// //                     ] as const
// //                   }
// //                 />
// //               ) : (
// //                 <div className="text-sm text-gray-500">
// //                   Detail fleet tidak tersedia.
// //                 </div>
// //               )}
// //             </section>

// //             {/* ===== Driver panel ===== */}
// //             <section
// //               className={`${
// //                 fdTab === "driver" ? "" : "hidden md:block"
// //               } min-w-0`}
// //             >
// //               <div className="flex items-start gap-3 mb-2">
// //                 <IconUser className="mt-0.5 h-7 w-7 text-gray-700 shrink-0" />
// //                 <div className="min-w-0 max-w-full">
// //                   <div className="font-semibold text-gray-900">
// //                     {safeLabel(drivers, "Driver")}
// //                   </div>
// //                   <p className="text-xs text-gray-500">Informasi pengemudi</p>
// //                 </div>
// //               </div>
// //               {driverLoading ? (
// //                 <div className="text-sm text-gray-500">
// //                   Memuat detail driver…
// //                 </div>
// //               ) : driverError ? (
// //                 <div className="text-sm text-red-600">
// //                   Gagal memuat detail driver. {driverError}
// //                 </div>
// //               ) : Number(drivers?.id) > 0 && driverInfo ? (
// //                 <InfoGrid
// //                   items={
// //                     [
// //                       ["Nama", pick(driverInfo, ["name"])],
// //                       ["Mobile", pick(driverInfo, ["mobile", "phone"])],
// //                       ["Email", pick(driverInfo, ["email"])],
// //                       [
// //                         "No. SIM",
// //                         pick(driverInfo, [
// //                           "drivers_license",
// //                           "sim_no",
// //                           "license_no",
// //                         ]),
// //                       ],
// //                       [
// //                         "Masa Berlaku SIM",
// //                         pick(driverInfo, [
// //                           "drivers_license_expiry",
// //                           "sim_expiry",
// //                         ]),
// //                       ],
// //                       ["NIK/KTP", pick(driverInfo, ["no_ktp", "nik"])],
// //                       ["Status", pick(driverInfo, ["status", "state"])],
// //                       ["Tipe User", pick(driverInfo, ["tms_user_type"])],
// //                     ] as const
// //                   }
// //                 />
// //               ) : (
// //                 <div className="text-sm text-gray-500">
// //                   Detail driver tidak tersedia.
// //                 </div>
// //               )}
// //             </section>
// //           </div>

// //           <div className="flex justify-end pt-2">
// //             <Button variant="primary" onClick={() => setFdOpen(false)}>
// //               Tutup
// //             </Button>
// //           </div>
// //         </div>
// //       </Modal>

// //       <ClaimListModal
// //         open={claimsModalOpen}
// //         onClose={() => setClaimsModalOpen(false)}
// //         claims={claims}
// //         loading={claimsLoading}
// //       />

// //       <ModalDialog
// //         open={dlgOpen}
// //         kind={dlgKind}
// //         title={dlgTitle}
// //         message={dlgMsg}
// //         onClose={() => setDlgOpen(false)}
// //       />
// //     </div>
// //   );
// // }
