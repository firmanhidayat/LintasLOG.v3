"use client";

import React, { useMemo } from "react";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import Link from "next/link";
import { RecordItem } from "@/types/recorditem";
// import { StatusStep } from "@/types/status-delivery";
import { useRouter } from "next/navigation";
import { fmtDate, fmtPrice, capitalizeIfLowercase } from "@/lib/helpers";
import { ClaimAttachmentGroup } from "@/features/claims/ClaimsFormController";

const CLAIMS_URL = process.env.NEXT_PUBLIC_TMS_CLAIMS_URL ?? "";
type ClaimRow = {
  id: number | string;
  name?: string;
  date?: string;
  purchase_order?: RecordItem;
  amount?: number;
  // states: StatusStep;
  state: string;
  document_attachment: ClaimAttachmentGroup;
};

function StatusPill({ value }: { value: string }) {
  const color =
    value === "draft"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : value === "reviewed"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : // : value === "approved"
      // ? "bg-amber-100 text-amber-700 border-amber-200"
      value === "approved"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : value === "reject"
      ? "bg-red-100 text-red-700 border-red-200"
      : value === "paid"
      ? "bg-cyan-100 text-cyan-700 border-cyan-200"
      : "bg-violet-100 text-violet-700 border-violet-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {capitalizeIfLowercase(value)}
    </span>
  );
}

export default function ClaimsListPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();
  const columns = useMemo<ColumnDef<ClaimRow>[]>(() => {
    const L = (key: string, fallback: string) =>
      i18nReady && activeLang ? t(key) || fallback : fallback;

    return [
      {
        id: "name",
        label: L("claims.columns.claimNo", "No. Claim"),
        sortable: true,
        className: "w-40",
        cell: (r) => <div className="font-medium text-gray-900">{r.name}</div>,
        mandatory: true,
      },
      {
        id: "purchase_order",
        label: L("claims.columns.joNo", "No. JO"),
        sortable: true,
        // sortValue: (r) => r.purchase_order?.name.toLowerCase(),
        className: "w-36",
        cell: (r) => r.purchase_order?.name,
        mandatory: true,
      },
      {
        id: "date",
        label: L("claims.columns.claimDate", "Claim Date"),
        sortable: true,
        sortValue: (r) => r.date ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.date),
        defaultVisible: true,
      },

      {
        id: "amount",
        label: L("claims.columns.amountTotal", "Amount Total"),
        sortable: true,
        sortValue: (r) => String(r.amount ?? ""),
        className: "w-40 text-right",
        cell: (r) => <span className="tabular-nums">{fmtPrice(r.amount)}</span>,
        defaultVisible: true,
      },
      {
        id: "document_attachment",
        label: L("claims.columns.document_attachment", "Document"),
        sortable: true,
        // sortValue: (r) => String(r.document_attachment.name),
        className: "w-40",
        cell: (r) => <span>{r.document_attachment?.name ?? "-"}</span>,
        defaultVisible: true,
      },
      {
        id: "state",
        label: L("claims.columns.status", "Status"),
        sortable: true,
        sortValue: (r) => String(r.state),
        className: "w-40",
        cell: (r) => <StatusPill value={String(r.state)} />,
        defaultVisible: true,
      },
    ];
  }, [i18nReady, activeLang]);
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
        fetchBase={`${CLAIMS_URL}`}
        deleteBase={`${CLAIMS_URL}`}
        enableEditAction={true}
        enableDetailsAction={true}
        enableDeleteAction={true}
        onEditAction={(id, row, index) => {
          const ed_url = `/claims/details?id=${encodeURIComponent(String(id))}`;
          router.push(ed_url);
        }}
        onDetailsAction={(id, row, index) => {
          console.log("{1} {2} {3}", id, row, index);
        }}
        getDetailsContent={(row, index) => {
          return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  No. Claim
                </span>
                <span className="text-sm text-gray-900">{row.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  No. JO
                </span>
                <span className="text-sm text-gray-900">
                  {row.purchase_order?.name}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">Date</span>
                <span className="text-sm text-gray-900">
                  {fmtDate(row.date)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  Amount
                </span>
                <span className="text-sm text-gray-900">
                  {fmtPrice(row.amount)}
                </span>
              </div>
            </div>
          );
        }}
        columns={columns}
        searchPlaceholder={t("claims.search.placeholder") || "Cari claim..."}
        rowsPerPageLabel={t("claims.rowsPerPage") || "Baris per halaman"}
        // leftHeader={leftHeader}
        initialSort={{ by: "date", dir: "desc" }}
        enableColumnVisibility={true}
        columnVisibilityStorageKey="claims-shipper-trans"
        rowNavigateTo={(id) => ({ pathname: "claims/details", query: { id } })}
      />
    </div>
  );
}
