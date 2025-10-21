import React from "react";
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

  if (mode === "create") {
    customer = profile?.name || "";
  }
  return (
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
          <Field.Root value={noJO || ""} onChange={() => {}} disabled>
            <Field.Label>{t("orders.no_jo")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full"></Field.Input>
            </Field.Control>
          </Field.Root>
          <Field.Root value={customer || ""} onChange={() => {}} disabled>
            <Field.Label>{t("orders.customer")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full"></Field.Input>
            </Field.Control>
          </Field.Root>
          <Field.Root value={namaPenerima || ""} onChange={setNamaPenerima}>
            <Field.Label>{t("orders.nama_penerima")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full"></Field.Input>
              <Field.Error></Field.Error>
            </Field.Control>
          </Field.Root>

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
                // onUnauthorized: () => {
                //   /* return true jika mau override goSignIn */
                // },
              }}
              cacheNamespace="order-types"
              prefetchQuery=""
            />
          </div>

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
                // onUnauthorized: () => {
                //   /* return true jika mau override goSignIn */
                // },
              }}
              cacheNamespace="kota-muat"
              prefetchQuery=""
            />
          </div>

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
                // onUnauthorized: () => {
                //   /* return true jika mau override goSignIn */
                // },
              }}
              cacheNamespace="kota-bongkar"
              prefetchQuery=""
            />
          </div>

          <div ref={refIf("armada")}>
            <LookupAutocomplete
              label={t("orders.armada")}
              placeholder={t("orders.search_moda")}
              value={armada}
              onChange={setArmada}
              error={errors.armada}
              endpoint={{
                url: process.env.NEXT_PUBLIC_TMS_OMODA_FORM_URL ?? "",
                method: "GET",
                queryParam: "query",
                pageParam: "page",
                pageSizeParam: "page_size",
                page: 1,
                pageSize: 80,
                // headers: { Authorization: `Bearer ${token}` }, // jika perlu
                mapResults: normalizeResults, // default juga sudah ini
                onUnauthorized: () => {
                  /* return true jika mau override goSignIn */
                },
              }}
              cacheNamespace="moda-types"
              prefetchQuery=""
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
