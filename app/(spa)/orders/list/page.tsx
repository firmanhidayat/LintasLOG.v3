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
import { OrderRow } from "@/types/orders";
import { fmtDate, fmtPrice } from "@/lib/helpers";
// import { StatusStep } from "@/types/status-delivery";
import { GetStatesInLine } from "@/components/ui/DeliveryState";

const GET_ORDERS_URL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";

export default function OrdersListPage() {
  const { i18nReady, activeLang } = useI18nReady();
  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        id: "jo_no",
        label: t("orders.columns.joNo") || "No. JO",
        sortable: true,
        sortValue: (r) => r.name ?? "",
        className: "w-40",
        cell: (r) => <div className="font-medium text-gray-900">{r.name}</div>,
      },
      {
        id: "pickup_date",
        label: t("orders.columns.pickupDate") || "Tanggal Pickup",
        sortable: true,
        sortValue: (r) => r.pickup_date_planne ?? "",
        className: "w-36",
        cell: (r) =>
          r.route_ids.length > 0
            ? r.route_ids[0].is_main_route
              ? fmtDate(r.route_ids[0].etd_date)
              : "-"
            : "-",
      },
      {
        id: "pickup_to",
        label: t("orders.columns.pickupTo") || "Tujuan Pickup",
        sortable: true,
        sortValue: (r) => (r.origin_city?.name ?? "").toLowerCase(),
        cell: (r) => (
          <span className="text-gray-700">{r.origin_city?.name ?? "-"}</span>
        ),
      },
      {
        id: "drop_date",
        label: t("orders.columns.dropDate") || "Tanggal Drop",
        sortable: true,
        sortValue: (r) => r.drop_off_date_planne ?? "",
        className: "w-36",
        cell: (r) =>
          r.route_ids.length > 0
            ? r.route_ids[0].is_main_route
              ? fmtDate(r.route_ids[0].eta_date)
              : "-"
            : "-",
      },
      {
        id: "drop_to",
        label: t("orders.columns.dropTo") || "Tujuan Drop",
        sortable: true,
        sortValue: (r) => (r.dest_city?.name ?? "").toLowerCase(),
        cell: (r) => (
          <span className="text-gray-700">{r.dest_city?.name ?? "-"}</span>
        ),
      },
      {
        id: "special_request",
        label: t("orders.columns.specialRequest") || "Permintaan Khusus",
        sortable: true,
        sortValue: (r) => (r.requirement_other ?? "").toLowerCase(),
        className: "min-w-60",
        cell: (r) => r.requirement_other?.trim() || "-",
      },
      {
        id: "price",
        label: t("orders.columns.price") || "Harga",
        sortable: true,
        sortValue: (r) => String(r.amount_total ?? ""),
        className: "w-36 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
        ),
      },
      {
        id: "status",
        label: t("orders.columns.status") || "Status",
        sortable: true,
        sortValue: (r) => r.states.find((s) => s.is_current)?.key || "unknown",
        className: "w-44",
        cell: (r) =>
          r.states.find((s) => s.is_current)?.is_current ? (
            <GetStatesInLine
              value={r.states.find((s) => s.is_current)?.key || "unknown"}
              label={r.states.find((s) => s.is_current)?.label || "unknown"}
            />
          ) : (
            <GetStatesInLine value="unknown" label="unknown" />
          ),
      },
      {
        id: "actions",
        label: "",
        isAction: true,
        className: "w-20",
        cell: (it) => (
          <div className="flex items-center gap-2">
            {it.id != null ? (
              <Link
                data-stop-rowclick
                href={`/orders/details?id=${encodeURIComponent(String(it.id))}`}
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
                    detail: { id: it.id, name: it.name },
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
    ],
    [activeLang]
  );

  if (!i18nReady) return null;

  const leftHeader = (
    <div className="flex items-center gap-2">
      <Link
        href="/orders/create"
        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {t("orders.create.title")}
      </Link>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<OrderRow>
        key={"orders-" + (t("lang") || "id")}
        fetchBase={`${GET_ORDERS_URL}`}
        deleteBase={`${GET_ORDERS_URL}`}
        columns={columns}
        searchPlaceholder={t("orders.search.placeholder")}
        rowsPerPageLabel={t("orders.rowsPerPage")}
        initialPageSize={80}
        initialSort={{ by: "id", dir: "desc" }}
        leftHeader={leftHeader}
        rowNavigateTo={(id) => ({ pathname: "orders/details", query: { id } })}
      />
    </div>
  );
}
