"use client";

import React, { useMemo } from "react";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { CityItem, ModaItem, OrderTypeItem } from "@/types/orders";
import { fmtDate, fmtPrice } from "@/lib/helpers";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type PriceListRow = {
  id: number | string;
  order_type: OrderTypeItem;
  moda: ModaItem;
  origin_district: CityItem;
  dest_district: CityItem;
  date_start: string;
  date_end: string;
  price: number;
};
const DEMO_PRICELIST: PriceListRow[] = [
  {
    id: 1,
    order_type: { id: 1, name: "LTL" },
    moda: { id: 1, name: "Truck" },
    origin_district: { id: 1, name: "Jakarta" },
    dest_district: { id: 2, name: "Bandung" },
    date_start: "2024-01-01",
    date_end: "2024-12-31",
    price: 1500000,
  },
  {
    id: 2,
    order_type: { id: 2, name: "FTL" },
    moda: { id: 2, name: "Train" },
    origin_district: { id: 3, name: "Surabaya" },
    dest_district: { id: 4, name: "Yogyakarta" },
    date_start: "2024-02-01",
    date_end: "2024-11-30 ",
    price: 2500000,
  },
];
export default function FinancePriceListPage() {
  const { i18nReady, activeLang } = useI18nReady();

  const columns = useMemo<ColumnDef<PriceListRow>[]>(() => {
    return [
      {
        id: "id",
        label: t("No."),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.id,
        className: "w-44",
      },
      {
        id: "order_type",
        label: t("Order Type"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.order_type.name,
        className: "w-44",
      },
      {
        id: "moda",
        label: t("Moda"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.moda.name,
        className: "w-44",
      },
      {
        id: "origin_district",
        label: t("Origin"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.origin_district.name,
        className: "w-44",
      },
      {
        id: "dest_district",
        label: t("Destination"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.dest_district.name,
        className: "w-44",
      },
      {
        id: "date_start",
        label: t("Valid From"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => fmtDate(info.date_start as string),
        className: "w-44",
      },
      {
        id: "date_end",
        label: t("Valid To"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => fmtDate(info.date_end as string),
        className: "w-44",
      },
      {
        id: "price",
        label: t("Price"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => fmtPrice(info.price as number),
        className: "w-44",
      },
      {
        id: "actions",
        label: "",
        header: "",
        isAction: true,
        className: "w-20",
        cell: (it) => (
          <div className="flex items-center gap-2">
            {it.id != null ? (
              <Link
                data-stop-rowclick
                href={`/claims/details?id=${encodeURIComponent(String(it.id))}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
                aria-label="Edit address"
                title="Edit"
              >
                <Icon name="pencil" className="h-3 w-3" />
              </Link>
            ) : (
              <button
                data-stop-rowclick
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border opacity-50"
                title="Edit (unavailable)"
                disabled
              >
                <Icon name="pencil" className="h-3 w-3" />
              </button>
            )}

            {it.id != null ? (
              <button
                data-stop-rowclick
                type="button"
                onClick={() => {
                  // ListTemplate kini menangani event ini & membuka modal konfirmasi
                  const evt = new CustomEvent("llog.openDeleteConfirm", {
                    detail: { id: it.id, name: it.order_type.name },
                  });
                  window.dispatchEvent(evt);
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
                aria-label="Delete address"
                title="Delete"
              >
                <Icon
                  name="trash"
                  className="h-3 w-3 text-red-600"
                  strokeWidth={1.5}
                />
              </button>
            ) : (
              <button
                data-stop-rowclick
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border opacity-50"
                title="Delete (unavailable)"
                disabled
              >
                <Icon
                  name="trash"
                  className="h-3 w-3 text-red-600"
                  strokeWidth={1.5}
                />
              </button>
            )}
          </div>
        ),
      },
    ];
  }, [activeLang]);

  if (!i18nReady) return null;
  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<PriceListRow>
        fetchBase={`${API_BASE}/api-tms/finance/price-list`} // diabaikan saat staticData dipakai
        deleteBase={`${API_BASE}/api-tms/finance/price-list`} // diabaikan saat staticData dipakai
        columns={columns}
        searchPlaceholder={t("invoices.search.placeholder")}
        rowsPerPageLabel={t("invoices.rowsPerPage")}
        // leftHeader={leftHeader}
        // initialSort={{ by: "order_type", dir: "desc" }}
        getRowName={(r) => r.order_type.name}
        staticData={DEMO_PRICELIST}
        staticSearch={(row, q) =>
          row.order_type.name.toLowerCase().includes(q) ||
          (row.moda.name ?? "").toLowerCase().includes(q) ||
          row.origin_district.name.toLowerCase().includes(q)
        }
        rowNavigateTo={(id) => ({
          pathname: "finance/pricelist/details",
          query: { id },
        })}
      />
    </div>
  );
}
