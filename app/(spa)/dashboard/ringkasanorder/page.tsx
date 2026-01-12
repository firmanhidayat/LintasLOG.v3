"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faCircleQuestion, faUser } from "@fortawesome/free-regular-svg-icons";
import { useEffect, useMemo, useState } from "react";
import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";
import {
  faCartShopping,
  faChartLine,
  faChartSimple,
  faDownload,
  faPercentage,
} from "@fortawesome/free-solid-svg-icons";

export default function RingkasanOrderPage() {
  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDictionaries();
      } catch (err) {
        console.error("[i18n] loadDictionaries failed:", err);
      } finally {
        if (!cancelled) setI18nReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locale = activeLang === "id" ? "id-ID" : "en-US";
  const currency = activeLang === "id" ? "IDR" : "USD";

  const nf = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale]
  );
  const cf = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [locale, currency]
  );
  const pf = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  if (!i18nReady) {
    return (
      <section className="p-4 text-sm text-gray-500">
        {t("common.loading")}
      </section>
    );
  }

  const title = t("ringkasanorder.title");
  const subtitle = t("ringkasanorder.subtitle");

  // Dummy numbers (ganti dengan data API)
  const customers = 9999;
  const revenue = 9999;
  const growth = 9999;
  const returns = 9999;
  const downloads = 9999;
  const orderRate = 0.9999;

  const totalProfit = 1248;
  const totalOrders = 1100;
  const averagePrice = 16.07;
  const quantity = 114;

  const deptTotalSales = 21000;
  const deptAverage = 1953;

  return (
    <>
      <header className="mb-3">
        <h1 className="text-base md:text-lg font-semibold text-gray-900">
          {title}
        </h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        Data Ringkasan Order akan ditampilkan di sini.<br />
        (Bagian ini sedang dalam pengembangan)
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <KPIItem
              label={t("ringkasanorder.kpi.customer")}
              icon={faUser}
              value={nf.format(customers)}
            />
            <KPIItem
              label={t("ringkasanorder.kpi.revenue")}
              icon={faChartSimple}
              value={nf.format(revenue)}
            />
            <KPIItem
              label={t("ringkasanorder.kpi.growth")}
              icon={faChartLine}
              value={nf.format(growth)}
            />
            <KPIItem
              label={t("ringkasanorder.kpi.returns")}
              icon={faPercentage}
              value={nf.format(returns)}
            />
            <KPIItem
              label={t("ringkasanorder.kpi.downloads")}
              icon={faDownload}
              value={nf.format(downloads)}
            />
            <KPIItem
              label={t("ringkasanorder.kpi.order")}
              icon={faCartShopping}
              value={pf.format(orderRate)}
            />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-3">
          <div className="grid grid-cols-2 gap-4 text-gray-900">
            <Stat
              label={t("ringkasanorder.stats.totalProfit")}
              value={cf.format(totalProfit)}
              trend={{ pct: 12, up: true }}
              highlight={false}
            />
            <Stat
              label={t("ringkasanorder.stats.totalOrders")}
              value={nf.format(totalOrders)}
              trend={{ pct: 8, up: true }}
              highlight={true}
            />
            <Stat
              label={t("ringkasanorder.stats.averagePrice")}
              value={cf.format(averagePrice)}
              trend={{ pct: 2, up: false }}
              highlight={false}
            />
            <Stat
              label={t("ringkasanorder.stats.quantity")}
              value={nf.format(quantity)}
              trend={{ pct: 2, up: false }}
              highlight={false}
            />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-md bg-gray-50 shadow-sm border border-gray-100 p-5">
            <div className="text-black text-xs">
              {t("ringkasanorder.departmentMonthlyTitle")}
            </div>
            <div className="grid grid-cols-2 text-black mt-3">
              <div>
                {cf.format(deptTotalSales)}
                <br />
                <span className="text-xs">
                  {t("ringkasanorder.totalSales")}
                </span>
              </div>
              <div>
                {cf.format(deptAverage)}
                <br />
                <span className="text-xs">{t("ringkasanorder.average")}</span>
              </div>
            </div>
          </div>
        </div>
      </div> */}
    </>
  );
}

/** KPI card: ikon kiri, angka+label kanan; proporsional & responsif */
function KPIItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: IconProp;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-white shadow-sm border border-gray-100 p-3">
      {/* Ikon proporsional; membesar di breakpoint */}
      <div className="flex-none rounded-md bg-green-700 text-white grid place-items-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16">
        <FontAwesomeIcon
          className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
          icon={icon ?? faCircleQuestion}
        />
      </div>

      {/* Angka + Label (tanpa truncate di desktop) */}
      <div className="flex-1">
        <div className="text-sm sm:text-base md:text-lg font-semibold leading-tight">
          {value}
        </div>
        <div className="text-[11px] sm:text-xs text-gray-500 leading-tight">
          {label}
        </div>
      </div>
    </div>
  );
}

type StatProps = {
  label: string;
  value: string;
  trend?: { pct: number; up?: boolean };
  highlight: boolean;
};

export function Stat({ label, value, trend, highlight }: StatProps) {
  return (
    <div className={highlight ? "card card-pad card-bg" : "card card-pad"}>
      <div className={highlight ? "text-white" : "card-label"}>{label}</div>
      <div className="card-content">
        <div className="card-sub-content flex items-baseline gap-2">
          <span>{value}</span>
          {trend && (
            <span
              className={
                trend.up ? "text-green-600 text-xs" : "text-red-600 text-xs"
              }
            >
              {trend.up ? "+" : "-"}
              {trend.pct}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
