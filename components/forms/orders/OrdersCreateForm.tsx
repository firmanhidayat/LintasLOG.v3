"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t, getLang, onLangChange } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldTextarea } from "@/components/form/FieldTextarea";
import OrderInfoCard from "@/components/forms/orders/OrderInfoCard";
import LocationInfoCard from "@/components/forms/orders/LocationInfoCard";
import SpecialServicesCard from "@/components/forms/orders/SpecialServicesCard";
import CargoInfoCard from "@/components/forms/orders/CargoInfoCard";
import CostDetailsCard from "@/components/forms/orders/CostDetailsCard";
import ShippingDocumentsCard from "@/components/forms/orders/ShippingDocumentsCard";
import { tzDateToUtcISO } from "@/lib/tz";
import { useAuth } from "@/components/providers/AuthProvider";

import type {
  AddressItem,
  OrderTypeItem,
  ModaItem,
  ApiPayload,
  OrderStatus,
  CityItem,
  OrdersCreateFormProps,
  PartnerItem,
} from "@/types/orders";

// === parsing bantuan untuk prefill dari API ===
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import {
  apiToLocalIsoMinute,
  buildDetailUrl,
  pathJoin,
} from "@/components/shared/Helper";
import StatusTracker from "@/components/ui/StatusTracker";

/** ENV */
const POST_ORDER_URL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL!;
const POST_CHAT_URL = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL ?? "";
const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
const UPDATE_URL_TPL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
const APP_BASE_PATH = process.env.NEXT_PUBLIC_URL_BASE ?? "";

/* === Optional metadata untuk Tiba/Keluar per step === */
type StatusMeta = Partial<
  Record<OrderStatus, { arrive?: string; depart?: string }>
>;

/** ExtraStop seragam dengan mainRoute (akan dikirim sebagai bagian dari route_ids) */
type ExtraStop = {
  lokMuat: AddressItem | null;
  lokBongkar: AddressItem | null;
  /** PIC di origin (lokasi muat) */
  originPicName: string;
  originPicPhone: string;
  /** PIC di destination (lokasi bongkar) */
  destPicName: string;
  destPicPhone: string;
  tglETDMuat: string;
  tglETABongkar: string;
};

