"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useI18nReady } from "@/hooks/useI18nReady";
import { ExtraStop } from "../ExtraStopCard";
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
} from "@/types/orders";
import {
  apiToLocalIsoMinute,
  buildDetailUrl,
} from "@/components/shared/Helper";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import StatusDeliveryImage from "@/components/ui/DeliveryState";
import { goSignIn } from "@/lib/goSignIn";
import { getLang, t } from "@/lib/i18n";
import SpecialServicesCard from "../SpecialServicesCard";
import CostDetailsCard from "../CostDetailsCard";
import ShippingDocumentsCard from "../ShippingDocumentsCard";
import Button from "@/components/ui/Button";
import React from "react";
import { Field } from "@/components/form/FieldInput";
import LocationInfoCard from "../LocationInfoCard";
import { Modal } from "../../OrdersCreateForm";
import { FieldTextarea } from "@/components/form/FieldTextarea";
import CargoInfoCard, { format2comma } from "../CargoInfoCard";

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

function prefillFromInitial(
  data: NonNullable<OrdersCreateFormProps["initialData"]>
) {
  const form = {
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
    tglMuat: apiToLocalIsoMinute(data.pickup_date_planne, "08:00"),
    tglBongkar: apiToLocalIsoMinute(data.drop_off_date_planne, "08:00"),
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

  form.tglMuat = apiToLocalIsoMinute(main?.etd_date) || form.tglMuat;
  form.tglBongkar = apiToLocalIsoMinute(main?.eta_date) || form.tglBongkar;
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
      tglETDMuat: apiToLocalIsoMinute(r.etd_date) ?? r.etd_date ?? "",
      tglETABongkar: apiToLocalIsoMinute(r.eta_date) ?? r.eta_date ?? "",
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
    })
  );

  const current = data.states?.find((s) => s.is_current);
  form.isReadOnly = current
    ? !["draft", "pending"].includes(current.key)
    : false;

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

/** ===== NEW: Lightweight ModalDialog (seragam dengan Fleet/Driver) ===== */
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
  );
}

