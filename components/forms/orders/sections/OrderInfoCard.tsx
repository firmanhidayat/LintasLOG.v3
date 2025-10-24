"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import type { CityItem, OrderTypeItem, ModaItem } from "@/types/orders";
import { TmsProfile } from "@/types/tms-profile";
import LookupAutocomplete, {
  normalizeResults,
} from "@/components/form/LookupAutocomplete";
import { Field } from "@/components/form/FieldInput";

type DivRef =
  | React.RefObject<HTMLDivElement>
  | React.Ref<HTMLDivElement>
  | null;

type Props = {
  mode: "create" | "edit";
  noJO: string;
  customer: string;
  namaPenerima: string;
  setNamaPenerima: (v: string) => void;
  jenisOrder: OrderTypeItem | null;
  setJenisOrder: (v: OrderTypeItem | null) => void;
  armada: ModaItem | null;
  setArmada: (v: ModaItem | null) => void;
  kotaMuat: CityItem | null;
  onChangeKotaMuat: (c: CityItem | null) => void;
  kotaBongkar: CityItem | null;
  onChangeKotaBongkar: (c: CityItem | null) => void;
  errors: Record<string, string>;
  firstErrorKey?: string;
  firstErrorRef?: DivRef;
  profile: TmsProfile | null | undefined;
};

export default function OrderInfoCard({
  mode,
  noJO,
  customer,
  namaPenerima,
  setNamaPenerima,
  jenisOrder,
  setJenisOrder,
  armada,
  setArmada,
  kotaMuat,
  onChangeKotaMuat,
  kotaBongkar,
  onChangeKotaBongkar,
  errors,
  firstErrorKey,
  firstErrorRef,
  profile,
}: Props) {
  const refIf = (k: string) =>
    firstErrorKey === k
      ? (firstErrorRef as React.Ref<HTMLDivElement>)
      : undefined;

  // Isi otomatis customer saat create (tetap seperti sebelumnya)
  if (mode === "create") {
    customer = profile?.name || "";
  }

  // Ambil identifier untuk order_type_id dari Jenis Order (code -> id -> value -> slug)
  const orderTypeId = useMemo(() => {
    const src =
      (jenisOrder as unknown as Partial<
        Record<"id" | "code" | "value" | "slug", string | number>
      >) || {};
    const v = src.code ?? src.id ?? src.value ?? src.slug;
    return v ? String(v) : "";
  }, [jenisOrder]);

  // Build endpoint Armada dengan order_type_id di URL (biar LookupAutocomplete yang nambah page/page_size/query)
  const armadaEndpoint = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_TMS_OMODA_FORM_URL ?? "";
    try {
      const u = new URL(base);
      if (orderTypeId) {
        u.searchParams.set("order_type_id", orderTypeId);
      } else {
        // kalau belum ada jenis order, kosongkan param agar tidak men-trigger fetch yang tidak perlu
        u.searchParams.delete("order_type_id");
      }
      return {
        url: u.toString(),
        method: "GET" as const,
        queryParam: "query",
        pageParam: "page",
        pageSizeParam: "page_size",
        page: 1,
        pageSize: 80,
        mapResults: normalizeResults,
        onUnauthorized: () => {
          /* override kalau diperlukan */
        },
      };
    } catch {
      // fallback kalau base bukan absolute URL (harusnya absolute)
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

  // Jaga: kalau Jenis Order berubah (setelah initial mount), reset pilihan Armada agar tidak mismatch
  const prevOrderTypeId = useRef<string | null>(null);
  useEffect(() => {
    if (prevOrderTypeId.current === null) {
      // initial mount
      prevOrderTypeId.current = orderTypeId;
      return;
    }
    if (prevOrderTypeId.current !== orderTypeId) {
      setArmada(null);
      prevOrderTypeId.current = orderTypeId;
    }
  }, [orderTypeId, setArmada]);

  const armadaDisabled = !orderTypeId;

  return (
    <Card>
      <CardHeader>
        <h4 className="text-3xl font-semibold text-gray-800">
          {mode === "edit"
            ? t("orders.edit.info_order") ?? "Edit - Info Order"
            : t("orders.create.info_order")}
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

          <Field.Root value={customer || ""} onChange={() => {}} disabled>
            <Field.Label>{t("orders.customer")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full" />
            </Field.Control>
          </Field.Root>

          {/* Jenis Order */}
          <div ref={refIf("jenisOrder")}>
            <LookupAutocomplete
              label={t("orders.jenis_order")}
              placeholder={t("orders.search_order_type")}
              value={jenisOrder}
              onChange={setJenisOrder}
              error={errors.jenisOrder}
              endpoint={{
                url: process.env.NEXT_PUBLIC_TMS_OTYPE_FORM_URL ?? "",
                method: "GET",
                queryParam: "query",
                pageParam: "page",
                pageSizeParam: "page_size",
                page: 1,
                pageSize: 80,
                mapResults: normalizeResults,
              }}
              cacheNamespace="order-types"
              prefetchQuery=""
            />
          </div>

          {/* Armada (tergantung Jenis Order) */}
          <div ref={refIf("armada")}>
            <LookupAutocomplete
              label={t("orders.armada")}
              placeholder={
                armadaDisabled
                  ? t("orders.select_order_type_first") ??
                    "Pilih Jenis Order dulu"
                  : t("orders.search_moda")
              }
              value={armada}
              onChange={setArmada}
              error={errors.armada}
              endpoint={armadaEndpoint}
              cacheNamespace={`moda-types:${orderTypeId || "none"}`}
              prefetchQuery=""
              disabled={armadaDisabled}
            />
          </div>

          {/* Kota Muat */}
          <div ref={refIf("kotaMuat")}>
            <LookupAutocomplete
              label={t("orders.kota_muat")}
              placeholder={t("common.search_city")}
              value={kotaMuat}
              onChange={onChangeKotaMuat}
              error={errors.kotaMuat}
              endpoint={{
                url: process.env.NEXT_PUBLIC_TMS_LOCATIONS_CITIES_URL ?? "",
                method: "GET",
                queryParam: "query",
                pageParam: "page",
                pageSizeParam: "page_size",
                page: 1,
                pageSize: 80,
                mapResults: normalizeResults,
              }}
              cacheNamespace="kota-muat"
              prefetchQuery=""
            />
          </div>

          {/* Kota Bongkar */}
          <div ref={refIf("kotaBongkar")}>
            <LookupAutocomplete
              label={t("orders.kota_bongkar")}
              placeholder={t("common.search_city")}
              value={kotaBongkar}
              onChange={onChangeKotaBongkar}
              error={errors.kotaBongkar}
              endpoint={{
                url: process.env.NEXT_PUBLIC_TMS_LOCATIONS_CITIES_URL ?? "",
                method: "GET",
                queryParam: "query",
                pageParam: "page",
                pageSizeParam: "page_size",
                page: 1,
                pageSize: 80,
                mapResults: normalizeResults,
              }}
              cacheNamespace="kota-bongkar"
              prefetchQuery=""
            />
          </div>

          {/* Nama Penerima */}
          <Field.Root
            error={errors.namaPenerima}
            touched={Boolean(errors.namaPenerima)}
            value={namaPenerima || ""}
            onChange={setNamaPenerima}
          >
            <Field.Label>{t("orders.nama_penerima")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full" />
              <Field.Error />
            </Field.Control>
          </Field.Root>
        </div>
      </CardBody>
    </Card>
  );
}
