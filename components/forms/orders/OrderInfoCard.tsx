import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { FieldText } from "@/components/form/FieldText";
import CityAutocomplete from "@/components/forms/orders/CityAutocomplete";
import type { CityItem, OrderTypeItem, ModaItem } from "@/types/orders";
import OrderTypeAutocomplete from "@/components/forms/orders/OrderTypeAutocomplete";
import ModaAutocomplete from "./ModaAutoComplete";

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

  jenisOrder: OrderTypeItem | "";
  setJenisOrder: (v: OrderTypeItem | "") => void;

  armada: ModaItem | "";
  setArmada: (v: ModaItem | "") => void;

  kotaMuat: CityItem | null;
  onChangeKotaMuat: (c: CityItem | null) => void;
  kotaBongkar: CityItem | null;
  onChangeKotaBongkar: (c: CityItem | null) => void;

  errors: Record<string, string>;
  firstErrorKey?: string;
  firstErrorRef?: DivRef;
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
}: Props) {
  const refIf = (k: string) =>
    firstErrorKey === k
      ? (firstErrorRef as React.Ref<HTMLDivElement>)
      : undefined;

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

          <div ref={refIf("jenisOrder")}>
            {/* <FieldSelect
              label={t("orders.jenis_order")}
              value={jenisOrder as string}
              onChange={(val) => setJenisOrder((val || "") as JenisOrder | "")}
              error={errors.jenisOrder}
              touched={Boolean(errors.jenisOrder)}
              placeholderOption={t("common.select")}
              options={[
                { value: "FTL", label: "FTL" },
                { value: "LTL", label: "LTL" },
                { value: "Project", label: "Project" },
                { value: "Express", label: "Express" },
              ]}
            /> */}
            <OrderTypeAutocomplete
              label={t("orders.jenis_order")}
              value={jenisOrder === "" ? null : jenisOrder}
              onChange={(v) => {
                setJenisOrder(v as OrderTypeItem);
              }}
            />
          </div>

          <div ref={refIf("kotaMuat")}>
            <CityAutocomplete
              label={t("orders.kota_muat")}
              value={kotaMuat}
              onChange={onChangeKotaMuat}
              error={errors.kotaMuat}
            />
          </div>

          <div ref={refIf("kotaBongkar")}>
            <CityAutocomplete
              label={t("orders.kota_bongkar")}
              value={kotaBongkar}
              onChange={onChangeKotaBongkar}
              error={errors.kotaBongkar}
            />
          </div>

          <div ref={refIf("armada")}>
            {/* <FieldSelect
              label={t("orders.armada")}
              value={armada === "" ? null : armada}
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
            /> */}
            <ModaAutocomplete
              label={t("orders.armada")}
              value={armada === "" ? null : armada}
              onChange={(v) => {
                setArmada(v as ModaItem);
              }}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
