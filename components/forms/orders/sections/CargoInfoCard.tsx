"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/form/FieldInput";
import LookupAutocomplete, {
  normalizeResults,
} from "@/components/form/LookupAutocomplete";
import { RecordItem } from "@/types/recorditem";
import type { OrderTypeItem } from "@/types/orders";

const CARGO_TYPE_URL = process.env.NEXT_PUBLIC_TMS_CARGO_TYPE_URL!;

type DivRef =
  | React.RefObject<HTMLDivElement>
  | React.Ref<HTMLDivElement>
  | null;

type Props = {
  jenisOrder: OrderTypeItem | null;

  muatanNama: string;
  setMuatanNama: (v: string) => void;
  muatanDeskripsi: string;
  setMuatanDeskripsi: (v: string) => void;

  jenisMuatan: RecordItem | null;
  setJenisMuatan: (v: RecordItem | null) => void;

  cargoCBM: string;
  setCargoCBM: (v: string) => void;

  jumlahMuatan: string;
  setJumlahMuatan: (v: string) => void;

  errors: Record<string, string>;
  firstErrorKey?: string;
  firstErrorRef?: DivRef;
};

// /** keep only digits, 1 dot/comma, max 2 decimals */
// function sanitizeDecimal2(input: string): string {
//   const cleaned = input.replace(",", ".").replace(/[^\d.]/g, "");
//   const [i = "", ...rest] = cleaned.split(".");
//   const dec = rest.join("").slice(0, 2);
//   return dec ? `${i}.${dec}` : i;
// }
/** keep only digits, allow 1 comma/dot, max 2 decimals */
function keepDecimal2(s: string) {
  const x = s.replace(/[^\d.,]/g, "");
  const iComma = x.indexOf(",");
  const iDot = x.indexOf(".");
  const i = [iComma, iDot].filter((v) => v >= 0).sort((a, b) => a - b)[0] ?? -1;
  if (i < 0) return x.replace(/[^\d]/g, ""); // hanya angka kalau belum ada pemisah
  const sep = x[i];
  const head = x.slice(0, i).replace(/[^\d]/g, ""); // integer
  const tail = x
    .slice(i + 1)
    .replace(/[^\d]/g, "")
    .slice(0, 2); // 2 desimal
  return tail ? `${head}${sep}${tail}` : `${head}${sep}`;
}

