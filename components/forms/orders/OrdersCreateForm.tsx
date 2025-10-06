"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { tzDateToUtcISO } from "@/lib/tz";
import { useAuth } from "@/components/providers/AuthProvider";
import type {
  IdName,
  AddressItem,
  JenisOrder,
  CreateOrderPayload,
} from "@/types/orders";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function OrdersCreateForm() {
  const router = useRouter();
  const { profile } = useAuth();

  // i18n
  const { ready: i18nReady } = useI18nReady();
  const [activeLang, setActiveLang] = useState<Lang>(getLang());
  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);

  const profileTimezone = profile?.tz || "Asia/Jakarta";

  const [noJO] = useState<string>("");
  const [customer] = useState<string>("");
  const [namaPenerima, setNamaPenerima] = useState<string>("");
  const [kotaMuat, setKotaMuat] = useState<IdName | null>(null);
  const [kotaBongkar, setKotaBongkar] = useState<IdName | null>(null);
  const [jenisOrder, setJenisOrder] = useState<JenisOrder | "">("");
  const [armada, setArmada] = useState<string>("");

  const [tglMuat, setTglMuat] = useState<string>("");
  const [tglBongkar, setTglBongkar] = useState<string>("");
  const [multiPickDrop, setMultiPickDrop] = useState<boolean>(false);
  const [lokMuat, setLokMuat] = useState<AddressItem | null>(null);
  const [lokBongkar, setLokBongkar] = useState<AddressItem | null>(null);

  // Reset dependent address ketika city berubah
  useEffect(() => {
    setLokMuat(null);
  }, [kotaMuat?.id]);
  useEffect(() => {
    setLokBongkar(null);
  }, [kotaBongkar?.id]);

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

  const errorOrder = [
    "kotaMuat",
    "kotaBongkar",
    "jenisOrder",
    "armada",
    "tglMuat",
    "tglBongkar",
    "muatanNama",
    "muatanJenis",
    "muatanDeskripsi",
  ] as const;
  const firstErrorKey = useMemo(
    () => errorOrder.find((k) => errors[k]),
    [errors]
  );

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

    if (tglMuat && tglBongkar) {
      const d1 = new Date(tzDateToUtcISO(tglMuat, profileTimezone)).getTime();
      const d2 = new Date(
        tzDateToUtcISO(tglBongkar, profileTimezone)
      ).getTime();
      if (d2 < d1) {
        e.tglBongkar = t("form.must_after_or_equal_pickup");
      }
    }

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
      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!res.ok) {
        const msg = await res.text();
        alert(t("common.failed_save") + " " + msg);
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

  if (!i18nReady) {
    return (
      <div className="p-4 text-sm text-gray-600">{t("common.loading")}…</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-auto space-y-2 p-2">
      <Card className="border-0!">
        <CardHeader className="border-0!">
          <h3 className="text-lg font-semibold text-gray-800">
            {t("orders.create.title")}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* ===== Left Column ===== */}
            <div className="space-y-4">
              {/* Info Order */}
              <Card>
                <CardHeader>
                  <h3 className="text-3xl font-semibold text-gray-800">
                    {t("orders.create.info_order")}
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
                        firstErrorKey === "kotaMuat" ? firstErrorRef : undefined
                      }
                    >
                      <CityAutocomplete
                        label={t("orders.kota_muat")}
                        value={kotaMuat}
                        onChange={setKotaMuat}
                        required
                        error={errors.kotaMuat}
                      />
                    </div>

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
                        onChange={setKotaBongkar}
                        required
                        error={errors.kotaBongkar}
                      />
                    </div>

                    <div
                      ref={
                        firstErrorKey === "jenisOrder"
                          ? firstErrorRef
                          : undefined
                      }
                    >
                      <FieldSelect
                        label={t("orders.jenis_order")}
                        required
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

                    <div
                      ref={
                        firstErrorKey === "armada" ? firstErrorRef : undefined
                      }
                    >
                      <FieldSelect
                        label={t("orders.armada")}
                        required
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div
                      ref={
                        firstErrorKey === "tglMuat" ? firstErrorRef : undefined
                      }
                    >
                      <FieldText
                        label={t("orders.tgl_muat")}
                        required
                        type="date"
                        value={tglMuat}
                        onChange={setTglMuat}
                        error={errors.tglMuat}
                        touched={Boolean(errors.tglMuat)}
                      />
                    </div>
                    <div
                      ref={
                        firstErrorKey === "tglBongkar"
                          ? firstErrorRef
                          : undefined
                      }
                    >
                      <FieldText
                        label={t("orders.tgl_bongkar")}
                        required
                        type="date"
                        value={tglBongkar}
                        onChange={setTglBongkar}
                        error={errors.tglBongkar}
                        touched={Boolean(errors.tglBongkar)}
                      />
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
                        required
                        value={muatanNama}
                        onChange={setMuatanNama}
                        error={errors.muatanNama}
                        touched={Boolean(errors.muatanNama)}
                      />
                    </div>

                    <div
                      ref={
                        firstErrorKey === "muatanJenis"
                          ? firstErrorRef
                          : undefined
                      }
                    >
                      <FieldSelect
                        label={t("orders.muatan_jenis")}
                        required
                        value={muatanJenis}
                        onChange={setMuatanJenis}
                        error={errors.muatanJenis}
                        touched={Boolean(errors.muatanJenis)}
                        placeholderOption={t("common.select")}
                        options={[
                          { value: "General", label: "General" },
                          { value: "Fragile", label: "Fragile" },
                          { value: "Liquid", label: "Liquid" },
                          { value: "Oversize", label: "Oversize" },
                        ]}
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
                        required
                        value={muatanDeskripsi}
                        error={errors.muatanDeskripsi}
                        onChange={setMuatanDeskripsi}
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("orders.upload_dokumen")}
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) =>
                          setDokumenFiles(Array.from(e.target.files ?? []))
                        }
                        className="mt-1 w-full text-sm"
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
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("orders.lampiran_dokumen")}
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) =>
                          setDokumenFiles(Array.from(e.target.files ?? []))
                        }
                        className="mt-1 w-full text-sm"
                      />
                    </div>
                    <div>
                      <Button
                        type="button"
                        onClick={() => alert("TODO: implement upload")}
                        variant="primary"
                        size="sm"
                      >
                        {t("common.upload")}
                      </Button>
                    </div>
                  </div>
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
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t("orders.lampiran_sj_pod")}
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) =>
                          setSjPodFiles(Array.from(e.target.files ?? []))
                        }
                        className="mt-1 w-full text-sm"
                      />
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => alert("TODO: download attachment")}
                      >
                        {t("common.download")}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={handleDiscard}>
          {t("common.discard")}
        </Button>
        <Button type="submit" variant="primary">
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
