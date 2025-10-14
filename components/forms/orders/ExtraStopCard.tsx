import React from "react";
import { t } from "@/lib/i18n";
import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
import { FieldText } from "@/components/form/FieldText";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";
import type { AddressItem } from "@/types/orders";

export type ExtraStop = {
  lokMuat: AddressItem | null;
  lokBongkar: AddressItem | null;
  originPicName: string;
  originPicPhone: string;
  destPicName: string;
  destPicPhone: string;

  /** ⬇️ mandatory ETD/ETA per stop */
  tglETDMuat: string; // "YYYY-MM-DDTHH:mm" (local)
  tglETABongkar: string; // "YYYY-MM-DDTHH:mm" (local)
};

type Props = {
  idx: number;
  stop: ExtraStop;
  onChange: (patch: Partial<ExtraStop>) => void;
  error?: string;

  /** city context (sudah dinormalisasi di parent) */
  cityIdMuat: number | null;
  cityIdBongkar: number | null;

  lokasiMuatDisabled: boolean;
  lokasiBongkarDisabled: boolean;

  /** ⬇️ Mandatory controller utk ETD/ETA */
  tglETDMuat: string;
  setTglETDMuat: (v: string) => void;
  tglETABongkar: string;
  setTglETABongkar: (v: string) => void;
};

const ExtraStopCard = React.forwardRef<HTMLDivElement, Props>(
  (
    {
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
    return (
      <div ref={ref} className="rounded-xl border border-gray-200 p-3">
        <div className="mb-2 text-sm font-semibold">
          {t("orders.set_ke") ?? "Set ke"} {idx + 1}
        </div>

        {error && (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* ETD/ETA per Set (MANDATORY) */}
        <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateTimePickerTW
            label={(t("orders.tgl_muat") ?? "Tgl Muat") + ` (${idx + 1})`}
            value={tglETDMuat}
            onChange={setTglETDMuat}
            displayFormat="DD-MM-YYYY"
          />
          <DateTimePickerTW
            label={(t("orders.tgl_bongkar") ?? "Tgl Bongkar") + ` (${idx + 1})`}
            value={tglETABongkar}
            onChange={setTglETABongkar}
            displayFormat="DD-MM-YYYY"
          />
        </div>

        {/* Alamat */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AddressAutocomplete
            label={(t("orders.lokasi_muat") ?? "Lokasi Muat") + ` (${idx + 1})`}
            cityId={cityIdMuat}
            value={stop.lokMuat}
            onChange={(v) => onChange({ lokMuat: v })}
            disabled={!!lokasiMuatDisabled}
          />
          <AddressAutocomplete
            label={
              (t("orders.lokasi_bongkar") ?? "Lokasi Bongkar") + ` (${idx + 1})`
            }
            cityId={cityIdBongkar}
            value={stop.lokBongkar}
            onChange={(v) => onChange({ lokBongkar: v })}
            disabled={!!lokasiBongkarDisabled}
          />
        </div>

        {/* PIC Origin & Destination */}
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText
            label={
              (t("orders.pic_muat_name") ?? "PIC Muat - Nama") + ` (${idx + 1})`
            }
            value={stop.originPicName}
            onChange={(v) => onChange({ originPicName: v })}
          />
          <FieldText
            label={
              (t("orders.pic_bongkar_name") ?? "PIC Bongkar - Nama") +
              ` (${idx + 1})`
            }
            value={stop.destPicName}
            onChange={(v) => onChange({ destPicName: v })}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldText
            label={
              (t("orders.pic_muat_phone") ?? "PIC Muat - Telepon") +
              ` (${idx + 1})`
            }
            value={stop.originPicPhone}
            onChange={(v) => onChange({ originPicPhone: v })}
            inputMode="tel"
            pattern="^[0-9+() -]*$"
          />
          <FieldText
            label={
              (t("orders.pic_bongkar_phone") ?? "PIC Bongkar - Telepon") +
              ` (${idx + 1})`
            }
            value={stop.destPicPhone}
            onChange={(v) => onChange({ destPicPhone: v })}
            inputMode="tel"
            pattern="^[0-9+() -]*$"
          />
        </div>
      </div>
    );
  }
);

ExtraStopCard.displayName = "ExtraStopCard";
export default ExtraStopCard;
