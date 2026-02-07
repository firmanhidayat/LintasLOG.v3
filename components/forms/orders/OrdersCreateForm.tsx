"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t, getLang, onLangChange } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import ChatterPanel from "@/components/chat/ChatterPanel";
import OrderInfoCard from "@/components/forms/orders/sections/OrderInfoCard";
import LocationInfoCard from "@/components/forms/orders/sections/LocationInfoCard";
import SpecialServicesCard from "@/components/forms/orders/sections/SpecialServicesCard";
import CargoInfoCard from "@/components/forms/orders/sections/CargoInfoCard";
import CostDetailsCard from "@/components/forms/orders/sections/CostDetailsCard";
import ShippingDocumentsCard from "@/components/forms/orders/sections/ShippingDocumentsCard";
import { tzDateToUtcISO } from "@/lib/tz";
import { useAuth } from "@/components/providers/AuthProvider";
import { ClaimItem } from "@/types/claims";
import { fetchOrderClaims } from "@/services/claimService";
import { ClaimListModal } from "@/components/claims/ClaimListModal";

import {
  odooUtcToDatetimeLocalValue,
  userLocalToOdooUtc,
} from "@/lib/datetime";

import type {
  AddressItem,
  OrderTypeItem,
  ModaItem,
  ApiPayload,
  CityItem,
  OrdersCreateFormProps,
  PartnerItem,
  OrderAttachmentGroup,
  OrderAttachmentItem,
  RoleOrderProps,
} from "@/types/orders";

import {
  // apiToLocalIsoMinute,
  buildDetailUrl,
  // pathJoin,
} from "@/components/shared/Helper";
import StatusDeliveryImage from "@/components/ui/DeliveryState";
import { StatusStep } from "@/types/status-delivery";
import { ExtraStop } from "./sections/ExtraStopCard";
import { RecordItem } from "@/types/recorditem";
import { ExistingFileItem } from "@/components/form/MultiFileUpload";
import { TmsUserType } from "@/types/tms-profile";
type ExtraStopWithId = ExtraStop & { uid: string };

// ====== NEW: Cargo Type Prefill (by id -> RecordItem) ======
type IdLike = string | number;

// const CARGO_TYPES_URL = process.env.NEXT_PUBLIC_TMS_CARGO_TYPES_URL ?? "";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isId(v: unknown): v is IdLike {
  return typeof v === "string" || typeof v === "number";
}
function isStr(v: unknown): v is string {
  return typeof v === "string";
}

export function toRecordItem(x: unknown): RecordItem {
  // Langsung handle primitif
  if (isId(x)) {
    return { id: x, name: String(x) };
  }

  // Object-like
  if (isRecord(x)) {
    const idRaw = x["id"] ?? x["value"] ?? x["code"];
    const nameRaw = x["name"] ?? x["label"];

    const id: IdLike | "" = isId(idRaw) ? idRaw : "";
    const name: string = isStr(nameRaw)
      ? nameRaw
      : isId(idRaw)
      ? String(idRaw)
      : "";

    return { id, name };
  }

  // Fallback aman
  return { id: "", name: "" };
}

// async function fetchCargoTypeById(id?: IdLike): Promise<RecordItem | null> {
//   if (id == null || id === "") return null;
//   if (!CARGO_TYPES_URL) {
//     // fallback minimal tanpa endpoint
//     return { id, name: `#${id}` };
//   }
//   try {
//     const res = await fetch(
//       `${CARGO_TYPES_URL.replace(/\/$/, "")}/${encodeURIComponent(String(id))}`,
//       {
//         headers: { "Accept-Language": getLang() },
//         credentials: "include",
//       }
//     );
//     if (!res.ok) return { id, name: `#${id}` };
//     const data = await res.json();
//     return toRecordItem(data);
//   } catch {
//     return { id, name: `#${id}` };
//   }
// }
// function useCargoTypePrefill(initialId?: IdLike) {
//   const [value, setValue] = useState<RecordItem | null>(null);
//   const [loading, setLoading] = useState(false);

//   console.log("useCargoTypePrefill: id = ", initialId);
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       if (initialId == null) {
//         setValue(null);
//         return;
//       }
//       setLoading(true);
//       try {
//         const item = await fetchCargoTypeById(initialId);
//         if (alive) setValue(item);
//       } finally {
//         if (alive) setLoading(false);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, [initialId]);
//   return { value, setValue, loading };
// }
// ===========================================================

// === Chat impulse hook (no top-level hooks usage violations) ===
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

/** ENV */

const POST_ORDER_URL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL!;
// const POST_CHAT_URL = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL ?? "";
const CHATTERS_URL = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL ?? "";
const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
const UPDATE_URL_TPL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
const APP_BASE_PATH = process.env.NEXT_PUBLIC_URL_BASE ?? "";

const DOCUMENT_ATTACHMENTS_URL =
  process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL ?? "";

const DOC_ATTACHMENT_PACKING_LIST_TYPE =
  "transport_order_packing_list" as const;
const DOC_ATTACHMENT_DELIVERY_NOTE_TYPE =
  "transport_order_delivery_note" as const;

const DOC_ATTACHMENT_PICKUP_TYPE = "route_purchase_pickup" as const;
const DOC_ATTACHMENT_DROP_OFF_TYPE = "route_purchase_drop_off" as const;

type DocumentAttachmentsResponse = OrderAttachmentGroup;

// ApiPayload + field attachment_id
type ApiPayloadWithAttachments = ApiPayload & {
  packing_list_attachment_id?: number;
  delivery_note_attachment_id?: number;
  pickup_attachment_id?: number;
  drop_off_attachment_id?: number;
  pickup_attachment?: OrderAttachmentGroup | null;
  drop_off_attachment?: OrderAttachmentGroup | null;
};

/* === Lightweight Modal/Dialog === */
export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-[61] w-[min(92vw,520px)] rounded-xl bg-white p-4 shadow-xl">
        {children}
      </div>
    </div>
  );
}

