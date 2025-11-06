"use client";
import * as React from "react";

type IconName = "pencil" | "trash";

type IconProps = Omit<React.SVGProps<SVGSVGElement>, "children"> & {
  name: IconName;
  strokeWidth?: number;
};

const PATHS: Record<IconName, React.ReactNode> = {
  pencil: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 3.487a2.1 2.1 0 0 1 2.97 2.97L7.5 18.79l-4 1 1-4 12.362-12.303z"
    />
  ),
  trash: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a 2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m4 4v8m6-8v8"
    />
  ),
};

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, className, strokeWidth = 2, ...props },
  ref
) {
  const path = PATHS[name];

  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden={props["aria-label"] ? undefined : true}
      focusable={false}
      className={className}
      {...props}
    >
      {/* apply strokeWidth via <g> supaya path reuse tetap rapih */}
      <g strokeWidth={strokeWidth}>{path}</g>
    </svg>
  );
});

export function TruckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7h10v7H3zM13 10h4l3 3v1h-7z"
      />
      <circle cx="7.5" cy="17.5" r="1.5" strokeWidth="2" />
      <circle cx="17.5" cy="17.5" r="1.5" strokeWidth="2" />
    </svg>
  );
}

export const IconDashboard = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
export const IconOrders = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M3 7h18M3 12h18M3 17h18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
export const IconClaims = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M5 5h14v14H5z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M9 9h6v6H9z" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);
export const IconFinance = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M12 1v22M5 5h14a2 2 0 0 1 0 4H5a2 2 0 0 1 0-4zm0 10h14a2 2 0 0 1 0 4H5a2 2 0 0 1 0-4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
export const IconDocs = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm9 0v5h5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

export const IconSummary = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M4 6h16M4 12h16M4 18h10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
export const IconTracking = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M12 6v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);
export const IconList = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M4 6h16M4 12h16M4 18h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
export const IconInvoice = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M6 2h12v20H6z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      d="M9 6h6M9 10h6M9 14h6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
export const IconDownPayment = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M4 4h16v12H4z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 20h8M10 16v4M14 16v4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
export const IconVendorBill = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M6 2h12v20H6z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 7h8M8 11h8M8 15h6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

export const IconTruck = (p: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {/* Box kargo */}
    <path d="M3 7h10v7H3z" />
    {/* Kabin + moncong */}
    <path d="M13 10L18 10L20 13L20 17L13 17Z" />
    {/* Roda */}
    <circle cx="7" cy="19" r="2" />
    <circle cx="17" cy="19" r="2" />
  </svg>
);

// IconFleet.tsx
export const IconFleet = (p: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {/* Truck belakang (lebih kecil, agak naik & kiri) */}
    <path d="M6 6h8v5H6z" />
    <path d="M14 8h3l2 2v3h-5z" />
    <circle cx="9" cy="15" r="1.5" />
    <circle cx="16" cy="15" r="1.5" />

    {/* Truck depan (utama) */}
    <path d="M3 9h10v7H3z" />
    <path d="M13 12h5l2 3v1h-7z" />
    <circle cx="7" cy="19" r="2" />
    <circle cx="17" cy="19" r="2" />
  </svg>
);

export const IconDriver = (p: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {/* Kepala */}
    <circle cx="12" cy="6.5" r="3" />
    {/* Bahu / badan bawah (garis lengkung) */}
    <path d="M5 20c0-3.5 14-3.5 14 0" />
    {/* Stir */}
    <circle cx="12" cy="15.5" r="4" />
    {/* Spoke & arc atas agar terbaca seperti stir */}
    <path d="M9 15.5a3 3 0 0 1 6 0" />
    <path d="M12 13v5" />
    {/* Tangan pegang stir (opsional, tipis) */}
    <path d="M8 15.5H6.8M16 15.5h1.2" />
  </svg>
);

export const IconCar = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path d="M3 13l2-5a2 2 0 0 1 2-1h8a2 2 0 0 1 2 1l2 5" strokeWidth={2} />
    <path d="M5 13h14" strokeWidth={2} />
    <circle cx="7.5" cy="17" r="1.5" />
    <circle cx="16.5" cy="17" r="1.5" />
    <path d="M3 17h2m14 0h2" strokeWidth={2} />
  </svg>
);

export const IconUser = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <circle cx="12" cy="7" r="3" strokeWidth={2} />
    <path d="M4 19a8 8 0 0 1 16 0" strokeWidth={2} />
  </svg>
);
