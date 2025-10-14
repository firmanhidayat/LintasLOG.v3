"use client";

import React, { useMemo } from "react";
import { t } from "@/lib/i18n";
import { TruckIcon } from "@/components/icons/Icon";

/** -------- Types -------- */
export type StatusKey = string;

export type StatusStep = {
  key: StatusKey;
  label: string;
  showSub?: boolean;
};

export type StatusMeta = Partial<
  Record<StatusKey, { arrive?: string; depart?: string }>
>;

export type ApiStatusItem = {
  code: string;
  name?: string;
  arrive?: string;
  depart?: string;
  showSub?: boolean;
};

export type ApiStatusPayload = {
  current?: string;
  items?: ApiStatusItem[];
};

/** -------- Helper i18n-safe -------- */
function tr(ready: boolean | undefined, key: string, fallback: string) {
  if (!ready) return fallback;
  try {
    return t(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Bangun default steps TANPA memanggil t() di module scope.
 * Panggil fungsi ini di dalam komponen (setelah i18n siap).
 */
export function buildDefaultTmsSteps(i18nReady?: boolean): StatusStep[] {
  return [
    {
      key: "Pending",
      label: tr(i18nReady, "orders.status.pending", "Pending"),
    },
    {
      key: "Accepted",
      label: tr(i18nReady, "orders.status.accepted", "Accepted"),
    },
    {
      key: "On Preparation",
      label: tr(i18nReady, "orders.status.on_preparation", "On Preparation"),
    },
    {
      key: "Pickup",
      label: tr(i18nReady, "orders.status.pickup", "Pickup"),
      showSub: true,
    },
    {
      key: "On Delivery",
      label: tr(i18nReady, "orders.status.on_delivery", "On Delivery"),
    },
    {
      key: "Received",
      label: tr(i18nReady, "orders.status.received", "Received"),
      showSub: true,
    },
    {
      key: "On Review",
      label: tr(i18nReady, "orders.status.on_review", "On Review"),
      showSub: true,
    },
    { key: "Done", label: tr(i18nReady, "orders.status.done", "Done") },
  ];
}

type Props = {
  current?: StatusKey;
  steps?: StatusStep[];
  meta?: StatusMeta;
  data?: ApiStatusPayload;
  activeLeadingIcon?: React.ReactNode;
  className?: string;
  minWidthClassName?: string;
  /** kirimkan dari parent: const { ready: i18nReady } = useI18nReady(); */
  i18nReady?: boolean;
};

export default function StatusTracker({
  current,
  steps,
  meta,
  data,
  activeLeadingIcon,
  className,
  minWidthClassName = "min-w-[720px]",
  i18nReady,
}: Props) {
  // Normalisasi dari payload API bila ada
  const { stepsFromApi, metaFromApi, currentFromApi } = useMemo(() => {
    if (!data?.items?.length) {
      return {
        stepsFromApi: null as StatusStep[] | null,
        metaFromApi: null as StatusMeta | null,
        currentFromApi: data?.current,
      };
    }
    const s: StatusStep[] = data.items.map((it) => ({
      key: it.code,
      label: it.name ?? it.code,
      showSub: it.showSub,
    }));
    const m: StatusMeta = {};
    data.items.forEach((it) => {
      if (it.arrive || it.depart)
        m[it.code] = { arrive: it.arrive, depart: it.depart };
    });
    return { stepsFromApi: s, metaFromApi: m, currentFromApi: data.current };
  }, [data]);

  // Fallback default steps (dibangun saat render)
  const fallbackSteps = useMemo(
    () => buildDefaultTmsSteps(i18nReady),
    [i18nReady]
  );

  const finalSteps: StatusStep[] = steps?.length
    ? steps
    : stepsFromApi?.length
    ? stepsFromApi
    : fallbackSteps;

  const finalMeta: StatusMeta | undefined =
    meta && Object.keys(meta).length
      ? meta
      : metaFromApi && Object.keys(metaFromApi).length
      ? metaFromApi
      : undefined;

  const finalCurrent = current ?? currentFromApi ?? finalSteps[0]?.key ?? "";
  const activeIdx = Math.max(
    0,
    finalSteps.findIndex((s) => s.key === finalCurrent)
  );

  const firstActiveIcon = activeLeadingIcon ?? (
    <div className="text-green-700">
      <TruckIcon className="h-6 w-6" />
    </div>
  );

  return (
    <div
      className={["mb-4 overflow-x-auto", className].filter(Boolean).join(" ")}
    >
      <div className={minWidthClassName}>
        <div className="flex items-start">
          {finalSteps.map((s, i) => {
            const isActive = i === activeIdx;
            const isCompleted = i < activeIdx;
            const m = finalMeta?.[s.key];

            return (
              <div key={s.key} className="flex-1">
                {/* dot + connector */}
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    {i === 0 && isActive ? (
                      firstActiveIcon
                    ) : (
                      <div
                        className={[
                          "h-4 w-4 rounded-full border",
                          isActive
                            ? "bg-green-600 border-green-600"
                            : isCompleted
                            ? "bg-green-500 border-green-500"
                            : "bg-gray-300 border-gray-300",
                        ].join(" ")}
                      />
                    )}
                  </div>
                  {i < finalSteps.length - 1 && (
                    <div className="mx-3 h-px flex-1 border-t border-dashed border-gray-300" />
                  )}
                </div>

                {/* label + sub info */}
                <div className="mt-2 text-center">
                  <div
                    className={[
                      "text-xs font-medium",
                      isActive ? "text-gray-900" : "text-gray-600",
                    ].join(" ")}
                  >
                    {s.label}
                  </div>

                  {s.showSub && (
                    <div className="mt-1 space-y-1 text-[11px] leading-4">
                      <div>
                        <span className="text-gray-600">
                          {tr(i18nReady, "orders.status.arrive", "Tiba")} :
                        </span>{" "}
                        <span className="text-gray-500">
                          {m?.arrive ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-700">
                          {tr(i18nReady, "orders.status.depart", "Keluar")} :
                        </span>{" "}
                        <span className="text-gray-500">
                          {m?.depart ?? "-"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
