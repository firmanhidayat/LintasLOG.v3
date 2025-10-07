"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const USE_STATIC = true;

/** ===== Types ===== */
type OrderStatus =
  | "Pending"
  | "Accepted"
  | "On Preparation"
  | "Pickup"
  | "On Delivery"
  | "Received"
  | "On Review"
  | "Done";

type OrderRow = {
  id: number | string;
  jo_no: string;
  pickup_date?: string;
  pickup_to?: string;
  drop_date?: string;
  drop_to?: string;
  special_request?: string;
  price?: number;
  status: OrderStatus;
};

/** ===== Helpers ===== */
function fmtDate(d?: string) {
  if (!d) return "-";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function fmtPrice(v?: number) {
  if (v == null) return "-";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return String(v);
  }
}
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

/** ===== Dummy data (dipakai hanya jika NEXT_PUBLIC_DUMMY=1) ===== */
const DEMO_ORDERS: OrderRow[] = [
  {
    id: 1,
    jo_no: "JO-2025-0001",
    pickup_date: "2025-10-05",
    pickup_to: "Gudang A, Jakarta",
    drop_date: "2025-10-06",
    drop_to: "Outlet X, Bandung",
    special_request: "Fragile, jangan ditumpuk",
    price: 1_250_000,
    status: "On Delivery",
  },
  {
    id: 2,
    jo_no: "JO-2025-0002",
    pickup_date: "2025-10-06",
    pickup_to: "Pelabuhan Tj. Priok",
    drop_date: "2025-10-07",
    drop_to: "Gudang B, Surabaya",
    special_request: "Butuh pendingin",
    price: 3_500_000,
    status: "Accepted",
  },
  {
    id: 3,
    jo_no: "JO-2025-0003",
    pickup_date: "2025-10-04",
    pickup_to: "DC Cikarang",
    drop_date: "2025-10-05",
    drop_to: "Ritel Y, Semarang",
    special_request: "",
    price: 1_780_000,
    status: "Done",
  },
];

export default function OrdersListPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();

  // kolom mengikuti ColumnDef<T> dari ListTemplate (bukan key/header/render versi lain)
  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        id: "jo_no",
        label: t("orders.columns.joNo") || "No. JO",
        sortable: true,
        sortValue: (r) => r.jo_no.toLowerCase(),
        className: "w-40",
        cell: (r) => <div className="font-medium text-gray-900">{r.jo_no}</div>,
      },
      {
        id: "pickup_date",
        label: t("orders.columns.pickupDate") || "Tanggal Pickup",
        sortable: true,
        sortValue: (r) => r.pickup_date ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.pickup_date),
      },
      {
        id: "pickup_to",
        label: t("orders.columns.pickupTo") || "Tujuan Pickup",
        sortable: true,
        sortValue: (r) => (r.pickup_to ?? "").toLowerCase(),
        cell: (r) => (
          <span className="text-gray-700">{r.pickup_to ?? "-"}</span>
        ),
      },
      {
        id: "drop_date",
        label: t("orders.columns.dropDate") || "Tanggal Drop",
        sortable: true,
        sortValue: (r) => r.drop_date ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.drop_date),
      },
      {
        id: "drop_to",
        label: t("orders.columns.dropTo") || "Tujuan Drop",
        sortable: true,
        sortValue: (r) => (r.drop_to ?? "").toLowerCase(),
        cell: (r) => <span className="text-gray-700">{r.drop_to ?? "-"}</span>,
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
        // jika kamu menambahkan filter di ListTemplate, bisa aktifkan:
        // filter: { type: "select", options: STATUS_ORDER.map(s => ({ label: s, value: s })) },
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
        fetchBase={`${API_BASE}/api-tms/orders/list`}
        deleteBase={`${API_BASE}/api-tms/orders`}
        columns={columns}
        searchPlaceholder={t("orders.search.placeholder") || "Cari order..."}
        rowsPerPageLabel={t("orders.rowsPerPage") || "Baris per halaman"}
        leftHeader={leftHeader}
        initialSort={{ by: "pickup_date", dir: "desc" }}
        // === inilah kuncinya: saat NEXT_PUBLIC_DUMMY=1, pakai data statis ===
        staticData={USE_STATIC ? DEMO_ORDERS : undefined}
        // optional: cara pencarian khusus saat static
        staticSearch={(row, q) =>
          row.jo_no.toLowerCase().includes(q) ||
          (row.pickup_to ?? "").toLowerCase().includes(q) ||
          (row.drop_to ?? "").toLowerCase().includes(q) ||
          (row.special_request ?? "").toLowerCase().includes(q) ||
          row.status.toLowerCase().includes(q)
        }
      />
    </div>
  );
}
