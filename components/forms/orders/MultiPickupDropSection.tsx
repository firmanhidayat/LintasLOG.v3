import React from "react";
import { t } from "@/lib/i18n";
import ExtraStopCard, { ExtraStop } from "./ExtraStopCard";

type Props = {
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
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300"
          checked={multiPickupDrop}
          onChange={(e) => setMultiPickupDrop(e.target.checked)}
        />
        <span>{t("orders.multi_pickdrop") ?? "Multi Pickup/Drop"}</span>
      </label>

      {multiPickupDrop && (
        <div className="space-y-4">
          {extraStops.map((stop, idx) => (
            <ExtraStopCard
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
