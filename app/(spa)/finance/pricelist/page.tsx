"use client";

import React, { useMemo } from "react";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import { CityItem, ModaItem } from "@/types/orders";
import { fmtDate, fmtPrice } from "@/lib/helpers";

const PL_URL = process.env.NEXT_PUBLIC_TMS_PRICELIST_URL ?? "";

type PriceListRow = {
  id: number | string;
  name: string;
  moda: ModaItem;
  cargo_type: string;
  origin_district: CityItem;
  dest_district: CityItem;
  min_quantity: number | string;
  price: number;
  date_start: string;
  date_end: string;
};

export default function FinancePriceListPage() {
  const { i18nReady, activeLang } = useI18nReady();

  const columns = useMemo<ColumnDef<PriceListRow>[]>(() => {
    return [
      {
        id: "id",
        label: t("pl.no"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.id,
        className: "w-44",
        defaultVisible: false,
      },
      {
        id: "name",
        label: t("pl.name"),
        sortable: true,
        sortValue: (info) => String(info.name ?? ""),
        cell: (info) => info.name,
        className: "w-44",
        mandatory: true,
      },
      // {
      //   id: "order_type",
      //   label: t("Order Type"),
      //   sortable: true,
      //   sortValue: (info) => String(info.id ?? ""),
      //   cell: (info) => info.order_type.name,
      //   className: "w-44",
      //   mandatory: true,
      // },
      {
        id: "moda",
        label: t("pl.moda"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.moda.name,
        className: "w-44",
        defaultVisible: true,
      },
      {
        id: "origin_district",
        label: t("pl.origin"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.origin_district.name,
        className: "w-44",
        defaultVisible: true,
      },
      {
        id: "dest_district",
        label: t("pl.destination"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => info.dest_district.name,
        className: "w-44",
        defaultVisible: true,
      },
      {
        id: "date_start",
        label: t("pl.date_start"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => fmtDate(info.date_start as string),
        className: "w-44",
        defaultVisible: false,
      },
      {
        id: "date_end",
        label: t("pl.date_end"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => fmtDate(info.date_end as string),
        className: "w-44",
        defaultVisible: false,
      },

      {
        id: "min_quantity",
        label: t("pl.min_qty"),
        sortable: true,
        sortValue: (info) => String(info.min_quantity ?? ""),
        cell: (info) => fmtPrice(info.min_quantity as number),
        className: "w-44",
        defaultVisible: false,
      },
      {
        id: "price",
        label: t("pl.price"),
        sortable: true,
        sortValue: (info) => String(info.id ?? ""),
        cell: (info) => fmtPrice(info.price as number),
        className: "w-44",
        mandatory: true,
      },
    ];
  }, [activeLang]);

  if (!i18nReady) return null;
  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<PriceListRow>
        fetchBase={`${PL_URL}`}
        deleteBase={`${PL_URL}`}
        enableEditAction={false}
        enableDetailsAction={true}
        enableDeleteAction={false}
        // onEditAction={(id, row, index) => {
        //   const ed_url = `/claims/details?id=${encodeURIComponent(String(id))}`;
        //   router.push(ed_url);
        // }}
        onDetailsAction={(id, row, index) => {
          console.log("{1} {2} {3}", id, row, index);
        }}
        getDetailsContent={(row, index) => {
          return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">Name</span>
                <span className="text-sm text-gray-900">{row.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  Cargo Type
                </span>
                <span className="text-sm text-gray-900">{row.cargo_type}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">Moda</span>
                <span className="text-sm text-gray-900">{row.moda.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  Min. Quantity
                </span>
                <span className="text-sm text-gray-900">
                  {row.min_quantity}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">Price</span>
                <span className="text-sm text-gray-900">{row.price}</span>
              </div>
            </div>
          );
        }}
        columns={columns}
        searchPlaceholder={t("invoices.search.placeholder")}
        rowsPerPageLabel={t("invoices.rowsPerPage")}
        // leftHeader={leftHeader}
        // initialSort={{ by: "order_type", dir: "desc" }}
        enableColumnVisibility={true}
        columnVisibilityStorageKey="price-lists-trans"
        getRowName={(r) => r.name}
        // rowNavigateTo={(id) => ({
        //   pathname: "finance/pricelist/details",
        //   query: { id },
        // })}
      />
    </div>
  );
}
