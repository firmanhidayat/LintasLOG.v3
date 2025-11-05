"use client";

import { useEffect, useMemo, useState, useTransition, memo } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavGroup, NavLink } from "@/components/NavLink";
import lintaslogo from "@/images/lintaslog-logo.png";
import { t, getLang, onLangChange, type Lang } from "@/lib/i18n";
import { OpenMap, SectionKey } from "@/types/sidebar";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  IconDashboard,
  IconSummary,
  IconClaims,
  IconDocs,
  IconDownPayment,
  IconFinance,
  IconInvoice,
  IconList,
  IconOrders,
  IconTracking,
  IconVendorBill,
  IconTruck,
  IconFleet,
  IconDriver,
} from "./icons/Icon";

export default function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const [, startTransition] = useTransition();
  const safeClose = () => startTransition(() => onClose?.());

  return (
    <>
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        {/* <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        /> */}
        <div
          onClick={safeClose}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Panel */}
        <aside
          className={`
            absolute left-0 top-0 h-full w-72
            border-r border-gray-200/70 bg-brand-900 text-white shadow-xl
            transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none
            ${open ? "translate-x-0" : "-translate-x-full"}
          `}
          role="dialog"
          aria-modal="true"
        >
          <SidebarContent />
        </aside>
      </div>

      <aside className="hidden md:flex w-64 shrink-0 h-dvh sticky top-0 border-r border-gray-200/70 bg-brand-900 text-white">
        <SidebarContent />
      </aside>
    </>
  );
}

const STORAGE_KEY = "sidebar.openGroups.v1";
const ACCORDION = true;

const DEFAULT_OPEN: OpenMap = {
  dashboard: true,
  orders: false,
  claims: false,
  finance: false,
  downpayment: false,
  vendorbill: false,
  fleetndriver: false,
};

/** ====== Komponen isi sidebar (dipakai di mobile & desktop) ====== */
const SidebarContent = memo(function SidebarContent() {
  const pathname = usePathname();
  const [openMap, setOpenMap] = useState<OpenMap>(DEFAULT_OPEN);
  const loaded = useMemo(() => typeof window !== "undefined", []);
  const [activeLang, setActiveLang] = useState<Lang>(() => getLang());

  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, [activeLang]);
  useEffect(() => {
    if (!loaded) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OpenMap;
        setOpenMap((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, [loaded]);

  const { currentUserType } = useAuth();

  useEffect(() => {
    const match = (prefix: string) =>
      pathname === prefix || (prefix !== "/" && pathname.startsWith(prefix));
    // const next: OpenMap = { ...openMap };
    const next: OpenMap = { ...DEFAULT_OPEN };
    if (match("/dashboard") || pathname === "/") next.dashboard = true;
    if (match("/orders")) next.orders = true;
    if (match("/claims")) next.claims = true;
    if (match("/finance")) next.finance = true;
    if (match("/downpayment")) next.downpayment = true;
    if (match("/vendorbill")) next.vendorbill = true;
    if (match("/fleetndriver")) next.fleetndriver = true;
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
          : match("/fleetndriver")
          ? "fleetndriver"
          : null;

      if (activeKey) {
        (Object.keys(next) as SectionKey[]).forEach((k) => {
          next[k] = k === activeKey;
        });
      }
    }

    setOpenMap(next);
  }, [pathname]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap));
    } catch {
      // ignore
    }
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
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        <NavGroup
          href="#"
          label={t("nav.dashboard.title")}
          icon={IconDashboard}
          items={[
            {
              label: t("nav.dashboard.summary"),
              href: "/dashboard/ringkasanorder",
              icon: IconSummary,
            },
            {
              label: t("nav.dashboard.tracking"),
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
          href="#"
          label={t("nav.orders.title")}
          icon={IconOrders}
          items={[
            {
              label: t("nav.orders.list"),
              href: "/orders/list",
              icon: IconList,
            },
            {
              label: t("nav.orders.addresses"),
              href: "/orders/addresses/list",
              icon: IconList,
            },
          ]}
          open={openMap.orders}
          onToggle={toggle("orders")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />
        <NavGroup
          href="#"
          label={t("nav.claims.title")}
          icon={IconClaims}
          items={[
            {
              label: t("nav.claims.list"),
              href: "/claims/list",
              icon: IconList,
            },
          ]}
          open={openMap.claims}
          onToggle={toggle("claims")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />
        <NavGroup
          href="#"
          label={t("nav.finance.title")}
          icon={IconFinance}
          items={[
            {
              label: t("nav.finance.invoices"),
              href: "/finance/invoices",
              icon: IconInvoice,
            },
            {
              label: t("nav.finance.pricelist"),
              href: "/finance/pricelist",
              icon: IconList,
            },
          ]}
          open={openMap.finance}
          onToggle={toggle("finance")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />
        <NavGroup
          href="#"
          label={t("nav.downpayment.title")}
          icon={IconDownPayment}
          items={[
            {
              label: t("nav.downpayment.list"),
              href: "/downpayment/list",
              icon: IconList,
            },
          ]}
          open={openMap.downpayment}
          onToggle={toggle("downpayment")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />
        <NavGroup
          href="#"
          label={t("nav.vendorbill.title")}
          icon={IconVendorBill}
          items={[
            {
              label: t("nav.vendorbill.list"),
              href: "/vendorbill/list",
              icon: IconList,
            },
          ]}
          open={openMap.vendorbill}
          onToggle={toggle("vendorbill")}
          duration={240}
          easing="cubic-bezier(.2,.8,.2,1)"
        />
        {currentUserType === "transporter" && (
          <NavGroup
            href="#"
            label={t("nav.fleetndriver.title")}
            icon={IconTruck}
            items={[
              {
                label: t("nav.fleetndriver.fleet"),
                href: "/fleetndriver/fleet/list",
                icon: IconFleet,
              },
              {
                label: t("nav.fleetndriver.driver"),
                href: "/fleetndriver/driver/list",
                icon: IconDriver,
              },
            ]}
            open={openMap.fleetndriver}
            onToggle={toggle("fleetndriver")}
            duration={240}
            easing="cubic-bezier(.2,.8,.2,1)"
          />
        )}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-3">
        <NavLink
          href="/docs"
          label={t("nav.docs")}
          icon={IconDocs}
          className="inline-flex w-full items-center justify-center rounded-md  px-2 py-2 text-md font-extrabold "
        />
      </div>
    </div>
  );
});
