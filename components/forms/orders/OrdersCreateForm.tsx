"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t, getLang, onLangChange, type Lang } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldText } from "@/components/form/FieldText";
import { FieldTextarea } from "@/components/form/FieldTextarea";
import { FieldSelect } from "@/components/form/FieldSelect";
import CityAutocomplete from "@/components/forms/orders/CityAutocomplete";
import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";
import MultiFileUpload from "@/components/form/MultiFileUpload";
import { TruckIcon } from "@/components/icons/Icon";

import { tzDateToUtcISO } from "@/lib/tz";
import { useAuth } from "@/components/providers/AuthProvider";

import type {
  AddressItem,
  JenisOrder,
  ApiPayload,
  Error422,
  OrderStatus,
  CityItem,
} from "@/types/orders";

// === parsing bantuan untuk prefill dari API ===
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

/** ENV */
const POST_ORDER_URL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL!;
const POST_CHAT_URL = process.env.NEXT_PUBLIC_TMS_ORDER_CHAT_URL ?? "";
const DETAIL_URL_TPL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
const UPDATE_URL_TPL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
const APP_BASE_PATH = process.env.NEXT_PUBLIC_URL_BASE ?? "";

/** Join path aman dari double slash */
function pathJoin(...parts: Array<string | undefined | null>): string {
  const cleaned = parts
    .filter((p): p is string => !!p)
    .map((p) => p.replace(/\/+$/g, "").replace(/^\/+/g, "/"));
  let joined = cleaned.join("/");
  joined = joined.replace(/\/{2,}/g, "/");
  if (!joined.startsWith("/")) joined = `/${joined}`;
  return joined === "" ? "/" : joined;
}

/** Build URL detail yang fleksibel:
 * - support template :id
 * - support base + /{id}
 * - support querystring ?id=...
 */
function buildDetailUrl(tpl: string, id: string | number | undefined): string {
  if (!tpl || id == null) return "";
  const sid = String(id);
  if (tpl.includes(":id")) return tpl.replace(":id", sid);

  if (tpl.includes("?")) {
    // Tambal / override id di querystring
    const [base, qs = ""] = tpl.split("?");
    const usp = new URLSearchParams(qs);
    usp.set("id", sid);
    return `${base}?${usp}`;
  }

  // default: base/{id}
  return `${tpl.replace(/\/$/, "")}/${sid}`;
}

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
};

/** Helper: isi date-time picker dari string API → "YYYY-MM-DDTHH:mm" (local) */
function apiToLocalIsoMinute(
  s: string | null | undefined,
  fallbackTime = "08:00"
): string {
  if (!s) return "";
  const candidates = [
    "YYYY-MM-DD HH:mm:ss",
    "YYYY-MM-DDTHH:mm:ssZ",
    "YYYY-MM-DDTHH:mm:ss",
    "YYYY-MM-DDTHH:mm",
    "YYYY-MM-DD",
  ];
  for (const fmt of candidates) {
    const d = dayjs(s, fmt, true);
    if (d.isValid()) {
      const datePart = d.format("YYYY-MM-DD");
      const hasTime = fmt !== "YYYY-MM-DD";
      const timePart = hasTime ? d.format("HH:mm") : fallbackTime;
      return `${datePart}T${timePart}`;
    }
  }
  return "";
}

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

