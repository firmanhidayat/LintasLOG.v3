"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** ===== Types ===== */
type DPStatus = "Pending" | "Approved" | "Paid" | "Rejected";

type DownPaymentRow = {
  id: number | string;
  jo_no: string; // No. JO
  dp_percent?: number; // Down Payment % (mis. 20 => 20%)
  amount_total?: number; // Amount Total
  status: DPStatus | string;
};

/** ===== Helpers ===== */
function fmtPercent(p?: number) {
  if (p == null) return "-";
  return `${p}%`;
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
function Pill({ value }: { value: string }) {
  const color =
    value === "Approved"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : value === "Paid"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : value === "Rejected"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-amber-100 text-amber-700 border-amber-200"; // Pending/others
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {value}
    </span>
  );
}

/** ===== Dummy data ===== */
const DEMO_DP: DownPaymentRow[] = [
  {
    id: 9001,
    jo_no: "JO-2025-0015",
    dp_percent: 20,
    amount_total: 3_000_000,
    status: "Pending",
  },
  {
    id: 9002,
    jo_no: "JO-2025-0011",
    dp_percent: 50,
    amount_total: 7_500_000,
    status: "Approved",
  },
  {
    id: 9003,
    jo_no: "JO-2025-0009",
    dp_percent: 30,
    amount_total: 12_000_000,
    status: "Paid",
  },
];

export default function DownPaymentListPage() {
  const { i18nReady, activeLang } = useI18nReady();

  // Definisikan columns via useMemo (non-kondisional); t() hanya dipanggil saat i18n siap
  const columns = useMemo<ColumnDef<DownPaymentRow>[]>(() => {
    const L = (key: string, fallback: string) =>
      i18nReady && activeLang ? t(key) || fallback : fallback;

    return [
      {
        id: "jo_no",
        label: L("downpayment.columns.joNo", "No. JO"),
        sortable: true,
        sortValue: (r) => r.jo_no.toLowerCase(),
        className: "w-40",
        cell: (r) => <div className="font-medium text-gray-900">{r.jo_no}</div>,
      },
      {
        id: "dp_percent",
        label: L("downpayment.columns.dpPercent", "Down Payment %"),
        sortable: true,
        sortValue: (r) => String(r.dp_percent ?? ""),
        className: "w-40 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPercent(r.dp_percent)}</span>
        ),
      },
      {
        id: "amount_total",
        label: L("downpayment.columns.amountTotal", "Amount Total"),
        sortable: true,
        sortValue: (r) => String(r.amount_total ?? ""),
        className: "w-44 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
        ),
      },
      {
        id: "status",
        label: L("downpayment.columns.status", "Status"),
        sortable: true,
        sortValue: (r) => String(r.status),
        className: "w-40",
        cell: (r) => <Pill value={String(r.status)} />,
      },
    ];
  }, [i18nReady, activeLang]);

  // Guard render setelah semua hooks terpanggil
  if (!i18nReady) return null;

  const leftHeader = (
    <div className="flex items-center gap-2">
      <Link
        href="/downpayment/create"
        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {t("downpayment.create.title") || "Create Down Payment"}
      </Link>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<DownPaymentRow>
        fetchBase={`${API_BASE}/api-tms/finance/downpayments`} // diabaikan saat staticData dipakai
        deleteBase={`${API_BASE}/api-tms/finance/downpayments`} // diabaikan saat staticData dipakai
        columns={columns}
        searchPlaceholder={
          t("downpayment.search.placeholder") || "Cari down payment..."
        }
        rowsPerPageLabel={t("downpayment.rowsPerPage") || "Baris per halaman"}
        leftHeader={leftHeader}
        initialSort={{ by: "jo_no", dir: "desc" }}
        getRowName={(r) => r.jo_no}
        staticData={DEMO_DP}
        staticSearch={(row, q) =>
          row.jo_no.toLowerCase().includes(q) ||
          String(row.dp_percent ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.amount_total ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.status).toLowerCase().includes(q)
        }
      />
    </div>
  );
}
