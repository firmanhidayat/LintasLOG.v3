import React from "react";
import { t } from "@/lib/i18n";
import ExtraStopCard, { ExtraStop } from "./sections/ExtraStopCard";
import { cn } from "@/lib/cn";

type Props = {
  isReadOnly: boolean;
  multiPickupDrop: boolean;
  setMultiPickupDrop: (v: boolean) => void;

  extraStops: ExtraStop[];
  setExtraStops: (fn: (prev: ExtraStop[]) => ExtraStop[]) => void;

  errors: Record<string, string>;
  extraRefs?: React.RefObject<HTMLDivElement[]>;

  // boleh string|number|null (dinormalisasi di sini)
  cityIdMuat: number | string | null;
  cityIdBongkar: number | string | null;

  lokasiMuatDisabled: boolean;
  lokasiBongkarDisabled: boolean;
};

export default function MultiPickupDropSection({
  isReadOnly,
  multiPickupDrop,
  setMultiPickupDrop,
  extraStops,
  setExtraStops,
  errors,
  extraRefs,
  cityIdMuat,
  cityIdBongkar,
  lokasiMuatDisabled,
  lokasiBongkarDisabled,
}: Props) {
  const toNumOrNull = (v: number | string | null): number | null => {
    if (v == null) return null;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  const muatId = toNumOrNull(cityIdMuat);
  const bongkarId = toNumOrNull(cityIdBongkar);

  return (
    <div className="mt-6 space-y-3">
      <div className={cn()}>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            className={cn(
              "h-4 w-4 shrink-0 align-middle rounded border-gray-300",
              `input ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""} `
            )}
            checked={multiPickupDrop}
            onChange={(e) => setMultiPickupDrop(e.target.checked)}
          />
          <span className="text-sm leading-none whitespace-nowrap">
            {t("orders.multi_pickdrop") ?? "Multi Pickup/Drop"}
          </span>
        </label>
      </div>

      {multiPickupDrop && (
        <div className="space-y-4">
          {extraStops.map((stop, idx) => (
            <ExtraStopCard
              isReadOnly={isReadOnly}
              key={idx}
              ref={(el) => {
                const list = extraRefs?.current;
                if (el && list) list[idx] = el;
              }}
              idx={idx}
              stop={stop}
              onChange={(patch) =>
                setExtraStops((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], ...patch };
                  return next;
                })
              }
              error={errors[`extra_${idx}`]}
              cityIdMuat={muatId}
              cityIdBongkar={bongkarId}
              lokasiMuatDisabled={!!lokasiMuatDisabled}
              lokasiBongkarDisabled={!!lokasiBongkarDisabled}
              /** ⬇️ mandatory ETD/ETA diteruskan dari state stop */
              tglETDMuat={stop.tglETDMuat}
              setTglETDMuat={(v) =>
                setExtraStops((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], tglETDMuat: v };
                  return next;
                })
              }
              tglETABongkar={stop.tglETABongkar}
              setTglETABongkar={(v) =>
                setExtraStops((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], tglETABongkar: v };
                  return next;
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
