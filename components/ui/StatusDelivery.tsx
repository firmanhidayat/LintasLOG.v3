"use client";

import React, { useMemo, useState } from "react";
import clsx from "clsx";

export type StatusItem = {
  label: string;
  datetime?: string | Date;
};

type Palette = "green" | "emerald" | "teal" | "blue" | "slate";

const paletteClass: Record<
  Palette,
  { border: string; ring: string; text: string }
> = {
  green: {
    border: "border-green-700",
    ring: "ring-green-700",
    text: "text-green-700",
  },
  emerald: {
    border: "border-emerald-600",
    ring: "ring-emerald-600",
    text: "text-emerald-600",
  },
  teal: {
    border: "border-teal-600",
    ring: "ring-teal-600",
    text: "text-teal-600",
  },
  blue: {
    border: "border-blue-600",
    ring: "ring-blue-600",
    text: "text-blue-600",
  },
  slate: {
    border: "border-slate-500",
    ring: "ring-slate-500",
    text: "text-slate-600",
  },
};

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ags",
  "Sept",
  "Okt",
  "Nov",
  "Des",
];
const fmt = (v?: string | Date) => {
  if (!v) return "";
  const d =
    typeof v === "string" && !Number.isNaN(Date.parse(v))
      ? new Date(v)
      : v instanceof Date
      ? v
      : null;
  if (!d) return String(v);
  const dd = d.getDate();
  const mon = MONTHS_ID[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${mon} ${yyyy} ${hh}:${mm}`;
};

type Props = {
  items: StatusItem[];
  maxVisible?: number;
  className?: string;
  color?: Palette; // default: "green"
  size?: "sm" | "md"; // default: "md"
  showAllText?: string; // default: "Tampilkan Semua"
  hideToggle?: boolean; // default: false
};

export default function StatusDelivery({
  items,
  maxVisible = 3,
  className,
  color = "green",
  size = "md",
  showAllText = "Tampilkan Semua",
  hideToggle = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = useMemo(
    () => (expanded ? items : items.slice(0, maxVisible)),
    [expanded, items, maxVisible]
  );

  const dotSize = size === "sm" ? "h-2 w-2" : "h-3 w-3";
  const labelSize = size === "sm" ? "text-sm" : "text-base";
  const dateSize = size === "sm" ? "text-xs" : "text-sm";
  const pal = paletteClass[color];

  return (
    <div className={clsx("w-full", className)}>
      <ol
        role="list"
        className={clsx("relative ml-1", "border-l-1", pal.border)}
        aria-label="Delivery status"
      >
        {visible.map((it, i) => (
          <li key={`${it.label}-${i}`} className="relative pl-6 pb-5 last:pb-0">
            <span
              aria-hidden="true"
              className={clsx(
                "absolute -left-[5px] top-0 rounded-full bg-white",
                dotSize,
                "ring-2",
                pal.ring
              )}
            />
            <div className="flex flex-col">
              <span className={clsx("font-medium", labelSize)}>{it.label}</span>
              {it.datetime && (
                <span className={clsx("text-neutral-500", dateSize)}>
                  {fmt(it.datetime)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {!hideToggle && items.length > maxVisible && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={clsx(
            "mt-1 underline decoration-1",
            pal.text,
            size === "sm" ? "text-sm" : "text-base"
          )}
        >
          {showAllText}
        </button>
      )}
    </div>
  );
}
