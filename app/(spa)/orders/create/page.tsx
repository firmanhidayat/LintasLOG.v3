"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, getLang, onLangChange, type Lang } from "@/lib/i18n";
import { isLoggedIn } from "@/lib/auth";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-300 bg-primary/5 px-4 py-3 text-sm font-semibold text-gray-800">
        {title}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required = false,
  children,
  hint,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

interface IdName {
  id: number | string;
  name: string;
}

interface AddressItem {
  id: number | string;
  name: string; // label to show
}

type JenisOrder = "FTL" | "LTL" | "Project" | "Express";

interface CreateOrderPayload {
  // Info Order
  no_jo?: string; // readonly display only
  customer?: string; // readonly display only
  penerima_nama?: string;
  kota_muat_id: number | string;
  kota_bongkar_id: number | string;
  jenis_order: JenisOrder;
  armada: string;

  // Lokasi Muat/Bongkar
  tgl_muat_utc: string; // ISO UTC
  tgl_bongkar_utc: string; // ISO UTC
  multi_pickdrop: boolean;
  lokasi_muat_id?: number | string;
  lokasi_bongkar_id?: number | string;

  // Layanan Khusus
  layanan_khusus: string[]; // e.g. ["Helm", "APAR", ...]
  layanan_lainnya?: string;

  // Informasi Muatan
  muatan_nama: string;
  muatan_jenis: string;
  muatan_deskripsi: string;

  // Dokumen (optional: just filenames for now)
  dokumen_lampiran?: string[];
  sj_pod_lampiran?: string[];

  // For server-side reference
  profile_timezone?: string;
}

// ====== TZ helpers (no external lib) ======
// Compute offset (ms) between provided timeZone and UTC at a given instant `date`.
function getOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUTC - date.getTime();
}

// Given a `YYYY-MM-DD` and a profile IANA TZ, return ISO string at 00:00 in that TZ converted to UTC
function tzDateToUtcISO(dateStr: string, tz: string): string {
  const [y, m, d] = dateStr.split("-").map((n) => Number(n));
  const utcGuess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const offsetMs = getOffsetMs(tz, utcGuess);
  const utcEpoch = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMs;
  return new Date(utcEpoch).toISOString();
}

