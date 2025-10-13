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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** ===== Types ===== */
type TwoState = "Approved" | "Paid";

type InvoiceRow = {
  id: number | string;
  invoice_no: string; // No. Invoice
  jo_no?: string; // No. JO
  partner_name?: string; // Customer
  order_type?: string; // Jenis Order
  amount_total?: number; // Amount Total
  payment_status: TwoState; // Payment Status
  invoice_status: TwoState; // Invoice Status
};

/** ===== Helpers ===== */
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

function Pill({ value }: { value: TwoState }) {
  const color =
    value === "Approved"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-blue-100 text-blue-700 border-blue-200"; // Paid
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {value}
    </span>
  );
}

/** ===== Dummy data ===== */
const DEMO_INVOICES: InvoiceRow[] = [
  {
    id: 7001,
    invoice_no: "INV/2025/0010",
    jo_no: "JO-2025-0015",
    partner_name: "PT Andalan Makmur",
    order_type: "LTL",
    amount_total: 3_250_000,
    payment_status: "Approved",
    invoice_status: "Approved",
  },
  {
    id: 7002,
    invoice_no: "INV/2025/0011",
    jo_no: "JO-2025-0011",
    partner_name: "CV Nusantara Jaya",
    order_type: "FTL",
    amount_total: 7_900_000,
    payment_status: "Paid",
    invoice_status: "Paid",
  },
  {
    id: 7003,
    invoice_no: "INV/2025/0012",
    jo_no: "JO-2025-0009",
    partner_name: "PT Sentosa Abadi",
    order_type: "Container",
    amount_total: 12_450_000,
    payment_status: "Approved",
    invoice_status: "Paid",
  },
];

export default function InvoicesListPage() {
  const { i18nReady, activeLang } = useI18nReady();

  // Definisikan columns tanpa conditional hook.
  // t() hanya dipanggil saat i18n ready untuk hindari warning build.
  const columns = useMemo<ColumnDef<InvoiceRow>[]>(() => {
    const L = (key: string, fallback: string) =>
      i18nReady && activeLang ? t(key) || fallback : fallback;

    return [
      {
        id: "invoice_no",
        label: L("invoices.columns.invoiceNo", "No. Invoice"),
        sortable: true,
        sortValue: (r) => r.invoice_no.toLowerCase(),
        className: "w-44",
        cell: (r) => (
          <div className="font-medium text-gray-900">{r.invoice_no}</div>
        ),
      },
      {
        id: "jo_no",
        label: L("invoices.columns.joNo", "No. JO"),
        sortable: true,
        sortValue: (r) => (r.jo_no ?? "").toLowerCase(),
        className: "w-36",
        cell: (r) => r.jo_no ?? "-",
      },
      {
        id: "partner_name",
        label: L("invoices.columns.customer", "Customer"),
        sortable: true,
        sortValue: (r) => (r.partner_name ?? "").toLowerCase(),
        className: "min-w-52",
        cell: (r) => r.partner_name ?? "-",
      },
      {
        id: "order_type",
        label: L("invoices.columns.orderType", "Jenis Order"),
        sortable: true,
        sortValue: (r) => (r.order_type ?? "").toLowerCase(),
        className: "w-36",
        cell: (r) => r.order_type ?? "-",
      },
      {
        id: "amount_total",
        label: L("invoices.columns.amountTotal", "Amount Total"),
        sortable: true,
        sortValue: (r) => String(r.amount_total ?? ""),
        className: "w-44 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
        ),
      },
      {
        id: "payment_status",
        label: L("invoices.columns.paymentStatus", "Payment Status"),
        sortable: true,
        sortValue: (r) => r.payment_status,
        className: "w-44",
        cell: (r) => <Pill value={r.payment_status} />,
      },
      {
        id: "invoice_status",
        label: L("invoices.columns.invoiceStatus", "Invoice Status"),
        sortable: true,
        sortValue: (r) => r.invoice_status,
        className: "w-44",
        cell: (r) => <Pill value={r.invoice_status} />,
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
                href={`/claims/details?id=${encodeURIComponent(String(it.id))}`}
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
                    detail: { id: it.id, name: it.invoice_no },
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
    ];
  }, [i18nReady, activeLang]);

  // Guard render setelah hook dipanggil
  if (!i18nReady) return null;

  const leftHeader = (
    <div className="flex items-center gap-2">
      <Link
        href="/finance/invoices/create"
        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {t("invoices.create.title") || "Create Invoice"}
      </Link>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<InvoiceRow>
        fetchBase={`${API_BASE}/api-tms/finance/invoices`} // diabaikan saat staticData dipakai
        deleteBase={`${API_BASE}/api-tms/finance/invoices`} // diabaikan saat staticData dipakai
        columns={columns}
        searchPlaceholder={
          t("invoices.search.placeholder") || "Cari invoice..."
        }
        rowsPerPageLabel={t("invoices.rowsPerPage") || "Baris per halaman"}
        leftHeader={leftHeader}
        initialSort={{ by: "invoice_no", dir: "desc" }}
        getRowName={(r) => r.invoice_no}
        staticData={DEMO_INVOICES}
        staticSearch={(row, q) =>
          row.invoice_no.toLowerCase().includes(q) ||
          (row.partner_name ?? "").toLowerCase().includes(q) ||
          (row.jo_no ?? "").toLowerCase().includes(q) ||
          (row.order_type ?? "").toLowerCase().includes(q) ||
          String(row.payment_status).toLowerCase().includes(q) ||
          String(row.invoice_status).toLowerCase().includes(q)
        }
      />
    </div>
  );
}
