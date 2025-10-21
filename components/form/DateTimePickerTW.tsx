// DateTimePickerTW.tsx
"use client";
import React from "react";
import Datepicker, { DateValueType } from "react-tailwindcss-datepicker";
import dayjs from "dayjs";
import clsx from "clsx";

type Props = {
  label: string;
  required?: boolean;
  value: string; // "YYYY-MM-DDTHH:mm" atau ""
  onChange: (v: string) => void; // gabungan "YYYY-MM-DDTHH:mm"
  error?: string;
  touched?: boolean;
  className?: string;
  /** << NEW: kontrol format tampilan tanggal (bukan nilai state) */
  displayFormat?: string; // default "DD-MM-YYYY"
  showTime?: boolean;
};

const is24h = (() => {
  try {
    // hour12 === false → 24-jam
    return (
      new Intl.DateTimeFormat(navigator.language, {
        hour: "numeric",
      }).resolvedOptions().hour12 === false
    );
  } catch {
    return false;
  }
})();

function splitIsoLocal(v: string): { date: string; time: string } {
  if (!v) return { date: "", time: "" };
  const [d, t] = v.split("T");
  return { date: d ?? "", time: (t ?? "").slice(0, 5) };
}

function toDateOrNull(yyyyMmDd: string): Date | null {
  if (!yyyyMmDd) return null;
  const d = dayjs(yyyyMmDd, "YYYY-MM-DD", true);
  return d.isValid() ? d.toDate() : null;
}

export default function DateTimePickerTW({
  label,
  required,
  value,
  onChange,
  error,
  touched,
  className,
  displayFormat = "DD-MM-YYYY", // << default tampilan ke user
  showTime = true,
}: Props) {
  const { date, time } = splitIsoLocal(value);

  const dateVal: DateValueType = {
    startDate: toDateOrNull(date),
    endDate: toDateOrNull(date),
  };

  function defaultTime() {
    return dayjs().format("HH:mm");
  }

  /**
   * Update gabungan:
   * - Simpan SELALU sebagai "YYYY-MM-DDTHH:mm"
   * - Auto isi jam saat tanggal terpilih (kalau belum ada jam)
   */
  function update(nextDate?: string, nextTime?: string) {
    const d = (nextDate ?? date) || "";
    const timeSource = nextTime ?? time;
    const t = d ? timeSource || defaultTime() : timeSource || "";
    const out = d && t ? `${d}T${t}` : "";
    onChange(out);
  }

  const showError = Boolean(touched && error);

  return (
    <div className={clsx("w-full", className)}>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      {/* Satu border utk date & time */}
      <div className="flex items-stretch rounded-md border-1 outline-none ">
        {/* Date */}
        <div className="min-w-0 flex-1">
          <Datepicker
            value={dateVal}
            onChange={(v) => {
              const d =
                v?.startDate instanceof Date
                  ? dayjs(v.startDate).format("YYYY-MM-DD") // << SIMPAN internal
                  : "";
              update(d, undefined);
            }}
            asSingle
            useRange={false}
            displayFormat={displayFormat} // << TAMPILAN ke user
            primaryColor={"green"}
            showShortcuts={false}
            showFooter={false}
            popoverDirection="down"
            containerClassName="relative w-full overflow-visible [&_.absolute]:left-0 [&_.absolute]:z-50 [&_.absolute]:min-w-[18rem] sm:[&_.absolute]:min-w-[20rem] "
            inputClassName="w-full rounded-md !border-0 px-3 py-2 text-sm "
            toggleClassName="hidden"
          />
        </div>

        {/* Divider */}
        <div className="my-2 w-px bg-gray-200" />

        {/* Time */}
        {showTime && (
          <input
            type="time"
            lang="en-GB"
            step={300}
            value={time}
            onFocus={() => {
              if (date && !time) update(undefined, dayjs().format("HH:mm"));
            }}
            onChange={(e) => {
              if (!date) return;
              update(undefined, e.target.value);
            }}
            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
            className={clsx(
              "w-[10ch] min-w-[9ch] shrink-0 border-0 bg-transparent px-2 py-2 text-center text-sm font-mono focus:outline-none focus:ring-0 appearance-none",
              "[&::-webkit-calendar-picker-indicator]:hidden",
              "[&::-webkit-clear-button]:hidden",
              "[&::-webkit-inner-spin-button]:hidden",
              "[&::-webkit-datetime-edit-hour-field]:px-0",
              "[&::-webkit-datetime-edit-minute-field]:px-0",
              is24h && "[&::-webkit-datetime-edit-ampm-field]:hidden",
              !date && "cursor-not-allowed text-gray-400"
            )}
            disabled={!date}
            required={Boolean(required && date)}
            aria-label="Time"
          />
        )}
      </div>

      {showError && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
