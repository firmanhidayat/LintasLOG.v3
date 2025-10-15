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
const USE_STATIC = true;

type ClaimStatus =
  | "Pending"
  | "Submitted"
  | "In Review"
  | "Approved"
  | "Rejected"
  | "Paid"
  | "Closed";

type ClaimRow = {
  id: number | string;
  claim_no: string; // No. Claim
  jo_no: string; // No. JO
  claim_date?: string; // ISO date
  description?: string; // Description
  order_type?: string; // Jenis Order
  amount_total?: number; // Amount Total
  status: ClaimStatus | string; // Status
};

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
function StatusPill({ value }: { value: string }) {
  const color =
    value === "Pending"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : value === "Submitted"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : value === "In Review"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : value === "Approved"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : value === "Rejected"
      ? "bg-red-100 text-red-700 border-red-200"
      : value === "Paid"
      ? "bg-cyan-100 text-cyan-700 border-cyan-200"
      : "bg-violet-100 text-violet-700 border-violet-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {value}
    </span>
  );
}

/** Dummy data (aktif jika NEXT_PUBLIC_DUMMY=1) */
const DEMO_CLAIMS: ClaimRow[] = [
  {
    id: 101,
    claim_no: "CLM-2025-0001",
    jo_no: "JO-2025-0002",
    claim_date: "2025-10-06",
    description: "Kerusakan kemasan sebagian",
    order_type: "LTL",
    amount_total: 450_000,
    status: "In Review",
  },
  {
    id: 102,
    claim_no: "CLM-2025-0002",
    jo_no: "JO-2025-0003",
    claim_date: "2025-10-05",
    description: "Keterlambatan 1 hari",
    order_type: "FTL",
    amount_total: 250_000,
    status: "Approved",
  },
  {
    id: 103,
    claim_no: "CLM-2025-0003",
    jo_no: "JO-2025-0001",
    claim_date: "2025-10-04",
    description: "Hilang 1 karton",
    order_type: "Container",
    amount_total: 1_250_000,
    status: "Pending",
  },
];

export default function ClaimsListPage() {
  const { i18nReady, activeLang } = useI18nReady();

  // FIX 1: panggil useMemo TANPA kondisi.
  // FIX 2: gunakan i18nReady DI DALAM memo agar t() hanya dipanggil jika siap.
  // FIX 3: "baca" activeLang (dipakai di ekspresi) supaya dependency valid.
  const columns = useMemo<ColumnDef<ClaimRow>[]>(() => {
    const L = (key: string, fallback: string) =>
      i18nReady && activeLang ? t(key) || fallback : fallback;

    return [
      {
        id: "claim_no",
        label: L("claims.columns.claimNo", "No. Claim"),
        sortable: true,
        sortValue: (r) => r.claim_no.toLowerCase(),
        className: "w-40",
        cell: (r) => (
          <div className="font-medium text-gray-900">{r.claim_no}</div>
        ),
      },
      {
        id: "jo_no",
        label: L("claims.columns.joNo", "No. JO"),
        sortable: true,
        sortValue: (r) => r.jo_no.toLowerCase(),
        className: "w-36",
        cell: (r) => r.jo_no,
      },
      {
        id: "claim_date",
        label: L("claims.columns.claimDate", "Claim Date"),
        sortable: true,
        sortValue: (r) => r.claim_date ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.claim_date),
      },
      {
        id: "description",
        label: L("claims.columns.description", "Description"),
        sortable: true,
        sortValue: (r) => (r.description ?? "").toLowerCase(),
        className: "min-w-60",
        cell: (r) => r.description?.trim() || "-",
      },
      {
        id: "order_type",
        label: L("claims.columns.orderType", "Jenis Order"),
        sortable: true,
        sortValue: (r) => (r.order_type ?? "").toLowerCase(),
        className: "w-36",
        cell: (r) => r.order_type ?? "-",
      },
      {
        id: "amount_total",
        label: L("claims.columns.amountTotal", "Amount Total"),
        sortable: true,
        sortValue: (r) => String(r.amount_total ?? ""),
        className: "w-40 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
        ),
      },
      {
        id: "status",
        label: L("claims.columns.status", "Status"),
        sortable: true,
        sortValue: (r) => String(r.status),
        className: "w-40",
        cell: (r) => <StatusPill value={String(r.status)} />,
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
                    detail: { id: it.id, name: it.claim_no },
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

  // Setelah semua hook dipanggil, baru boleh guard render
  if (!i18nReady) return null;

  const leftHeader = (
    <div className="flex items-center gap-2">
      <Link
        href="/claims/create"
        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {t("claims.create.title") || "Create Claim"}
      </Link>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<ClaimRow>
        fetchBase={`${API_BASE}/api-tms/claims/list`} // diabaikan jika staticData aktif
        deleteBase={`${API_BASE}/api-tms/claims`} // diabaikan jika staticData aktif
        columns={columns}
        searchPlaceholder={t("claims.search.placeholder") || "Cari claim..."}
        rowsPerPageLabel={t("claims.rowsPerPage") || "Baris per halaman"}
        leftHeader={leftHeader}
        initialSort={{ by: "claim_date", dir: "desc" }}
        getRowName={(r) => r.claim_no}
        staticData={USE_STATIC ? DEMO_CLAIMS : undefined}
        staticSearch={(row, q) =>
          row.claim_no.toLowerCase().includes(q) ||
          row.jo_no.toLowerCase().includes(q) ||
          (row.description ?? "").toLowerCase().includes(q) ||
          (row.order_type ?? "").toLowerCase().includes(q) ||
          String(row.status).toLowerCase().includes(q)
        }
        rowNavigateTo={(id) => ({ pathname: "claims/details", query: { id } })}
      />
    </div>
  );
}