export default function CargoInfoCard({
  jenisOrder,
  muatanNama,
  setMuatanNama,
  muatanDeskripsi,
  setMuatanDeskripsi,
  jenisMuatan,
  setJenisMuatan,
  cargoCBM,
  setCargoCBM,
  setJumlahMuatan,
  jumlahMuatan,

  errors,
  firstErrorKey,
  firstErrorRef,
}: Props) {
  const refIf = (k: string) =>
    firstErrorKey === k
      ? (firstErrorRef as React.Ref<HTMLDivElement>)
      : undefined;

  // local-only state for "Jumlah Muatan" (tidak mengubah parent API)
  // const [jumlahMuatan, setJumlahMuatan] = useState<string>("");

  const orderTypeId = useMemo(() => {
    const src =
      (jenisOrder as unknown as Partial<
        Record<"id" | "code" | "value" | "slug", string | number>
      >) || {};
    const v = src.code ?? src.id ?? src.value ?? src.slug;
    return v ? String(v) : "";
  }, [jenisOrder]);

  const cargoEndpoint = useMemo(() => {
    const base = CARGO_TYPE_URL ?? "";
    try {
      const u = new URL(base);
      if (orderTypeId) u.searchParams.set("order_type_id", orderTypeId);
      else u.searchParams.delete("order_type_id");
      return {
        url: u.toString(),
        method: "GET" as const,
        queryParam: "query",
        pageParam: "page",
        pageSizeParam: "page_size",
        page: 1,
        pageSize: 80,
        mapResults: normalizeResults,
        onUnauthorized: () => {},
      };
    } catch {
      const withParam = orderTypeId
        ? `${base}?order_type_id=${encodeURIComponent(orderTypeId)}`
        : base;
      return {
        url: withParam,
        method: "GET" as const,
        queryParam: "query",
        pageParam: "page",
        pageSizeParam: "page_size",
        page: 1,
        pageSize: 80,
        mapResults: normalizeResults,
        onUnauthorized: () => {},
      };
    }
  }, [orderTypeId]);

  const prevOrderTypeId = useRef<string | null>(null);
  useEffect(() => {
    if (prevOrderTypeId.current === null) {
      prevOrderTypeId.current = orderTypeId;
      return;
    }
    if (prevOrderTypeId.current !== orderTypeId) {
      setJenisMuatan(null);
      prevOrderTypeId.current = orderTypeId;
    }
  }, [orderTypeId, setJenisMuatan]);
  const cargoDisabled = !orderTypeId;

  return (
    <Card>
      <CardHeader>
        <h4 className="text-3xl font-semibold text-gray-800">
          {t("orders.info_muatan")}
        </h4>
      </CardHeader>
      <CardBody>
        {/* Grid utama: 2 kolom */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kiri: Cargo Name */}
          <div>
            <div ref={refIf("muatanNama")}>
              <Field.Root
                value={muatanNama}
                onChange={setMuatanNama}
                // error={errors.muatanNama}
                touched={Boolean(errors.muatanNama)}
                className="flex-auto"
              >
                <Field.Label>{t("orders.muatan_nama")}</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full" />
                  <Field.Error />
                </Field.Control>
              </Field.Root>
            </div>
          </div>

          {/* Kanan: Dimensi CBM */}
          <div>
            <Field.Root
              value={cargoCBM}
              onChange={setCargoCBM}
              error={errors.cargoCBM}
              touched={Boolean(errors.cargoCBM)}
              className="flex-auto"
            >
              <Field.Label>Dimensi CBM</Field.Label>
              <Field.Control>
                <Field.Input className="w-full" />
                <Field.Error />
              </Field.Control>
            </Field.Root>
          </div>

          {/* BARIS KHUSUS (span 2 kolom): Cargo Type + Jumlah Muatan */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr),160px]">
              {/* Cargo Type */}
              <div ref={refIf("jenisMuatan")}>
                <LookupAutocomplete
                  label={t("orders.jenis_cargo")}
                  placeholder={
                    cargoDisabled
                      ? t("orders.select_order_type_first") ??
                        "Pilih Jenis Order dulu"
                      : t("orders.search_cargo_type")
                  }
                  value={jenisMuatan}
                  onChange={setJenisMuatan}
                  error={errors.jenisMuatan}
                  endpoint={cargoEndpoint}
                  cacheNamespace={`cargo-types:${orderTypeId || "none"}`}
                  prefetchQuery=""
                  disabled={cargoDisabled}
                />
              </div>

              {/* Jumlah Muatan (desimal 2 digit) */}
              <div>
                <Field.Root
                  value={jumlahMuatan}
                  onChange={(v) => setJumlahMuatan(keepDecimal2(v))}
                  error={errors.jumlahMuatan}
                  touched={Boolean(errors.jumlahMuatan)}
                  className="flex-auto"
                >
                  <Field.Label>Jumlah Muatan</Field.Label>
                  <Field.Control>
                    <Field.Input
                      className="w-full"
                      inputMode="decimal"
                      placeholder="0,00"
                      pattern="^\d*(?:[.,]\d{0,2})?$"
                    />
                    <Field.Suffix>Kg</Field.Suffix>
                    <Field.Error />
                  </Field.Control>
                </Field.Root>
              </div>
            </div>
          </div>
        </div>

        {/* Deskripsi */}
        <div className="grid grid-cols-1 gap-4">
          <div ref={refIf("muatanDeskripsi")}>
            <Field.Root
              type="text"
              value={muatanDeskripsi}
              onChange={setMuatanDeskripsi}
              // error={errors.muatanDeskripsi}
              touched={Boolean(errors.muatanDeskripsi)}
              rows={4}
            >
              <Field.Label>{t("orders.muatan_deskripsi")}</Field.Label>
              <Field.Control>
                <Field.Textarea className="w-full" />
                <Field.Error />
              </Field.Control>
            </Field.Root>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
