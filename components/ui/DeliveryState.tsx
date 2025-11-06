"use client";

import {
  DEFAULT_TRUCK_DATA_URL,
  StatusKey,
  StatusMeta,
  StatusStep,
} from "@/types/status-delivery";
import React, { useMemo } from "react";

export type StatusDeliveryImageProps = {
  steps: StatusStep[];
  current?: StatusKey; // current step key
  meta?: StatusMeta; // arrival/depart notes per step
  width?: number; // default 1200
  height?: number; // default 160
  showTruck?: boolean; // default true
  fontFamily?: string; // override default font
  truckGap?: number; // gap between truck and bullet when above
  truckImageDataUrl?: string; // data URL or same-origin path
  truckWidth?: number;
  truckHeight?: number;
  className?: string;
  onPngReady?: (dataUrl: string) => void; // jika butuh dari file PNG yang di-convert dari SVG
};

// ===== Core SVG generator (pure function) =====
export function generateStatusTimelineSvg(opts: {
  steps: StatusStep[];
  current?: StatusKey;
  meta?: StatusMeta;
  width?: number;
  height?: number;
  showTruck?: boolean;
  fontFamily?: string;
  truckGap?: number; // sekarang = offset ke atas (default 0)
  truckImageDataUrl?: string;
  truckWidth?: number;
  truckHeight?: number;
  className?: string;
}): string {
  const {
    steps,
    current,
    meta = {},
    width = 1200,
    height = 50,
    showTruck = true,
    fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    truckGap = 0, // ⬅️ default 0 supaya truk sejajar tepat di baseline bullet
    truckImageDataUrl = DEFAULT_TRUCK_DATA_URL,
    truckWidth = 40,
    truckHeight = 34,
  } = opts;

  const n = Math.max(steps.length, 1);
  const marginX = 50;
  const lineY = 20; // baseline untuk bullets
  const usableW = Math.max(width - marginX * 2, 10);

  const isRejectMode =
    current === "reject" ||
    steps.some(
      (s) => s.key === "reject" && (s.is_current || current === s.key)
    );

  const xs = Array.from({ length: n }, (_, i) =>
    n === 1
      ? marginX + usableW / 2
      : Math.round(marginX + (usableW * i) / (n - 1))
  );

  const activeIndex = (() => {
    if (current) {
      const i = steps.findIndex((s) => s.key === current);
      if (i >= 0) return i;
    }
    const j = steps.findIndex((s) => s.is_current);
    return j >= 0 ? j : -1;
  })();

  // Palette (tailwind-ish)
  const gray500 = "#64748B";
  const gray400 = "#94A3B8";
  const gray300 = "#CBD5E1";
  const green600 = "#16A34A";
  const maroon = "#800000";

  const bulletR = 8;
  const activeR = 9.5;

  const labelY = lineY + 28;
  const sub1Y = labelY + 18; // "Tiba"
  const sub2Y = sub1Y + 16; // "Keluar"

  // Garis antar bullet: hijau untuk segmen yang sudah dilewati (i < activeIndex), sisanya abu-abu
  const segs = xs
    .slice(0, -1)
    .map((x, i) => {
      const x2 = xs[i + 1];
      const isPastSeg = activeIndex >= 0 && i < activeIndex;
      const stroke = isRejectMode ? maroon : isPastSeg ? green600 : gray300;
      return `<line x1="${x}" y1="${lineY}" x2="${x2}" y2="${lineY}" stroke="${stroke}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`;
    })
    .join("");

  const showTruckNow = showTruck && !isRejectMode;

  // Truk: menggantikan bullet current → posisi pusat truk tepat di (xs[active], lineY)
  const truck =
    !showTruckNow || activeIndex < 0
      ? ""
      : (() => {
          const xCenter = xs[activeIndex];
          // sejajarkan: pusat truk = lineY, boleh diangkat sedikit dengan truckGap
          const yCenter = lineY - truckGap;
          const xPos = xCenter - truckWidth / 2;
          const yPos = yCenter - truckHeight / 2;
          const href = truckImageDataUrl || DEFAULT_TRUCK_DATA_URL;
          return `<image href="${href}" xlink:href="${href}" x="${xPos}" y="${yPos}" width="${truckWidth}" height="${truckHeight}" />`;
        })();

  // Bullets + labels
  const bullets = steps
    .map((s, i) => {
      const x = xs[i];
      const isCurrent = i === activeIndex;
      const isPast = activeIndex >= 0 && i < activeIndex;
      const isFuture = activeIndex >= 0 && i > activeIndex;
      // Warna: past & current = hijau, future = abu-abu.
      // Tapi current TIDAK digambar sebagai bullet karena digantikan truk.
      //const fill = isPast ? green600 : isFuture ? gray400 : green600;
      const fill = isRejectMode
        ? maroon
        : isPast
        ? green600
        : isFuture
        ? gray400
        : green600;
      // const stroke = isPast ? green600 : isFuture ? gray500 : green600;
      const stroke = isRejectMode
        ? maroon
        : isPast
        ? green600
        : isFuture
        ? gray500
        : green600;

      const r = isCurrent ? activeR : bulletR;

      const metaFor = meta[s.key] || {};
      const arrive = metaFor.arrive ?? " ";
      const depart = metaFor.depart ?? " ";
      const showSubs =
        s.showSub === true || Boolean(metaFor.arrive || metaFor.depart);

      const accent = isRejectMode ? maroon : green600;
      const subs = showSubs
        ? `
      <text x="${x}" y="${sub1Y}" text-anchor="middle" font-size="11" fill="${gray500}">
        Tiba : <tspan fill="${accent}">${escapeXml(arrive)}</tspan>
      </text>
      <text x="${x}" y="${sub2Y}" text-anchor="middle" font-size="11" fill="${gray500}">
        Keluar : <tspan fill="${accent}">${escapeXml(depart)}</tspan>
      </text>`
        : ``;

      //  Skip bullet untuk current (karena sudah diganti truk), tetap render label & subteks
      const bulletNode =
        isCurrent && showTruckNow
          ? ""
          : `<circle cx="${x}" cy="${lineY}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;

      return `
      <g>
        ${bulletNode}
        <text x="${x}" y="${labelY}" text-anchor="middle" font-size="12" fill="${gray500}" font-weight="600">
          ${escapeXml(s.label)}
        </text>
        ${subs}
      </g>`;
    })
    .join("");

  // SVG wrapper
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
     role="img" aria-label="Delivery status timeline"
     style="background:#ffffff;font-family:${escapeXml(fontFamily)}">
  <g>${segs}${bullets}${truck}</g>
</svg>`;

  return svg;
}

// ===== React wrapper that outputs <img src="data:image/svg+xml"> =====
export default function StatusDeliveryImage(props: StatusDeliveryImageProps) {
  const svg = useMemo(() => generateStatusTimelineSvg(props), [props]);
  const { width = 1200, height = 160, onPngReady } = props;

  const dataUrl = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    [svg]
  );

  // Optional: if caller wants a PNG, convert when mounted.
  React.useEffect(() => {
    if (!onPngReady) return;
    svgToPng(dataUrl, width, height)
      .then(onPngReady)
      .catch(() => {});
  }, [dataUrl, height, onPngReady, width]);

  return (
    <div className={props.className}>
      <img
        src={dataUrl}
        width={width}
        height={height}
        alt="Delivery status"
        style={{ display: "block", maxWidth: "100%" }}
      />
    </div>
  );
}

// ===== Utilities =====
function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function svgToPng(svgDataUrl: string, width: number, height: number) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas 2D context not available"));
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = svgDataUrl;
  });
}

// OrderState for Grid View
// Usage: see app/(spa)/orders/list/page.tsx
export function GetStatesInLine({
  value,
  label,
}: {
  value: StatusStep["key"];
  label: StatusStep["label"];
}) {
  const color =
    value === "pending"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : value === "accepted"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : value === "preparation"
      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
      : value === "pickup"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : value === "delivery"
      ? "bg-cyan-100 text-cyan-700 border-cyan-200"
      : value === "received"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : value === "review"
      ? "bg-violet-100 text-violet-700 border-violet-200"
      : value === "rfq"
      ? "bg-white text-black border-gray-200"
      : value === "reject"
      ? "bg-red-400 text-gwhite border-black"
      : "bg-green-100 text-green-700 border-green-200"; // Done

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-md ${color}`}
    >
      {label}
    </span>
  );
}