/* === Konfirmasi sebelum submit === */
function ConfirmSubmitDialog({
  open,
  onCancel,
  onConfirm,
  loading,
  mode,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  mode: "create" | "edit";
}) {
  return (
    <Modal open={open} onClose={onCancel}>
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-800">
          {t("common.confirm") ?? "Konfirmasi"}
        </h4>
        <p className="text-sm text-gray-700">
          {mode === "create"
            ? t("orders.confirm_submit_text") ??
              "Pastikan semua informasi sudah benar sebelum submit. Lanjutkan?"
            : t("orders.confirm_update_text") ??
              "Perbarui data order sesuai perubahan yang sudah Anda buat. Lanjutkan?"}
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {t("common.no") ?? "Tidak"}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={loading}>
            {loading
              ? t("common.sending") ?? "Mengirim…"
              : t("common.yes") ?? "Ya"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* === Dialog hasil response submit === */
function ResponseDialog({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
        <div className="text-sm whitespace-pre-wrap text-gray-700">
          {message}
        </div>
        <div className="flex items-center justify-end pt-2">
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalDialog({
  open,
  kind = "success",
  title,
  message,
  onClose,
}: {
  open: boolean;
  kind?: "success" | "error";
  title: string;
  message: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  const ring = kind === "success" ? "ring-green-500" : "ring-red-500";
  const head = kind === "success" ? "text-green-700" : "text-red-700";
  const btn =
    kind === "success"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-red-600 hover:bg-red-700";
  return (
    <div>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          className={`relative mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ${ring}`}
        >
          <div className={`mb-2 text-lg font-semibold ${head}`}>{title}</div>
          <div className="mb-4 text-sm text-gray-700">{message}</div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center rounded-lg px-4 py-2 text-white ${btn} focus:outline-none focus:ring`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fillUrlTemplate(tpl: string, id?: string | number): string {
  if (!tpl) return "";
  if (tpl.includes(":id")) return tpl.replace(":id", String(id ?? ""));
  if (id != null && !tpl.endsWith("/")) return `${tpl}/${id}`;
  if (id != null) return `${tpl}${id}`;
  return tpl;
}

type RouteItem = NonNullable<
  NonNullable<OrdersCreateFormProps["initialData"]>["route_ids"]
>[number];

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

function normalizeKey(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "");
}

function extractApiSteps(
  d: NonNullable<OrdersCreateFormProps["initialData"]>
): StatusStep[] {
  const items = (d.states ?? []) as StatusStep[];

  return items.map((it): StatusStep => {
    if (typeof it === "string") {
      return { key: normalizeKey(it), label: it, is_current: false };
    }
    const key = normalizeKey(it.key ?? it.label);
    const label = it.label ?? it.key ?? "";
    return { key, label, is_current: Boolean(it.is_current) };
  });
}

function toExistingFileItems(
  attachment: OrderAttachmentGroup | OrderAttachmentItem[] | null | undefined
): ExistingFileItem[] {
  if (!attachment) return [];
  if (Array.isArray(attachment)) {
    return attachment.map((att) => ({
      id: att.id,
      name: att.name,
      url: att.url,
      mimetype: att.mimetype,
    }));
  }
  const items = attachment.attachments ?? [];
  return items.map((att) => ({
    id: att.id,
    name: att.name,
    url: att.url,
    mimetype: att.mimetype,
  }));
}

function prefillFromInitial(
  data: NonNullable<OrdersCreateFormProps["initialData"]>,
  userTz: string = "Asia/Jakarta"
) {
  const tz = userTz;

  let claimCount = 0;
  if ("reviewed_claim_ids_count" in data) {
    const v = (data as { reviewed_claim_ids_count?: unknown })
      .reviewed_claim_ids_count;
    if (typeof v === "number") {
      claimCount = v;
    } else if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) claimCount = n;
    }
  }

  const isReviewed = (data.state ?? "").toLowerCase().includes("review");
  const form = {
    states: data.states ? extractApiSteps(data) : ([] as StatusStep[]),
    state: data.state ?? "",
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
    tglBongkar: odooUtcToDatetimeLocalValue(
      data.drop_off_date_planne,
      tz,
      "17:00"
    ),

    lokMuat: null as AddressItem | null,
    lokBongkar: null as AddressItem | null,

    // readonly
    origin_address_name: "",
    origin_street: "",
    origin_street2: "",
    origin_district_name: "",
    origin_zip: "",
    origin_latitude: "",
    origin_longitude: "",
    // readonly
    dest_address_name: "",
    dest_street: "",
    dest_street2: "",
    dest_district_name: "",
    dest_zip: "",
    dest_latitude: "",
    dest_longitude: "",

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

    existingPackingList: [] as ExistingFileItem[],
    existingDeliveryNotes: [] as ExistingFileItem[],

    packingListAttachmentId: null as number | null,
    deliveryNoteAttachmentId: null as number | null,
    packingListAttachmentName: "",
    deliveryNoteAttachmentName: "",
    pickupAttachment: null as OrderAttachmentGroup | null,
    dropOffAttachment: null as OrderAttachmentGroup | null,

    extraStops: [] as ExtraStop[],
    isReadOnly: false,
    mainRouteId: null as number | null,
    reviewed_claim_ids_count: claimCount,

    res_id: data.res_id,
    res_model: data.res_model,
    original_res_id: data.original_res_id,
    original_res_model: data.original_res_model,
  };

  console.log("data:", data);
  console.log("form before:", form);

  const routes: RouteItem[] = Array.isArray(data.route_ids)
    ? (data.route_ids as RouteItem[])
    : ([] as RouteItem[]);

  console.log("routes:", routes);
  // const main = routes.find((r) => r.is_main_route);
  const main = routes.flat().find((r) => r.is_main_route === true);

  console.log("main route:", main);
  form.mainRouteId = typeof main?.id === "number" ? main.id : null;

  const etdLocal = odooUtcToDatetimeLocalValue(main?.etd_date ?? null, tz);
  const etaLocal = odooUtcToDatetimeLocalValue(main?.eta_date ?? null, tz);

  if (etdLocal) form.tglMuat = etdLocal;
  if (etaLocal) form.tglBongkar = etaLocal; // apiToLocalIsoMinute(main?.eta_date) || form.tglBongkar;
  form.lokMuat = addrFromRoute(main, "origin");
  form.lokBongkar = addrFromRoute(main, "dest");
  form.picMuatNama = main?.origin_pic_name ?? "";
  form.picMuatTelepon = main?.origin_pic_phone ?? "";
  form.picBongkarNama = main?.dest_pic_name ?? "";
  form.picBongkarTelepon = main?.dest_pic_phone ?? "";

  // readonly
  form.origin_address_name = main?.origin_address_name ?? "";
  form.origin_street = main?.origin_street ?? "";
  form.origin_street2 = main?.origin_street2 ?? "";
  form.origin_district_name = main?.origin_district.name ?? "";
  form.origin_zip = main?.origin_zip ?? "";
  form.origin_latitude = main?.origin_latitude ?? "";
  form.origin_longitude = main?.origin_longitude ?? "";
  // readonly
  form.dest_address_name = main?.dest_address_name ?? "";
  form.dest_street = main?.dest_street ?? "";
  form.dest_street2 = main?.dest_street2 ?? "";
  form.dest_district_name = main?.dest_district.name ?? "";
  form.dest_zip = main?.dest_zip ?? "";
  form.dest_latitude = main?.dest_latitude ?? main?.dest_latitude ?? "";
  form.dest_longitude = main?.dest_longitude ?? "";

  if (!form.lokMuat)
    form.lokMuat = (data.origin_address as AddressItem) ?? null;
  if (!form.lokBongkar)
    form.lokBongkar = (data.dest_address as AddressItem) ?? null;

  form.amount_shipping = data.amount_shipping ?? "";
  form.amount_shipping_multi_charge = data.amount_shipping_multi_charge ?? "";
  form.amount_tax = data.amount_tax ?? "";
  form.amount_total = data.amount_total ?? "";

  // const extras: RouteItem[] = routes.filter((r) => !r.is_main_route);
  const extras: RouteItem[] = routes.flat().filter((r) => !r.is_main_route);

  console.log("extra routes:", extras);

  form.extraStops = extras.map(
    (r): ExtraStop => ({
      id: r.id,
      lokMuat: addrFromRoute(r, "origin"),
      lokBongkar: addrFromRoute(r, "dest"),
      originPicName: r.origin_pic_name ?? "",
      originPicPhone: r.origin_pic_phone ?? "",
      destPicName: r.dest_pic_name ?? "",
      destPicPhone: r.dest_pic_phone ?? "",
      // tglETDMuat: apiToLocalIsoMinute(r.etd_date) ?? r.etd_date ?? "",
      // tglETABongkar: apiToLocalIsoMinute(r.eta_date) ?? r.eta_date ?? "",

      tglETDMuat: odooUtcToDatetimeLocalValue(r.etd_date, tz),
      tglETABongkar: odooUtcToDatetimeLocalValue(r.eta_date, tz),

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

  const current = data.states?.find((s) => s.is_current);

  console.log("current state:", current);

  form.isReadOnly = current
    ? !["draft", "pending"].includes(current.key)
    : false;

  form.existingPackingList = toExistingFileItems(
    data.packing_list_attachment as
      | OrderAttachmentGroup
      | OrderAttachmentItem[]
      | null
      | undefined
  );

  form.existingDeliveryNotes = toExistingFileItems(
    data.delivery_note_attachment as
      | OrderAttachmentGroup
      | OrderAttachmentItem[]
      | null
      | undefined
  );

  const pl = data.packing_list_attachment as
    | OrderAttachmentGroup
    | OrderAttachmentItem[]
    | null
    | undefined;

  if (pl && !Array.isArray(pl)) {
    form.packingListAttachmentId = typeof pl.id === "number" ? pl.id : null;
    form.packingListAttachmentName = pl.name ?? "";
  }

  const dn = data.delivery_note_attachment as
    | OrderAttachmentGroup
    | OrderAttachmentItem[]
    | null
    | undefined;

  if (dn && !Array.isArray(dn)) {
    form.deliveryNoteAttachmentId = typeof dn.id === "number" ? dn.id : null;
    form.deliveryNoteAttachmentName = dn.name ?? "";
  }

  // Pickup / Drop-off attachment group lives on main route
  if (main) {
    const pu =
      (main as unknown as { pickup_attachment?: OrderAttachmentGroup | null })
        .pickup_attachment ?? null;
    if (pu && !Array.isArray(pu)) form.pickupAttachment = pu;

    const doff =
      (main as unknown as { drop_off_attachment?: OrderAttachmentGroup | null })
        .drop_off_attachment ?? null;
    if (doff && !Array.isArray(doff)) form.dropOffAttachment = doff;
  }

  form.state = data.state ?? "";
  console.log("form results:", form);
  return form;
}

function extractCreatedId(json: unknown): string | number | undefined {
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;

    const direct = o["id"];
    if (typeof direct === "string" || typeof direct === "number") return direct;

    const data = o["data"];
    if (data && typeof data === "object") {
      const did = (data as Record<string, unknown>)["id"];
      if (typeof did === "string" || typeof did === "number") return did;
    }

    const result = o["result"];
    if (result && typeof result === "object") {
      const rid = (result as Record<string, unknown>)["id"];
      if (typeof rid === "string" || typeof rid === "number") return rid;
    }
  }
  return undefined;
}

type ApiErrorItem = string | { msg?: string } | Record<string, unknown>;
type ApiErrorBody = {
  message?: string;
  error?: string;
  errors?: ApiErrorItem[];
  detail?: ApiErrorItem[];
};

function itemToMsg(it: ApiErrorItem): string | null {
  if (typeof it === "string") return it;
  if (it && typeof it === "object" && "msg" in it) {
    const v = (it as { msg?: unknown }).msg;
    if (typeof v === "string") return v;
  }
  return null;
}

/** ===================== Component ===================== */
// export default function OrdersCreateForm({
//   mode = "create",
//   orderId,
//   initialData,
//   onSuccess,
// }: OrdersCreateFormProps) {
export default function OrdersCreateForm<T extends TmsUserType>({
  mode = "edit",
  orderId,
  initialData,
  onSuccess,
  userType,
}: RoleOrderProps<T> & { userType: T }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qsId = searchParams?.get("id") ?? null;
  const effectiveOrderId = useMemo<string | number | undefined>(() => {
    return orderId ?? qsId ?? undefined;
  }, [orderId, qsId]);

  const { profile } = useAuth();

  const { ready: i18nReady } = useI18nReady();
  const { hasChatImpulse, setHasChatImpulse } = useChatImpulseChannel();
  const forceRerender = React.useReducer((x: number) => x + 1, 0)[1];
  useEffect(() => {
    const off = onLangChange(() => forceRerender());
    return () => off?.();
  }, [forceRerender]);

  const profileTimezone =
    (profile as { tz?: string } | undefined)?.tz || "Asia/Jakarta";

  // ===== Local states =====
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
  const [mainRouteId, setMainRouteId] = useState<number | null>(null);

  const [reviewClaimIdsCount, setReviewClaimIdsCount] = useState<number>(0);

  // Kontak utama (PIC)
  const [picMuatNama, setPicMuatNama] = useState<string>("");
  const [picMuatTelepon, setPicMuatTelepon] = useState<string>("");
  const [picBongkarNama, setPicBongkarNama] = useState<string>("");
  const [picBongkarTelepon, setPicBongkarTelepon] = useState<string>("");

  // Multi Pickup/Drop
  const [multiPickupDrop, setMultiPickupDrop] = useState<boolean>(false);
  const [extraStops, setExtraStops] = useState<ExtraStopWithId[]>(() =>
    (
      [
        {
          id: 0,
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
        },
        {
          id: 0,
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
        },
      ] as ExtraStop[]
    ).map((s) => ({ ...s, uid: genUid() }))
  );

  // Upload lists (MultiFileUpload controlled)
  const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
  const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);

  const [existingPackingList, setExistingPackingList] = useState<
    ExistingFileItem[]
  >([]);
  const [existingDeliveryNotes, setExistingDeliveryNotes] = useState<
    ExistingFileItem[]
  >([]);

  const [packingListAttachmentId, setPackingListAttachmentId] = useState<
    number | null
  >(null);
  const [deliveryNoteAttachmentId, setDeliveryNoteAttachmentId] = useState<
    number | null
  >(null);

  const [packingListAttachmentName, setPackingListAttachmentName] =
    useState<string>("");
  const [deliveryNoteAttachmentName, setDeliveryNoteAttachmentName] =
    useState<string>("");

  // Independent attachments (Pickup / Drop-off)
  const [pickupAttachment, setPickupAttachment] =
    useState<OrderAttachmentGroup | null>(null);
  const [dropOffAttachment, setDropOffAttachment] =
    useState<OrderAttachmentGroup | null>(null);

  // Amount placeholders
  const [biayaKirimLabel, setAmountShipping] = useState<number | string>();
  const [biayaLayananTambahanLabel, setAmountShippingMultiCharge] = useState<
    number | string
  >("");
  const [taxLabel, setAmountTax] = useState<number | string>("");
  const [totalHargaLabel, setAmountTotal] = useState<number | string>("");

  // Errors & refs
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstErrorRef = useRef<HTMLDivElement | null>(null);
  const extraRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const firstErrorKey = useMemo(() => {
    const order = [
      "namaPenerima",
      "kotaMuat",
      "kotaBongkar",
      "jenisOrder",
      "armada",
      "tglMuat",
      "tglBongkar",
      "jenisMuatan",
      "cargoCBM",
      "cargoQTY",
      // "jumlahMuatan",
      "lokMuat",
      "lokBongkar",
    ] as const;
    return order.find((k) => errors[k]);
  }, [errors]);

  // Dialogs & loading
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [respOpen, setRespOpen] = useState(false);
  const [respTitle, setRespTitle] = useState("");
  const [respMessage, setRespMessage] = useState("");
  const [respIsSuccess, setRespIsSuccess] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<
    string | number | undefined
  >(undefined);

  const [statusCurrent, setStatusCurrent] = useState<string | undefined>("");
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);

  const [steps, setSteps] = useState<StatusStep[]>([]);

  // ===================== Prefill untuk Edit =====================
  const [loadingDetail, setLoadingDetail] = useState<boolean>(
    mode === "edit" && !initialData ? true : false
  );

  // const [chatOpen, setChatOpen] = useState(false);
  const canShowChat = isReadOnly || respIsSuccess;

  // const canShowReviewClaims = mode === "edit";
  const canShowListReviewClaims = reviewClaimIdsCount > 0;

  const [claimsModalOpen, setClaimsModalOpen] = useState(false);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const fetchClaims = async () => {
    if (!effectiveOrderId) return;
    setClaimsLoading(true);
    try {
      const claimsData = await fetchOrderClaims(effectiveOrderId);
      setClaims(claimsData.items);
    } catch (error) {
      console.error("Failed to fetch claims:", error);
      openErrorDialog(error, "Failed to load claims");
    } finally {
      setClaimsLoading(false);
    }
  };

  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");

  const [reloadSelfAfterDlg, setReloadSelfAfterDlg] = useState(false);

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
  function onHandleShowReviewClaimListButton() {
    setClaimsModalOpen(true);
    fetchClaims();
  }

  function handleChangeKotaMuat(city: CityItem | null) {
    setKotaMuat(city);
    setLokMuat(null);
  }

  function handleChangeKotaBongkar(city: CityItem | null) {
    setKotaBongkar(city);
    setLokBongkar(null);
  }

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
  const [cargoCBM, setCargoCBM] = useState<number>();
  const [cargoQTY, setCargoQTY] = useState<number>();

  useEffect(() => {
    console.log("initialData changed:", initialData);
    if (!initialData) return;
    console.log("Prefilling form from initialData:", initialData);

    const f = prefillFromInitial(initialData, profileTimezone);
    setChatterResModel(
      typeof f.res_model === "string" ? f.res_model : String(f.res_model ?? "")
    );
    setChatterResId(
      typeof f.res_id === "string" || typeof f.res_id === "number"
        ? f.res_id
        : undefined
    );
    setMainRouteId(f.mainRouteId);
    setNamaPenerima(f.namaPenerima);
    setJenisOrder(f.jenisOrder);
    setArmada(f.armada);
    setKotaMuat(f.kotaMuat);
    setKotaBongkar(f.kotaBongkar);

    console.log(" PROFILE TZ :: ", profile?.tz);

    setTglMuat(f.tglMuat);
    setTglBongkar(f.tglBongkar);

    setLokMuat(f.lokMuat);
    setLokBongkar(f.lokBongkar);

    setPicMuatNama(f.picMuatNama);
    setPicMuatTelepon(f.picMuatTelepon);
    setPicBongkarNama(f.picBongkarNama);
    setPicBongkarTelepon(f.picBongkarTelepon);

    setMuatanNama(f.muatanNama);
    setMuatanDeskripsi(f.muatanDeskripsi);

    setJenisMuatan(f.cargo_type ?? null);

    setJenisMuatan(
      f.cargo_type_id != null
        ? {
            id: String(f.cargo_type_id),
            name: f.cargo_type?.name ?? f.cargo_type?.name ?? "",
          }
        : null
    );
    setCargoCBM(f.cargoCBM);
    setCargoQTY(f.cargoQTY);

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

    setExistingPackingList(f.existingPackingList);
    setExistingDeliveryNotes(f.existingDeliveryNotes);

    setPackingListAttachmentId(f.packingListAttachmentId);
    setDeliveryNoteAttachmentId(f.deliveryNoteAttachmentId);
    setPackingListAttachmentName(f.packingListAttachmentName);
    setDeliveryNoteAttachmentName(f.deliveryNoteAttachmentName);

    setPickupAttachment(f.pickupAttachment ?? null);
    setDropOffAttachment(f.dropOffAttachment ?? null);

    // if (userType === "shipper") {
    setReviewClaimIdsCount(Number(f.reviewed_claim_ids_count ?? 0));
    // }

    console.log("f data: ", f);
    console.log("initialData.states:", initialData.states);
    console.log("extracted steps:", extractApiSteps(initialData));
    console.log("prefilled steps:", f.states);

    setSteps(f.states);
    setStatusCurrent(f.states.find((s) => s.is_current)?.key);

    console.log(
      "prefilled current step:",
      f.states.find((s) => s.is_current)
    );

    console.log("Current Status after setStatusCurrent :", statusCurrent);
    setLoadingDetail(false);
  }, [initialData]);

  async function deleteRemoteAttachment(
    docAttachmentId: number,
    attachmentId: number
  ) {
    const url = `${DOCUMENT_ATTACHMENTS_URL}/${encodeURIComponent(
      String(docAttachmentId)
    )}/attachments/${encodeURIComponent(String(attachmentId))}`;

    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to delete attachment (${res.status} ${res.statusText}) ${text}`
      );
    }
  }

  // ===== Pickup / Drop-off attachments (independent uploader) =====
  const uploadPickupAttachmentGroup = useCallback(
    async (files: File[]) => {
      const g = await uploadDocumentsForDocTypeGroup(files, {
        docType: DOC_ATTACHMENT_PICKUP_TYPE,
        groupId: pickupAttachment?.id ?? null,
      });
      setPickupAttachment(g);
      return g;
    },
    [pickupAttachment?.id]
  );

  const uploadDropOffAttachmentGroup = useCallback(
    async (files: File[]) => {
      const g = await uploadDocumentsForDocTypeGroup(files, {
        docType: DOC_ATTACHMENT_DROP_OFF_TYPE,
        groupId: dropOffAttachment?.id ?? null,
      });
      setDropOffAttachment(g);
      return g;
    },
    [dropOffAttachment?.id]
  );

  const deletePickupAttachmentFile = useCallback(
    async (attachmentId: number) => {
      const groupId = pickupAttachment?.id;
      if (!groupId) return pickupAttachment ?? null;

      await deleteRemoteAttachment(groupId, attachmentId);

      const next: OrderAttachmentGroup | null = pickupAttachment
        ? {
            ...pickupAttachment,
            attachments: (pickupAttachment.attachments ?? []).filter(
              (a) => a.id !== attachmentId
            ),
          }
        : null;

      setPickupAttachment(next);
      return next;
    },
    [pickupAttachment]
  );

  const deleteDropOffAttachmentFile = useCallback(
    async (attachmentId: number) => {
      const groupId = dropOffAttachment?.id;
      if (!groupId) return dropOffAttachment ?? null;

      await deleteRemoteAttachment(groupId, attachmentId);

      const next: OrderAttachmentGroup | null = dropOffAttachment
        ? {
            ...dropOffAttachment,
            attachments: (dropOffAttachment.attachments ?? []).filter(
              (a) => a.id !== attachmentId
            ),
          }
        : null;

      setDropOffAttachment(next);
      return next;
    },
    [dropOffAttachment]
  );

  const handleRemovePackingList = useCallback(
    async (item: ExistingFileItem) => {
      console.log("handleRemovePackingList ", item);
      if (!item.groupId) {
        setExistingPackingList((prev) =>
          prev.filter((it) => it.id !== item.id)
        );
        return;
      }
      try {
        setExistingPackingList((prev) => prev.filter((i) => i.id !== item.id));
        await deleteRemoteAttachment(item.groupId, item.id);
        console.log("Removing packing list attachment:", item);
      } catch (error) {
        console.error("Failed to remove packing list:", error);
        setExistingPackingList((prev) => [...prev, item]);
      }
    },
    []
  );

  const handleRemoveDeliveryNote = useCallback(
    async (item: ExistingFileItem) => {
      console.log("handleRemoveDeliveryNote ", item);
      if (!item.groupId) {
        setExistingDeliveryNotes((prev) =>
          prev.filter((it) => it.id !== item.id)
        );
        return;
      }

      try {
        setExistingDeliveryNotes((prev) =>
          prev.filter((i) => i.id !== item.id)
        );
        await deleteRemoteAttachment(item.groupId, item.id);
        console.log("Removing delivery note attachment:", item);
      } catch (error) {
        console.error("Failed to remove delivery note:", error);
        setExistingDeliveryNotes((prev) => [...prev, item]);
      }
    },
    []
  );

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

    console.log("Fetching order detail for prefill from URL:", url);

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
          console.log("Fetched order detail for prefill:", json);
          console.log(" PROFILE TZ :: ", profile?.tz);
          console.log("profileTimezone:", profileTimezone);

          const f = prefillFromInitial(json, profileTimezone);

          console.log("Prefilled data from fetched detail:", f);

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
          setMainRouteId(f.mainRouteId);
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
          setCargoCBM(f.cargoCBM);
          setCargoQTY(f.cargoQTY);

          setDestAddressName(f.dest_address_name);
          setDestStreet(f.dest_street);
          setDestStreet2(f.dest_street2);
          setDestDistrictName(f.dest_district_name);
          setDestZipCode(f.dest_zip);
          setDestLatitude(f.dest_latitude);
          setDestLongitude(f.dest_longitude);

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

          setExistingPackingList(f.existingPackingList);
          setExistingDeliveryNotes(f.existingDeliveryNotes);

          setPackingListAttachmentId(f.packingListAttachmentId);
          setDeliveryNoteAttachmentId(f.deliveryNoteAttachmentId);
          setPackingListAttachmentName(f.packingListAttachmentName);
          setDeliveryNoteAttachmentName(f.deliveryNoteAttachmentName);

    setPickupAttachment(f.pickupAttachment ?? null);
    setDropOffAttachment(f.dropOffAttachment ?? null);

          setReviewClaimIdsCount(Number(f?.reviewed_claim_ids_count ?? 0));

          setSteps(f.states);
          setStatusCurrent(f.states.find((s) => s.is_current)?.key);

          setIsReadOnly(f.isReadOnly);
        }
      } catch (err) {
      } finally {
        setLoadingDetail(false);
      }
    })();
    return () => abort.abort();
  }, [mode, effectiveOrderId, initialData, router.replace]);

  async function uploadDocumentsForDocType(
    files: File[],
    opts: {
      docType:
        | typeof DOC_ATTACHMENT_PACKING_LIST_TYPE
        | typeof DOC_ATTACHMENT_DELIVERY_NOTE_TYPE;
      groupId?: number | null;
    }
  ): Promise<number | null> {
    if (!files.length) return opts.groupId ?? null;
    const { docType, groupId } = opts;
    const baseUrl = DOCUMENT_ATTACHMENTS_URL.replace(/\/$/, "");
    const url =
      groupId && groupId > 0
        ? `${baseUrl}/${groupId}`
        : `${baseUrl}?doc_type=${encodeURIComponent(docType)}`;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file, file.name);
    });

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      let text = "";
      try {
        text = await res.text();
      } catch {}
      const baseMsg =
        docType === DOC_ATTACHMENT_PACKING_LIST_TYPE
          ? t("orders.upload_packing_list_failed") ??
            "Upload dokumen Packing List gagal."
          : t("orders.upload_delivery_note_failed") ??
            "Upload dokumen Surat Jalan / POD gagal.";
      const msg = text ? `${baseMsg} ${text}` : baseMsg;
      throw new Error(msg);
    }
    if (!groupId) {
      try {
        const json = (await res.json()) as DocumentAttachmentsResponse;
        if (typeof json.id === "number") {
          return json.id;
        }
      } catch {}
      return null;
    }
    return groupId;
  }

  async function fetchDocumentAttachmentGroup(
    groupId: number
  ): Promise<DocumentAttachmentsResponse> {
    const res = await fetch(`${DOCUMENT_ATTACHMENTS_URL}/${groupId}`, {
      method: "GET",
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(
        `Gagal mengambil attachment group (HTTP ${res.status}). ${t}`.trim()
      );
    }
    return (await res.json()) as DocumentAttachmentsResponse;
  }

  async function uploadDocumentsForDocTypeGroup(
    files: File[],
    opts: {
      docType:
        | typeof DOC_ATTACHMENT_PACKING_LIST_TYPE
        | typeof DOC_ATTACHMENT_DELIVERY_NOTE_TYPE
        | typeof DOC_ATTACHMENT_PICKUP_TYPE
        | typeof DOC_ATTACHMENT_DROP_OFF_TYPE;
      groupId?: number | null;
    }
  ): Promise<DocumentAttachmentsResponse> {
    const groupId = opts.groupId ?? null;

    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    const url = groupId
      ? `${DOCUMENT_ATTACHMENTS_URL}/${groupId}`
      : `${DOCUMENT_ATTACHMENTS_URL}?doc_type=${encodeURIComponent(
          opts.docType
        )}`;

    const res = await fetch(url, {
      method: "POST",
      body: fd,
      credentials: "include",
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Gagal upload dokumen (HTTP ${res.status}). ${t}`.trim());
    }

    // Sebagian backend bisa mengembalikan group object, sebagian hanya mengembalikan minimal payload.
    // Kita coba parse JSON, jika tidak ada id, fallback ke GET.
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const maybe = json as Partial<DocumentAttachmentsResponse> | null;
    const finalGroupId =
      typeof maybe?.id === "number" ? maybe.id : groupId ?? null;

    if (!finalGroupId) {
      throw new Error("Upload berhasil tetapi tidak mendapatkan group id.");
    }

    // Jika response sudah group lengkap, langsung pakai; jika tidak, GET ulang.
    if (
      maybe &&
      typeof maybe.id === "number" &&
      Array.isArray(maybe.attachments)
    ) {
      return maybe as DocumentAttachmentsResponse;
    }

    return await fetchDocumentAttachmentGroup(finalGroupId);
  }

  async function uploadShippingDocumentsIfNeeded(): Promise<{
    packingListAttachmentId?: number;
    deliveryNoteAttachmentId?: number;
  }> {
    let packingId = packingListAttachmentId ?? undefined;
    let deliveryId = deliveryNoteAttachmentId ?? undefined;

    if (dokumenFiles.length > 0) {
      const newId = await uploadDocumentsForDocType(dokumenFiles, {
        docType: DOC_ATTACHMENT_PACKING_LIST_TYPE,
        groupId: packingId,
      });
      if (typeof newId === "number") {
        packingId = newId;
        setPackingListAttachmentId(newId);
      }
    }

    if (sjPodFiles.length > 0) {
      const newId = await uploadDocumentsForDocType(sjPodFiles, {
        docType: DOC_ATTACHMENT_DELIVERY_NOTE_TYPE,
        groupId: deliveryId,
      });
      if (typeof newId === "number") {
        deliveryId = newId;
        setDeliveryNoteAttachmentId(newId);
      }
    }

    return {
      packingListAttachmentId: packingId,
      deliveryNoteAttachmentId: deliveryId,
    };
  }

  /** ===================== Validation ===================== */
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const REQ = t("form.required") ?? "Wajib diisi";
    if (!namaPenerima) e.namaPenerima = REQ;
    if (!kotaMuat) e.kotaMuat = REQ;
    if (!kotaBongkar) e.kotaBongkar = REQ;
    if (
      !jenisOrder ||
      (typeof jenisOrder === "object" && !jenisOrder.id && !jenisOrder.name)
    ) {
      e.jenisOrder = REQ;
    }
    if (!armada) e.armada = REQ;
    if (!tglMuat) e.tglMuat = REQ;
    if (!tglBongkar) e.tglBongkar = REQ;
    // if (!muatanNama) e.muatanNama = REQ;
    // if (!muatanDeskripsi) e.muatanDeskripsi = REQ;
    if (!jenisMuatan) e.jenisMuatan = REQ;
    if (!cargoCBM) e.cargoCBM = REQ;
    if (!cargoQTY) e.cargoQTY = REQ;
    const hasTime = (v: string) =>
      v.includes("T") && v.split("T")[1]?.length >= 4;
    if (tglMuat && !hasTime(tglMuat))
      e.tglMuat = t("form.time_required") ?? "Jam wajib diisi";
    if (tglBongkar && !hasTime(tglBongkar))
      e.tglBongkar = t("form.time_required") ?? "Jam wajib diisi";
    const muatUTC = tzDateToUtcISO(tglMuat, profileTimezone);
    const bongkarUTC = tzDateToUtcISO(tglBongkar, profileTimezone);
    if (!muatUTC) e.tglMuat = REQ;
    if (!bongkarUTC) e.tglBongkar = REQ;
    if (muatUTC && bongkarUTC) {
      if (new Date(bongkarUTC).getTime() < new Date(muatUTC).getTime()) {
        e.tglBongkar =
          t("form.must_after_or_equal_pickup") ??
          "Tanggal bongkar harus setelah/sama dengan tanggal muat.";
      }
    }
    // === Validasi MAIN ROUTE wajib ===
    if (!lokMuat?.id) e.lokMuat = REQ;
    if (!lokBongkar?.id) e.lokBongkar = REQ;
    // === Validasi EXTRA ROUTES (multi pick/drop) ===
    if (multiPickupDrop) {
      extraStops.forEach((s, idx) => {
        const anyFilled =
          Boolean(s.lokMuat?.id) ||
          Boolean(s.lokBongkar?.id) ||
          s.originPicName.trim() !== "" ||
          s.originPicPhone.trim() !== "" ||
          s.destPicName.trim() !== "" ||
          s.destPicPhone.trim() !== "";
        if (anyFilled) {
          if (!s.lokMuat?.id || !s.lokBongkar?.id) {
            e[`extra_${idx}`] =
              t("form.address_pair_required") ??
              "Isi lengkap pasangan lokasi muat dan bongkar.";
          }
        }
      });
    }
    setErrors(e);
    return e;
  }

  const canSubmit = useMemo(() => {
    return Boolean(
      jenisOrder?.id &&
        armada &&
        namaPenerima &&
        kotaMuat?.id &&
        kotaBongkar?.id &&
        lokMuat?.id &&
        lokBongkar?.id &&
        tglMuat &&
        tglBongkar &&
        // muatanNama &&
        // muatanDeskripsi &&
        jenisMuatan &&
        cargoCBM &&
        cargoQTY
    );
  }, [
    jenisOrder,
    armada,
    kotaMuat?.id,
    kotaBongkar?.id,
    lokMuat?.id,
    lokBongkar?.id,
    tglMuat,
    tglBongkar,
    // muatanNama,
    // muatanDeskripsi,
    jenisMuatan,
    cargoCBM,
    cargoQTY,
  ]);

  /** ===================== Build Payload ===================== */
  function buildApiPayload(params?: {
    packingListAttachmentId?: number;
    deliveryNoteAttachmentId?: number;
  }): ApiPayload {
    console.log("[buildApiPayload] :  tglMuat ", tglMuat);
    console.log("[buildApiPayload] : tglBongkar ", tglBongkar);

    const mainRoute = {
      ...(mode === "edit" && mainRouteId ? { id: mainRouteId } : {}),
      is_main_route: true,
      origin_address_id: Number(lokMuat?.id ?? 0),
      origin_pic_name: (picMuatNama ?? "").trim(),
      origin_pic_phone: (picMuatTelepon ?? "").trim(),
      dest_address_id: Number(lokBongkar?.id ?? 0),
      dest_pic_name: (picBongkarNama ?? "").trim(),
      dest_pic_phone: (picBongkarTelepon ?? "").trim(),
      etd_date: userLocalToOdooUtc(tglMuat, profileTimezone),
      eta_date: userLocalToOdooUtc(tglBongkar, profileTimezone),
    };

    const extraRoutes = multiPickupDrop
      ? extraStops
          .filter((s) => s.lokMuat?.id && s.lokBongkar?.id)
          .map((s) => ({
            ...(mode === "edit" && typeof s.id === "number" && s.id > 0
              ? { id: s.id }
              : {}),
            is_main_route: false,
            origin_address_id: Number(s.lokMuat?.id ?? 0),
            origin_pic_name: (s.originPicName ?? "").trim(),
            origin_pic_phone: (s.originPicPhone ?? "").trim(),
            dest_address_id: Number(s.lokBongkar?.id ?? 0),
            dest_pic_name: (s.destPicName ?? "").trim(),
            dest_pic_phone: (s.destPicPhone ?? "").trim(),
            etd_date: userLocalToOdooUtc(s.tglETDMuat ?? "", profileTimezone),
            eta_date: userLocalToOdooUtc(
              s.tglETABongkar ?? "",
              profileTimezone
            ),
          }))
      : [];

    const basePayload: ApiPayloadWithAttachments = {
      receipt_by: (namaPenerima ?? "").trim(),
      origin_city_id: Number(kotaMuat!.id),
      dest_city_id: Number(kotaBongkar!.id),
      order_type_id: (jenisOrder as OrderTypeItem).id.toString(),
      moda_id: (armada as ModaItem).id.toString(),
      cargo_type_id: Number((jenisMuatan as RecordItem).id),
      cargo_cbm: cargoCBM ?? 0,
      cargo_qty: cargoQTY ?? 0,
      cargo_name: (muatanNama ?? "").trim(),
      cargo_description: (muatanDeskripsi ?? "").trim(),
      requirement_helmet: !!layananKhusus["Helm"],
      requirement_apar: !!layananKhusus["APAR"],
      requirement_safety_shoes: !!layananKhusus["Safety Shoes"],
      requirement_vest: !!layananKhusus["Rompi"],
      requirement_glasses: !!layananKhusus["Kaca mata"],
      requirement_gloves: !!layananKhusus["Sarung tangan"],
      requirement_face_mask: !!layananKhusus["Masker"],
      requirement_tarpaulin: !!layananKhusus["Terpal"],
      requirement_other: (layananLainnya ?? "").trim(),
      route_ids: [mainRoute, ...extraRoutes],
    };

    const payload: ApiPayloadWithAttachments = { ...basePayload };

    if (mode === "edit") {
      // Jika ada existing attachment IDs, gunakan mereka
      payload.packing_list_attachment_id = 0;
      if (packingListAttachmentId) {
        payload.packing_list_attachment_id = packingListAttachmentId;
      }
      payload.delivery_note_attachment_id = 0;
      if (deliveryNoteAttachmentId) {
        payload.delivery_note_attachment_id = deliveryNoteAttachmentId;
      }

      // Pickup / Drop-off attachments (independent uploader)
      payload.pickup_attachment_id = pickupAttachment?.id ?? 0;
      payload.drop_off_attachment_id = dropOffAttachment?.id ?? 0;
      payload.pickup_attachment = pickupAttachment ?? null;
      payload.drop_off_attachment = dropOffAttachment ?? null;
    }

    if (typeof params?.packingListAttachmentId === "number") {
      payload.packing_list_attachment_id = params.packingListAttachmentId;
    }
    if (typeof params?.deliveryNoteAttachmentId === "number") {
      payload.delivery_note_attachment_id = params.deliveryNoteAttachmentId;
    }

    return payload;
  }

  /** ===================== Submit (Create/Edit) ===================== */

  async function doSubmitToApi() {
    if (mode === "create" && !POST_ORDER_URL) {
      setRespIsSuccess(false);
      setRespTitle(t("common.error") ?? "Error");
      setRespMessage("Endpoint form order belum dikonfigurasi ().");
      setRespOpen(true);
      return;
    }
    if (
      mode === "edit" &&
      !effectiveOrderId &&
      !UPDATE_URL_TPL &&
      !POST_ORDER_URL
    ) {
      setRespIsSuccess(false);
      setRespTitle(t("common.error") ?? "Error");
      setRespMessage(
        "Edit mode butuh id dan endpoint update () atau fallback ke ()/{id}."
      );
      setRespOpen(true);
      return;
    }

    try {
      setSubmitLoading(true);

      // === 1) Upload dokumen (kalau ada file) ===
      let attachIds: {
        packingListAttachmentId?: number;
        deliveryNoteAttachmentId?: number;
      } | null = null;

      try {
        attachIds = await uploadShippingDocumentsIfNeeded();
      } catch (err) {
        console.error("[OrderSubmit] upload attachments error:", err);
        setRespIsSuccess(false);
        setRespTitle(t("common.error") ?? "Error");
        setRespMessage(
          err instanceof Error
            ? err.message
            : t("orders.upload_failed") ??
                "Upload dokumen gagal. Silakan periksa file dan coba lagi."
        );
        setRespOpen(true);
        return;
      }

      // === 2) Build payload order + attachment_id bila ada ===
      const apiPayload = buildApiPayload(attachIds ?? undefined);
      console.log("[OrderSubmit] payload:", apiPayload);

      const method = mode === "create" ? "POST" : "PUT";
      let url = POST_ORDER_URL;

      if (mode === "edit") {
        if (UPDATE_URL_TPL) {
          url = fillUrlTemplate(UPDATE_URL_TPL, effectiveOrderId);
        } else if (POST_ORDER_URL && effectiveOrderId != null) {
          url = `${POST_ORDER_URL.replace(/\/$/, "")}/${effectiveOrderId}`;
        }
      }

      console.log(`[OrderSubmit] ${method} ${url}`, apiPayload);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getLang(),
        },
        credentials: "include",
        body: JSON.stringify(apiPayload),
      });

      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }

      if (mode === "create" && res.status === 201) {
        let createdId: string | number | undefined = undefined;

        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const json = await res.json();
            createdId = extractCreatedId(json);
          }
          if (!createdId) {
            const loc =
              res.headers.get("Location") || res.headers.get("location");
            const m = loc?.match(/\/orders\/(\d+|[A-Za-z0-9-]+)/);
            if (m) createdId = m[1];
          }
        } catch {}
        setLastCreatedId(createdId);
        setRespIsSuccess(true);
        setRespTitle(t("common.success") ?? "Berhasil");
        setRespMessage(t("orders.create_success") ?? "Order berhasil dibuat.");
        setRespOpen(true);
        return;
      }

      if (mode === "edit" && (res.status === 200 || res.status === 204)) {
        setRespIsSuccess(true);
        setRespTitle(t("common.success") ?? "Berhasil");
        setRespMessage(
          t("orders.update_success") ?? "Order berhasil diperbarui."
        );
        setRespOpen(true);
        return;
      }

      if (res.status === 422) {
        let msg = t("common.failed_save") ?? "Gagal menyimpan.";
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const json = (await res.json()) as unknown;
            const body = json as ApiErrorBody;

            const details = body.detail;
            if (Array.isArray(details)) {
              const list = details
                .map(itemToMsg)
                .filter((x): x is string => Boolean(x))
                .map((s) => `• ${s}`)
                .join("\n");
              if (list) msg = list;
            } else {
              const errorsList = Array.isArray(body.errors)
                ? body.errors.map(itemToMsg).filter(Boolean).join(", ")
                : "";
              msg = body.message ?? (errorsList || body.error || msg);
            }
          } else {
            msg = await res.text();
          }
        } catch {
          const text = await res.text();
          if (text) msg = text;
        }
        setRespIsSuccess(false);
        setRespTitle(t("common.error") ?? "Error");
        setRespMessage(msg);
        setRespOpen(true);
        return;
      }

      const text = await res.text();
      setRespIsSuccess(false);
      setRespTitle(t("common.error") ?? "Error");
      setRespMessage(text || (t("common.failed_save") ?? "Gagal menyimpan."));
      setRespOpen(true);
    } catch (err) {
      console.error("[OrderSubmit] error", err);
      setRespIsSuccess(false);
      setRespTitle(t("common.network_error") ?? "Network Error");
      setRespMessage(
        t("common.network_error") ?? "Terjadi kesalahan jaringan. Coba lagi."
      );
      setRespOpen(true);
    } finally {
      setSubmitLoading(false);
      setConfirmOpen(false);
    }
  }

  function confirmAndSubmit() {
    const eobj = validate();
    console.log("confirmAndSubmit, validation errors:", eobj);
    if (Object.keys(eobj).length > 0) {
      setConfirmOpen(false);
      return;
    }
    void doSubmitToApi();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const eobj = validate();
    console.log("handleSubmit, validation errors:", eobj);
    if (Object.keys(eobj).length > 0) {
      requestAnimationFrame(() => {
        if (firstErrorRef.current) {
          firstErrorRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          const el = firstErrorRef.current.querySelector(
            "input,select,textarea,[role='combobox']"
          ) as HTMLElement | null;
          el?.focus();
        } else {
          const firstExtraIdx = Object.keys(eobj)
            .filter((k) => k.startsWith("extra_"))
            .map((k) => Number(k.split("_")[1]))
            .sort((a, b) => a - b)[0];
          const firstUid = extraStops[firstExtraIdx]?.uid;
          const ex = firstUid ? extraRefs.current[firstUid] : undefined;
          if (ex) {
            ex.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      });
      return;
    }
    setConfirmOpen(true);
  }

  function handleCreate() {
    router.push("/orders/create");
  }

  async function handleDone() {
    if (!effectiveOrderId) return;
    const DONE_POST_URL = `${POST_ORDER_URL}/${effectiveOrderId}/done`;
    try {
      console.log("Marking order as done:", DONE_POST_URL);
      const res = await fetch(DONE_POST_URL, {
        method: "POST",
        headers: {
          "Accept-Language": getLang(),
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        openErrorDialog(
          text || `Failed to done (${res.status} ${res.statusText})`,
          "Failed to done"
        );
        return;
      }

      setReloadSelfAfterDlg(true);
      setLastCreatedId(undefined); // biar gak ke-trigger navigasi lastCreatedId. karena dialog nya samaan bareng bareng

      setDlgKind("success");
      setDlgTitle("Done successfully!");
      setDlgMsg("Order marked as done successfully.");
      setDlgOpen(true);
    } catch (err) {
      openErrorDialog(err, "Failed to done");
    }
  }

  async function handleDuplicate() {
    if (!effectiveOrderId) return;
    const DUPLIKASI_ORDER_URL = `${POST_ORDER_URL}/${effectiveOrderId}/duplicate`;
    try {
      const res = await fetch(DUPLIKASI_ORDER_URL, {
        method: "POST",
        headers: {
          "Accept-Language": getLang(),
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        openErrorDialog(
          text || `Failed to duplicate (${res.status} ${res.statusText})`,
          "Failed to duplicate"
        );
        return;
      }
      let newId: string | number | undefined;
      try {
        const json = await res.json();
        newId = json?.id ?? json?.data?.id ?? json?.result?.id;
      } catch {
        newId = undefined;
      }
      setLastCreatedId(newId);
      setDlgKind("success");
      setDlgTitle("Duplicate successfully!");
      setDlgMsg("Order duplicated successfully. Click OK to open it.");
      setDlgOpen(true);
    } catch (err) {
      openErrorDialog(err, "Failed to duplicate");
    }
  }

  function handleDiscard() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/orders");
    }
  }

  /* =================== Chatter: res_model/res_id (sync) ================== */
  const [chatterResModel, setChatterResModel] = useState<string>("");
  const [chatterResId, setChatterResId] = useState<string | number | undefined>(
    undefined
  );
  /* ======================================================================= */

  /* =================== Chat state & handler (non-intrusive) ================== */
  const [chatMsg, setChatMsg] = useState("");
  const [chatSending, setChatSending] = useState(false);
  // === Result Dialog for Chat ===
  const [chatDlgOpen, setChatDlgOpen] = useState(false);
  const [chatDlgKind, setChatDlgKind] = useState<"success" | "error">(
    "success"
  );
  const [chatDlgTitle, setChatDlgTitle] = useState("");
  const [chatDlgMsg, setChatDlgMsg] = useState<React.ReactNode>("");

  function openChatSuccessDialog(message?: string, title?: string) {
    setChatDlgKind("success");
    setChatDlgTitle(title ?? t("common.success") ?? "Berhasil");
    setChatDlgMsg(message ?? t("orders.message_sent") ?? "Pesan terkirim.");
    setChatDlgOpen(true);
  }
  function openChatErrorDialog(err: unknown, title?: string) {
    const msg =
      (typeof err === "object" &&
        err !== null &&
        // @ts-expect-error best-effort
        (err.detail?.[0]?.msg || err.message || err.error)) ||
      String(err);
    setChatDlgKind("error");
    setChatDlgTitle(title ?? t("common.error") ?? "Error");
    setChatDlgMsg(
      <pre className="whitespace-pre-wrap text-xs text-red-700">{msg}</pre>
    );
    setChatDlgOpen(true);
  }

  if (!i18nReady || loadingDetail) {
    return (
      <div className="p-4 text-sm text-gray-600">{t("common.loading")}…</div>
    );
  }
  function safeJoin(base: string, path: string): string {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }
  const stp = [
    {
      key: "pending",
      label: "Pending",
      is_current: false,
    },
    {
      key: "accepted",
      label: "Accepted",
      is_current: false,
    },
    {
      key: "preparation",
      label: "On Preparation",
      is_current: true,
    },
    {
      key: "pickup",
      label: "Pickup",
      is_current: false,
    },
    {
      key: "delivery",
      label: "On Delivery",
      is_current: false,
    },
    {
      key: "received",
      label: "Received",
      is_current: false,
    },
    {
      key: "review",
      label: "Reviewed",
      is_current: false,
    },
    {
      key: "done",
      label: "Done",
      is_current: false,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="mx-auto space-y-4 p-1">
      {/* === Status Tracker (dinamis) === */}

      {steps.length > 0 && (
        <Card className="sticky top-14 z-30">
          <CardBody>
            <StatusDeliveryImage
              steps={steps}
              meta={{
                pickup: { arrive: "-", depart: "-" },
                received: { arrive: "-", depart: "-" },
                review: { arrive: "-", depart: "-" },
              }}
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
              {/* Info Order */}
              <OrderInfoCard
                mode={mode}
                noJO={noJO}
                customer={customer}
                namaPenerima={namaPenerima}
                setNamaPenerima={setNamaPenerima}
                jenisOrder={jenisOrder}
                setJenisOrder={setJenisOrder}
                armada={armada}
                setArmada={setArmada}
                kotaMuat={kotaMuat}
                onChangeKotaMuat={handleChangeKotaMuat}
                kotaBongkar={kotaBongkar}
                onChangeKotaBongkar={handleChangeKotaBongkar}
                errors={errors}
                firstErrorKey={firstErrorKey}
                firstErrorRef={firstErrorRef}
                profile={profile}
              />

              {/* Info Lokasi */}
              <LocationInfoCard
                isReadOnly={isReadOnly}
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
                deliveryNoteUri=""
                mode={mode}
                pickupAttachment={pickupAttachment}
                setPickupAttachment={setPickupAttachment}
                uploadPickupAttachmentGroup={uploadPickupAttachmentGroup}
                deletePickupAttachmentFile={deletePickupAttachmentFile}
                dropOffAttachment={dropOffAttachment}
                setDropOffAttachment={setDropOffAttachment}
                uploadDropOffAttachmentGroup={uploadDropOffAttachmentGroup}
                deleteDropOffAttachmentFile={deleteDropOffAttachmentFile}
                multiPickupDrop={multiPickupDrop}
                setMultiPickupDrop={setMultiPickupDrop}
                extraStops={extraStops}
                setExtraStops={setExtraStops}
                errors={errors}
                firstErrorKey={firstErrorKey}
                firstErrorRef={firstErrorRef}
                extraRefs={extraRefs}
              />

              {/* Layanan Khusus */}
              <SpecialServicesCard
                isReadOnly={isReadOnly}
                layananPreset={layananPreset}
                layananKhusus={layananKhusus}
                setLayananKhusus={setLayananKhusus}
                layananLainnya={layananLainnya}
                setLayananLainnya={setLayananLainnya}
              />
            </div>

            {/* ===== Right Column ===== */}
            <div className="md:basis-1/3  min-w-0 space-y-4">
              {/* Info Muatan */}
              <CargoInfoCard
                jenisOrder={jenisOrder}
                muatanNama={muatanNama}
                setMuatanNama={setMuatanNama}
                muatanDeskripsi={muatanDeskripsi}
                setMuatanDeskripsi={setMuatanDeskripsi}
                jenisMuatan={jenisMuatan}
                setJenisMuatan={setJenisMuatan}
                cargoQTY={cargoQTY ?? 0}
                setCargoQTY={setCargoQTY}
                cargoCBM={cargoCBM ?? 0}
                setCargoCBM={setCargoCBM}
                errors={errors}
                firstErrorKey={firstErrorKey}
                firstErrorRef={firstErrorRef}
              />

              {/* Detail Amount */}
              <CostDetailsCard
                biayaKirimLabel={biayaKirimLabel}
                biayaLayananTambahanLabel={biayaLayananTambahanLabel}
                taxLabel={taxLabel}
                totalHargaLabel={totalHargaLabel}
              />

              {/* Dokumen Pengiriman */}
              <ShippingDocumentsCard
                dokumenFiles={dokumenFiles}
                setDokumenFiles={setDokumenFiles}
                sjPodFiles={sjPodFiles}
                setSjPodFiles={setSjPodFiles}
                existingPackingList={existingPackingList}
                existingDeliveryNotes={existingDeliveryNotes}
                onRemovePackingList={handleRemovePackingList}
                onRemoveDeliveryNote={handleRemoveDeliveryNote}
                existingPackingListLabel={packingListAttachmentName}
                existingDeliveryNotesLabel={deliveryNoteAttachmentName}
              />
            </div>

            {/* === Bottom Action Bar — match AddressesForm + Chat Impulse === */}
            <div
              className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70"
              role="region"
              aria-label="Form actions"
            >
              <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-2">
                {/* LEFT: Chat / Broadcast (dengan IMPULSE) */}
                <div className="flex items-center gap-2">
                  {mode != "create" && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCreate}
                    >
                      {t("orders.create.title")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDuplicate}
                  >
                    {t("orders.duplicate.title")}
                  </Button>

                  {/* {canShowChat && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setChatOpen(true);
                        setHasChatImpulse(false); // buka chat = anggap sudah dibaca
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

                  {canShowListReviewClaims && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onHandleShowReviewClaimListButton}
                    >
                      {`Claims (${reviewClaimIdsCount})`}
                    </Button>
                  )}
                </div>

                {/* RIGHT: Discard & Submit */}
                <div className="flex items-center gap-2">
                  {statusCurrent === "review" && (
                    <Button type="button" variant="solid" onClick={handleDone}>
                      Done
                    </Button>
                  )}

                  <Button type="button" variant="ghost" onClick={handleDiscard}>
                    {t("common.discard")}
                  </Button>
                  <Button
                    hidden={isReadOnly}
                    type="submit"
                    // disabled={submitLoading || !canSubmit}
                    disabled={submitLoading}
                    variant="solid"
                  >
                    {submitLoading
                      ? t("common.sending") ?? "Mengirim…"
                      : mode === "edit"
                      ? t("common.update") ?? "Update"
                      : t("common.save") ?? "Save"}
                  </Button>
                </div>
              </div>
            </div>

            {/* <div className="flex items-center justify-start gap-3 pt-3"></div> */}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {canShowChat && (
            <ChatterPanel
              resModel={chatterResModel}
              resId={chatterResId ?? null}
              endpointBase={CHATTERS_URL}
              onRead={() => setHasChatImpulse(false)}
              className="w-full"
            />
          )}
        </CardBody>
      </Card>

      {/* === Chat Dialog (Popup) === */}
      {/* <Modal open={chatOpen && canShowChat} onClose={() => setChatOpen(false)}>
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-gray-800">
            {t("orders.chat_broadcast") ?? "Chat / Broadcast Message"}
          </h4>
          <FieldTextarea
            label={t("orders.message") ?? "Message"}
            value={chatMsg}
            onChange={setChatMsg}
            rows={3}
            placeholder={
              t("orders.type_message") ??
              "Tulis pesan untuk broadcast ke server…"
            }
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setChatOpen(false)}>
              {t("common.cancel") ?? "Batal"}
            </Button>
            <Button
              type="button"
              onClick={handleSendChat}
              disabled={chatSending || !chatMsg.trim()}
              variant="primary"
            >
              {chatSending
                ? t("common.sending") ?? "Sending…"
                : t("common.send") ?? "Send"}
            </Button>
          </div>
        </div>
      </Modal> */}
      {/* === Dialogs === */}
      {confirmOpen && (
        <ConfirmSubmitDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmAndSubmit}
          loading={submitLoading}
          mode={mode}
        />
      )}
      {respOpen && (
        <ResponseDialog
          open={respOpen}
          title={respTitle}
          message={respMessage}
          onClose={() => {
            setRespOpen(false);
            if (respIsSuccess) {
              if (onSuccess) onSuccess();
              else if (lastCreatedId) {
                const idStr = String(lastCreatedId ?? "");
                router.push(
                  idStr
                    ? safeJoin(
                        APP_BASE_PATH,
                        `/orders/details/?id=${encodeURIComponent(idStr)}`
                      )
                    : safeJoin(APP_BASE_PATH, "/orders")
                );
              } else {
                router.push(safeJoin(APP_BASE_PATH, "/orders"));
              }
            }
          }}
        />
      )}
      {claimsModalOpen && (
        <ClaimListModal
          open={claimsModalOpen}
          onClose={() => setClaimsModalOpen(false)}
          claims={claims}
          loading={claimsLoading}
        />
      )}
      {chatDlgOpen && (
        <ModalDialog
          open={chatDlgOpen}
          kind={chatDlgKind}
          title={chatDlgTitle}
          message={chatDlgMsg}
          onClose={() => setChatDlgOpen(false)}
        />
      )}
      {dlgOpen && (
        <ModalDialog
          open={dlgOpen}
          kind={dlgKind}
          title={dlgTitle}
          message={dlgMsg}
          onClose={() => {
            setDlgOpen(false);

            console.log(
              "Dialog closed, kind=",
              dlgKind,
              " lastCreatedId=",
              lastCreatedId
            );
            console.log("reloadSelfAfterDlg=", reloadSelfAfterDlg);
            console.log("effectiveOrderId=", effectiveOrderId);

            if (reloadSelfAfterDlg) {
              setReloadSelfAfterDlg(false);
              router.push(
                `/orders/details/?id=${encodeURIComponent(
                  String(effectiveOrderId)
                )}`
              );
              // window.location.reload(); // reload page dirinya sendiri OKEH!! kadang gak jalan
              return;
            }

            if (dlgKind === "success" && lastCreatedId) {
              router.push(
                `/orders/details/?id=${encodeURIComponent(
                  String(lastCreatedId)
                )}`
              );
            }
          }}
        />
      )}
    </form>
  );
}

// "use client";

// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { t, getLang, onLangChange } from "@/lib/i18n";
// import { goSignIn } from "@/lib/goSignIn";
// import { useI18nReady } from "@/hooks/useI18nReady";
// import { Card, CardBody } from "@/components/ui/Card";
// import { Button } from "@/components/ui/Button";
// import ChatterPanel from "@/components/chat/ChatterPanel";
// import OrderInfoCard from "@/components/forms/orders/sections/OrderInfoCard";
// import LocationInfoCard from "@/components/forms/orders/sections/LocationInfoCard";
// import SpecialServicesCard from "@/components/forms/orders/sections/SpecialServicesCard";
// import CargoInfoCard from "@/components/forms/orders/sections/CargoInfoCard";
// import CostDetailsCard from "@/components/forms/orders/sections/CostDetailsCard";
// import ShippingDocumentsCard from "@/components/forms/orders/sections/ShippingDocumentsCard";
// import { tzDateToUtcISO } from "@/lib/tz";
// import { useAuth } from "@/components/providers/AuthProvider";
// import { ClaimItem } from "@/types/claims";
// import { fetchOrderClaims } from "@/services/claimService";
// import { ClaimListModal } from "@/components/claims/ClaimListModal";

// import {
//   odooUtcToDatetimeLocalValue,
//   userLocalToOdooUtc,
// } from "@/lib/datetime";

// import type {
//   AddressItem,
//   OrderTypeItem,
//   ModaItem,
//   ApiPayload,
//   CityItem,
//   OrdersCreateFormProps,
//   PartnerItem,
//   OrderAttachmentGroup,
//   OrderAttachmentItem,
//   RoleOrderProps,
// } from "@/types/orders";

// import {
//   // apiToLocalIsoMinute,
//   buildDetailUrl,
//   // pathJoin,
// } from "@/components/shared/Helper";
// import StatusDeliveryImage from "@/components/ui/DeliveryState";
// import { StatusStep } from "@/types/status-delivery";
// import { ExtraStop } from "./sections/ExtraStopCard";
// import { RecordItem } from "@/types/recorditem";
// import { ExistingFileItem } from "@/components/form/MultiFileUpload";
// import { TmsUserType } from "@/types/tms-profile";
// type ExtraStopWithId = ExtraStop & { uid: string };

// // ====== NEW: Cargo Type Prefill (by id -> RecordItem) ======
// type IdLike = string | number;

// // const CARGO_TYPES_URL = process.env.NEXT_PUBLIC_TMS_CARGO_TYPES_URL ?? "";

// function isRecord(v: unknown): v is Record<string, unknown> {
//   return typeof v === "object" && v !== null;
// }
// function isId(v: unknown): v is IdLike {
//   return typeof v === "string" || typeof v === "number";
// }
// function isStr(v: unknown): v is string {
//   return typeof v === "string";
// }

// export function toRecordItem(x: unknown): RecordItem {
//   // Langsung handle primitif
//   if (isId(x)) {
//     return { id: x, name: String(x) };
//   }

//   // Object-like
//   if (isRecord(x)) {
//     const idRaw = x["id"] ?? x["value"] ?? x["code"];
//     const nameRaw = x["name"] ?? x["label"];

//     const id: IdLike | "" = isId(idRaw) ? idRaw : "";
//     const name: string = isStr(nameRaw)
//       ? nameRaw
//       : isId(idRaw)
//       ? String(idRaw)
//       : "";

//     return { id, name };
//   }

//   // Fallback aman
//   return { id: "", name: "" };
// }

// // async function fetchCargoTypeById(id?: IdLike): Promise<RecordItem | null> {
// //   if (id == null || id === "") return null;
// //   if (!CARGO_TYPES_URL) {
// //     // fallback minimal tanpa endpoint
// //     return { id, name: `#${id}` };
// //   }
// //   try {
// //     const res = await fetch(
// //       `${CARGO_TYPES_URL.replace(/\/$/, "")}/${encodeURIComponent(String(id))}`,
// //       {
// //         headers: { "Accept-Language": getLang() },
// //         credentials: "include",
// //       }
// //     );
// //     if (!res.ok) return { id, name: `#${id}` };
// //     const data = await res.json();
// //     return toRecordItem(data);
// //   } catch {
// //     return { id, name: `#${id}` };
// //   }
// // }
// // function useCargoTypePrefill(initialId?: IdLike) {
// //   const [value, setValue] = useState<RecordItem | null>(null);
// //   const [loading, setLoading] = useState(false);

// //   console.log("useCargoTypePrefill: id = ", initialId);
// //   useEffect(() => {
// //     let alive = true;
// //     (async () => {
// //       if (initialId == null) {
// //         setValue(null);
// //         return;
// //       }
// //       setLoading(true);
// //       try {
// //         const item = await fetchCargoTypeById(initialId);
// //         if (alive) setValue(item);
// //       } finally {
// //         if (alive) setLoading(false);
// //       }
// //     })();
// //     return () => {
// //       alive = false;
// //     };
// //   }, [initialId]);
// //   return { value, setValue, loading };
// // }
// // ===========================================================

// // === Chat impulse hook (no top-level hooks usage violations) ===
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

// /** ENV */

// const POST_ORDER_URL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL!;
// // const POST_CHAT_URL = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL ?? "";
// const CHATTERS_URL = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL ?? "";
// const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
// const UPDATE_URL_TPL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
// const APP_BASE_PATH = process.env.NEXT_PUBLIC_URL_BASE ?? "";

// const DOCUMENT_ATTACHMENTS_URL =
//   process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL ?? "";

// const DOC_ATTACHMENT_PACKING_LIST_TYPE =
//   "transport_order_packing_list" as const;
// const DOC_ATTACHMENT_DELIVERY_NOTE_TYPE =
//   "transport_order_delivery_note" as const;

// const DOC_ATTACHMENT_PICKUP_TYPE = "route_transport_pickup" as const;
// const DOC_ATTACHMENT_DROP_OFF_TYPE = "route_transport_drop_off" as const;

// type DocumentAttachmentsResponse = OrderAttachmentGroup;

// // ApiPayload + field attachment_id
// type ApiPayloadWithAttachments = ApiPayload & {
//   packing_list_attachment_id?: number;
//   delivery_note_attachment_id?: number;
//   pickup_attachment_id?: number;
//   drop_off_attachment_id?: number;
//   pickup_attachment?: OrderAttachmentGroup | null;
//   drop_off_attachment?: OrderAttachmentGroup | null;
// };

// /* === Lightweight Modal/Dialog === */
// export function Modal({
//   open,
//   onClose,
//   children,
// }: {
//   open: boolean;
//   onClose?: () => void;
//   children: React.ReactNode;
// }) {
//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 z-[60] flex items-center justify-center">
//       <div
//         className="absolute inset-0 bg-black/30"
//         onClick={onClose}
//         aria-hidden
//       />
//       <div className="relative z-[61] w-[min(92vw,520px)] rounded-xl bg-white p-4 shadow-xl">
//         {children}
//       </div>
//     </div>
//   );
// }

// /* === Konfirmasi sebelum submit === */
// function ConfirmSubmitDialog({
//   open,
//   onCancel,
//   onConfirm,
//   loading,
//   mode,
// }: {
//   open: boolean;
//   onCancel: () => void;
//   onConfirm: () => void;
//   loading?: boolean;
//   mode: "create" | "edit";
// }) {
//   return (
//     <Modal open={open} onClose={onCancel}>
//       <div className="space-y-3">
//         <h4 className="text-lg font-semibold text-gray-800">
//           {t("common.confirm") ?? "Konfirmasi"}
//         </h4>
//         <p className="text-sm text-gray-700">
//           {mode === "create"
//             ? t("orders.confirm_submit_text") ??
//               "Pastikan semua informasi sudah benar sebelum submit. Lanjutkan?"
//             : t("orders.confirm_update_text") ??
//               "Perbarui data order sesuai perubahan yang sudah Anda buat. Lanjutkan?"}
//         </p>
//         <div className="flex items-center justify-end gap-3 pt-2">
//           <Button variant="outline" onClick={onCancel} disabled={loading}>
//             {t("common.no") ?? "Tidak"}
//           </Button>
//           <Button variant="primary" onClick={onConfirm} disabled={loading}>
//             {loading
//               ? t("common.sending") ?? "Mengirim…"
//               : t("common.yes") ?? "Ya"}
//           </Button>
//         </div>
//       </div>
//     </Modal>
//   );
// }

// /* === Dialog hasil response submit === */
// function ResponseDialog({
//   open,
//   title,
//   message,
//   onClose,
// }: {
//   open: boolean;
//   title: string;
//   message: string;
//   onClose: () => void;
// }) {
//   return (
//     <Modal open={open} onClose={onClose}>
//       <div className="space-y-3">
//         <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
//         <div className="text-sm whitespace-pre-wrap text-gray-700">
//           {message}
//         </div>
//         <div className="flex items-center justify-end pt-2">
//           <Button variant="primary" onClick={onClose}>
//             OK
//           </Button>
//         </div>
//       </div>
//     </Modal>
//   );
// }

// function ModalDialog({
//   open,
//   kind = "success",
//   title,
//   message,
//   onClose,
// }: {
//   open: boolean;
//   kind?: "success" | "error";
//   title: string;
//   message: React.ReactNode;
//   onClose: () => void;
// }) {
//   if (!open) return null;
//   const ring = kind === "success" ? "ring-green-500" : "ring-red-500";
//   const head = kind === "success" ? "text-green-700" : "text-red-700";
//   const btn =
//     kind === "success"
//       ? "bg-green-600 hover:bg-green-700"
//       : "bg-red-600 hover:bg-red-700";
//   return (
//     <div>
//       <div
//         className="fixed inset-0 z-[100] flex items-center justify-center"
//         role="dialog"
//         aria-modal="true"
//         onKeyDown={(e) => e.key === "Escape" && onClose()}
//       >
//         <div
//           className="absolute inset-0 bg-black/40 backdrop-blur-sm"
//           onClick={onClose}
//         />
//         <div
//           className={`relative mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ${ring}`}
//         >
//           <div className={`mb-2 text-lg font-semibold ${head}`}>{title}</div>
//           <div className="mb-4 text-sm text-gray-700">{message}</div>
//           <div className="flex justify-end">
//             <button
//               type="button"
//               onClick={onClose}
//               className={`inline-flex items-center rounded-lg px-4 py-2 text-white ${btn} focus:outline-none focus:ring`}
//             >
//               OK
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function fillUrlTemplate(tpl: string, id?: string | number): string {
//   if (!tpl) return "";
//   if (tpl.includes(":id")) return tpl.replace(":id", String(id ?? ""));
//   if (id != null && !tpl.endsWith("/")) return `${tpl}/${id}`;
//   if (id != null) return `${tpl}${id}`;
//   return tpl;
// }

// type RouteItem = NonNullable<
//   NonNullable<OrdersCreateFormProps["initialData"]>["route_ids"]
// >[number];

// function addrFromRoute(
//   r: RouteItem | undefined,
//   which: "origin" | "dest"
// ): AddressItem | null {
//   if (!r) return null;
//   const obj = which === "origin" ? r.origin_address : r.dest_address;
//   if (obj && (obj as AddressItem).id) return obj as AddressItem;
//   const id = which === "origin" ? r.origin_address_id : r.dest_address_id;
//   return id ? ({ id } as AddressItem) : null;
// }

// function normalizeKey(s: unknown): string {
//   return String(s ?? "")
//     .toLowerCase()
//     .trim()
//     .replace(/[\s_-]+/g, "");
// }

// function extractApiSteps(
//   d: NonNullable<OrdersCreateFormProps["initialData"]>
// ): StatusStep[] {
//   const items = (d.states ?? []) as StatusStep[];

//   return items.map((it): StatusStep => {
//     if (typeof it === "string") {
//       return { key: normalizeKey(it), label: it, is_current: false };
//     }
//     const key = normalizeKey(it.key ?? it.label);
//     const label = it.label ?? it.key ?? "";
//     return { key, label, is_current: Boolean(it.is_current) };
//   });
// }

// function toExistingFileItems(
//   attachment: OrderAttachmentGroup | OrderAttachmentItem[] | null | undefined
// ): ExistingFileItem[] {
//   if (!attachment) return [];
//   if (Array.isArray(attachment)) {
//     return attachment.map((att) => ({
//       id: att.id,
//       name: att.name,
//       url: att.url,
//       mimetype: att.mimetype,
//     }));
//   }
//   const items = attachment.attachments ?? [];
//   return items.map((att) => ({
//     id: att.id,
//     name: att.name,
//     url: att.url,
//     mimetype: att.mimetype,
//   }));
// }

// function prefillFromInitial(
//   data: NonNullable<OrdersCreateFormProps["initialData"]>,
//   userTz: string = "Asia/Jakarta"
// ) {
//   const tz = userTz;

//   let claimCount = 0;
//   if ("reviewed_claim_ids_count" in data) {
//     const v = (data as { reviewed_claim_ids_count?: unknown })
//       .reviewed_claim_ids_count;
//     if (typeof v === "number") {
//       claimCount = v;
//     } else if (typeof v === "string") {
//       const n = Number(v);
//       if (Number.isFinite(n)) claimCount = n;
//     }
//   }

//   const isReviewed = (data.state ?? "").toLowerCase().includes("review");
//   const form = {
//     states: data.states ? extractApiSteps(data) : ([] as StatusStep[]),
//     state: data.state ?? "",
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
//     tglMuat: odooUtcToDatetimeLocalValue(data.pickup_date_planne, tz, "08:00"),
//     tglBongkar: odooUtcToDatetimeLocalValue(
//       data.drop_off_date_planne,
//       tz,
//       "17:00"
//     ),

//     lokMuat: null as AddressItem | null,
//     lokBongkar: null as AddressItem | null,

//     // readonly
//     origin_address_name: "",
//     origin_street: "",
//     origin_street2: "",
//     origin_district_name: "",
//     origin_zip: "",
//     origin_latitude: "",
//     origin_longitude: "",
//     // readonly
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

//     existingPackingList: [] as ExistingFileItem[],
//     existingDeliveryNotes: [] as ExistingFileItem[],

//     packingListAttachmentId: null as number | null,
//     deliveryNoteAttachmentId: null as number | null,
//     packingListAttachmentName: "",
//     deliveryNoteAttachmentName: "",
//     pickupAttachment: null as OrderAttachmentGroup | null,
//     dropOffAttachment: null as OrderAttachmentGroup | null,

//     extraStops: [] as ExtraStop[],
//     isReadOnly: false,
//     mainRouteId: null as number | null,
//     reviewed_claim_ids_count: claimCount,

//     res_id: data.res_id,
//     res_model: data.res_model,
//     original_res_id: data.original_res_id,
//     original_res_model: data.original_res_model,
//   };

//   console.log("data:", data);
//   console.log("form before:", form);

//   const routes: RouteItem[] = Array.isArray(data.route_ids)
//     ? (data.route_ids as RouteItem[])
//     : ([] as RouteItem[]);

//   console.log("routes:", routes);
//   // const main = routes.find((r) => r.is_main_route);
//   const main = routes.flat().find((r) => r.is_main_route === true);

//   console.log("main route:", main);
//   form.mainRouteId = typeof main?.id === "number" ? main.id : null;

//   const etdLocal = odooUtcToDatetimeLocalValue(main?.etd_date ?? null, tz);
//   const etaLocal = odooUtcToDatetimeLocalValue(main?.eta_date ?? null, tz);

//   if (etdLocal) form.tglMuat = etdLocal;
//   if (etaLocal) form.tglBongkar = etaLocal; // apiToLocalIsoMinute(main?.eta_date) || form.tglBongkar;
//   form.lokMuat = addrFromRoute(main, "origin");
//   form.lokBongkar = addrFromRoute(main, "dest");
//   form.picMuatNama = main?.origin_pic_name ?? "";
//   form.picMuatTelepon = main?.origin_pic_phone ?? "";
//   form.picBongkarNama = main?.dest_pic_name ?? "";
//   form.picBongkarTelepon = main?.dest_pic_phone ?? "";

//   // readonly
//   form.origin_address_name = main?.origin_address_name ?? "";
//   form.origin_street = main?.origin_street ?? "";
//   form.origin_street2 = main?.origin_street2 ?? "";
//   form.origin_district_name = main?.origin_district.name ?? "";
//   form.origin_zip = main?.origin_zip ?? "";
//   form.origin_latitude = main?.origin_latitude ?? "";
//   form.origin_longitude = main?.origin_longitude ?? "";
//   // readonly
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

//   // const extras: RouteItem[] = routes.filter((r) => !r.is_main_route);
//   const extras: RouteItem[] = routes.flat().filter((r) => !r.is_main_route);

//   console.log("extra routes:", extras);

//   form.extraStops = extras.map(
//     (r): ExtraStop => ({
//       id: r.id,
//       lokMuat: addrFromRoute(r, "origin"),
//       lokBongkar: addrFromRoute(r, "dest"),
//       originPicName: r.origin_pic_name ?? "",
//       originPicPhone: r.origin_pic_phone ?? "",
//       destPicName: r.dest_pic_name ?? "",
//       destPicPhone: r.dest_pic_phone ?? "",
//       // tglETDMuat: apiToLocalIsoMinute(r.etd_date) ?? r.etd_date ?? "",
//       // tglETABongkar: apiToLocalIsoMinute(r.eta_date) ?? r.eta_date ?? "",

//       tglETDMuat: odooUtcToDatetimeLocalValue(r.etd_date, tz),
//       tglETABongkar: odooUtcToDatetimeLocalValue(r.eta_date, tz),

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

//   const current = data.states?.find((s) => s.is_current);

//   console.log("current state:", current);

//   form.isReadOnly = current
//     ? !["draft", "pending"].includes(current.key)
//     : false;

//   form.existingPackingList = toExistingFileItems(
//     data.packing_list_attachment as
//       | OrderAttachmentGroup
//       | OrderAttachmentItem[]
//       | null
//       | undefined
//   );

//   form.existingDeliveryNotes = toExistingFileItems(
//     data.delivery_note_attachment as
//       | OrderAttachmentGroup
//       | OrderAttachmentItem[]
//       | null
//       | undefined
//   );

//   const pl = data.packing_list_attachment as
//     | OrderAttachmentGroup
//     | OrderAttachmentItem[]
//     | null
//     | undefined;

//   if (pl && !Array.isArray(pl)) {
//     form.packingListAttachmentId = typeof pl.id === "number" ? pl.id : null;
//     form.packingListAttachmentName = pl.name ?? "";
//   }

//   const dn = data.delivery_note_attachment as
//     | OrderAttachmentGroup
//     | OrderAttachmentItem[]
//     | null
//     | undefined;

//   if (dn && !Array.isArray(dn)) {
//     form.deliveryNoteAttachmentId = typeof dn.id === "number" ? dn.id : null;
//     form.deliveryNoteAttachmentName = dn.name ?? "";
//   }

//   // Pickup / Drop-off attachment group lives on main route
//   if (main) {
//     const pu =
//       (main as unknown as { pickup_attachment?: OrderAttachmentGroup | null })
//         .pickup_attachment ?? null;
//     if (pu && !Array.isArray(pu)) form.pickupAttachment = pu;

//     const doff =
//       (main as unknown as { drop_off_attachment?: OrderAttachmentGroup | null })
//         .drop_off_attachment ?? null;
//     if (doff && !Array.isArray(doff)) form.dropOffAttachment = doff;
//   }

//   form.state = data.state ?? "";
//   console.log("form results:", form);
//   return form;
// }

// function extractCreatedId(json: unknown): string | number | undefined {
//   if (json && typeof json === "object") {
//     const o = json as Record<string, unknown>;

//     const direct = o["id"];
//     if (typeof direct === "string" || typeof direct === "number") return direct;

//     const data = o["data"];
//     if (data && typeof data === "object") {
//       const did = (data as Record<string, unknown>)["id"];
//       if (typeof did === "string" || typeof did === "number") return did;
//     }

//     const result = o["result"];
//     if (result && typeof result === "object") {
//       const rid = (result as Record<string, unknown>)["id"];
//       if (typeof rid === "string" || typeof rid === "number") return rid;
//     }
//   }
//   return undefined;
// }

// type ApiErrorItem = string | { msg?: string } | Record<string, unknown>;
// type ApiErrorBody = {
//   message?: string;
//   error?: string;
//   errors?: ApiErrorItem[];
//   detail?: ApiErrorItem[];
// };

// function itemToMsg(it: ApiErrorItem): string | null {
//   if (typeof it === "string") return it;
//   if (it && typeof it === "object" && "msg" in it) {
//     const v = (it as { msg?: unknown }).msg;
//     if (typeof v === "string") return v;
//   }
//   return null;
// }

// /** ===================== Component ===================== */
// // export default function OrdersCreateForm({
// //   mode = "create",
// //   orderId,
// //   initialData,
// //   onSuccess,
// // }: OrdersCreateFormProps) {
// export default function OrdersCreateForm<T extends TmsUserType>({
//   mode = "edit",
//   orderId,
//   initialData,
//   onSuccess,
//   userType,
// }: RoleOrderProps<T> & { userType: T }) {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const qsId = searchParams?.get("id") ?? null;
//   const effectiveOrderId = useMemo<string | number | undefined>(() => {
//     return orderId ?? qsId ?? undefined;
//   }, [orderId, qsId]);

//   const { profile } = useAuth();

//   const { ready: i18nReady } = useI18nReady();
//   const { hasChatImpulse, setHasChatImpulse } = useChatImpulseChannel();
//   const forceRerender = React.useReducer((x: number) => x + 1, 0)[1];
//   useEffect(() => {
//     const off = onLangChange(() => forceRerender());
//     return () => off?.();
//   }, [forceRerender]);

//   const profileTimezone =
//     (profile as { tz?: string } | undefined)?.tz || "Asia/Jakarta";

//   // ===== Local states =====
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
//   const [mainRouteId, setMainRouteId] = useState<number | null>(null);

//   const [reviewClaimIdsCount, setReviewClaimIdsCount] = useState<number>(0);

//   // Kontak utama (PIC)
//   const [picMuatNama, setPicMuatNama] = useState<string>("");
//   const [picMuatTelepon, setPicMuatTelepon] = useState<string>("");
//   const [picBongkarNama, setPicBongkarNama] = useState<string>("");
//   const [picBongkarTelepon, setPicBongkarTelepon] = useState<string>("");

//   // Multi Pickup/Drop
//   const [multiPickupDrop, setMultiPickupDrop] = useState<boolean>(false);
//   const [extraStops, setExtraStops] = useState<ExtraStopWithId[]>(() =>
//     (
//       [
//         {
//           id: 0,
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
//           id: 0,
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

//   // Upload lists (MultiFileUpload controlled)
//   const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
//   const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);

//   const [existingPackingList, setExistingPackingList] = useState<
//     ExistingFileItem[]
//   >([]);
//   const [existingDeliveryNotes, setExistingDeliveryNotes] = useState<
//     ExistingFileItem[]
//   >([]);

//   const [packingListAttachmentId, setPackingListAttachmentId] = useState<
//     number | null
//   >(null);
//   const [deliveryNoteAttachmentId, setDeliveryNoteAttachmentId] = useState<
//     number | null
//   >(null);

//   const [packingListAttachmentName, setPackingListAttachmentName] =
//     useState<string>("");
//   const [deliveryNoteAttachmentName, setDeliveryNoteAttachmentName] =
//     useState<string>("");

//   // Independent attachments (Pickup / Drop-off)
//   const [pickupAttachment, setPickupAttachment] =
//     useState<OrderAttachmentGroup | null>(null);
//   const [dropOffAttachment, setDropOffAttachment] =
//     useState<OrderAttachmentGroup | null>(null);

//   // Amount placeholders
//   const [biayaKirimLabel, setAmountShipping] = useState<number | string>();
//   const [biayaLayananTambahanLabel, setAmountShippingMultiCharge] = useState<
//     number | string
//   >("");
//   const [taxLabel, setAmountTax] = useState<number | string>("");
//   const [totalHargaLabel, setAmountTotal] = useState<number | string>("");

//   // Errors & refs
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const firstErrorRef = useRef<HTMLDivElement | null>(null);
//   const extraRefs = useRef<Record<string, HTMLDivElement | null>>({});

//   const firstErrorKey = useMemo(() => {
//     const order = [
//       "namaPenerima",
//       "kotaMuat",
//       "kotaBongkar",
//       "jenisOrder",
//       "armada",
//       "tglMuat",
//       "tglBongkar",
//       "jenisMuatan",
//       "cargoCBM",
//       "cargoQTY",
//       // "jumlahMuatan",
//       "lokMuat",
//       "lokBongkar",
//     ] as const;
//     return order.find((k) => errors[k]);
//   }, [errors]);

//   // Dialogs & loading
//   const [confirmOpen, setConfirmOpen] = useState(false);
//   const [submitLoading, setSubmitLoading] = useState(false);

//   const [respOpen, setRespOpen] = useState(false);
//   const [respTitle, setRespTitle] = useState("");
//   const [respMessage, setRespMessage] = useState("");
//   const [respIsSuccess, setRespIsSuccess] = useState(false);
//   const [lastCreatedId, setLastCreatedId] = useState<
//     string | number | undefined
//   >(undefined);

//   const [statusCurrent, setStatusCurrent] = useState<string | undefined>("");
//   const [isReadOnly, setIsReadOnly] = useState<boolean>(false);

//   const [steps, setSteps] = useState<StatusStep[]>([]);

//   // ===================== Prefill untuk Edit =====================
//   const [loadingDetail, setLoadingDetail] = useState<boolean>(
//     mode === "edit" && !initialData ? true : false
//   );

//   // const [chatOpen, setChatOpen] = useState(false);
//   const canShowChat = isReadOnly || respIsSuccess;

//   // const canShowReviewClaims = mode === "edit";
//   const canShowListReviewClaims = reviewClaimIdsCount > 0;

//   const [claimsModalOpen, setClaimsModalOpen] = useState(false);
//   const [claims, setClaims] = useState<ClaimItem[]>([]);
//   const [claimsLoading, setClaimsLoading] = useState(false);
//   const fetchClaims = async () => {
//     if (!effectiveOrderId) return;
//     setClaimsLoading(true);
//     try {
//       const claimsData = await fetchOrderClaims(effectiveOrderId);
//       setClaims(claimsData.items);
//     } catch (error) {
//       console.error("Failed to fetch claims:", error);
//       openErrorDialog(error, "Failed to load claims");
//     } finally {
//       setClaimsLoading(false);
//     }
//   };

//   const [dlgOpen, setDlgOpen] = useState(false);
//   const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
//   const [dlgTitle, setDlgTitle] = useState("");
//   const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");

//   const [reloadSelfAfterDlg, setReloadSelfAfterDlg] = useState(false);

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
//   function onHandleShowReviewClaimListButton() {
//     setClaimsModalOpen(true);
//     fetchClaims();
//   }

//   function handleChangeKotaMuat(city: CityItem | null) {
//     setKotaMuat(city);
//     setLokMuat(null);
//   }

//   function handleChangeKotaBongkar(city: CityItem | null) {
//     setKotaBongkar(city);
//     setLokBongkar(null);
//   }

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
//   const [cargoCBM, setCargoCBM] = useState<number>();
//   const [cargoQTY, setCargoQTY] = useState<number>();

//   useEffect(() => {
//     console.log("initialData changed:", initialData);
//     if (!initialData) return;
//     console.log("Prefilling form from initialData:", initialData);

//     const f = prefillFromInitial(initialData, profileTimezone);
//     setChatterResModel(
//       typeof f.res_model === "string" ? f.res_model : String(f.res_model ?? "")
//     );
//     setChatterResId(
//       typeof f.res_id === "string" || typeof f.res_id === "number"
//         ? f.res_id
//         : undefined
//     );
//     setMainRouteId(f.mainRouteId);
//     setNamaPenerima(f.namaPenerima);
//     setJenisOrder(f.jenisOrder);
//     setArmada(f.armada);
//     setKotaMuat(f.kotaMuat);
//     setKotaBongkar(f.kotaBongkar);

//     console.log(" PROFILE TZ :: ", profile?.tz);

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

//     setJenisMuatan(
//       f.cargo_type_id != null
//         ? {
//             id: String(f.cargo_type_id),
//             name: f.cargo_type?.name ?? f.cargo_type?.name ?? "",
//           }
//         : null
//     );
//     setCargoCBM(f.cargoCBM);
//     setCargoQTY(f.cargoQTY);

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

//     setExistingPackingList(f.existingPackingList);
//     setExistingDeliveryNotes(f.existingDeliveryNotes);

//     setPackingListAttachmentId(f.packingListAttachmentId);
//     setDeliveryNoteAttachmentId(f.deliveryNoteAttachmentId);
//     setPackingListAttachmentName(f.packingListAttachmentName);
//     setDeliveryNoteAttachmentName(f.deliveryNoteAttachmentName);

//     // if (userType === "shipper") {
//     setReviewClaimIdsCount(Number(f.reviewed_claim_ids_count ?? 0));
//     // }

//     console.log("f data: ", f);
//     console.log("initialData.states:", initialData.states);
//     console.log("extracted steps:", extractApiSteps(initialData));
//     console.log("prefilled steps:", f.states);

//     setSteps(f.states);
//     setStatusCurrent(f.states.find((s) => s.is_current)?.key);

//     console.log(
//       "prefilled current step:",
//       f.states.find((s) => s.is_current)
//     );

//     console.log("Current Status after setStatusCurrent :", statusCurrent);
//     setLoadingDetail(false);
//   }, [initialData]);

//   async function deleteRemoteAttachment(
//     docAttachmentId: number,
//     attachmentId: number
//   ) {
//     const url = `${DOCUMENT_ATTACHMENTS_URL}/${encodeURIComponent(
//       String(docAttachmentId)
//     )}/attachments/${encodeURIComponent(String(attachmentId))}`;

//     const res = await fetch(url, {
//       method: "DELETE",
//       credentials: "include",
//     });

//     if (!res.ok) {
//       const text = await res.text().catch(() => "");
//       throw new Error(
//         `Failed to delete attachment (${res.status} ${res.statusText}) ${text}`
//       );
//     }
//   }

//   // ===== Pickup / Drop-off attachments (independent uploader) =====
//   const uploadPickupAttachmentGroup = useCallback(
//     async (files: File[]) => {
//       const g = await uploadDocumentsForDocTypeGroup(files, {
//         docType: DOC_ATTACHMENT_PICKUP_TYPE,
//         groupId: pickupAttachment?.id ?? null,
//       });
//       setPickupAttachment(g);
//       return g;
//     },
//     [pickupAttachment?.id]
//   );

//   const uploadDropOffAttachmentGroup = useCallback(
//     async (files: File[]) => {
//       const g = await uploadDocumentsForDocTypeGroup(files, {
//         docType: DOC_ATTACHMENT_DROP_OFF_TYPE,
//         groupId: dropOffAttachment?.id ?? null,
//       });
//       setDropOffAttachment(g);
//       return g;
//     },
//     [dropOffAttachment?.id]
//   );

//   const deletePickupAttachmentFile = useCallback(
//     async (attachmentId: number) => {
//       const groupId = pickupAttachment?.id;
//       if (!groupId) return pickupAttachment ?? null;

//       await deleteRemoteAttachment(groupId, attachmentId);

//       const next: OrderAttachmentGroup | null = pickupAttachment
//         ? {
//             ...pickupAttachment,
//             attachments: (pickupAttachment.attachments ?? []).filter(
//               (a) => a.id !== attachmentId
//             ),
//           }
//         : null;

//       setPickupAttachment(next);
//       return next;
//     },
//     [pickupAttachment]
//   );

//   const deleteDropOffAttachmentFile = useCallback(
//     async (attachmentId: number) => {
//       const groupId = dropOffAttachment?.id;
//       if (!groupId) return dropOffAttachment ?? null;

//       await deleteRemoteAttachment(groupId, attachmentId);

//       const next: OrderAttachmentGroup | null = dropOffAttachment
//         ? {
//             ...dropOffAttachment,
//             attachments: (dropOffAttachment.attachments ?? []).filter(
//               (a) => a.id !== attachmentId
//             ),
//           }
//         : null;

//       setDropOffAttachment(next);
//       return next;
//     },
//     [dropOffAttachment]
//   );

//   const handleRemovePackingList = useCallback(
//     async (item: ExistingFileItem) => {
//       console.log("handleRemovePackingList ", item);
//       if (!item.groupId) {
//         setExistingPackingList((prev) =>
//           prev.filter((it) => it.id !== item.id)
//         );
//         return;
//       }
//       try {
//         setExistingPackingList((prev) => prev.filter((i) => i.id !== item.id));
//         await deleteRemoteAttachment(item.groupId, item.id);
//         console.log("Removing packing list attachment:", item);
//       } catch (error) {
//         console.error("Failed to remove packing list:", error);
//         setExistingPackingList((prev) => [...prev, item]);
//       }
//     },
//     []
//   );

//   const handleRemoveDeliveryNote = useCallback(
//     async (item: ExistingFileItem) => {
//       console.log("handleRemoveDeliveryNote ", item);
//       if (!item.groupId) {
//         setExistingDeliveryNotes((prev) =>
//           prev.filter((it) => it.id !== item.id)
//         );
//         return;
//       }

//       try {
//         setExistingDeliveryNotes((prev) =>
//           prev.filter((i) => i.id !== item.id)
//         );
//         await deleteRemoteAttachment(item.groupId, item.id);
//         console.log("Removing delivery note attachment:", item);
//       } catch (error) {
//         console.error("Failed to remove delivery note:", error);
//         setExistingDeliveryNotes((prev) => [...prev, item]);
//       }
//     },
//     []
//   );

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

//     console.log("Fetching order detail for prefill from URL:", url);

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
//           console.log("Fetched order detail for prefill:", json);
//           console.log(" PROFILE TZ :: ", profile?.tz);
//           console.log("profileTimezone:", profileTimezone);

//           const f = prefillFromInitial(json, profileTimezone);

//           console.log("Prefilled data from fetched detail:", f);

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
//           setMainRouteId(f.mainRouteId);
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
//           setCargoCBM(f.cargoCBM);
//           setCargoQTY(f.cargoQTY);

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

//           setExistingPackingList(f.existingPackingList);
//           setExistingDeliveryNotes(f.existingDeliveryNotes);

//           setPackingListAttachmentId(f.packingListAttachmentId);
//           setDeliveryNoteAttachmentId(f.deliveryNoteAttachmentId);
//           setPackingListAttachmentName(f.packingListAttachmentName);
//           setDeliveryNoteAttachmentName(f.deliveryNoteAttachmentName);

//           setReviewClaimIdsCount(Number(f?.reviewed_claim_ids_count ?? 0));

//           setSteps(f.states);
//           setStatusCurrent(f.states.find((s) => s.is_current)?.key);

//           setIsReadOnly(f.isReadOnly);
//         }
//       } catch (err) {
//       } finally {
//         setLoadingDetail(false);
//       }
//     })();
//     return () => abort.abort();
//   }, [mode, effectiveOrderId, initialData, router.replace]);

//   async function uploadDocumentsForDocType(
//     files: File[],
//     opts: {
//       docType:
//         | typeof DOC_ATTACHMENT_PACKING_LIST_TYPE
//         | typeof DOC_ATTACHMENT_DELIVERY_NOTE_TYPE;
//       groupId?: number | null;
//     }
//   ): Promise<number | null> {
//     if (!files.length) return opts.groupId ?? null;
//     const { docType, groupId } = opts;
//     const baseUrl = DOCUMENT_ATTACHMENTS_URL.replace(/\/$/, "");
//     const url =
//       groupId && groupId > 0
//         ? `${baseUrl}/${groupId}`
//         : `${baseUrl}?doc_type=${encodeURIComponent(docType)}`;

//     const formData = new FormData();
//     files.forEach((file) => {
//       formData.append("files", file, file.name);
//     });

//     const res = await fetch(url, {
//       method: "POST",
//       body: formData,
//       credentials: "include",
//     });

//     if (!res.ok) {
//       let text = "";
//       try {
//         text = await res.text();
//       } catch {}
//       const baseMsg =
//         docType === DOC_ATTACHMENT_PACKING_LIST_TYPE
//           ? t("orders.upload_packing_list_failed") ??
//             "Upload dokumen Packing List gagal."
//           : t("orders.upload_delivery_note_failed") ??
//             "Upload dokumen Surat Jalan / POD gagal.";
//       const msg = text ? `${baseMsg} ${text}` : baseMsg;
//       throw new Error(msg);
//     }
//     if (!groupId) {
//       try {
//         const json = (await res.json()) as DocumentAttachmentsResponse;
//         if (typeof json.id === "number") {
//           return json.id;
//         }
//       } catch {}
//       return null;
//     }
//     return groupId;
//   }

//   async function fetchDocumentAttachmentGroup(
//     groupId: number
//   ): Promise<DocumentAttachmentsResponse> {
//     const res = await fetch(`${DOCUMENT_ATTACHMENTS_URL}/${groupId}`, {
//       method: "GET",
//       credentials: "include",
//       headers: { accept: "application/json" },
//     });
//     if (!res.ok) {
//       const t = await res.text().catch(() => "");
//       throw new Error(
//         `Gagal mengambil attachment group (HTTP ${res.status}). ${t}`.trim()
//       );
//     }
//     return (await res.json()) as DocumentAttachmentsResponse;
//   }

//   async function uploadDocumentsForDocTypeGroup(
//     files: File[],
//     opts: {
//       docType:
//         | typeof DOC_ATTACHMENT_PACKING_LIST_TYPE
//         | typeof DOC_ATTACHMENT_DELIVERY_NOTE_TYPE
//         | typeof DOC_ATTACHMENT_PICKUP_TYPE
//         | typeof DOC_ATTACHMENT_DROP_OFF_TYPE;
//       groupId?: number | null;
//     }
//   ): Promise<DocumentAttachmentsResponse> {
//     const groupId = opts.groupId ?? null;

//     const fd = new FormData();
//     files.forEach((f) => fd.append("files", f));

//     const url = groupId
//       ? `${DOCUMENT_ATTACHMENTS_URL}/${groupId}`
//       : `${DOCUMENT_ATTACHMENTS_URL}?doc_type=${encodeURIComponent(
//           opts.docType
//         )}`;

//     const res = await fetch(url, {
//       method: "POST",
//       body: fd,
//       credentials: "include",
//       headers: { accept: "application/json" },
//     });

//     if (!res.ok) {
//       const t = await res.text().catch(() => "");
//       throw new Error(`Gagal upload dokumen (HTTP ${res.status}). ${t}`.trim());
//     }

//     // Sebagian backend bisa mengembalikan group object, sebagian hanya mengembalikan minimal payload.
//     // Kita coba parse JSON, jika tidak ada id, fallback ke GET.
//     let json: unknown = null;
//     try {
//       json = await res.json();
//     } catch {
//       json = null;
//     }

//     const maybe = json as Partial<DocumentAttachmentsResponse> | null;
//     const finalGroupId =
//       typeof maybe?.id === "number" ? maybe.id : groupId ?? null;

//     if (!finalGroupId) {
//       throw new Error("Upload berhasil tetapi tidak mendapatkan group id.");
//     }

//     // Jika response sudah group lengkap, langsung pakai; jika tidak, GET ulang.
//     if (
//       maybe &&
//       typeof maybe.id === "number" &&
//       Array.isArray(maybe.attachments)
//     ) {
//       return maybe as DocumentAttachmentsResponse;
//     }

//     return await fetchDocumentAttachmentGroup(finalGroupId);
//   }

//   async function uploadShippingDocumentsIfNeeded(): Promise<{
//     packingListAttachmentId?: number;
//     deliveryNoteAttachmentId?: number;
//   }> {
//     let packingId = packingListAttachmentId ?? undefined;
//     let deliveryId = deliveryNoteAttachmentId ?? undefined;

//     if (dokumenFiles.length > 0) {
//       const newId = await uploadDocumentsForDocType(dokumenFiles, {
//         docType: DOC_ATTACHMENT_PACKING_LIST_TYPE,
//         groupId: packingId,
//       });
//       if (typeof newId === "number") {
//         packingId = newId;
//         setPackingListAttachmentId(newId);
//       }
//     }

//     if (sjPodFiles.length > 0) {
//       const newId = await uploadDocumentsForDocType(sjPodFiles, {
//         docType: DOC_ATTACHMENT_DELIVERY_NOTE_TYPE,
//         groupId: deliveryId,
//       });
//       if (typeof newId === "number") {
//         deliveryId = newId;
//         setDeliveryNoteAttachmentId(newId);
//       }
//     }

//     return {
//       packingListAttachmentId: packingId,
//       deliveryNoteAttachmentId: deliveryId,
//     };
//   }

//   /** ===================== Validation ===================== */
//   function validate(): Record<string, string> {
//     const e: Record<string, string> = {};
//     const REQ = t("form.required") ?? "Wajib diisi";
//     if (!namaPenerima) e.namaPenerima = REQ;
//     if (!kotaMuat) e.kotaMuat = REQ;
//     if (!kotaBongkar) e.kotaBongkar = REQ;
//     if (
//       !jenisOrder ||
//       (typeof jenisOrder === "object" && !jenisOrder.id && !jenisOrder.name)
//     ) {
//       e.jenisOrder = REQ;
//     }
//     if (!armada) e.armada = REQ;
//     if (!tglMuat) e.tglMuat = REQ;
//     if (!tglBongkar) e.tglBongkar = REQ;
//     // if (!muatanNama) e.muatanNama = REQ;
//     // if (!muatanDeskripsi) e.muatanDeskripsi = REQ;
//     if (!jenisMuatan) e.jenisMuatan = REQ;
//     if (!cargoCBM) e.cargoCBM = REQ;
//     if (!cargoQTY) e.cargoQTY = REQ;
//     const hasTime = (v: string) =>
//       v.includes("T") && v.split("T")[1]?.length >= 4;
//     if (tglMuat && !hasTime(tglMuat))
//       e.tglMuat = t("form.time_required") ?? "Jam wajib diisi";
//     if (tglBongkar && !hasTime(tglBongkar))
//       e.tglBongkar = t("form.time_required") ?? "Jam wajib diisi";
//     const muatUTC = tzDateToUtcISO(tglMuat, profileTimezone);
//     const bongkarUTC = tzDateToUtcISO(tglBongkar, profileTimezone);
//     if (!muatUTC) e.tglMuat = REQ;
//     if (!bongkarUTC) e.tglBongkar = REQ;
//     if (muatUTC && bongkarUTC) {
//       if (new Date(bongkarUTC).getTime() < new Date(muatUTC).getTime()) {
//         e.tglBongkar =
//           t("form.must_after_or_equal_pickup") ??
//           "Tanggal bongkar harus setelah/sama dengan tanggal muat.";
//       }
//     }
//     // === Validasi MAIN ROUTE wajib ===
//     if (!lokMuat?.id) e.lokMuat = REQ;
//     if (!lokBongkar?.id) e.lokBongkar = REQ;
//     // === Validasi EXTRA ROUTES (multi pick/drop) ===
//     if (multiPickupDrop) {
//       extraStops.forEach((s, idx) => {
//         const anyFilled =
//           Boolean(s.lokMuat?.id) ||
//           Boolean(s.lokBongkar?.id) ||
//           s.originPicName.trim() !== "" ||
//           s.originPicPhone.trim() !== "" ||
//           s.destPicName.trim() !== "" ||
//           s.destPicPhone.trim() !== "";
//         if (anyFilled) {
//           if (!s.lokMuat?.id || !s.lokBongkar?.id) {
//             e[`extra_${idx}`] =
//               t("form.address_pair_required") ??
//               "Isi lengkap pasangan lokasi muat dan bongkar.";
//           }
//         }
//       });
//     }
//     setErrors(e);
//     return e;
//   }

//   const canSubmit = useMemo(() => {
//     return Boolean(
//       jenisOrder?.id &&
//         armada &&
//         namaPenerima &&
//         kotaMuat?.id &&
//         kotaBongkar?.id &&
//         lokMuat?.id &&
//         lokBongkar?.id &&
//         tglMuat &&
//         tglBongkar &&
//         // muatanNama &&
//         // muatanDeskripsi &&
//         jenisMuatan &&
//         cargoCBM &&
//         cargoQTY
//     );
//   }, [
//     jenisOrder,
//     armada,
//     kotaMuat?.id,
//     kotaBongkar?.id,
//     lokMuat?.id,
//     lokBongkar?.id,
//     tglMuat,
//     tglBongkar,
//     // muatanNama,
//     // muatanDeskripsi,
//     jenisMuatan,
//     cargoCBM,
//     cargoQTY,
//   ]);

//   /** ===================== Build Payload ===================== */
//   function buildApiPayload(params?: {
//     packingListAttachmentId?: number;
//     deliveryNoteAttachmentId?: number;
//   }): ApiPayload {
//     console.log("[buildApiPayload] :  tglMuat ", tglMuat);
//     console.log("[buildApiPayload] : tglBongkar ", tglBongkar);

//     const mainRoute = {
//       ...(mode === "edit" && mainRouteId ? { id: mainRouteId } : {}),
//       is_main_route: true,
//       origin_address_id: Number(lokMuat?.id ?? 0),
//       origin_pic_name: (picMuatNama ?? "").trim(),
//       origin_pic_phone: (picMuatTelepon ?? "").trim(),
//       dest_address_id: Number(lokBongkar?.id ?? 0),
//       dest_pic_name: (picBongkarNama ?? "").trim(),
//       dest_pic_phone: (picBongkarTelepon ?? "").trim(),
//       etd_date: userLocalToOdooUtc(tglMuat, profileTimezone),
//       eta_date: userLocalToOdooUtc(tglBongkar, profileTimezone),
//     };

//     const extraRoutes = multiPickupDrop
//       ? extraStops
//           .filter((s) => s.lokMuat?.id && s.lokBongkar?.id)
//           .map((s) => ({
//             ...(mode === "edit" && typeof s.id === "number" && s.id > 0
//               ? { id: s.id }
//               : {}),
//             is_main_route: false,
//             origin_address_id: Number(s.lokMuat?.id ?? 0),
//             origin_pic_name: (s.originPicName ?? "").trim(),
//             origin_pic_phone: (s.originPicPhone ?? "").trim(),
//             dest_address_id: Number(s.lokBongkar?.id ?? 0),
//             dest_pic_name: (s.destPicName ?? "").trim(),
//             dest_pic_phone: (s.destPicPhone ?? "").trim(),
//             etd_date: userLocalToOdooUtc(s.tglETDMuat ?? "", profileTimezone),
//             eta_date: userLocalToOdooUtc(
//               s.tglETABongkar ?? "",
//               profileTimezone
//             ),
//           }))
//       : [];

//     const basePayload: ApiPayloadWithAttachments = {
//       receipt_by: (namaPenerima ?? "").trim(),
//       origin_city_id: Number(kotaMuat!.id),
//       dest_city_id: Number(kotaBongkar!.id),
//       order_type_id: (jenisOrder as OrderTypeItem).id.toString(),
//       moda_id: (armada as ModaItem).id.toString(),
//       cargo_type_id: Number((jenisMuatan as RecordItem).id),
//       cargo_cbm: cargoCBM ?? 0,
//       cargo_qty: cargoQTY ?? 0,
//       cargo_name: (muatanNama ?? "").trim(),
//       cargo_description: (muatanDeskripsi ?? "").trim(),
//       requirement_helmet: !!layananKhusus["Helm"],
//       requirement_apar: !!layananKhusus["APAR"],
//       requirement_safety_shoes: !!layananKhusus["Safety Shoes"],
//       requirement_vest: !!layananKhusus["Rompi"],
//       requirement_glasses: !!layananKhusus["Kaca mata"],
//       requirement_gloves: !!layananKhusus["Sarung tangan"],
//       requirement_face_mask: !!layananKhusus["Masker"],
//       requirement_tarpaulin: !!layananKhusus["Terpal"],
//       requirement_other: (layananLainnya ?? "").trim(),
//       route_ids: [mainRoute, ...extraRoutes],
//     };

//     const payload: ApiPayloadWithAttachments = { ...basePayload };

//     if (mode === "edit") {
//       // Jika ada existing attachment IDs, gunakan mereka
//       payload.packing_list_attachment_id = 0;
//       if (packingListAttachmentId) {
//         payload.packing_list_attachment_id = packingListAttachmentId;
//       }
//       payload.delivery_note_attachment_id = 0;
//       if (deliveryNoteAttachmentId) {
//         payload.delivery_note_attachment_id = deliveryNoteAttachmentId;
//       }

//       // Pickup / Drop-off attachments (independent uploader)
//       payload.pickup_attachment_id = pickupAttachment?.id ?? 0;
//       payload.drop_off_attachment_id = dropOffAttachment?.id ?? 0;
//       payload.pickup_attachment = pickupAttachment ?? null;
//       payload.drop_off_attachment = dropOffAttachment ?? null;
//     }

//     if (typeof params?.packingListAttachmentId === "number") {
//       payload.packing_list_attachment_id = params.packingListAttachmentId;
//     }
//     if (typeof params?.deliveryNoteAttachmentId === "number") {
//       payload.delivery_note_attachment_id = params.deliveryNoteAttachmentId;
//     }

//     return payload;
//   }

//   /** ===================== Submit (Create/Edit) ===================== */

//   async function doSubmitToApi() {
//     if (mode === "create" && !POST_ORDER_URL) {
//       setRespIsSuccess(false);
//       setRespTitle(t("common.error") ?? "Error");
//       setRespMessage("Endpoint form order belum dikonfigurasi ().");
//       setRespOpen(true);
//       return;
//     }
//     if (
//       mode === "edit" &&
//       !effectiveOrderId &&
//       !UPDATE_URL_TPL &&
//       !POST_ORDER_URL
//     ) {
//       setRespIsSuccess(false);
//       setRespTitle(t("common.error") ?? "Error");
//       setRespMessage(
//         "Edit mode butuh id dan endpoint update () atau fallback ke ()/{id}."
//       );
//       setRespOpen(true);
//       return;
//     }

//     try {
//       setSubmitLoading(true);

//       // === 1) Upload dokumen (kalau ada file) ===
//       let attachIds: {
//         packingListAttachmentId?: number;
//         deliveryNoteAttachmentId?: number;
//       } | null = null;

//       try {
//         attachIds = await uploadShippingDocumentsIfNeeded();
//       } catch (err) {
//         console.error("[OrderSubmit] upload attachments error:", err);
//         setRespIsSuccess(false);
//         setRespTitle(t("common.error") ?? "Error");
//         setRespMessage(
//           err instanceof Error
//             ? err.message
//             : t("orders.upload_failed") ??
//                 "Upload dokumen gagal. Silakan periksa file dan coba lagi."
//         );
//         setRespOpen(true);
//         return;
//       }

//       // === 2) Build payload order + attachment_id bila ada ===
//       const apiPayload = buildApiPayload(attachIds ?? undefined);
//       console.log("[OrderSubmit] payload:", apiPayload);

//       const method = mode === "create" ? "POST" : "PUT";
//       let url = POST_ORDER_URL;

//       if (mode === "edit") {
//         if (UPDATE_URL_TPL) {
//           url = fillUrlTemplate(UPDATE_URL_TPL, effectiveOrderId);
//         } else if (POST_ORDER_URL && effectiveOrderId != null) {
//           url = `${POST_ORDER_URL.replace(/\/$/, "")}/${effectiveOrderId}`;
//         }
//       }

//       console.log(`[OrderSubmit] ${method} ${url}`, apiPayload);

//       const res = await fetch(url, {
//         method,
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//         body: JSON.stringify(apiPayload),
//       });

//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }

//       if (mode === "create" && res.status === 201) {
//         let createdId: string | number | undefined = undefined;

//         try {
//           const ct = res.headers.get("content-type") || "";
//           if (ct.includes("application/json")) {
//             const json = await res.json();
//             createdId = extractCreatedId(json);
//           }
//           if (!createdId) {
//             const loc =
//               res.headers.get("Location") || res.headers.get("location");
//             const m = loc?.match(/\/orders\/(\d+|[A-Za-z0-9-]+)/);
//             if (m) createdId = m[1];
//           }
//         } catch {}
//         setLastCreatedId(createdId);
//         setRespIsSuccess(true);
//         setRespTitle(t("common.success") ?? "Berhasil");
//         setRespMessage(t("orders.create_success") ?? "Order berhasil dibuat.");
//         setRespOpen(true);
//         return;
//       }

//       if (mode === "edit" && (res.status === 200 || res.status === 204)) {
//         setRespIsSuccess(true);
//         setRespTitle(t("common.success") ?? "Berhasil");
//         setRespMessage(
//           t("orders.update_success") ?? "Order berhasil diperbarui."
//         );
//         setRespOpen(true);
//         return;
//       }

//       if (res.status === 422) {
//         let msg = t("common.failed_save") ?? "Gagal menyimpan.";
//         try {
//           const ct = res.headers.get("content-type") || "";
//           if (ct.includes("application/json")) {
//             const json = (await res.json()) as unknown;
//             const body = json as ApiErrorBody;

//             const details = body.detail;
//             if (Array.isArray(details)) {
//               const list = details
//                 .map(itemToMsg)
//                 .filter((x): x is string => Boolean(x))
//                 .map((s) => `• ${s}`)
//                 .join("\n");
//               if (list) msg = list;
//             } else {
//               const errorsList = Array.isArray(body.errors)
//                 ? body.errors.map(itemToMsg).filter(Boolean).join(", ")
//                 : "";
//               msg = body.message ?? (errorsList || body.error || msg);
//             }
//           } else {
//             msg = await res.text();
//           }
//         } catch {
//           const text = await res.text();
//           if (text) msg = text;
//         }
//         setRespIsSuccess(false);
//         setRespTitle(t("common.error") ?? "Error");
//         setRespMessage(msg);
//         setRespOpen(true);
//         return;
//       }

//       const text = await res.text();
//       setRespIsSuccess(false);
//       setRespTitle(t("common.error") ?? "Error");
//       setRespMessage(text || (t("common.failed_save") ?? "Gagal menyimpan."));
//       setRespOpen(true);
//     } catch (err) {
//       console.error("[OrderSubmit] error", err);
//       setRespIsSuccess(false);
//       setRespTitle(t("common.network_error") ?? "Network Error");
//       setRespMessage(
//         t("common.network_error") ?? "Terjadi kesalahan jaringan. Coba lagi."
//       );
//       setRespOpen(true);
//     } finally {
//       setSubmitLoading(false);
//       setConfirmOpen(false);
//     }
//   }

//   function confirmAndSubmit() {
//     const eobj = validate();
//     console.log("confirmAndSubmit, validation errors:", eobj);
//     if (Object.keys(eobj).length > 0) {
//       setConfirmOpen(false);
//       return;
//     }
//     void doSubmitToApi();
//   }

//   async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
//     e.preventDefault();
//     const eobj = validate();
//     console.log("handleSubmit, validation errors:", eobj);
//     if (Object.keys(eobj).length > 0) {
//       requestAnimationFrame(() => {
//         if (firstErrorRef.current) {
//           firstErrorRef.current.scrollIntoView({
//             behavior: "smooth",
//             block: "center",
//           });
//           const el = firstErrorRef.current.querySelector(
//             "input,select,textarea,[role='combobox']"
//           ) as HTMLElement | null;
//           el?.focus();
//         } else {
//           const firstExtraIdx = Object.keys(eobj)
//             .filter((k) => k.startsWith("extra_"))
//             .map((k) => Number(k.split("_")[1]))
//             .sort((a, b) => a - b)[0];
//           const firstUid = extraStops[firstExtraIdx]?.uid;
//           const ex = firstUid ? extraRefs.current[firstUid] : undefined;
//           if (ex) {
//             ex.scrollIntoView({ behavior: "smooth", block: "center" });
//           }
//         }
//       });
//       return;
//     }
//     setConfirmOpen(true);
//   }

//   function handleCreate() {
//     router.push("/orders/create");
//   }

//   async function handleDone() {
//     if (!effectiveOrderId) return;
//     const DONE_POST_URL = `${POST_ORDER_URL}/${effectiveOrderId}/done`;
//     try {
//       console.log("Marking order as done:", DONE_POST_URL);
//       const res = await fetch(DONE_POST_URL, {
//         method: "POST",
//         headers: {
//           "Accept-Language": getLang(),
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) {
//         const text = await res.text().catch(() => "");
//         openErrorDialog(
//           text || `Failed to done (${res.status} ${res.statusText})`,
//           "Failed to done"
//         );
//         return;
//       }

//       setReloadSelfAfterDlg(true);
//       setLastCreatedId(undefined); // biar gak ke-trigger navigasi lastCreatedId. karena dialog nya samaan bareng bareng

//       setDlgKind("success");
//       setDlgTitle("Done successfully!");
//       setDlgMsg("Order marked as done successfully.");
//       setDlgOpen(true);
//     } catch (err) {
//       openErrorDialog(err, "Failed to done");
//     }
//   }

//   async function handleDuplicate() {
//     if (!effectiveOrderId) return;
//     const DUPLIKASI_ORDER_URL = `${POST_ORDER_URL}/${effectiveOrderId}/duplicate`;
//     try {
//       const res = await fetch(DUPLIKASI_ORDER_URL, {
//         method: "POST",
//         headers: {
//           "Accept-Language": getLang(),
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//       });
//       if (res.status === 401) {
//         goSignIn({ routerReplace: router.replace });
//         return;
//       }
//       if (!res.ok) {
//         const text = await res.text().catch(() => "");
//         openErrorDialog(
//           text || `Failed to duplicate (${res.status} ${res.statusText})`,
//           "Failed to duplicate"
//         );
//         return;
//       }
//       let newId: string | number | undefined;
//       try {
//         const json = await res.json();
//         newId = json?.id ?? json?.data?.id ?? json?.result?.id;
//       } catch {
//         newId = undefined;
//       }
//       setLastCreatedId(newId);
//       setDlgKind("success");
//       setDlgTitle("Duplicate successfully!");
//       setDlgMsg("Order duplicated successfully. Click OK to open it.");
//       setDlgOpen(true);
//     } catch (err) {
//       openErrorDialog(err, "Failed to duplicate");
//     }
//   }

//   function handleDiscard() {
//     if (typeof window !== "undefined" && window.history.length > 1) {
//       router.back();
//     } else {
//       router.push("/orders");
//     }
//   }

//   /* =================== Chatter: res_model/res_id (sync) ================== */
//   const [chatterResModel, setChatterResModel] = useState<string>("");
//   const [chatterResId, setChatterResId] = useState<string | number | undefined>(
//     undefined
//   );
//   /* ======================================================================= */

//   /* =================== Chat state & handler (non-intrusive) ================== */
//   const [chatMsg, setChatMsg] = useState("");
//   const [chatSending, setChatSending] = useState(false);
//   // === Result Dialog for Chat ===
//   const [chatDlgOpen, setChatDlgOpen] = useState(false);
//   const [chatDlgKind, setChatDlgKind] = useState<"success" | "error">(
//     "success"
//   );
//   const [chatDlgTitle, setChatDlgTitle] = useState("");
//   const [chatDlgMsg, setChatDlgMsg] = useState<React.ReactNode>("");

//   function openChatSuccessDialog(message?: string, title?: string) {
//     setChatDlgKind("success");
//     setChatDlgTitle(title ?? t("common.success") ?? "Berhasil");
//     setChatDlgMsg(message ?? t("orders.message_sent") ?? "Pesan terkirim.");
//     setChatDlgOpen(true);
//   }
//   function openChatErrorDialog(err: unknown, title?: string) {
//     const msg =
//       (typeof err === "object" &&
//         err !== null &&
//         // @ts-expect-error best-effort
//         (err.detail?.[0]?.msg || err.message || err.error)) ||
//       String(err);
//     setChatDlgKind("error");
//     setChatDlgTitle(title ?? t("common.error") ?? "Error");
//     setChatDlgMsg(
//       <pre className="whitespace-pre-wrap text-xs text-red-700">{msg}</pre>
//     );
//     setChatDlgOpen(true);
//   }

//   if (!i18nReady || loadingDetail) {
//     return (
//       <div className="p-4 text-sm text-gray-600">{t("common.loading")}…</div>
//     );
//   }
//   function safeJoin(base: string, path: string): string {
//     return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
//   }
//   const stp = [
//     {
//       key: "pending",
//       label: "Pending",
//       is_current: false,
//     },
//     {
//       key: "accepted",
//       label: "Accepted",
//       is_current: false,
//     },
//     {
//       key: "preparation",
//       label: "On Preparation",
//       is_current: true,
//     },
//     {
//       key: "pickup",
//       label: "Pickup",
//       is_current: false,
//     },
//     {
//       key: "delivery",
//       label: "On Delivery",
//       is_current: false,
//     },
//     {
//       key: "received",
//       label: "Received",
//       is_current: false,
//     },
//     {
//       key: "review",
//       label: "Reviewed",
//       is_current: false,
//     },
//     {
//       key: "done",
//       label: "Done",
//       is_current: false,
//     },
//   ];

//   return (
//     <form onSubmit={handleSubmit} className="mx-auto space-y-4 p-1">
//       {/* === Status Tracker (dinamis) === */}

//       {steps.length > 0 && (
//         <Card className="sticky top-14 z-30">
//           <CardBody>
//             <StatusDeliveryImage
//               steps={steps}
//               meta={{
//                 pickup: { arrive: "-", depart: "-" },
//                 received: { arrive: "-", depart: "-" },
//                 review: { arrive: "-", depart: "-" },
//               }}
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
//               {/* Info Order */}
//               <OrderInfoCard
//                 mode={mode}
//                 noJO={noJO}
//                 customer={customer}
//                 namaPenerima={namaPenerima}
//                 setNamaPenerima={setNamaPenerima}
//                 jenisOrder={jenisOrder}
//                 setJenisOrder={setJenisOrder}
//                 armada={armada}
//                 setArmada={setArmada}
//                 kotaMuat={kotaMuat}
//                 onChangeKotaMuat={handleChangeKotaMuat}
//                 kotaBongkar={kotaBongkar}
//                 onChangeKotaBongkar={handleChangeKotaBongkar}
//                 errors={errors}
//                 firstErrorKey={firstErrorKey}
//                 firstErrorRef={firstErrorRef}
//                 profile={profile}
//               />

//               {/* Info Lokasi */}
//               <LocationInfoCard
//                 isReadOnly={isReadOnly}
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
//                 deliveryNoteUri=""
//                 mode={mode}
//                 pickupAttachment={pickupAttachment}
//                 setPickupAttachment={setPickupAttachment}
//                 uploadPickupAttachmentGroup={uploadPickupAttachmentGroup}
//                 deletePickupAttachmentFile={deletePickupAttachmentFile}
//                 dropOffAttachment={dropOffAttachment}
//                 setDropOffAttachment={setDropOffAttachment}
//                 uploadDropOffAttachmentGroup={uploadDropOffAttachmentGroup}
//                 deleteDropOffAttachmentFile={deleteDropOffAttachmentFile}
//                 multiPickupDrop={multiPickupDrop}
//                 setMultiPickupDrop={setMultiPickupDrop}
//                 extraStops={extraStops}
//                 setExtraStops={setExtraStops}
//                 errors={errors}
//                 firstErrorKey={firstErrorKey}
//                 firstErrorRef={firstErrorRef}
//                 extraRefs={extraRefs}
//               />

//               {/* Layanan Khusus */}
//               <SpecialServicesCard
//                 isReadOnly={isReadOnly}
//                 layananPreset={layananPreset}
//                 layananKhusus={layananKhusus}
//                 setLayananKhusus={setLayananKhusus}
//                 layananLainnya={layananLainnya}
//                 setLayananLainnya={setLayananLainnya}
//               />
//             </div>

//             {/* ===== Right Column ===== */}
//             <div className="md:basis-1/3  min-w-0 space-y-4">
//               {/* Info Muatan */}
//               <CargoInfoCard
//                 jenisOrder={jenisOrder}
//                 muatanNama={muatanNama}
//                 setMuatanNama={setMuatanNama}
//                 muatanDeskripsi={muatanDeskripsi}
//                 setMuatanDeskripsi={setMuatanDeskripsi}
//                 jenisMuatan={jenisMuatan}
//                 setJenisMuatan={setJenisMuatan}
//                 cargoQTY={cargoQTY ?? 0}
//                 setCargoQTY={setCargoQTY}
//                 cargoCBM={cargoCBM ?? 0}
//                 setCargoCBM={setCargoCBM}
//                 errors={errors}
//                 firstErrorKey={firstErrorKey}
//                 firstErrorRef={firstErrorRef}
//               />

//               {/* Detail Amount */}
//               <CostDetailsCard
//                 biayaKirimLabel={biayaKirimLabel}
//                 biayaLayananTambahanLabel={biayaLayananTambahanLabel}
//                 taxLabel={taxLabel}
//                 totalHargaLabel={totalHargaLabel}
//               />

//               {/* Dokumen Pengiriman */}
//               <ShippingDocumentsCard
//                 dokumenFiles={dokumenFiles}
//                 setDokumenFiles={setDokumenFiles}
//                 sjPodFiles={sjPodFiles}
//                 setSjPodFiles={setSjPodFiles}
//                 existingPackingList={existingPackingList}
//                 existingDeliveryNotes={existingDeliveryNotes}
//                 onRemovePackingList={handleRemovePackingList}
//                 onRemoveDeliveryNote={handleRemoveDeliveryNote}
//                 existingPackingListLabel={packingListAttachmentName}
//                 existingDeliveryNotesLabel={deliveryNoteAttachmentName}
//               />
//             </div>

//             {/* === Bottom Action Bar — match AddressesForm + Chat Impulse === */}
//             <div
//               className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70"
//               role="region"
//               aria-label="Form actions"
//             >
//               <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-2">
//                 {/* LEFT: Chat / Broadcast (dengan IMPULSE) */}
//                 <div className="flex items-center gap-2">
//                   {mode != "create" && (
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={handleCreate}
//                     >
//                       {t("orders.create.title")}
//                     </Button>
//                   )}
//                   <Button
//                     type="button"
//                     variant="ghost"
//                     onClick={handleDuplicate}
//                   >
//                     {t("orders.duplicate.title")}
//                   </Button>

//                   {/* {canShowChat && (
//                     <Button
//                       type="button"
//                       variant="outline"
//                       onClick={() => {
//                         setChatOpen(true);
//                         setHasChatImpulse(false); // buka chat = anggap sudah dibaca
//                       }}
//                       className={`relative pr-8 ${
//                         hasChatImpulse ? "motion-safe:animate-pulse" : ""
//                       }`}
//                       aria-label={
//                         t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
//                       }
//                       title={
//                         t("orders.chat_broadcast") ?? "Chat / Broadcast Message"
//                       }
//                     >
//                       {t("orders.chat_broadcast") ?? "Chat / Broadcast Message"}
//                       {hasChatImpulse && (
//                         <span className="pointer-events-none absolute right-2 top-2 inline-flex">
//                           <span className="motion-safe:animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
//                           <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
//                         </span>
//                       )}
//                     </Button>
//                   )} */}

//                   {canShowListReviewClaims && (
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       onClick={onHandleShowReviewClaimListButton}
//                     >
//                       {`Claims (${reviewClaimIdsCount})`}
//                     </Button>
//                   )}
//                 </div>

//                 {/* RIGHT: Discard & Submit */}
//                 <div className="flex items-center gap-2">
//                   {statusCurrent === "review" && (
//                     <Button type="button" variant="solid" onClick={handleDone}>
//                       Done
//                     </Button>
//                   )}

//                   <Button type="button" variant="ghost" onClick={handleDiscard}>
//                     {t("common.discard")}
//                   </Button>
//                   <Button
//                     hidden={isReadOnly}
//                     type="submit"
//                     // disabled={submitLoading || !canSubmit}
//                     disabled={submitLoading}
//                     variant="solid"
//                   >
//                     {submitLoading
//                       ? t("common.sending") ?? "Mengirim…"
//                       : mode === "edit"
//                       ? t("common.update") ?? "Update"
//                       : t("common.save") ?? "Save"}
//                   </Button>
//                 </div>
//               </div>
//             </div>

//             {/* <div className="flex items-center justify-start gap-3 pt-3"></div> */}
//           </div>
//         </CardBody>
//       </Card>

//       <Card>
//         <CardBody>
//           {canShowChat && (
//             <ChatterPanel
//               resModel={chatterResModel}
//               resId={chatterResId ?? null}
//               endpointBase={CHATTERS_URL}
//               onRead={() => setHasChatImpulse(false)}
//               className="w-full"
//             />
//           )}
//         </CardBody>
//       </Card>

//       {/* === Chat Dialog (Popup) === */}
//       {/* <Modal open={chatOpen && canShowChat} onClose={() => setChatOpen(false)}>
//         <div className="space-y-3">
//           <h4 className="text-lg font-semibold text-gray-800">
//             {t("orders.chat_broadcast") ?? "Chat / Broadcast Message"}
//           </h4>
//           <FieldTextarea
//             label={t("orders.message") ?? "Message"}
//             value={chatMsg}
//             onChange={setChatMsg}
//             rows={3}
//             placeholder={
//               t("orders.type_message") ??
//               "Tulis pesan untuk broadcast ke server…"
//             }
//           />
//           <div className="flex items-center justify-end gap-3 pt-2">
//             <Button variant="outline" onClick={() => setChatOpen(false)}>
//               {t("common.cancel") ?? "Batal"}
//             </Button>
//             <Button
//               type="button"
//               onClick={handleSendChat}
//               disabled={chatSending || !chatMsg.trim()}
//               variant="primary"
//             >
//               {chatSending
//                 ? t("common.sending") ?? "Sending…"
//                 : t("common.send") ?? "Send"}
//             </Button>
//           </div>
//         </div>
//       </Modal> */}
//       {/* === Dialogs === */}
//       {confirmOpen && (
//         <ConfirmSubmitDialog
//           open={confirmOpen}
//           onCancel={() => setConfirmOpen(false)}
//           onConfirm={confirmAndSubmit}
//           loading={submitLoading}
//           mode={mode}
//         />
//       )}
//       {respOpen && (
//         <ResponseDialog
//           open={respOpen}
//           title={respTitle}
//           message={respMessage}
//           onClose={() => {
//             setRespOpen(false);
//             if (respIsSuccess) {
//               if (onSuccess) onSuccess();
//               else if (lastCreatedId) {
//                 const idStr = String(lastCreatedId ?? "");
//                 router.push(
//                   idStr
//                     ? safeJoin(
//                         APP_BASE_PATH,
//                         `/orders/details/?id=${encodeURIComponent(idStr)}`
//                       )
//                     : safeJoin(APP_BASE_PATH, "/orders")
//                 );
//               } else {
//                 router.push(safeJoin(APP_BASE_PATH, "/orders"));
//               }
//             }
//           }}
//         />
//       )}
//       {claimsModalOpen && (
//         <ClaimListModal
//           open={claimsModalOpen}
//           onClose={() => setClaimsModalOpen(false)}
//           claims={claims}
//           loading={claimsLoading}
//         />
//       )}
//       {chatDlgOpen && (
//         <ModalDialog
//           open={chatDlgOpen}
//           kind={chatDlgKind}
//           title={chatDlgTitle}
//           message={chatDlgMsg}
//           onClose={() => setChatDlgOpen(false)}
//         />
//       )}
//       {dlgOpen && (
//         <ModalDialog
//           open={dlgOpen}
//           kind={dlgKind}
//           title={dlgTitle}
//           message={dlgMsg}
//           onClose={() => {
//             setDlgOpen(false);

//             console.log(
//               "Dialog closed, kind=",
//               dlgKind,
//               " lastCreatedId=",
//               lastCreatedId
//             );
//             console.log("reloadSelfAfterDlg=", reloadSelfAfterDlg);
//             console.log("effectiveOrderId=", effectiveOrderId);

//             if (reloadSelfAfterDlg) {
//               setReloadSelfAfterDlg(false);
//               router.push(
//                 `/orders/details/?id=${encodeURIComponent(
//                   String(effectiveOrderId)
//                 )}`
//               );
//               // window.location.reload(); // reload page dirinya sendiri OKEH!! kadang gak jalan
//               return;
//             }

//             if (dlgKind === "success" && lastCreatedId) {
//               router.push(
//                 `/orders/details/?id=${encodeURIComponent(
//                   String(lastCreatedId)
//                 )}`
//               );
//             }
//           }}
//         />
//       )}
//     </form>
//   );
// }
