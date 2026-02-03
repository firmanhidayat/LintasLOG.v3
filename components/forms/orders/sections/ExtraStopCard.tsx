import React from "react";
import { t } from "@/lib/i18n";
import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
import { FieldText } from "@/components/form/FieldText";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";
import type { AddressItem } from "@/types/orders";
import FieldPhone from "@/components/form/FieldPhone";
import { cn } from "@/lib/cn";
import { AddressSidePanel } from "@/components/ui/AddressSidePanel";
import { fmtDate } from "@/lib/helpers";

export type ExtraStop = {
  id?: number;
  lokMuat: AddressItem | null;
  lokBongkar: AddressItem | null;
  originPicName: string;
  originPicPhone: string;
  destPicName: string;
  destPicPhone: string;

  tglETDMuat: string; // "YYYY-MM-DDTHH:mm" (local)
  tglETABongkar: string; // "YYYY-MM-DDTHH:mm" (local)

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
  delivery_note_uri: string;
};

type Props = {
  id?: number;
  isReadOnly: boolean;
  idx: number;
  stop: ExtraStop;
  onChange: (patch: Partial<ExtraStop>) => void;
  error?: string;
  cityIdMuat: number | null;
  cityIdBongkar: number | null;
  lokasiMuatDisabled: boolean;
  lokasiBongkarDisabled: boolean;
  tglETDMuat: string;
  setTglETDMuat: (v: string) => void;
  tglETABongkar: string;
  setTglETABongkar: (v: string) => void;
};

const ExtraStopCard = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      isReadOnly,
      idx,
      stop,
      onChange,
      error,
      cityIdMuat,
      cityIdBongkar,
      lokasiMuatDisabled,
      lokasiBongkarDisabled,
      tglETDMuat,
      setTglETDMuat,
      tglETABongkar,
      setTglETABongkar,
    },
    ref
  ) => {
    const origin = {
      name: stop.originAddressName,
      street1: stop.originStreet,
      street2: stop.originStreet2,
      districtLine: stop.originDistrictName,
      province: "",
      postcode: stop.originZipCode,
      mobile: "-",
      email: "-",
      lat: stop.originLatitude,
      lng: stop.originLongitude,
      picName: stop.originPicName,
      picPhone: stop.originPicPhone,
      timeLabel: "ETD",
      timeValue: fmtDate(stop.tglETDMuat),
    };

    const destination = {
      name: stop.destAddressName,
      street1: stop.destStreet,
      street2: stop.destStreet2,
      districtLine: stop.destDistrictName,
      province: "",
      postcode: stop.destZipCode,
      mobile: "-",
      email: "-",
      lat: stop.destLatitude,
      lng: stop.destLongitude,
      picName: stop.destPicName,
      picPhone: stop.destPicPhone,
      timeLabel: "ETA",
      timeValue: fmtDate(stop.tglETABongkar),
      delivery_note_uri: stop.delivery_note_uri,
    };

    return (
      <div>
        <div
          ref={ref}
          className={cn(
            !isReadOnly && "hidden",
            "grid grid-cols-1 gap-8 lg:grid-cols-2"
          )}
        >
          <AddressSidePanel
            title="Origin Address"
            labelPrefix="Origin"
            info={origin}
            
          />
          <AddressSidePanel
            title="Destination Address"
            labelPrefix="Destination"
            info={destination}
          />
        </div>

        <div
          ref={ref}
          className={cn(
            "rounded-xl border border-gray-200 p-3 ",
            isReadOnly && "hidden"
          )}
        >
          <div className="mb-2 text-sm font-semibold">
            {t("orders.set_ke") ?? "Set ke"} {idx + 1}
          </div>

          {error && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/** Kolom 1 */}
            <div className="space-y-4">
              <DateTimePickerTW
                label={(t("orders.tgl_muat") ?? "Tgl Muat") + ` (${idx + 1})`}
                value={tglETDMuat}
                onChange={setTglETDMuat}
                displayFormat="DD-MM-YYYY"
              />
              <AddressAutocomplete
                label={
                  (t("orders.lokasi_muat") ?? "Lokasi Muat") + ` (${idx + 1})`
                }
                cityId={cityIdMuat}
                value={stop.lokMuat}
                onChange={(v) => onChange({ lokMuat: v })}
                disabled={!!lokasiMuatDisabled}
              />
              <FieldText
                label={
                  (t("orders.pic_muat_name") ?? "PIC Muat - Nama") +
                  ` (${idx + 1})`
                }
                value={stop.originPicName}
                onChange={(v) => onChange({ originPicName: v })}
              />
              <FieldPhone
                label={
                  (t("orders.pic_muat_phone") ?? "PIC Muat - Telepon") +
                  ` (${idx + 1})`
                }
                value={stop.originPicPhone}
                onChange={(v) => onChange({ originPicPhone: v })}
                kind="mobile"
                placeholder={t("placeholders.phone") ?? "08xx atau +628xx"}
              />
            </div>

            {/** Kolom 2 */}
            <div className="space-y-4">
              <DateTimePickerTW
                label={
                  (t("orders.tgl_bongkar") ?? "Tgl Bongkar") + ` (${idx + 1})`
                }
                value={tglETABongkar}
                onChange={setTglETABongkar}
                displayFormat="DD-MM-YYYY"
              />
              <AddressAutocomplete
                label={
                  (t("orders.lokasi_bongkar") ?? "Lokasi Bongkar") +
                  ` (${idx + 1})`
                }
                cityId={cityIdBongkar}
                value={stop.lokBongkar}
                onChange={(v) => onChange({ lokBongkar: v })}
                disabled={!!lokasiBongkarDisabled}
              />
              <FieldText
                label={
                  (t("orders.pic_bongkar_name") ?? "PIC Bongkar - Nama") +
                  ` (${idx + 1})`
                }
                value={stop.destPicName}
                onChange={(v) => onChange({ destPicName: v })}
              />
              <FieldPhone
                label={
                  (t("orders.pic_bongkar_phone") ?? "PIC Bongkar - Telepon") +
                  ` (${idx + 1})`
                }
                value={stop.destPicPhone}
                onChange={(v) => onChange({ destPicPhone: v })}
                kind="mobile"
                placeholder={t("placeholders.phone") ?? "08xx atau +628xx"}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ExtraStopCard.displayName = "ExtraStopCard";
export default ExtraStopCard;
