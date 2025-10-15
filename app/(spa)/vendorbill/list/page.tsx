"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";

import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import { Icon } from "@/components/icons/Icon";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
//
/** ===== Types ===== */
type TwoState = "Approved" | "Paid";

type VendorBillRow = {
  id: number | string;
  bill_no: string; // No. Bill
  jo_no?: string; // No. JO
  bill_date?: string; // Tanggal (ISO)
  amount_total?: number; // Amount Total
  status: TwoState; // Status (Approved, Paid)
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
const DEMO_VENDOR_BILLS: VendorBillRow[] = [
  {
    id: 8101,
    bill_no: "BILL/2025/0007",
    jo_no: "JO-2025-0015",
    bill_date: "2025-10-05",
    amount_total: 4_200_000,
    status: "Approved",
  },
  {
    id: 8102,
    bill_no: "BILL/2025/0008",
    jo_no: "JO-2025-0011",
    bill_date: "2025-10-04",
    amount_total: 6_750_000,
    status: "Paid",
  },
  {
    id: 8103,
    bill_no: "BILL/2025/0009",
    jo_no: "JO-2025-0009",
    bill_date: "2025-10-06",
    amount_total: 2_950_000,
    status: "Approved",
  },
];

export default function VendorBillListPage() {
  const { i18nReady, activeLang } = useI18nReady();
  const columns = useMemo<ColumnDef<VendorBillRow>[]>(() => {
    return [
      {
        id: "bill_no",
        label: t("vendorbill.columns.billNo"),
        sortable: true,
        sortValue: (r) => r.bill_no.toLowerCase(),
        className: "w-44",
        cell: (r) => (
          <div className="font-medium text-gray-900">{r.bill_no}</div>
        ),
      },
      {
        id: "jo_no",
        label: t("vendorbill.columns.joNo"),
        sortable: true,
        sortValue: (r) => (r.jo_no ?? "").toLowerCase(),
        className: "w-36",
        cell: (r) => r.jo_no ?? "-",
      },
      {
        id: "bill_date",
        label: t("vendorbill.columns.date"),
        sortable: true,
        sortValue: (r) => r.bill_date ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.bill_date),
      },
      {
        id: "amount_total",
        label: t("vendorbill.columns.amountTotal"),
        sortable: true,
        sortValue: (r) => String(r.amount_total ?? ""),
        className: "w-44 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
        ),
      },
      {
        id: "status",
        label: t("vendorbill.columns.status"),
        sortable: true,
        sortValue: (r) => r.status,
        className: "w-36",
        cell: (r) => <Pill value={r.status} />,
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
                // href={`/claims/details?id=${encodeURIComponent(String(it.id))}`}
                href="#"
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
                    detail: { id: it.id, name: it.bill_no },
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
  }, [i18nReady, activeLang]);

  // Guard render setelah hooks
  if (!i18nReady) return null;

  const leftHeader = (
    <div className="flex items-center gap-2">
      <Link
        href="/vendorbill/create"
        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {t("vendorbill.create.title") || "Create Vendor Bill"}
      </Link>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<VendorBillRow>
        key={activeLang} // reset state internal ListTemplate jika ganti bahasa
        fetchBase={`${API_BASE}/api-tms/finance/vendorbills`} // diabaikan saat staticData dipakai
        deleteBase={`${API_BASE}/api-tms/finance/vendorbills`} // diabaikan saat staticData dipakai
        columns={columns}
        searchPlaceholder={
          t("vendorbill.search.placeholder") || "Cari vendor bill..."
        }
        rowsPerPageLabel={t("vendorbill.rowsPerPage") || "Baris per halaman"}
        leftHeader={leftHeader}
        initialSort={{ by: "bill_date", dir: "desc" }}
        getRowName={(r) => r.bill_no}
        staticData={DEMO_VENDOR_BILLS}
        staticSearch={(row, q) =>
          row.bill_no.toLowerCase().includes(q) ||
          (row.jo_no ?? "").toLowerCase().includes(q) ||
          (row.bill_date ?? "").toLowerCase().includes(q) ||
          String(row.amount_total ?? "")
            .toLowerCase()
            .includes(q) ||
          row.status.toLowerCase().includes(q)
        }
        rowNavigateTo={(id) => ({
          pathname: "vendorbill/details",
          query: { id },
        })}
      />
    </div>
  );
}
