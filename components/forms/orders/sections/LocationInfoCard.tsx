import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";
import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
import type { AddressItem, CityItem } from "@/types/orders";
import MultiPickupDropSection from "../MultiPickupDropSection";
import type { ExtraStop } from "./ExtraStopCard";
import { cn } from "@/lib/cn";
import { AddressSidePanel } from "@/components/ui/AddressSidePanel";
import { fmtDate } from "@/lib/helpers";
import { Field } from "@/components/form/FieldInput";

type DivRef =
  | React.RefObject<HTMLDivElement>
  | React.Ref<HTMLDivElement>
  | null;

type Props = {
  isReadOnly: boolean;
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

  originAddressName: string;
  originStreet: string;
  originStreet2: string;
  originDistrictName: string;
  originZipCode: string;
  originLatitude: string;
  originLongitude: string;

  destAddressName: string;
  destStreet: string;
  destStreet2: string;
  destDistrictName: string;
  destZipCode: string;
  destLatitude: string;
  destLongitude: string;

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
  isReadOnly,
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
  originAddressName,
  originStreet,
  originStreet2,
  originDistrictName,
  originZipCode,
  originLatitude,
  originLongitude,
  destAddressName,
  destStreet,
  destStreet2,
  destDistrictName,
  destZipCode,
  destLatitude,
  destLongitude,
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

  const origin = {
    name: originAddressName,
    street1: originStreet,
    street2: originStreet2,
    districtLine: originDistrictName,
    province: "",
    postCode: originZipCode,
    mobile: "-",
    email: "-",
    lat: originLatitude,
    lng: originLongitude,
    picName: picMuatNama,
    picPhone: picMuatTelepon,
    timeLabel: "ETD",
    timeValue: fmtDate(tglMuat),
  };

  const destination = {
    name: destAddressName,
    street1: destStreet,
    street2: destStreet2,
    districtLine: destDistrictName,
    province: "",
    postCode: destZipCode,
    mobile: "-",
    email: "-",
    lat: destLatitude,
    lng: destLongitude,
    picName: picBongkarNama,
    picPhone: picBongkarTelepon,
    timeLabel: "ETA",
    timeValue: fmtDate(tglBongkar),
  };
  return (
    <Card>
      <CardHeader>
        <h3 className="text-3xl font-semibold text-gray-800">
          {t("orders.info_lokasi")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kolom 1 - Editable */}
          <div className={cn("space-y-4", isReadOnly && "hidden")}>
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

            <Field.Root value={picMuatNama} onChange={setPicMuatNama}>
              <Field.Label>{t("orders.pic_muat_name")}</Field.Label>
              <Field.Input></Field.Input>
              <Field.Error></Field.Error>
            </Field.Root>
            <Field.Root
              type="tel"
              value={picMuatTelepon}
              onChange={setPicMuatTelepon}
              placeholder={t("placeholders.phone")}
            >
              <Field.Label>{t("orders.pic_muat_phone")}</Field.Label>
              <Field.Input></Field.Input>
              <Field.Error></Field.Error>
            </Field.Root>
          </div>
          {/* Kolom 2 - Editable */}
          <div className={cn("space-y-4", isReadOnly && "hidden")}>
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

            <Field.Root value={picBongkarNama} onChange={setPicBongkarNama}>
              <Field.Label>{t("orders.pic_bongkar_name")}</Field.Label>
              <Field.Input></Field.Input>
              <Field.Error></Field.Error>
            </Field.Root>
            <Field.Root
              type="tel"
              value={picBongkarTelepon}
              onChange={setPicBongkarTelepon}
              placeholder={t("placeholders.phone")}
            >
              <Field.Label>{t("orders.pic_bongkar_phone")}</Field.Label>
              <Field.Input></Field.Input>
              <Field.Error></Field.Error>
            </Field.Root>
          </div>

          {/** Readonly Information origin _address _name*/}
          <div className={cn("space-y-4", !isReadOnly && "hidden")}>
            <AddressSidePanel
              title="Origin Address"
              labelPrefix="Origin"
              info={origin}
            />
          </div>
          {/** Readonly Information destination _address _name*/}
          <div className={cn("space-y-4", !isReadOnly && "hidden")}>
            <AddressSidePanel
              title="Destination Address"
              labelPrefix="Destination"
              info={destination}
            />
          </div>
        </div>

        {/* ==== Multi Pickup/Drop (dipisah ke komponen) ==== */}
        <MultiPickupDropSection
          isReadOnly={isReadOnly}
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