/* === Komponen tracker (dinamis + i18n) === */
function StatusTracker({
  current = "Pending",
  meta,
}: {
  current?: OrderStatus;
  meta?: StatusMeta;
}) {
  const steps: Array<{
    key: OrderStatus;
    label: string;
    showSub?: boolean; // tampilkan Tiba/Keluar
  }> = [
    { key: "Pending", label: t("orders.status.pending") ?? "Pending" },
    { key: "Accepted", label: t("orders.status.accepted") ?? "Accepted" },
    {
      key: "On Preparation",
      label: t("orders.status.on_preparation") ?? "On Preparation",
    },
    {
      key: "Pickup",
      label: t("orders.status.pickup") ?? "Pickup",
      showSub: true,
    },
    {
      key: "On Delivery",
      label: t("orders.status.on_delivery") ?? "On Delivery",
    },
    {
      key: "Received",
      label: t("orders.status.received") ?? "Received",
      showSub: true,
    },
    {
      key: "On Review",
      label: t("orders.status.on_review") ?? "On Review",
      showSub: true,
    },
    { key: "Done", label: t("orders.status.done") ?? "Done" },
  ];

  const activeIdx = Math.max(
    0,
    steps.findIndex((s) => s.key === current)
  );

  return (
    <div className="mb-4 overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="flex items-start">
          {steps.map((s, i) => {
            const isActive = i === activeIdx;
            const isCompleted = i < activeIdx;
            const m = meta?.[s.key];

            return (
              <div key={s.key} className="flex-1">
                {/* dot + dashed connector */}
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    {i === 0 && isActive ? (
                      <div className="text-green-700">
                        <TruckIcon className="h-6 w-6" />
                      </div>
                    ) : (
                      <div
                        className={[
                          "h-4 w-4 rounded-full border",
                          isActive
                            ? "bg-green-600 border-green-600"
                            : isCompleted
                            ? "bg-green-500 border-green-500"
                            : "bg-gray-300 border-gray-300",
                        ].join(" ")}
                      />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="mx-3 h-px flex-1 border-t border-dashed border-gray-300" />
                  )}
                </div>

                {/* labels */}
                <div className="mt-2 text-center">
                  <div
                    className={[
                      "text-xs font-medium",
                      isActive ? "text-gray-900" : "text-gray-600",
                    ].join(" ")}
                  >
                    {s.label}
                  </div>

                  {s.showSub && (
                    <div className="mt-1 space-y-1 text-[11px] leading-4">
                      <div>
                        <span className="text-gray-600">
                          {t("orders.status.arrive") ?? "Tiba"} :
                        </span>{" "}
                        <span className="text-gray-500">
                          {m?.arrive ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-700">
                          {t("orders.status.depart") ?? "Keluar"} :
                        </span>{" "}
                        <span className="text-gray-500">
                          {m?.depart ?? "-"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** ===================== Props & Helpers (Reusable) ===================== */
type OrdersCreateFormProps = {
  mode?: "create" | "edit";
  /** Digunakan di edit mode untuk fetch detail otomatis jika initialData tidak diberikan */
  orderId?: string | number;
  /** Jika tersedia, form akan prefill dari sini (override fetch) */
  initialData?: Partial<{
    id: number | string;
    receipt_by: string;
    origin_city_id: number;
    dest_city_id: number;
    order_type: JenisOrder;
    moda: string;
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
    }>;
    status?: OrderStatus;
  }>;
  /** Callback opsional setelah sukses submit */
  onSuccess?: (result?: unknown) => void;
};

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
  const form = {
    namaPenerima: data.receipt_by ?? "",
    jenisOrder: (data.order_type ?? "") as JenisOrder | "",
    armada: data.moda ?? "",
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
    picMuatNama: "",
    picMuatTelepon: "",
    picBongkarNama: "",
    picBongkarTelepon: "",
    extraStops: [] as ExtraStop[],
  };

  const routes: RouteItem[] = Array.isArray(data.route_ids)
    ? (data.route_ids as RouteItem[])
    : ([] as RouteItem[]);

  const main = routes.find((r) => r.is_main_route);

  // Prefill dari route main kalau ada
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
    })
  );

  return form;
}

function extractMsg(x: unknown): string | null {
  if (x && typeof x === "object") {
    const v = (x as Record<string, unknown>)["msg"];
    return typeof v === "string" ? v : null;
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

  // i18n
  const { ready: i18nReady } = useI18nReady();
  const [activeLang, setActiveLang] = useState<Lang>(getLang());
  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);

  const profileTimezone =
    (profile as { tz?: string } | undefined)?.tz || "Asia/Jakarta";

  // ===== Local states =====
  const [noJO] = useState<string>("");
  const [customer] = useState<string>("");
  const [namaPenerima, setNamaPenerima] = useState<string>("");

  const [kotaMuat, setKotaMuat] = useState<CityItem | null>(null);
  const [kotaBongkar, setKotaBongkar] = useState<CityItem | null>(null);

  const [jenisOrder, setJenisOrder] = useState<JenisOrder | "">("");
  const [armada, setArmada] = useState<string>("");

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
    },
    {
      lokMuat: null,
      lokBongkar: null,
      originPicName: "",
      originPicPhone: "",
      destPicName: "",
      destPicPhone: "",
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
    if (!jenisOrder) e.jenisOrder = REQ;
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
      jenisOrder &&
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
    };

    const extraRoutes = multiPickupDrop
      ? extraStops
          .filter(
            (s) =>
              s.lokMuat?.id != null ||
              s.lokBongkar?.id != null ||
              s.originPicName.trim() !== "" ||
              s.originPicPhone.trim() !== "" ||
              s.destPicName.trim() !== "" ||
              s.destPicPhone.trim() !== ""
          )
          .map((s) => ({
            is_main_route: false,
            origin_address_id: Number(s.lokMuat?.id ?? 0),
            origin_pic_name: (s.originPicName ?? "").trim(),
            origin_pic_phone: (s.originPicPhone ?? "").trim(),
            dest_address_id: Number(s.lokBongkar?.id ?? 0),
            dest_pic_name: (s.destPicName ?? "").trim(),
            dest_pic_phone: (s.destPicPhone ?? "").trim(),
          }))
      : [];

    return {
      receipt_by: (namaPenerima ?? "").trim(),
      origin_city_id: Number(kotaMuat!.id),
      dest_city_id: Number(kotaBongkar!.id),
      order_type: jenisOrder as JenisOrder,
      moda: armada,
      pickup_date_planne: toBackendDate(tglMuat, profileTimezone),
      drop_off_date_planne: toBackendDate(tglBongkar, profileTimezone),
      route_ids: [mainRoute, ...extraRoutes],
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
          const json = (await res.json()) as unknown;
          const details = (json as Partial<Error422>)?.detail;
          if (Array.isArray(details)) {
            const list = details
              .map((d) => {
                const m = extractMsg(d);
                return m ? `• ${m}` : null;
              })
              .filter((x): x is string => Boolean(x))
              .join("\n");
            if (list) msg = list;
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
    const payload = buildApiPayload();
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

  const lokasiMuatDisabled = !kotaMuat;
  const lokasiBongkarDisabled = !kotaBongkar;

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

  return (
    <form
      key={activeLang}
      onSubmit={handleSubmit}
      className="mx-auto space-y-1 p-1"
    >
      {/* === Status Tracker (dinamis) === */}
      <StatusTracker
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
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {mode === "edit"
                      ? t("orders.edit.info_order") ?? "Edit - Info Order"
                      : t("orders.create.info_order")}
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldText
                      label={t("orders.no_jo")}
                      value={noJO || "-"}
                      onChange={() => {}}
                      disabled
                    />
                    <FieldText
                      label={t("orders.customer")}
                      value={customer || "-"}
                      onChange={() => {}}
                      disabled
                    />

                    <FieldText
                      label={t("orders.nama_penerima")}
                      value={namaPenerima}
                      onChange={setNamaPenerima}
                    />

                    <div
                      ref={
                        firstErrorKey === "jenisOrder"
                          ? firstErrorRef
                          : undefined
                      }
                    >
                      <FieldSelect
                        label={t("orders.jenis_order")}
                        value={jenisOrder as string}
                        onChange={(val) =>
                          setJenisOrder((val || "") as JenisOrder | "")
                        }
                        error={errors.jenisOrder}
                        touched={Boolean(errors.jenisOrder)}
                        placeholderOption={t("common.select")}
                        options={[
                          { value: "FTL", label: "FTL" },
                          { value: "LTL", label: "LTL" },
                          { value: "Project", label: "Project" },
                          { value: "Express", label: "Express" },
                        ]}
                      />
                    </div>

                    {/* Pickup City (kiri) */}
                    <div
                      ref={
                        firstErrorKey === "kotaMuat" ? firstErrorRef : undefined
                      }
                    >
                      <CityAutocomplete
                        label={t("orders.kota_muat")}
                        value={kotaMuat}
                        onChange={handleChangeKotaMuat}
                        error={errors.kotaMuat}
                      />
                    </div>

                    {/* Drop-off City (kanan) */}
                    <div
                      ref={
                        firstErrorKey === "kotaBongkar"
                          ? firstErrorRef
                          : undefined
                      }
                    >
                      <CityAutocomplete
                        label={t("orders.kota_bongkar")}
                        value={kotaBongkar}
                        onChange={handleChangeKotaBongkar}
                        error={errors.kotaBongkar}
                      />
                    </div>

                    <div
                      ref={
                        firstErrorKey === "armada" ? firstErrorRef : undefined
                      }
                    >
                      <FieldSelect
                        label={t("orders.armada")}
                        value={armada}
                        onChange={(val) => setArmada(val)}
                        error={errors.armada}
                        touched={Boolean(errors.armada)}
                        placeholderOption={t("common.select")}
                        options={[
                          { value: "CDE", label: "CDE" },
                          { value: "CDD", label: "CDD" },
                          { value: "Fuso", label: "Fuso" },
                          { value: "Trailer", label: "Trailer" },
                        ]}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Info Lokasi */}
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {t("orders.info_lokasi")}
                  </h3>
                </CardHeader>
                <CardBody>
                  {/* === 2-KOLOM: MUAT (kiri) & BONGKAR (kanan) === */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* === KOLOM 1: tgl_muat, lokasi_muat, PIC muat === */}
                    <div className="space-y-4">
                      {/* Tanggal & Waktu Muat */}
                      <div
                        ref={
                          firstErrorKey === "tglMuat"
                            ? firstErrorRef
                            : undefined
                        }
                      >
                        <DateTimePickerTW
                          label={t("orders.tgl_muat")}
                          value={tglMuat}
                          onChange={setTglMuat}
                          error={errors.tglMuat}
                          touched={Boolean(errors.tglMuat)}
                          displayFormat="DD-MM-YYYY"
                        />
                      </div>

                      {/* Lokasi Muat */}
                      <div
                        ref={
                          firstErrorKey === "lokMuat"
                            ? firstErrorRef
                            : undefined
                        }
                      >
                        <AddressAutocomplete
                          label={t("orders.lokasi_muat")}
                          cityId={kotaMuat?.id ?? null}
                          value={lokMuat}
                          onChange={setLokMuat}
                          disabled={!!lokasiMuatDisabled}
                        />
                        {errors.lokMuat && (
                          <div className="mt-1 text-xs text-red-600">
                            {errors.lokMuat}
                          </div>
                        )}
                      </div>

                      {/* PIC Muat: Nama */}
                      <div>
                        <FieldText
                          label={t("orders.pic_muat_name") ?? "PIC Muat - Nama"}
                          value={picMuatNama}
                          onChange={setPicMuatNama}
                        />
                      </div>

                      {/* PIC Muat: Telepon */}
                      <div>
                        <FieldText
                          label={
                            t("orders.pic_muat_phone") ?? "PIC Muat - Telepon"
                          }
                          value={picMuatTelepon}
                          onChange={setPicMuatTelepon}
                          inputMode="tel"
                          pattern="^[0-9+() -]*$"
                        />
                      </div>
                    </div>

                    {/* === KOLOM 2: tgl_bongkar, lokasi_bongkar, PIC bongkar === */}
                    <div className="space-y-4">
                      {/* Tanggal & Waktu Bongkar */}
                      <div
                        ref={
                          firstErrorKey === "tglBongkar"
                            ? firstErrorRef
                            : undefined
                        }
                      >
                        <DateTimePickerTW
                          label={t("orders.tgl_bongkar")}
                          value={tglBongkar}
                          onChange={setTglBongkar}
                          error={errors.tglBongkar}
                          touched={Boolean(errors.tglBongkar)}
                          displayFormat="DD-MM-YYYY"
                        />
                      </div>

                      {/* Lokasi Bongkar */}
                      <div
                        ref={
                          firstErrorKey === "lokBongkar"
                            ? firstErrorRef
                            : undefined
                        }
                      >
                        <AddressAutocomplete
                          label={t("orders.lokasi_bongkar")}
                          cityId={kotaBongkar?.id ?? null}
                          value={lokBongkar}
                          onChange={setLokBongkar}
                          disabled={!!lokasiBongkarDisabled}
                        />
                        {errors.lokBongkar && (
                          <div className="mt-1 text-xs text-red-600">
                            {errors.lokBongkar}
                          </div>
                        )}
                      </div>

                      {/* PIC Bongkar: Nama */}
                      <div>
                        <FieldText
                          label={
                            t("orders.pic_bongkar_name") ?? "PIC Bongkar - Nama"
                          }
                          value={picBongkarNama}
                          onChange={setPicBongkarNama}
                        />
                      </div>

                      {/* PIC Bongkar: Telepon */}
                      <div>
                        <FieldText
                          label={
                            t("orders.pic_bongkar_phone") ??
                            "PIC Bongkar - Telepon"
                          }
                          value={picBongkarTelepon}
                          onChange={setPicBongkarTelepon}
                          inputMode="tel"
                          pattern="^[0-9+() -]*$"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ====== Multi Pickup/Drop + ExtraStop ====== */}
                  <div className="mt-6 space-y-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={multiPickupDrop}
                        onChange={(e) => setMultiPickupDrop(e.target.checked)}
                      />
                      <span>
                        {t("orders.multi_pickdrop") ?? "Multi Pickup/Drop"}
                      </span>
                    </label>

                    {multiPickupDrop && (
                      <div className="space-y-4">
                        {extraStops.map((s, idx) => (
                          <div
                            key={idx}
                            ref={(el) => {
                              if (el) extraRefs.current[idx] = el;
                            }}
                            className="rounded-xl border border-gray-200 p-3"
                          >
                            <div className="mb-2 text-sm font-semibold">
                              {t("orders.set_ke") ?? "Set ke"} {idx + 1}
                            </div>

                            {errors[`extra_${idx}`] && (
                              <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                {errors[`extra_${idx}`]}
                              </div>
                            )}

                            {/* Alamat */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <AddressAutocomplete
                                label={
                                  (t("orders.lokasi_muat") ?? "Lokasi Muat") +
                                  ` (${idx + 1})`
                                }
                                cityId={kotaMuat?.id ?? null}
                                value={s.lokMuat}
                                onChange={(v) =>
                                  setExtraStops((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], lokMuat: v };
                                    return next;
                                  })
                                }
                                disabled={!!lokasiMuatDisabled}
                              />
                              <AddressAutocomplete
                                label={
                                  (t("orders.lokasi_bongkar") ??
                                    "Lokasi Bongkar") + ` (${idx + 1})`
                                }
                                cityId={kotaBongkar?.id ?? null}
                                value={s.lokBongkar}
                                onChange={(v) =>
                                  setExtraStops((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], lokBongkar: v };
                                    return next;
                                  })
                                }
                                disabled={!!lokasiBongkarDisabled}
                              />
                            </div>

                            {/* PIC ORIGIN (MUAT) */}
                            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <FieldText
                                label={
                                  (t("orders.pic_muat_name") ??
                                    "PIC Muat - Nama") + ` (${idx + 1})`
                                }
                                value={s.originPicName}
                                onChange={(v) =>
                                  setExtraStops((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      originPicName: v,
                                    };
                                    return next;
                                  })
                                }
                              />
                              <FieldText
                                label={
                                  (t("orders.pic_muat_phone") ??
                                    "PIC Muat - Telepon") + ` (${idx + 1})`
                                }
                                value={s.originPicPhone}
                                onChange={(v) =>
                                  setExtraStops((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      originPicPhone: v,
                                    };
                                    return next;
                                  })
                                }
                                inputMode="tel"
                                pattern="^[0-9+() -]*$"
                              />
                            </div>

                            {/* PIC DESTINATION (BONGKAR) */}
                            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <FieldText
                                label={
                                  (t("orders.pic_bongkar_name") ??
                                    "PIC Bongkar - Nama") + ` (${idx + 1})`
                                }
                                value={s.destPicName}
                                onChange={(v) =>
                                  setExtraStops((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      destPicName: v,
                                    };
                                    return next;
                                  })
                                }
                              />
                              <FieldText
                                label={
                                  (t("orders.pic_bongkar_phone") ??
                                    "PIC Bongkar - Telepon") + ` (${idx + 1})`
                                }
                                value={s.destPicPhone}
                                onChange={(v) =>
                                  setExtraStops((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      destPicPhone: v,
                                    };
                                    return next;
                                  })
                                }
                                inputMode="tel"
                                pattern="^[0-9+() -]*$"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
              {/* Layanan Khusus */}
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {t("orders.layanan_khusus")}
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {layananPreset.map((k) => (
                      <label
                        key={k}
                        className="inline-flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={!!layananKhusus[k]}
                          onChange={(e) =>
                            setLayananKhusus((prev) => ({
                              ...prev,
                              [k]: e.target.checked,
                            }))
                          }
                        />
                        {k}
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <FieldTextarea
                      label={t("orders.layanan_lainnya")}
                      value={layananLainnya}
                      onChange={setLayananLainnya}
                      rows={4}
                    />
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* ===== Right Column ===== */}
            <div className="space-y-4">
              {/* Info Muatan */}
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {t("orders.info_muatan")}
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 gap-4">
                    <div
                      ref={
                        firstErrorKey === "muatanNama"
                          ? firstErrorRef
                          : undefined
                      }
                    >
                      <FieldText
                        label={t("orders.muatan_nama")}
                        value={muatanNama}
                        onChange={setMuatanNama}
                        error={errors.muatanNama}
                        touched={Boolean(errors.muatanNama)}
                      />
                    </div>

                    <div
                      ref={
                        firstErrorKey === "muatanDeskripsi"
                          ? firstErrorRef
                          : undefined
                      }
                    >
                      <FieldTextarea
                        label={t("orders.muatan_deskripsi")}
                        value={muatanDeskripsi}
                        error={errors.muatanDeskripsi}
                        onChange={setMuatanDeskripsi}
                        rows={4}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Detail Amount */}
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {t("orders.detail_amount")}
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{t("orders.biaya_kirim")}</span>
                      <span className="font-medium">{biayaKirimLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("orders.biaya_layanan_tambahan")}</span>
                      <span className="font-medium">
                        {biayaLayananTambahanLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("orders.tax")}</span>
                      <span className="font-medium">{taxLabel}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span>{t("orders.biaya_na")}</span>
                      <span className="max-w-[60%] text-right text-gray-600">
                        {t("orders.biaya_na_note")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {t("orders.total_harga")}
                      </span>
                      <span className="font-semibold">{totalHargaLabel}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Dokumen Pengiriman */}
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {t("orders.dok_pengiriman")}
                  </h3>
                </CardHeader>
                <CardBody>
                  <MultiFileUpload
                    label={t("orders.lampiran_dokumen")}
                    value={dokumenFiles}
                    onChange={setDokumenFiles}
                    accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                    maxFileSizeMB={10}
                    maxFiles={10}
                    hint={
                      t("orders.upload_hint_10mb") ??
                      "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                    }
                    onReject={(msgs) =>
                      console.warn("[Dokumen] rejected:", msgs)
                    }
                    className="grid grid-cols-1 gap-4"
                  />
                </CardBody>
              </Card>

              {/* SJ & POD */}
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {t("orders.sj_pod")}
                  </h3>
                </CardHeader>
                <CardBody>
                  <MultiFileUpload
                    label={t("orders.lampiran_sj_pod")}
                    value={sjPodFiles}
                    onChange={setSjPodFiles}
                    accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                    maxFileSizeMB={10}
                    maxFiles={10}
                    hint={
                      t("orders.upload_hint_10mb") ??
                      "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                    }
                    onReject={(msgs) =>
                      console.warn("[SJ/POD] rejected:", msgs)
                    }
                    className="grid grid-cols-1 gap-4"
                    showImagePreview
                  />
                </CardBody>
              </Card>
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
            else router.push(pathJoin(APP_BASE_PATH, "/orders"));
          }
        }}
      />
    </form>
  );
}
