import React from "react";
import { t } from "@/lib/i18n";
import ExtraStopCard, { ExtraStop } from "./sections/ExtraStopCard";
import { cn } from "@/lib/cn";

type ExtraStopWithId = ExtraStop & { uid: string };

type Props = {
  isReadOnly: boolean;
  orderId?: number | string;
  userType?: string | "";
  mode: "create" | "edit";
  multiPickupDrop: boolean;
  setMultiPickupDrop: (v: boolean) => void;

  extraStops: ExtraStopWithId[];
  setExtraStops: (fn: (prev: ExtraStopWithId[]) => ExtraStopWithId[]) => void;

  errors: Record<string, string>;
  // map ref by uid
  extraRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;

  // boleh string|number|null (dinormalisasi di sini)
  cityIdMuat: number | string | null;
  cityIdBongkar: number | string | null;

  lokasiMuatDisabled: boolean;
  lokasiBongkarDisabled: boolean;
};

const MAX_EXTRA = 2;

const genUid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`;

function blankStop(): ExtraStopWithId {
  return {
    lokMuat: null,
    lokBongkar: null,
    originPicName: "",
    originPicPhone: "",
    destPicName: "",
    destPicPhone: "",
    tglETDMuat: "",
    tglETABongkar: "",
    originAddressName: "",
    originStreet: "",
    originStreet2: "",
    originDistrictName: "",
    originZipCode: "",
    originLatitude: "",
    originLongitude: "",
    destAddressName: "",
    destStreet: "",
    destStreet2: "",
    destDistrictName: "",
    destZipCode: "",
    destLatitude: "",
    destLongitude: "",
    delivery_note_uri: "",
    pickupAttachment: null,
    dropOffAttachment: null,
    uid: genUid(),
  };
}

export default function MultiPickupDropSection({
  isReadOnly,
  orderId,
  userType,
  mode,
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
  const toNumOrNull = (
    v: number | string | null | undefined,
  ): number | null => {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const muatId = toNumOrNull(cityIdMuat);
  const bongkarId = toNumOrNull(cityIdBongkar);

  const updateStop = (
    uid: string,
    patch: Partial<Omit<ExtraStopWithId, "uid">>,
  ) =>
    setExtraStops((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)),
    );

  const handleAdd = () => {
    if (isReadOnly) return;
    setExtraStops((prev) => {
      if (prev.length >= MAX_EXTRA) return prev;
      const next = [...prev, blankStop()];
      // optional auto-scroll ke item baru
      const newUid = next[next.length - 1].uid;
      queueMicrotask(() => {
        const el = extraRefs?.current?.[newUid];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return next;
    });
  };

  const handleRemove = (uid: string) => {
    if (isReadOnly) return;
    setExtraStops((prev) => prev.filter((s) => s.uid !== uid));
    if (extraRefs?.current) {
      delete extraRefs.current[uid];
    }
  };

  // console.log("Rendering MultiPickupDropSection ", {
  //   isReadOnly,
  //   multiPickupDrop,
  //   extraStopsCount: extraStops.length,
  //   cityIdMuat,
  //   cityIdBongkar,
  //   extraStops,
  // });

  return (
    <div className="mt-6 space-y-3">
      {/* Header + Toggle + Add control */}
      {userType === "shipper" && (
        <>
          <div className="flex items-center justify-between">
            <label
              className="inline-flex items-center gap-2 cursor-pointer select-none"
              aria-disabled={isReadOnly}
            >
              <input
                type="checkbox"
                disabled={isReadOnly}
                className={cn(
                  "h-4 w-4 shrink-0 align-middle rounded border-gray-300",
                  "input",
                  isReadOnly && "opacity-50 cursor-not-allowed",
                )}
                checked={multiPickupDrop}
                onChange={(e) => setMultiPickupDrop(e.target.checked)}
              />
              <span className="text-sm leading-none whitespace-nowrap">
                {t("orders.multi_pickdrop") ?? "Multi Pickup/Drop"}
              </span>
            </label>

            {/* Add button only when editing & feature enabled */}
            {!isReadOnly && multiPickupDrop && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600">
                  {extraStops.length}/{MAX_EXTRA}
                </span>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={extraStops.length >= MAX_EXTRA}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    extraStops.length >= MAX_EXTRA
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-gray-50",
                  )}
                  title={t("orders.add_extra_stop") ?? "Tambah set"}
                >
                  {t("common.add") ?? "Tambah"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* List extra stops */}
      {multiPickupDrop && (
        <div className="space-y-4">
          {extraStops.map((stop, idx) => (
            <div key={stop.uid} className="relative">
              {/* Remove button (only edit mode) */}

              {userType === "shipper" && (
                <>
                  {!isReadOnly && (
                    <div className="absolute right-2 top-2 z-10">
                      <button
                        type="button"
                        onClick={() => handleRemove(stop.uid)}
                        className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        title={t("common.remove") ?? "Hapus"}
                      >
                        {t("common.remove") ?? "Hapus"}
                      </button>
                    </div>
                  )}
                </>
              )}

              <ExtraStopCard
                isReadOnly={isReadOnly}
                mode={mode}
                orderId={orderId}
                userType={userType}
                ref={(el) => {
                  if (extraRefs?.current)
                    extraRefs.current[stop.uid] = el ?? null;
                }}
                idx={idx}
                stop={stop}
                pickupAttachment={stop.pickupAttachment ?? null}
                setPickupAttachment={(v) =>
                  updateStop(stop.uid, { pickupAttachment: v })
                }
                dropOffAttachment={stop.dropOffAttachment ?? null}
                setDropOffAttachment={(v) =>
                  updateStop(stop.uid, { dropOffAttachment: v })
                }
                onChange={(patch) => updateStop(stop.uid, patch)}
                error={errors[stop.uid] ?? errors[`extra_${idx}`]}
                cityIdMuat={muatId}
                cityIdBongkar={bongkarId}
                lokasiMuatDisabled={lokasiMuatDisabled}
                lokasiBongkarDisabled={lokasiBongkarDisabled}
                tglETDMuat={stop.tglETDMuat}
                setTglETDMuat={(v) => updateStop(stop.uid, { tglETDMuat: v })}
                tglETABongkar={stop.tglETABongkar}
                setTglETABongkar={(v) =>
                  updateStop(stop.uid, { tglETABongkar: v })
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
