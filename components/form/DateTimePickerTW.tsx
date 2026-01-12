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
  displayFormat?: string; // default "DD-MM-YYYY"
  showTime?: boolean;

  /**
   * NEW:
   * - autoDefaultNow: kalau value kosong, auto isi dengan tanggal+jam sekarang (sekali saat mount)
   * - timeZone: timezone profile (IANA, mis: "Asia/Jakarta") atau offset "+07:00"
   */
  autoDefaultNow?: boolean; // default true
  timeZone?: string; // "Asia/Jakarta" / "UTC" / "+07:00"
};

const is24h = (() => {
  try {
    return (
      new Intl.DateTimeFormat(navigator.language, { hour: "numeric" }).resolvedOptions()
        .hour12 === false
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

function fmtNowParts(date: Date, timeZone?: string): { date: string; time: string } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`,
    };
  } catch {
    // fallback: timezone invalid -> pakai timezone browser
    return { date: dayjs().format("YYYY-MM-DD"), time: dayjs().format("HH:mm") };
  }
}

function nowInZone(timeZone?: string): { date: string; time: string } {
  const z = (timeZone ?? "").trim();
  // support offset "+07:00" / "-05:30"
  const m = z.match(/^([+-])(\d{2}):(\d{2})$/);
  if (m) {
    const sign = m[1] === "-" ? -1 : 1;
    const hh = Number(m[2]);
    const mm = Number(m[3]);
    const offsetMin = sign * (hh * 60 + mm);

    // shift epoch, lalu format di UTC => hasilnya “local time” untuk offset tsb
    const shifted = new Date(Date.now() + offsetMin * 60_000);
    return fmtNowParts(shifted, "UTC");
  }

  // IANA timezone (mis: "Asia/Jakarta")
  return fmtNowParts(new Date(), z || undefined);
}

export default function DateTimePickerTW({
  label,
  required,
  value,
  onChange,
  error,
  touched,
  className,
  displayFormat = "DD-MM-YYYY",
  showTime = true,
  autoDefaultNow = true,
  timeZone,
}: Props) {
  const { date, time } = splitIsoLocal(value);

  // auto set default sekarang (sekali)
  const didInit = React.useRef(false);
  React.useEffect(() => {
    if (!autoDefaultNow) return;
    if (didInit.current) return;
    if (value) {
      didInit.current = true;
      return;
    }
    didInit.current = true;

    const now = nowInZone(timeZone);
    onChange(`${now.date}T${now.time}`);
  }, [autoDefaultNow, value, onChange, timeZone]);

  const dateVal: DateValueType = {
    startDate: toDateOrNull(date),
    endDate: toDateOrNull(date),
  };

  function defaultTime() {
    return nowInZone(timeZone).time;
  }

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

      <div className="flex items-stretch rounded-md border-1 outline-none ">
        <div className="min-w-0 flex-1">
          <Datepicker
            value={dateVal}
            onChange={(v) => {
              const d =
                v?.startDate instanceof Date ? dayjs(v.startDate).format("YYYY-MM-DD") : "";
              update(d, undefined);
            }}
            asSingle
            useRange={false}
            displayFormat={displayFormat}
            primaryColor={"green"}
            showShortcuts={false}
            showFooter={false}
            popoverDirection="down"
            containerClassName="relative w-full overflow-visible [&_.absolute]:left-0 [&_.absolute]:z-50 [&_.absolute]:min-w-[18rem] sm:[&_.absolute]:min-w-[20rem] "
            inputClassName="w-full rounded-md !border-0 px-3 py-2 text-sm "
            toggleClassName="hidden"
          />
        </div>

        <div className="my-2 w-px bg-gray-200" />

        {showTime && (
          <input
            type="time"
            lang="en-GB"
            step={300}
            value={time}
            onFocus={() => {
              if (date && !time) update(undefined, defaultTime());
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
