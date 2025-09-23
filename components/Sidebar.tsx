"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavGroup, NavLink } from "@/components/NavLink";
import lintaslogo from "@/images/lintaslog-logo.png";

/** ====== NEW: Props agar bisa dikontrol dari Header (mobile) ====== */
export default function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* ===== Mobile Drawer (md:hidden) ===== */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Panel */}
        <aside
          className={`
            absolute left-0 top-0 h-full w-72
            border-r border-gray-200/70 bg-brand-900 text-white shadow-xl
            transition-transform duration-200 ease-out
            ${open ? "translate-x-0" : "-translate-x-full"}
          `}
          role="dialog"
          aria-modal="true"
        >
          <SidebarContent />
        </aside>
      </div>

      {/* ===== Desktop Sidebar (sticky) ===== */}
      <aside className="hidden md:flex w-64 shrink-0 h-dvh sticky top-0 border-r border-gray-200/70 bg-brand-900 text-white">
        <SidebarContent />
      </aside>
    </>
  );
}

/* ============================================================= */
/* =============== Di bawah ini KONTEN ASLI kamu =============== */
/* ============================================================= */

type SectionKey =
  | "dashboard"
  | "orders"
  | "claims"
  | "finance"
  | "downpayment"
  | "vendorbill";

const STORAGE_KEY = "sidebar.openGroups.v1";
const ACCORDION = true;

const IconDashboard = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
const IconOrders = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M3 7h18M3 12h18M3 17h18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
const IconClaims = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M5 5h14v14H5z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M9 9h6v6H9z" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconFinance = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M12 1v22M5 5h14a2 2 0 0 1 0 4H5a2 2 0 0 1 0-4zm0 10h14a2 2 0 0 1 0 4H5a2 2 0 0 1 0-4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
const IconDocs = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm9 0v5h5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const IconSummary = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M4 6h16M4 12h16M4 18h10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
const IconTracking = (p: React.SVGProps<SVGSVGElement>) => (
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
const IconList = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M4 6h16M4 12h16M4 18h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
const IconInvoice = (p: React.SVGProps<SVGSVGElement>) => (
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
const IconDownPayment = (p: React.SVGProps<SVGSVGElement>) => (
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
const IconVendorBill = (p: React.SVGProps<SVGSVGElement>) => (
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

type OpenMap = Record<SectionKey, boolean>;

const DEFAULT_OPEN: OpenMap = {
  dashboard: true,
  orders: false,
  claims: false,
  finance: false,
  downpayment: false,
  vendorbill: false,
};

/** ====== Komponen isi sidebar (dibagi supaya bisa dipakai di mobile & desktop) ====== */
function SidebarContent() {
  const pathname = usePathname();

  const [openMap, setOpenMap] = useState<OpenMap>(DEFAULT_OPEN);
  const loaded = useMemo(() => typeof window !== "undefined", []);

  // load dari localStorage
  useEffect(() => {
    if (!loaded) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OpenMap;
        setOpenMap((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, [loaded]);

  // auto-open sesuai route + accordion
  useEffect(() => {
    const match = (prefix: string) =>
      pathname === prefix || (prefix !== "/" && pathname.startsWith(prefix));
    const next: OpenMap = { ...openMap };

    if (match("/dashboard") || pathname === "/") next.dashboard = true;
    if (match("/orders")) next.orders = true;
    if (match("/claims")) next.claims = true;
    if (match("/finance")) next.finance = true;
    if (match("/downpayment")) next.downpayment = true;
    if (match("/vendorbill")) next.vendorbill = true;

    if (ACCORDION) {
      const activeKey: SectionKey | null =
        match("/dashboard") || pathname === "/"
          ? "dashboard"
          : match("/orders")
          ? "orders"
          : match("/claims")
          ? "claims"
          : match("/finance")
          ? "finance"
          : match("/downpayment")
          ? "downpayment"
          : match("/vendorbill")
          ? "vendorbill"
          : null;

      if (activeKey) {
        (Object.keys(next) as SectionKey[]).forEach((k) => {
          next[k] = k === activeKey;
        });
      }
    }

    setOpenMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // persist ke localStorage
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap));
    } catch {}
  }, [openMap, loaded]);

  const toggle = (key: SectionKey) => (next: boolean) => {
    setOpenMap((curr) => {
      if (ACCORDION) {
        const allClosed = (Object.keys(curr) as SectionKey[]).reduce(
          (acc, k) => ({ ...acc, [k]: false }),
          {} as OpenMap
        );
        return { ...allClosed, [key]: next };
      }
      return { ...curr, [key]: next };
    });
  };

  return (
    <div className="flex w-full flex-col">
      {/* Logo */}
      <div className="px-4 pt-4 pb-10">
        <div className="flex items-center gap-3">
          <Image
            src={lintaslogo}
            alt="Lintas-LOG Logo"
            width={140}
            height={32}
            className="h-12 w-auto"
            priority
          />
        </div>
      </div>

      {/* Navigasi */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        <NavGroup
          href="/"
          label="Dashboard"
          icon={IconDashboard}
          items={[
            {
              label: "Ringkasan Order",
              href: "/dashboard/ringkasanorder",
              icon: IconSummary,
            },
            {
              label: "Status Tracking",
              href: "/dashboard/statustracking",
              icon: IconTracking,
            },
          ]}
          open={openMap.dashboard}
          onToggle={toggle("dashboard")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />

        <NavGroup
          href="/orders"
          label="Orders"
          icon={IconOrders}
          items={[
            { label: "Order List", href: "/orders/list", icon: IconList },
          ]}
          open={openMap.orders}
          onToggle={toggle("orders")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />

        <NavGroup
          href="/claims"
          label="Claims"
          icon={IconClaims}
          items={[
            { label: "Claim List", href: "/claims/list", icon: IconList },
          ]}
          open={openMap.claims}
          onToggle={toggle("claims")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />

        <NavGroup
          href="/finance"
          label="Finance"
          icon={IconFinance}
          items={[
            {
              label: "Invoice List",
              href: "/finance/invoices",
              icon: IconInvoice,
            },
            { label: "Price List", href: "/finance/pricelist", icon: IconList },
          ]}
          open={openMap.finance}
          onToggle={toggle("finance")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />

        <NavGroup
          href="/downpayment"
          label="Down Payment"
          icon={IconDownPayment}
          items={[
            { label: "DP List", href: "/downpayment/list", icon: IconList },
          ]}
          open={openMap.downpayment}
          onToggle={toggle("downpayment")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />

        <NavGroup
          href="/vendorbill"
          label="Vendor Bill"
          icon={IconVendorBill}
          items={[
            {
              label: "Vendor Bill List",
              href: "/vendorbill/list",
              icon: IconList,
            },
          ]}
          open={openMap.vendorbill}
          onToggle={toggle("vendorbill")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />
      </nav>

      {/* Bottom button */}
      <div className="mt-auto border-t border-white/10 px-4 py-3">
        <NavLink
          href="/docs"
          label="Docs & Components"
          icon={IconDocs}
          className="inline-flex w-full items-center justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
        />
      </div>
    </div>
  );
}