export default function PurchaseOrderForm({
  mode = "edit",
  orderId,
  initialData,
  onSuccess,
}: OrdersCreateFormProps) {
  const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!;
  const POST_CHAT_URL = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const qsId = searchParams?.get("id") ?? null;
  const effectiveOrderId = useMemo<string | number | undefined>(() => {
    return orderId ?? qsId ?? undefined;
  }, [orderId, qsId]);
  const { profile } = useAuth();
  const { ready: i18nReady } = useI18nReady();
  const { hasChatImpulse, setHasChatImpulse } = useChatImpulseChannel();
  const profileTimezone =
    (profile as { tz?: string } | undefined)?.tz || "Asia/Jakarta";

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

  const [picMuatNama, setPicMuatNama] = useState<string>("");
  const [picMuatTelepon, setPicMuatTelepon] = useState<string>("");
  const [picBongkarNama, setPicBongkarNama] = useState<string>("");
  const [picBongkarTelepon, setPicBongkarTelepon] = useState<string>("");

  const [multiPickupDrop, setMultiPickupDrop] = useState<boolean>(false);
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
        },
      ] as ExtraStop[]
    ).map((s) => ({ ...s, uid: genUid() }))
  );
  const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
  const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);

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
      router.refresh?.();
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
      router.refresh?.();
      openSuccessDialog();
    } catch (e) {
      console.error("[PurchaseOrder] reject error:", e);
      openErrorDialog(e);
    } finally {
      setRejectLoading(false);
    }
  }

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatSending, setChatSending] = useState(false);

  async function handleSendChat() {
    if (!chatMsg.trim()) return;
    if (!POST_CHAT_URL) {
      openErrorDialog(
        "Chat endpoint belum dikonfigurasi.",
        "Konfigurasi belum lengkap"
      );
      return;
    }
    try {
      setChatSending(true);
      const res = await fetch(POST_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getLang(),
        },
        credentials: "include",
        body: JSON.stringify({ message: chatMsg.trim() }),
      });
      if (!res.ok) {
        const msg = await res.text();
        openErrorDialog(msg);
        return;
      }
      setChatMsg("");
      openSuccessDialog(t("orders.message_sent") ?? "Pesan terkirim.");
    } catch (e) {
      console.error("Chat error", e);
      openErrorDialog(
        t("common.network_error") ?? "Terjadi kesalahan jaringan."
      );
    } finally {
      setChatSending(false);
    }
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
  const [cargoCBMText, setCargoCBMText] = useState<string>("");
  const [jumlahMuatanText, setJumlahMuatanText] = useState<string>("");

  const firstErrorKey = useMemo(() => {
    const order = ["namaPenerima", "lokBongkar"] as const;
    return order.find((k) => errors[k]);
  }, [errors]);

  useEffect(() => {
    if (!initialData) return;
    const f = prefillFromInitial(initialData);
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
    setSteps(f.states);
    setStatusCurrent(f.states.find((s) => s.is_current)?.key);
    setLoadingDetail(false);
  }, [initialData]);

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
          const f = prefillFromInitial(json);
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
  }, [mode, effectiveOrderId, initialData, router.replace]);

  function buildPOrderActionUrl(
    id: string | number,
    action: "accept" | "reject"
  ): string {
    const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
    return `${base}/${action}`;
  }

  return (
    <div>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setChatOpen(true);
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
                </div>

                {/* RIGHT: Reject & Accept */}
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
              </div>
            </div>
          </div>
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

      {/* === Chat Dialog === */}
      <Modal open={chatOpen} onClose={() => setChatOpen(false)}>
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
      </Modal>

      {/* ===== NEW: Global Success/Error Dialog ===== */}
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
// import { useAuth } from "@/components/providers/AuthProvider";
// import { useI18nReady } from "@/hooks/useI18nReady";
// import { ExtraStop } from "../ExtraStopCard";
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
// } from "@/types/orders";
// import {
//   apiToLocalIsoMinute,
//   buildDetailUrl,
// } from "@/components/shared/Helper";
// import { Card, CardBody, CardHeader } from "@/components/ui/Card";
// import StatusDeliveryImage from "@/components/ui/DeliveryState";
// import { goSignIn } from "@/lib/goSignIn";
// import { getLang, t } from "@/lib/i18n";
// import SpecialServicesCard from "../SpecialServicesCard";
// import CostDetailsCard from "../CostDetailsCard";
// import ShippingDocumentsCard from "../ShippingDocumentsCard";
// import Button from "@/components/ui/Button";
// import React from "react";
// import { Field } from "@/components/form/FieldInput";
// import LocationInfoCard from "../LocationInfoCard";
// import { Modal } from "../../OrdersCreateForm";
// import { FieldTextarea } from "@/components/form/FieldTextarea";
// import CargoInfoCard, { format2comma } from "../CargoInfoCard";
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
//     .replace(/[\s_-]+/g, ""); // "On Review" -> "onreview"
// }

// function extractApiSteps(
//   d: NonNullable<OrdersCreateFormProps["initialData"]>
// ): StatusStep[] {
//   const items = (d.tms_states ?? []) as StatusStep[]; // ← tanpa any

//   return items.map((it): StatusStep => {
//     if (typeof it === "string") {
//       return { key: normalizeKey(it), label: it, is_current: false };
//     }
//     const key = normalizeKey(it.key ?? it.label);
//     const label = it.label ?? it.key ?? "";
//     return { key, label, is_current: Boolean(it.is_current) };
//   });
// }
// function prefillFromInitial(
//   data: NonNullable<OrdersCreateFormProps["initialData"]>
// ) {
//   console.log("data:", data);

//   const form = {
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
//     // IMPORTANT: biarkan null, akan diprefill oleh useCargoTypePrefill
//     // jenisMuatan: null as RecordItem | null,
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
//     // extraStops: [] as ExtraStopWithId[],
//     extraStops: [] as ExtraStop[],
//     isReadOnly: false,
//   };

//   console.log("form before:", form);

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

//   // form.id = main.id ?? 0;
//   // Prefill dari route main kalau ada
//   form.tglMuat = apiToLocalIsoMinute(main?.etd_date) || form.tglMuat;
//   form.tglBongkar = apiToLocalIsoMinute(main?.eta_date) || form.tglBongkar;
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

//   // Fallback: kalau tidak ada route main, coba dari top-level origin/dest_address
//   if (!form.lokMuat)
//     form.lokMuat = (data.origin_address as AddressItem) ?? null;
//   if (!form.lokBongkar)
//     form.lokBongkar = (data.dest_address as AddressItem) ?? null;

//   // Amount Details readonly
//   form.amount_shipping = data.amount_shipping ?? "";
//   form.amount_shipping_multi_charge = data.amount_shipping_multi_charge ?? "";
//   form.amount_tax = data.amount_tax ?? "";
//   form.amount_total = data.amount_total ?? "";

//   // Extra routes
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

// export default function PurchaseOrderForm({
//   mode = "edit",
//   orderId,
//   initialData,
//   onSuccess,
// }: OrdersCreateFormProps) {
//   const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!;
//   const POST_CHAT_URL = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL ?? "";
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   // Baca id dari query (?id=123) jika orderId prop tidak disuplai
//   const qsId = searchParams?.get("id") ?? null;
//   const effectiveOrderId = useMemo<string | number | undefined>(() => {
//     return orderId ?? qsId ?? undefined;
//   }, [orderId, qsId]);
//   const { profile } = useAuth();
//   // i18n// i18n
//   const { ready: i18nReady } = useI18nReady();
//   const { hasChatImpulse, setHasChatImpulse } = useChatImpulseChannel();
//   const profileTimezone =
//     (profile as { tz?: string } | undefined)?.tz || "Asia/Jakarta";
//   const [noJO, setNoJO] = useState<string>("");
//   const [customer, setCustomer] = useState<string>("");
//   const [namaPenerima, setNamaPenerima] = useState<string>("");
//   const [kotaMuat, setKotaMuat] = useState<CityItem | null>(null);
//   const [kotaBongkar, setKotaBongkar] = useState<CityItem | null>(null);
//   const [jenisOrder, setJenisOrder] = useState<OrderTypeItem | null>(null);
//   const [armada, setArmada] = useState<ModaItem | null>(null);

//   // DateTime (ISO lokal "YYYY-MM-DDTHH:mm")
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
//   // Upload lists (MultiFileUpload controlled) — belum dikirim (UI only)
//   const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
//   const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);

//   // Amount placeholders
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

//   async function handleAccept() {
//     if (!effectiveOrderId) {
//       alert("ID Purchase Order tidak ditemukan.");
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
//       alert(t("common.saved") ?? "Tersimpan");
//       setIsReadOnly(true); // aman: setelah di-accept form jadi read-only
//       onSuccess?.();
//       router.refresh?.();
//     } catch (e) {
//       console.error("[PurchaseOrder] accept error:", e);
//       alert(
//         (t("common.failed_save") ?? "Gagal menyimpan.") +
//           " " +
//           (e instanceof Error ? e.message : "")
//       );
//     } finally {
//       setAcceptLoading(false);
//     }
//   }

//   async function handleReject() {
//     if (!effectiveOrderId) {
//       alert("ID Purchase Order tidak ditemukan.");
//       return;
//     }
//     const r = reason.trim();
//     if (!r) {
//       alert("Mohon isi alasan penolakan.");
//       return;
//     }
//     try {
//       setRejectLoading(true);
//       const url = buildPOrderActionUrl(effectiveOrderId, "reject");
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
//       alert(t("common.saved") ?? "Tersimpan");
//       setReasonOpen(false);
//       setReason("");
//       setIsReadOnly(true);
//       onSuccess?.();
//       router.refresh?.();
//     } catch (e) {
//       console.error("[PurchaseOrder] reject error:", e);
//       alert(
//         (t("common.failed_save") ?? "Gagal menyimpan.") +
//           " " +
//           (e instanceof Error ? e.message : "")
//       );
//     } finally {
//       setRejectLoading(false);
//     }
//   }

//   const [chatOpen, setChatOpen] = useState(false);
//   /* =================== Chat state & handler (non-intrusive) ================== */
//   const [chatMsg, setChatMsg] = useState("");
//   const [chatSending, setChatSending] = useState(false);
//   async function handleSendChat() {
//     if (!chatMsg.trim()) return;
//     if (!POST_CHAT_URL) {
//       console.warn("POST_CHAT_URL not configured");
//       alert("Chat endpoint belum dikonfigurasi.");
//       return;
//     }
//     try {
//       setChatSending(true);
//       const res = await fetch(POST_CHAT_URL, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Accept-Language": getLang(),
//         },
//         credentials: "include",
//         body: JSON.stringify({ message: chatMsg.trim() }),
//       });
//       if (!res.ok) {
//         const msg = await res.text();
//         alert((t("common.failed_save") ?? "Gagal menyimpan.") + " " + msg);
//         return;
//       }
//       setChatMsg("");
//       alert(t("common.saved") ?? "Tersimpan");
//     } catch (e) {
//       console.error("Chat error", e);
//       alert(t("common.network_error") ?? "Terjadi kesalahan jaringan.");
//     } finally {
//       setChatSending(false);
//     }
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
//   // ====== UI state untuk jenisMuatan (RecordItem) ======
//   const [jenisMuatan, setJenisMuatan] = useState<RecordItem | null>(null);
//   //   const [cargoCBM, setCargoCBM] = useState<number>();
//   //   const [cargoQTY, setCargoQTY] = useState<number>();
//   const [cargoCBMText, setCargoCBMText] = useState<string>("");
//   const [jumlahMuatanText, setJumlahMuatanText] = useState<string>("");

//   const firstErrorKey = useMemo(() => {
//     const order = ["namaPenerima", "lokBongkar"] as const;
//     return order.find((k) => errors[k]);
//   }, [errors]);

//   useEffect(() => {
//     console.log("initialData changed:", initialData);

//     if (!initialData) return;
//     const f = prefillFromInitial(initialData);
//     setNamaPenerima(f.namaPenerima);
//     setJenisOrder(f.jenisOrder);
//     setArmada(f.armada);
//     // prefill langsung set kota (tanpa trigger handler reset)
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

//     // setJenisMuatan(
//     //   f.cargo_type_id != null
//     //     ? {
//     //         id: String(f.cargo_type_id),
//     //         name: f.cargo_type?.name ?? f.cargo_type?.name ?? "",
//     //       }
//     //     : null
//     // );
//     // setCargoCBM(f.cargoCBM);
//     // setCargoQTY(f.cargoQTY);

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

//     console.log("initialData.states:", initialData.states);
//     console.log("extracted steps:", extractApiSteps(initialData));
//     console.log("prefilled steps:", f.states);

//     setSteps(f.states);
//     setStatusCurrent(f.states.find((s) => s.is_current)?.key);

//     console.log(
//       "prefilled current step:",
//       f.states.find((s) => s.is_current)
//     );

//     setLoadingDetail(false);
//   }, [initialData]);

//   // jika initialData tidak ada
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
//           const f = prefillFromInitial(json);
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
//   }, [mode, effectiveOrderId, initialData, router.replace]);

//   function buildPOrderActionUrl(
//     id: string | number,
//     action: "accept" | "reject"
//   ): string {
//     // if (action === "accept" && PORDER_ACCEPT_URL_TPL) {
//     //   return buildDetailUrl(PORDER_ACCEPT_URL_TPL, id);
//     // }
//     // if (action === "reject" && PORDER_REJECT_URL_TPL) {
//     //   return buildDetailUrl(PORDER_REJECT_URL_TPL, id);
//     // }
//     // if (DETAIL_URL_TPL) {
//     const base = buildDetailUrl(DETAIL_URL_TPL, id).replace(/\/$/, "");
//     console.log(base);

//     return `${base}/${action}`;
//     // }
//     // const sid = encodeURIComponent(String(id));
//     // return `https://odoodev.linitekno.com/api-tms/purchase-orders/${sid}/${action}`;
//   }

//   return (
//     <div>
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
//               {/* Info Order */}
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

//               {/* Info Lokasi */}
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
//                 // ⬇️ Tambahkan 8 props PIC berikut
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

//               {/* Layanan Khusus */}
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
//               {/* Info Muatan */}
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

//               {/* Detail Amount */}
//               <CostDetailsCard
//                 isShowNotes={false}
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
//                   <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() => {
//                       setChatOpen(true);
//                       setHasChatImpulse(false); // buka chat = anggap sudah dibaca
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
//                   </Button>
//                 </div>

//                 {/* RIGHT: Discard & Submit */}
//                 <div className="flex items-center gap-2">
//                   <Button
//                     type="button"
//                     variant="ghost"
//                     onClick={() => {
//                       setReasonOpen(true);
//                     }}
//                   >
//                     {t("common.reject")}
//                   </Button>

//                   <Button
//                     hidden={isReadOnly}
//                     onClick={handleAccept}
//                     disabled={acceptLoading}
//                     variant="solid"
//                   >
//                     {acceptLoading
//                       ? t("common.sending") ?? "Mengirim…"
//                       : t("common.accept")}
//                   </Button>
//                 </div>
//               </div>
//             </div>

//             {/* <div className="flex items-center justify-start gap-3 pt-3"></div> */}
//           </div>
//         </CardBody>
//       </Card>
//       {/* === Confirmation Dialog (Popup) === */}
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
//             {/* <Button variant="primary">Ya</Button> */}
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

//       {/* === Chat Dialog (Popup) === */}
//       <Modal open={chatOpen} onClose={() => setChatOpen(false)}>
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
//       </Modal>
//     </div>
//   );
// }
