"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faCircleQuestion, faUser } from "@fortawesome/free-regular-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useEffect, useState } from "react";
import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
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
        if (!cancelled) setI18nReady(true);
      } catch (err) {
        console.error("[i18n] loadDictionaries failed:", err);
        if (!cancelled) setI18nReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!i18nReady) {
    return <section className="p-4 text-sm text-gray-500">Memuat…</section>;
  }

  const title = t("ringkasanorder.title");
  const subtitle = t("ringkasanorder.subtitle");
  const statsToday = t("ringkasanorder.statsToday");
  const orders = t("ringkasanorder.orders");

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2">
        <div className="col-span-12 lg:col-span-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
            <StatKPIBusiness label="Customer" icon={faUser} value="9,999" />
            <StatKPIBusiness
              label="Revenue"
              icon={faChartSimple}
              value="9,999"
            />
            <StatKPIBusiness label="Growth" icon={faChartLine} value="9,999" />
            <StatKPIBusiness
              label="Returns"
              icon={faPercentage}
              value="9,999"
            />
            <StatKPIBusiness
              label="Downloads"
              icon={faDownload}
              value="9,999"
            />
            <StatKPIBusiness
              label="Order"
              icon={faCartShopping}
              value="99,99%"
            />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-3">
          <div className="grid grid-cols-2 gap-1 text-gray-900">
            <Stat
              label="Total Profit"
              value="$1,248"
              trend={{ pct: 12, up: true }}
              isbgcolor={false}
            />
            <Stat
              label="Total Orders"
              value="1,100"
              trend={{ pct: 8, up: true }}
              isbgcolor={true}
            />
            <Stat
              label="Average Price"
              value="$34"
              trend={{ pct: 5, up: false }}
              isbgcolor={true}
            />
            <Stat
              label="Product Sold"
              value="114"
              trend={{ pct: 2, up: false }}
              isbgcolor={false}
            />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-sm bg-gray-50 shadow-soft border-0 p-5 mb-1 lg:m-1 lg:mb-1">
            <div className="text-black text-xs">
              Department wise monthly sales report
            </div>
            <div className="grid grid-cols-2 text-black mt-3">
              <div>
                $21,000.00
                <br />
                <span className="text-xs">Total Sales</span>
              </div>
              <div>
                $1953.0
                <br />
                <span className="text-xs">Average</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* <Card>
        <CardHeader>
          Monthly Activity<span>Requests by status (last 12 months)</span>
        </CardHeader>
        <CardBody>
          <div className="h-64 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 grid place-content-center text-gray-500">
            <span>Chart Placeholder</span>
          </div>
        </CardBody>
      </Card> */}
    </>
  );
}

type StatKPIBusinessProps = {
  label: string;
  value: React.ReactNode;
  trend?: React.ReactNode;
  /** Kirim object ikon hasil import, bukan string */
  icon?: IconDefinition;
};

export function Stat({
  label,
  value,
  trend,
  isbgcolor,
}: {
  label: string;
  value: string;
  trend?: { pct: number; up?: boolean };
  isbgcolor: boolean;
}) {
  return (
    <div className={isbgcolor ? "card card-pad card-bg" : "card card-pad"}>
      <div className={isbgcolor ? "text-white" : "card-label"}>{label}</div>
      <div className="card-content">
        <div className="card-sub-content">{value}</div>
      </div>
    </div>
  );
}

function StatKPIBusiness({ label, value, trend, icon }: StatKPIBusinessProps) {
  return (
    <div className="lg:bg-gray-400 bg-white text-black mr-1">
      <div className="kpi-business-card">
        <div className="kpi-business-icon-card">
          <FontAwesomeIcon
            icon={icon ?? faCircleQuestion}
            className="text-3xl lg:text-sm w-6 h-6"
          />
        </div>
        <div className="kpi-business-content-card">
          <span className="kpi-business-content-value">{value}</span>
          <span className="kpi-business-content-label">{label}</span>
        </div>
      </div>
    </div>
  );
}
