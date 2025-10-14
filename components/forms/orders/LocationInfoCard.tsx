import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";
import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
import { FieldText } from "@/components/form/FieldText";
import type { AddressItem, CityItem } from "@/types/orders";
import MultiPickupDropSection from "./MultiPickupDropSection";
import type { ExtraStop } from "./ExtraStopCard";
import FieldPhone from "@/components/form/FieldPhone";

type DivRef =
  | React.RefObject<HTMLDivElement>
  | React.Ref<HTMLDivElement>
  | null;

type Props = {
  tglMuat: string;
  setTglMuat: (v: string) => void;
  tglBongkar: string;
  setTglBongkar: (v: string) => void;

  kotaMuat: CityItem | null;
  kotaBongkar: CityItem | null;
  lokMuat: AddressItem | null;
  setLokMuat: (a: AddressItem | null) => void;
  lokBongkar: AddressItem | null;
  setLokBongkar: (a: AddressItem | null) => void;

  picMuatNama: string;
  setPicMuatNama: (v: string) => void;
  picMuatTelepon: string;
  setPicMuatTelepon: (v: string) => void;
  picBongkarNama: string;
  setPicBongkarNama: (v: string) => void;
  picBongkarTelepon: string;
  setPicBongkarTelepon: (v: string) => void;

  multiPickupDrop: boolean;
  setMultiPickupDrop: (v: boolean) => void;
  extraStops: ExtraStop[];
  setExtraStops: (fn: (prev: ExtraStop[]) => ExtraStop[]) => void;

  errors: Record<string, string>;
  firstErrorKey?: string;
  firstErrorRef?: DivRef;
  extraRefs?: React.RefObject<HTMLDivElement[]>; // ⬅️ sebelumnya MutableRefObject
};

export default function LocationInfoCard({
  tglMuat,
  setTglMuat,
  tglBongkar,
  setTglBongkar,
  kotaMuat,
  kotaBongkar,
  lokMuat,
  setLokMuat,
  lokBongkar,
  setLokBongkar,
  picMuatNama,
  setPicMuatNama,
  picMuatTelepon,
  setPicMuatTelepon,
  picBongkarNama,
  setPicBongkarNama,
  picBongkarTelepon,
  setPicBongkarTelepon,
  multiPickupDrop,
  setMultiPickupDrop,
  extraStops,
  setExtraStops,
  errors,
  firstErrorKey,
  firstErrorRef,
  extraRefs,
}: Props) {
  const lokasiMuatDisabled = !kotaMuat;
  const lokasiBongkarDisabled = !kotaBongkar;
  const refIf = (k: string) =>
    firstErrorKey === k
      ? (firstErrorRef as React.Ref<HTMLDivElement>)
      : undefined;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-3xl font-semibold text-gray-800">
          {t("orders.info_lokasi")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kolom 1 */}
          <div className="space-y-4">
            <div ref={refIf("tglMuat")}>
              <DateTimePickerTW
                label={t("orders.tgl_muat")}
                value={tglMuat}
                onChange={setTglMuat}
                error={errors.tglMuat}
                touched={Boolean(errors.tglMuat)}
                displayFormat="DD-MM-YYYY"
              />
            </div>

            <div ref={refIf("lokMuat")}>
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

            <FieldText
              label={t("orders.pic_muat_name") ?? "PIC Muat - Nama"}
              value={picMuatNama}
              onChange={setPicMuatNama}
            />
            {/* <FieldText
              label={t("orders.pic_muat_phone") ?? "PIC Muat - Telepon"}
              value={picMuatTelepon}
              onChange={setPicMuatTelepon}
              inputMode="tel"
              pattern={ID_PHONE_PATTERN}
            /> */}
            <FieldPhone
              label={t("orders.pic_muat_phone") ?? "PIC Muat - Telepon"}
              value={picMuatTelepon}
              onChange={setPicMuatTelepon}
              kind="mobile"
              placeholder={t("placeholders.phone") ?? "08xx atau +628xx"}
            />
          </div>

          {/* Kolom 2 */}
          <div className="space-y-4">
            <div ref={refIf("tglBongkar")}>
              <DateTimePickerTW
                label={t("orders.tgl_bongkar")}
                value={tglBongkar}
                onChange={setTglBongkar}
                error={errors.tglBongkar}
                touched={Boolean(errors.tglBongkar)}
                displayFormat="DD-MM-YYYY"
              />
            </div>

            <div ref={refIf("lokBongkar")}>
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

            <FieldText
              label={t("orders.pic_bongkar_name") ?? "PIC Bongkar - Nama"}
              value={picBongkarNama}
              onChange={setPicBongkarNama}
            />
            {/* <FieldText
              label={t("orders.pic_bongkar_phone") ?? "PIC Bongkar - Telepon"}
              value={picBongkarTelepon}
              onChange={setPicBongkarTelepon}
              inputMode="tel"
              pattern={ID_PHONE_PATTERN}
            /> */}
            <FieldPhone
              label={t("orders.pic_bongkar_phone") ?? "PIC Bongkar - Telepon"}
              value={picBongkarTelepon}
              onChange={setPicBongkarTelepon}
              kind="mobile"
              placeholder={t("placeholders.phone") ?? "08xx atau +628xx"}
            />
          </div>
        </div>

        {/* ==== Multi Pickup/Drop (dipisah ke komponen) ==== */}
        <MultiPickupDropSection
          multiPickupDrop={multiPickupDrop}
          setMultiPickupDrop={setMultiPickupDrop}
          extraStops={extraStops}
          setExtraStops={setExtraStops}
          errors={errors}
          extraRefs={extraRefs}
          cityIdMuat={kotaMuat?.id ?? null}
          cityIdBongkar={kotaBongkar?.id ?? null}
          lokasiMuatDisabled={!!lokasiMuatDisabled}
          lokasiBongkarDisabled={!!lokasiBongkarDisabled}
        />
      </CardBody>
    </Card>
  );
}
