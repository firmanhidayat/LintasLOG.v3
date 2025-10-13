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
import { OrderRow, OrderStatus } from "@/types/orders";
import { fmtDate, fmtPrice } from "@/lib/helpers";

const GET_ORDERS_URL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";

function StatusPill({ value }: { value: OrderStatus }) {
  const color =
    value === "Pending"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : value === "Accepted"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : value === "On Preparation"
      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
      : value === "Pickup"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : value === "On Delivery"
      ? "bg-cyan-100 text-cyan-700 border-cyan-200"
      : value === "Received"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : value === "On Review"
      ? "bg-violet-100 text-violet-700 border-violet-200"
      : "bg-green-100 text-green-700 border-green-200"; // Done

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {value}
    </span>
  );
}

export default function OrdersListPage() {
  const { i18nReady, activeLang } = useI18nReady();
  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        id: "jo_no",
        label: t("orders.columns.joNo") || "No. JO",
        sortable: true,
        sortValue: (r) => r.jo_no ?? "",
        className: "w-40",
        cell: (r) => <div className="font-medium text-gray-900">{r.jo_no}</div>,
      },
      {
        id: "pickup_date",
        label: t("orders.columns.pickupDate") || "Tanggal Pickup",
        sortable: true,
        sortValue: (r) => r.pickup_date_planne ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.pickup_date_planne),
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
        cell: (r) => fmtDate(r.drop_off_date_planne),
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
        sortValue: (r) => (r.special_request ?? "").toLowerCase(),
        className: "min-w-60",
        cell: (r) => r.special_request?.trim() || "-",
      },
      {
        id: "price",
        label: t("orders.columns.price") || "Harga",
        sortable: true,
        sortValue: (r) => String(r.price ?? ""),
        className: "w-36 text-right",
        cell: (r) => <span className="tabular-nums">{fmtPrice(r.price)}</span>,
      },
      {
        id: "status",
        label: t("orders.columns.status") || "Status",
        sortable: true,
        sortValue: (r) => r.status,
        className: "w-44",
        cell: (r) => <StatusPill value={r.status} />,
        // jika menambahkan filter di ListTemplate, bisa aktifkan:
        // filter: { type: "select", options: STATUS_ORDER.map(s => ({ label: s, value: s })) },
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
                href={`/orders/details?id=${encodeURIComponent(String(it.id))}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
                aria-label="Edit address"
                title="Edit"
              >
                <Icon name="pencil" className="h-3 w-3" />
              </Link>
            ) : (
              <button
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
                type="button"
                onClick={() => {
                  // ListTemplate kini menangani event ini & membuka modal konfirmasi
                  const evt = new CustomEvent("llog.openDeleteConfirm", {
                    detail: { id: it.id, name: it.jo_no },
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
        fetchBase={`${GET_ORDERS_URL}`}
        deleteBase={`${GET_ORDERS_URL}`}
        columns={columns}
        searchPlaceholder={t("orders.search.placeholder")}
        rowsPerPageLabel={t("orders.rowsPerPage")}
        initialPageSize={80}
        leftHeader={leftHeader}
      />
    </div>
  );
}