// ====== Simple Autocomplete (Cities) ======
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function CityAutocomplete({
  label,
  value,
  onChange,
  required = false,
  error,
}: {
  label: string;
  value: IdName | null;
  onChange: (val: IdName | null) => void;
  required?: boolean;
  error?: string;
}) {
  const [query, setQuery] = useState<string>(value?.name ?? "");
  const [options, setOptions] = useState<IdName[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 250);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!debounced) {
        setOptions([]);
        return;
      }
      try {
        const url = new URL(API_BASE + "/locations/cities/search");
        url.searchParams.set("query", debounced);
        const res = await fetch(url.toString(), { credentials: "include" });
        if (!res.ok) return;
        const arr = (await res.json()) as IdName[];
        if (!ignore) setOptions(arr);
      } catch (err) {
        console.error("[CityAutocomplete] search failed", err);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [debounced]);

  // keep input text in sync when parent changes (e.g., reset)
  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value?.id]);

  return (
    <Field label={label} required={required} error={error}>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          placeholder={t("common.search_city")}
        />
        {open && options.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
            {options.map((opt) => (
              <li
                key={String(opt.id)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setQuery(opt.name);
                  setOpen(false);
                }}
              >
                {opt.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

// ====== Address Autocomplete (depends on selected city) ======
function AddressAutocomplete({
  label,
  cityId,
  value,
  onChange,
  disabled,
}: {
  label: string;
  cityId: number | string | null;
  value: AddressItem | null;
  onChange: (v: AddressItem | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState<string>(value?.name ?? "");
  const [options, setOptions] = useState<AddressItem[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 250);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!cityId || !debounced) {
        setOptions([]);
        return;
      }
      try {
        const url = new URL(API_BASE + "/locations/addresses/search");
        url.searchParams.set("city_id", String(cityId));
        url.searchParams.set("query", debounced);
        const res = await fetch(url.toString(), { credentials: "include" });
        if (!res.ok) return;
        const arr = (await res.json()) as AddressItem[];
        if (!ignore) setOptions(arr);
      } catch (err) {
        console.error("[AddressAutocomplete] search failed", err);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [debounced, cityId]);

  // reset query if city changes
  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value?.id, cityId]);

  return (
    <Field label={label}>
      <div className="relative">
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none disabled:bg-gray-100 focus:ring-2 focus:ring-brand-500"
          placeholder={
            disabled
              ? t("common.select_city_first")
              : t("common.search_address")
          }
        />
        {!disabled && open && options.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
            {options.map((opt) => (
              <li
                key={String(opt.id)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setQuery(opt.name);
                  setOpen(false);
                }}
              >
                {opt.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

export default function OrdersCreatePage() {
  const router = useRouter();

  const [i18nReady, setI18nReady] = useState<boolean>(true); // assume dictionaries already loaded globally
  const [activeLang, setActiveLang] = useState<Lang>(getLang());
  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);

  const profileTimezone = "Asia/Jakarta"; // fallback if profile not mounted yet

  const [noJO] = useState<string>("");
  const [customer] = useState<string>("");
  const [namaPenerima, setNamaPenerima] = useState<string>("");
  const [kotaMuat, setKotaMuat] = useState<IdName | null>(null);
  const [kotaBongkar, setKotaBongkar] = useState<IdName | null>(null);
  const [jenisOrder, setJenisOrder] = useState<JenisOrder | "">("");
  const [armada, setArmada] = useState<string>("");

  const [tglMuat, setTglMuat] = useState<string>(""); // YYYY-MM-DD
  const [tglBongkar, setTglBongkar] = useState<string>("");
  const [multiPickDrop, setMultiPickDrop] = useState<boolean>(false);
  const [lokMuat, setLokMuat] = useState<AddressItem | null>(null);
  const [lokBongkar, setLokBongkar] = useState<AddressItem | null>(null);

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
  const [muatanJenis, setMuatanJenis] = useState<string>("");
  const [muatanDeskripsi, setMuatanDeskripsi] = useState<string>("");

  const [dokumenFiles, setDokumenFiles] = useState<File[]>([]);
  const [sjPodFiles, setSjPodFiles] = useState<File[]>([]);

  const biayaKirimLabel = "-";
  const biayaLayananTambahanLabel = "-";
  const taxLabel = "-";
  const totalHargaLabel = "-";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstErrorRef = useRef<HTMLDivElement | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};

    if (!kotaMuat) e.kotaMuat = t("form.required");
    if (!kotaBongkar) e.kotaBongkar = t("form.required");
    if (!jenisOrder) e.jenisOrder = t("form.required");
    if (!armada) e.armada = t("form.required");
    if (!tglMuat) e.tglMuat = t("form.required");
    if (!tglBongkar) e.tglBongkar = t("form.required");
    if (!muatanNama) e.muatanNama = t("form.required");
    if (!muatanJenis) e.muatanJenis = t("form.required");
    if (!muatanDeskripsi) e.muatanDeskripsi = t("form.required");

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) {
      firstErrorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    const selectedLayanan = Object.entries(layananKhusus)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const payload: CreateOrderPayload = {
      no_jo: noJO || undefined,
      customer: customer || undefined,
      penerima_nama: namaPenerima || undefined,
      kota_muat_id: kotaMuat!.id,
      kota_bongkar_id: kotaBongkar!.id,
      jenis_order: jenisOrder as JenisOrder,
      armada,
      tgl_muat_utc: tzDateToUtcISO(tglMuat, profileTimezone),
      tgl_bongkar_utc: tzDateToUtcISO(tglBongkar, profileTimezone),
      multi_pickdrop: multiPickDrop,
      lokasi_muat_id: lokMuat?.id,
      lokasi_bongkar_id: lokBongkar?.id,
      layanan_khusus: selectedLayanan,
      layanan_lainnya: layananLainnya || undefined,
      muatan_nama: muatanNama,
      muatan_jenis: muatanJenis,
      muatan_deskripsi: muatanDeskripsi,
      dokumen_lampiran: dokumenFiles.map((f) => f.name),
      sj_pod_lampiran: sjPodFiles.map((f) => f.name),
      profile_timezone: profileTimezone,
    };

    try {
      const res = await fetch(API_BASE + "/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        alert(t("common.failed_save") + "\n" + msg);
        return;
      }
      alert(t("common.saved"));
      router.push("/orders");
    } catch (err) {
      console.error("[CreateOrder] submit error", err);
      alert(t("common.network_error"));
    }
  }

  function handleDiscard() {
    router.back();
  }

  const lokasiMuatDisabled = !kotaMuat;
  const lokasiBongkarDisabled = !kotaBongkar;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-4 p-4">
      <Card title={t("orders.create.title")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <Card title={t("orders.create.info_order")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("orders.no_jo")}>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    {noJO || "-"}
                  </div>
                </Field>
                <Field label={t("orders.customer")}>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    {customer || "-"}
                  </div>
                </Field>
                <Field label={t("orders.nama_penerima")}>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={namaPenerima}
                    onChange={(e) => setNamaPenerima(e.target.value)}
                  />
                </Field>
                <div ref={errors.kotaMuat ? firstErrorRef : undefined}>
                  <CityAutocomplete
                    label={t("orders.kota_muat")}
                    value={kotaMuat}
                    onChange={setKotaMuat}
                    required
                    error={errors.kotaMuat}
                  />
                </div>
                <div ref={errors.kotaBongkar ? firstErrorRef : undefined}>
                  <CityAutocomplete
                    label={t("orders.kota_bongkar")}
                    value={kotaBongkar}
                    onChange={setKotaBongkar}
                    required
                    error={errors.kotaBongkar}
                  />
                </div>
                <Field label={t("orders.jenis_order")} required>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={jenisOrder}
                    onChange={(e) =>
                      setJenisOrder(e.target.value as JenisOrder | "")
                    }
                  >
                    <option value="">{t("common.select")}</option>
                    <option value="FTL">FTL</option>
                    <option value="LTL">LTL</option>
                    <option value="Project">Project</option>
                    <option value="Express">Express</option>
                  </select>
                  {errors.jenisOrder ? (
                    <p className="text-xs text-red-600">{errors.jenisOrder}</p>
                  ) : null}
                </Field>
                <Field label={t("orders.armada")} required>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={armada}
                    onChange={(e) => setArmada(e.target.value)}
                  >
                    <option value="">{t("common.select")}</option>
                    <option value="CDE">CDE</option>
                    <option value="CDD">CDD</option>
                    <option value="Fuso">Fuso</option>
                    <option value="Trailer">Trailer</option>
                  </select>
                  {errors.armada ? (
                    <p className="text-xs text-red-600">{errors.armada}</p>
                  ) : null}
                </Field>
              </div>
            </Card>

            <Card title={t("orders.info_lokasi")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div ref={errors.tglMuat ? firstErrorRef : undefined}>
                  <Field label={t("orders.tgl_muat")} required>
                    <input
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={tglMuat}
                      onChange={(e) => setTglMuat(e.target.value)}
                    />
                    {errors.tglMuat ? (
                      <p className="text-xs text-red-600">{errors.tglMuat}</p>
                    ) : null}
                  </Field>
                </div>
                <div ref={errors.tglBongkar ? firstErrorRef : undefined}>
                  <Field label={t("orders.tgl_bongkar")} required>
                    <input
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={tglBongkar}
                      onChange={(e) => setTglBongkar(e.target.value)}
                    />
                    {errors.tglBongkar ? (
                      <p className="text-xs text-red-600">
                        {errors.tglBongkar}
                      </p>
                    ) : null}
                  </Field>
                </div>
              </div>
              <div className="mt-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={multiPickDrop}
                    onChange={(e) => setMultiPickDrop(e.target.checked)}
                  />
                  {t("orders.multi_pickdrop")}
                </label>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AddressAutocomplete
                  label={t("orders.lokasi_muat")}
                  cityId={kotaMuat?.id ?? null}
                  value={lokMuat}
                  onChange={setLokMuat}
                  disabled={lokasiMuatDisabled}
                />
                <AddressAutocomplete
                  label={t("orders.lokasi_bongkar")}
                  cityId={kotaBongkar?.id ?? null}
                  value={lokBongkar}
                  onChange={setLokBongkar}
                  disabled={lokasiBongkarDisabled}
                />
              </div>
            </Card>

            {/* Permintaan Layanan Khusus */}
            <Card title={t("orders.layanan_khusus")}>
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
                <Field label={t("orders.layanan_lainnya")}>
                  <textarea
                    className="min-h-[80px] w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={layananLainnya}
                    onChange={(e) => setLayananLainnya(e.target.value)}
                  />
                </Field>
              </div>
            </Card>
          </div>

          {/* ===== Right Column ===== */}
          <div className="space-y-4">
            {/* Informasi Muatan */}
            <Card title={t("orders.info_muatan")}>
              <div className="grid grid-cols-1 gap-4">
                <div ref={errors.muatanNama ? firstErrorRef : undefined}>
                  <Field label={t("orders.muatan_nama")} required>
                    <input
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={muatanNama}
                      onChange={(e) => setMuatanNama(e.target.value)}
                    />
                    {errors.muatanNama ? (
                      <p className="text-xs text-red-600">
                        {errors.muatanNama}
                      </p>
                    ) : null}
                  </Field>
                </div>
                <div ref={errors.muatanJenis ? firstErrorRef : undefined}>
                  <Field label={t("orders.muatan_jenis")} required>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={muatanJenis}
                      onChange={(e) => setMuatanJenis(e.target.value)}
                    >
                      <option value="">{t("common.select")}</option>
                      <option value="General">General</option>
                      <option value="Fragile">Fragile</option>
                      <option value="Liquid">Liquid</option>
                      <option value="Oversize">Oversize</option>
                    </select>
                    {errors.muatanJenis ? (
                      <p className="text-xs text-red-600">
                        {errors.muatanJenis}
                      </p>
                    ) : null}
                  </Field>
                </div>
                <div ref={errors.muatanDeskripsi ? firstErrorRef : undefined}>
                  <Field label={t("orders.muatan_deskripsi")} required>
                    <textarea
                      className="min-h-[80px] w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={muatanDeskripsi}
                      onChange={(e) => setMuatanDeskripsi(e.target.value)}
                    />
                    {errors.muatanDeskripsi ? (
                      <p className="text-xs text-red-600">
                        {errors.muatanDeskripsi}
                      </p>
                    ) : null}
                  </Field>
                </div>
                <Field label={t("orders.upload_dokumen")}>
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setDokumenFiles(Array.from(e.target.files ?? []))
                    }
                  />
                </Field>
              </div>
            </Card>

            {/* Detail Amount */}
            <Card title={t("orders.detail_amount")}>
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
            </Card>

            {/* Dokumen Pengiriman */}
            <Card title={t("orders.dok_pengiriman")}>
              <div className="grid grid-cols-1 gap-4">
                <Field label={t("orders.lampiran_dokumen")}>
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setDokumenFiles(Array.from(e.target.files ?? []))
                    }
                  />
                </Field>
                <div>
                  <button
                    type="button"
                    onClick={() => alert("TODO: implement upload")}
                    className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
                  >
                    {t("common.upload")}
                  </button>
                </div>
              </div>
            </Card>

            {/* Surat Jalan & POD */}
            <Card title={t("orders.sj_pod")}>
              <div className="grid grid-cols-1 gap-4">
                <Field label={t("orders.lampiran_sj_pod")}>
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setSjPodFiles(Array.from(e.target.files ?? []))
                    }
                  />
                </Field>
                <div>
                  <button
                    type="button"
                    onClick={() => alert("TODO: download attachment")}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {t("common.download")}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* Footer Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleDiscard}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          {t("common.discard")}
        </button>
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}