/* === Lightweight Modal/Dialog === */
function Modal({
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

function fillUrlTemplate(tpl: string, id?: string | number): string {
  if (!tpl) return "";
  if (tpl.includes(":id")) return tpl.replace(":id", String(id ?? ""));
  if (id != null && !tpl.endsWith("/")) return `${tpl}/${id}`;
  if (id != null) return `${tpl}${id}`;
  return tpl;
}

/** Prefill helper dari 'initialData' project kamu ke state form komponen */
type RouteItem = NonNullable<
  NonNullable<OrdersCreateFormProps["initialData"]>["route_ids"]
>[number];

// Ambil AddressItem dari route: utamakan object, fallback ke id
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

function prefillFromInitial(
  data: NonNullable<OrdersCreateFormProps["initialData"]>
) {
  type Maybe<T> = T | null | undefined;

  const toOrderTypeItem = (
    v: Maybe<string | OrderTypeItem>
  ): OrderTypeItem | null => {
    if (!v) return null;
    return typeof v === "string" ? { id: v, name: v } : v;
  };

  const toModaItem = (v: Maybe<string | ModaItem>): ModaItem | null => {
    if (!v) return null;
    return typeof v === "string" ? { id: v, name: v } : v;
  };

  // console.log("data edit form (prefill):", data);

  const form = {
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
    muatanNama: data.cargo_name ?? "",
    muatanDeskripsi: data.cargo_description ?? "",
    requirement_helmet: Boolean(data.requirement_helmet),
    requirement_apar: Boolean(data.requirement_apar),
    requirement_safety_shoes: Boolean(data.requirement_safety_shoes),
    requirement_vest: Boolean(data.requirement_vest),
    requirement_glasses: Boolean(data.requirement_glasses),
    requirement_gloves: Boolean(data.requirement_gloves),
    requirement_face_mask: Boolean(data.requirement_face_mask),
    requirement_tarpaulin: Boolean(data.requirement_tarpaulin),
    requirement_other: data.requirement_other ?? "",
    picMuatNama: "",
    picMuatTelepon: "",
    picBongkarNama: "",
    picBongkarTelepon: "",
    extraStops: [] as ExtraStop[],
  };

  // console.log("form:", form);

  const routes: RouteItem[] = Array.isArray(data.route_ids)
    ? (data.route_ids as RouteItem[])
    : ([] as RouteItem[]);

  const main = routes.find((r) => r.is_main_route);

  // Prefill dari route main kalau ada
  form.tglMuat = apiToLocalIsoMinute(main?.etd_date) || form.tglMuat;
  form.tglBongkar = apiToLocalIsoMinute(main?.eta_date) || form.tglBongkar;
  form.lokMuat = addrFromRoute(main, "origin");
  form.lokBongkar = addrFromRoute(main, "dest");
  form.picMuatNama = main?.origin_pic_name ?? "";
  form.picMuatTelepon = main?.origin_pic_phone ?? "";
  form.picBongkarNama = main?.dest_pic_name ?? "";
  form.picBongkarTelepon = main?.dest_pic_phone ?? "";

  // Fallback: kalau tidak ada route main, coba dari top-level origin/dest_address
  if (!form.lokMuat)
    form.lokMuat = (data.origin_address as AddressItem) ?? null;
  if (!form.lokBongkar)
    form.lokBongkar = (data.dest_address as AddressItem) ?? null;

  // Extra routes
  const extras: RouteItem[] = routes.filter((r) => !r.is_main_route);
  form.extraStops = extras.map(
    (r): ExtraStop => ({
      lokMuat: addrFromRoute(r, "origin"),
      lokBongkar: addrFromRoute(r, "dest"),
      originPicName: r.origin_pic_name ?? "",
      originPicPhone: r.origin_pic_phone ?? "",
      destPicName: r.dest_pic_name ?? "",
      destPicPhone: r.dest_pic_phone ?? "",
      tglETDMuat: apiToLocalIsoMinute(r.etd_date) ?? r.etd_date ?? "",
      tglETABongkar: apiToLocalIsoMinute(r.eta_date) ?? r.eta_date ?? "", // belum ada dari API → kosong
    })
  );

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
export default function OrdersCreateForm({
  mode = "create",
  orderId,
  initialData,
  onSuccess,
}: OrdersCreateFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Baca id dari query (?id=123) jika orderId prop tidak disuplai
  const qsId = searchParams?.get("id") ?? null;
  const effectiveOrderId = useMemo<string | number | undefined>(() => {
    return orderId ?? qsId ?? undefined;
  }, [orderId, qsId]);

  const { profile } = useAuth();

  // i18n// i18n
  const { ready: i18nReady } = useI18nReady();
  // pakai reducer utk trigger re-render tanpa state variabel yang unused
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

  // DateTime (ISO lokal "YYYY-MM-DDTHH:mm")
  const [tglMuat, setTglMuat] = useState<string>("");
  const [tglBongkar, setTglBongkar] = useState<string>("");

  const [lokMuat, setLokMuat] = useState<AddressItem | null>(null);
  const [lokBongkar, setLokBongkar] = useState<AddressItem | null>(null);

  // Kontak utama (PIC)
  const [picMuatNama, setPicMuatNama] = useState<string>("");
  const [picMuatTelepon, setPicMuatTelepon] = useState<string>("");
  const [picBongkarNama, setPicBongkarNama] = useState<string>("");
  const [picBongkarTelepon, setPicBongkarTelepon] = useState<string>("");

  // Multi Pickup/Drop
  const [multiPickupDrop, setMultiPickupDrop] = useState<boolean>(false);
  const [extraStops, setExtraStops] = useState<ExtraStop[]>([
    {
      lokMuat: null,
      lokBongkar: null,
      originPicName: "",
      originPicPhone: "",
      destPicName: "",
      destPicPhone: "",
      tglETDMuat: "", // ⬅️ baru
      tglETABongkar: "", // ⬅️ baru
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
    },
  ]);

  // Upload lists (MultiFileUpload controlled) — belum dikirim (UI only)
  const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
  const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);

  // Amount placeholders
  const biayaKirimLabel = "-";
  const biayaLayananTambahanLabel = "-";
  const taxLabel = "-";
  const totalHargaLabel = "-";

  // Errors & refs
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstErrorRef = useRef<HTMLDivElement | null>(null);
  const extraRefs = useRef<HTMLDivElement[]>([]);

  const firstErrorKey = useMemo(() => {
    const order = [
      "kotaMuat",
      "kotaBongkar",
      "jenisOrder",
      "armada",
      "tglMuat",
      "tglBongkar",
      "muatanNama",
      "muatanDeskripsi",
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

  // Tracker status (create: Pending; edit: dari data)
  const [statusCurrent, setStatusCurrent] = useState<OrderStatus | undefined>(
    initialData?.status
  );

  // ===================== Prefill untuk Edit =====================
  const [loadingDetail, setLoadingDetail] = useState<boolean>(
    mode === "edit" && !initialData ? true : false
  );

  // ❌ HAPUS efek reset otomatis yang mengosongkan prefill
  // useEffect(() => { setLokMuat(null); }, [kotaMuat?.id]);
  // useEffect(() => { setLokBongkar(null); }, [kotaBongkar?.id]);

  // ✅ Ganti dengan handler khusus saat user mengganti kota
  function handleChangeKotaMuat(city: CityItem | null) {
    setKotaMuat(city);
    setLokMuat(null);
  }
  function handleChangeKotaBongkar(city: CityItem | null) {
    setKotaBongkar(city);
    setLokBongkar(null);
  }

  // i18n list
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

  // Jika ada initialData, langsung prefill
  useEffect(() => {
    if (!initialData) return;
    const f = prefillFromInitial(initialData);
    setNamaPenerima(f.namaPenerima);
    setJenisOrder(f.jenisOrder);
    setArmada(f.armada);
    // prefill langsung set kota (tanpa trigger handler reset)
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

    if (f.extraStops.length > 0) {
      setMultiPickupDrop(true);
      setExtraStops(f.extraStops);
    }
    if (initialData.status) setStatusCurrent(initialData.status);
    setLoadingDetail(false);
  }, [initialData]);

  // Jika edit tapi initialData tidak ada, fetch detail (jika env DETAIL_URL_TPL tersedia)
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
          setMuatanNama(f.muatanNama);
          setMuatanDeskripsi(f.muatanDeskripsi);
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

          if (f.extraStops.length > 0) {
            setMultiPickupDrop(true);
            setExtraStops(f.extraStops);
          }
          if (json?.status) setStatusCurrent(json.status);
        }
      } catch (err) {
        console.error("[OrderDetail] fetch error:", err);
      } finally {
        setLoadingDetail(false);
      }
    })();
    return () => abort.abort();
  }, [mode, effectiveOrderId, initialData, router.replace]);

  /** ===================== Validation ===================== */
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const REQ = t("form.required") ?? "Wajib diisi";

    if (!kotaMuat) e.kotaMuat = REQ;
    if (!kotaBongkar) e.kotaBongkar = REQ;
    // if (!jenisOrder) e.jenisOrder = REQ;
    if (
      !jenisOrder ||
      (typeof jenisOrder === "object" && !jenisOrder.id && !jenisOrder.name)
    ) {
      e.jenisOrder = REQ;
    }
    if (!armada) e.armada = REQ;

    if (!tglMuat) e.tglMuat = REQ;
    if (!tglBongkar) e.tglBongkar = REQ;

    if (!muatanNama) e.muatanNama = REQ;
    if (!muatanDeskripsi) e.muatanDeskripsi = REQ;

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
        kotaMuat?.id &&
        kotaBongkar?.id &&
        lokMuat?.id &&
        lokBongkar?.id &&
        tglMuat &&
        tglBongkar &&
        muatanNama &&
        muatanDeskripsi
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
    muatanNama,
    muatanDeskripsi,
  ]);

  /** ===================== Build Payload ===================== */
  function buildApiPayload(): ApiPayload {
    const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    const toBackendDate = (localStr: string, tz: string): string => {
      if (!localStr) return "";
      const utcIso = tzDateToUtcISO(localStr, tz);
      if (!utcIso) return "";
      const d = new Date(utcIso);
      if (Number.isNaN(d.getTime())) return "";
      const yyyy = d.getUTCFullYear();
      const MM = pad2(d.getUTCMonth() + 1);
      const dd = pad2(d.getUTCDate());
      const HH = pad2(d.getUTCHours());
      const mm = pad2(d.getUTCMinutes());
      const ss = pad2(d.getUTCSeconds());
      return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
    };

    const mainRoute = {
      is_main_route: true,
      origin_address_id: Number(lokMuat?.id ?? 0),
      origin_pic_name: (picMuatNama ?? "").trim(),
      origin_pic_phone: (picMuatTelepon ?? "").trim(),
      dest_address_id: Number(lokBongkar?.id ?? 0),
      dest_pic_name: (picBongkarNama ?? "").trim(),
      dest_pic_phone: (picBongkarTelepon ?? "").trim(),
      etd_date: toBackendDate(tglMuat, profileTimezone),
      eta_date: toBackendDate(tglBongkar, profileTimezone),
    };

    const extraRoutes = multiPickupDrop
      ? extraStops
          .filter((s) => s.lokMuat?.id && s.lokBongkar?.id)
          .map((s) => ({
            is_main_route: false,
            origin_address_id: Number(s.lokMuat?.id ?? 0),
            origin_pic_name: (s.originPicName ?? "").trim(),
            origin_pic_phone: (s.originPicPhone ?? "").trim(),
            dest_address_id: Number(s.lokBongkar?.id ?? 0),
            dest_pic_name: (s.destPicName ?? "").trim(),
            dest_pic_phone: (s.destPicPhone ?? "").trim(),
            etd_date: toBackendDate(s.tglETDMuat ?? "", profileTimezone),
            eta_date: toBackendDate(s.tglETABongkar ?? "", profileTimezone),
          }))
      : [];

    return {
      receipt_by: (namaPenerima ?? "").trim(),
      origin_city_id: Number(kotaMuat!.id),
      dest_city_id: Number(kotaBongkar!.id),
      order_type_id: (jenisOrder as OrderTypeItem).id.toString(),
      moda_id: (armada as ModaItem).id.toString(),

      cargo_name: (muatanNama ?? "").trim(),
      cargo_description: (muatanDeskripsi ?? "").trim(),

      requirement_helmet: layananKhusus["Helm"] ? true : false,
      requirement_apar: layananKhusus["APAR"] ? true : false,
      requirement_safety_shoes: layananKhusus["Safety Shoes"] ? true : false,
      requirement_vest: layananKhusus["Rompi"] ? true : false,
      requirement_glasses: layananKhusus["Kaca mata"] ? true : false,
      requirement_gloves: layananKhusus["Sarung tangan"] ? true : false,
      requirement_face_mask: layananKhusus["Masker"] ? true : false,
      requirement_tarpaulin: layananKhusus["Terpal"] ? true : false,
      requirement_other: (layananLainnya ?? "").trim(),

      route_ids: [mainRoute, ...extraRoutes],
      // // attachments: siapkan kolom untuk backend (nanti ganti dengan IDs)
      // attachments: {
      //   docs: [],
      //   pod: [],
      // },
    };
  }

  /** ===================== Submit (Create/Edit) ===================== */
  async function doSubmitToApi(apiPayload: ApiPayload) {
    if (mode === "create" && !POST_ORDER_URL) {
      setRespIsSuccess(false);
      setRespTitle(t("common.error") ?? "Error");
      setRespMessage(
        "Endpoint form order belum dikonfigurasi (NEXT_PUBLIC_TMS_ORDER_FORM_URL)."
      );
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
        "Edit mode butuh id dan endpoint update (NEXT_PUBLIC_TMS_ORDER_UPDATE_URL) atau fallback ke POST_ORDER_URL/{id}."
      );
      setRespOpen(true);
      return;
    }

    try {
      setSubmitLoading(true);

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
    if (Object.keys(eobj).length > 0) {
      setConfirmOpen(false);
      return;
    }
    const payload = buildApiPayload();

    console.log(payload);

    void doSubmitToApi(payload);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const eobj = validate();
    if (Object.keys(eobj).length > 0) {
      // Tunggu DOM re-render supaya firstErrorRef terpasang
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
          // cari extra_* pertama
          const firstExtraIdx = Object.keys(eobj)
            .filter((k) => k.startsWith("extra_"))
            .map((k) => Number(k.split("_")[1]))
            .sort((a, b) => a - b)[0];
          const ex = extraRefs.current[firstExtraIdx];
          if (ex) {
            ex.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      });
      return;
    }
    setConfirmOpen(true);
  }

  function handleDiscard() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(pathJoin(APP_BASE_PATH, "/orders"));
    }
  }

  // const lokasiMuatDisabled = !kotaMuat;
  // const lokasiBongkarDisabled = !kotaBongkar;

  /* =================== Chat state & handler (non-intrusive) ================== */
  const [chatMsg, setChatMsg] = useState("");
  const [chatSending, setChatSending] = useState(false);
  async function handleSendChat() {
    if (!chatMsg.trim()) return;
    if (!POST_CHAT_URL) {
      console.warn("POST_CHAT_URL not configured");
      alert("Chat endpoint belum dikonfigurasi.");
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
        alert((t("common.failed_save") ?? "Gagal menyimpan.") + " " + msg);
        return;
      }
      setChatMsg("");
      alert(t("common.saved") ?? "Tersimpan");
    } catch (e) {
      console.error("Chat error", e);
      alert(t("common.network_error") ?? "Terjadi kesalahan jaringan.");
    } finally {
      setChatSending(false);
    }
  }
  /* ========================================================================== */

  if (!i18nReady || loadingDetail) {
    return (
      <div className="p-4 text-sm text-gray-600">{t("common.loading")}…</div>
    );
  }

  function safeJoin(base: string, path: string): string {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }
  return (
    <form
      // key={activeLang}
      onSubmit={handleSubmit}
      className="mx-auto space-y-1 p-1"
    >
      {/* === Status Tracker (dinamis) === */}
      <StatusTracker
        className="sticky top-14 z-30 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm"
        i18nReady={i18nReady}
        current={statusCurrent ?? "Pending"}
        meta={{
          Pickup: { arrive: "-", depart: "-" },
          Received: { arrive: "-", depart: "-" },
          "On Review": { arrive: "-", depart: "-" },
        }}
      />
      <Card className="!border-0">
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* ===== Left Column ===== */}
            <div className="space-y-4">
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
                // ⬇️ Tambahkan 8 props PIC berikut
                picMuatNama={picMuatNama}
                setPicMuatNama={setPicMuatNama}
                picMuatTelepon={picMuatTelepon}
                setPicMuatTelepon={setPicMuatTelepon}
                picBongkarNama={picBongkarNama}
                setPicBongkarNama={setPicBongkarNama}
                picBongkarTelepon={picBongkarTelepon}
                setPicBongkarTelepon={setPicBongkarTelepon}
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
                layananPreset={layananPreset}
                layananKhusus={layananKhusus}
                setLayananKhusus={setLayananKhusus}
                layananLainnya={layananLainnya}
                setLayananLainnya={setLayananLainnya}
              />
            </div>

            {/* ===== Right Column ===== */}
            <div className="space-y-4">
              {/* Info Muatan */}
              <CargoInfoCard
                muatanNama={muatanNama}
                setMuatanNama={setMuatanNama}
                muatanDeskripsi={muatanDeskripsi}
                setMuatanDeskripsi={setMuatanDeskripsi}
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
              />
            </div>

            {/* === Button Submit and Discard === */}
            <div className="flex items-center justify-start gap-3 pt-3">
              <Button type="button" variant="outline" onClick={handleDiscard}>
                {t("common.discard")}
              </Button>
              <Button
                type="submit"
                disabled={submitLoading || !canSubmit}
                variant="primary"
              >
                {submitLoading
                  ? t("common.sending") ?? "Mengirim…"
                  : mode === "edit"
                  ? t("common.update") ?? "Update"
                  : t("common.save")}
              </Button>
            </div>

            {/* ==== Chat / Broadcast Message - Full Width ==== */}
            {/* Muncul setelah submit sukses */}
            <div className="md:col-span-2" hidden={!respIsSuccess}>
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {t("orders.chat_broadcast") ?? "Chat / Broadcast Message"}
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
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
                    <div className="flex justify-start items-center">
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
                </CardBody>
              </Card>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* === Dialogs === */}
      <ConfirmSubmitDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmAndSubmit}
        loading={submitLoading}
        mode={mode}
      />
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
    </form>
  );
}
