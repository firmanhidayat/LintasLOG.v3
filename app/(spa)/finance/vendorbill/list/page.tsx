"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";

import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import { useRouter } from "next/navigation";
import { capitalizeIfLowercase, fmtDate, fmtPrice } from "@/lib/helpers";
import { ClaimAttachmentGroup } from "@/features/claims/ClaimsFormController";

const BILLS_URL = process.env.NEXT_PUBLIC_TMS_INV_BILL_URL ?? "";
type moveType = "out_invoice" | "out_refund" | "in_invoice" | "in_refund";

type keyStates = {
  key: string;
  label: string;
  is_current: boolean;
};
type VendorBillRow = {
  id: number | string;
  name: string;
  move_type: moveType;
  invoice_date?: string;
  invoice_date_due?: string;
  ref?: string;
  invoice_origin?: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  state: string;
  payment_state: string;
  // states: keyStates;
  document_attachment: ClaimAttachmentGroup;
};

function StatusPill({ value }: { value: string }) {
  const color =
    value === "draft"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : value === "posted"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      :value === "cancel"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-violet-100 text-violet-700 border-violet-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {capitalizeIfLowercase(value)}
    </span>
  );
}

function PaymentStatusPill({ value }: { value: string }) {
  const color =
    value === "not_paid"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : value === "in_payment"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : value === "paid"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      :value === "partial"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : value === "reversed"
      ? "bg-red-100 text-red-700 border-red-200"
      : value === "invoicing_legacy"
      ? "bg-cyan-100 text-cyan-700 border-cyan-200"
      : "bg-violet-100 text-violet-700 border-violet-200";
  const ret_value =
  value==="not_paid" ? "Not Paid": value==="in_payment" ? "In Payment" : value==="paid" ? "Paid" : value=== "partial" ? "Partially Paid" : value=== "reversed" ? 
  "Reversed" : value==="invoicing_legacy" ? "Invoicing App Legacy" : "--Undefined--" ;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {capitalizeIfLowercase(ret_value)}
    </span>
  );
}

export default function VendorBillListPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();
  const columns = useMemo<ColumnDef<VendorBillRow>[]>(() => {
    return [
      {
        id: "name",
        label: t("vendorbills.columns.name"),
        sortable: true,
        sortValue: (r) => r.name.toLowerCase(),
        className: "w-44",
        cell: (r) => <div className="font-medium text-gray-900">{r.name}</div>,
        mandatory: true,
      },
      {
        id: "invoice_date",
        label: t("vendorbills.columns.invoice_date"),
        sortable: true,
        sortValue: (r) => r.invoice_date ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.invoice_date),
        defaultVisible: true,
      },
      {
        id: "invoice_date_due",
        label: t("vendorbills.columns.invoice_date_due"),
        sortable: true,
        sortValue: (r) => r.invoice_date_due ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.invoice_date_due),
        defaultVisible: true,
      },
      {
        id: "ref",
        label: t("vendorbills.columns.ref"),
        sortable: true,
        sortValue: (r) => r.ref ?? "",
        className: "w-36",
        cell: (r) => r.ref,
        defaultVisible: false,
      },
      {
        id: "invoice_origin",
        label: t("vendorbills.columns.invoice_origin"),
        sortable: true,
        sortValue: (r) => r.invoice_origin ?? "",
        className: "w-36",
        cell: (r) => r.invoice_origin,
        defaultVisible: false,
      },
      {
        id: "amount_untaxed",
        label: t("vendorbills.columns.amount_untaxed"),
        sortable: true,
        sortValue: (r) => String(r.amount_untaxed),
        className: "w-36 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_untaxed)}</span>
        ),
        defaultVisible: true,
      },
      {
        id: "amount_tax",
        label: t("vendorbills.columns.amount_tax"),
        sortable: true,
        sortValue: (r) => String(r.amount_tax),
        className: "w-44 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_tax)}</span>
        ),
        defaultVisible: true,
      },
      {
        id: "amount_total",
        label: t("vendorbills.columns.amount_total"),
        sortable: true,
        sortValue: (r) => String(r.amount_total),
        className: "w-44 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
        ),
        defaultVisible: true,
      },
      {
        id: "state",
        label: t("vendorbills.columns.state"),
        sortable: true,
        sortValue: (r) => r.state,
        className: "w-36",
        cell: (r) => <StatusPill value={String(r.state)}/>,
        defaultVisible: true,
      },
      {
        id: "payment_state",
        label: t("vendorbills.columns.payment_state"),
        sortable: true,
        sortValue: (r) => r.payment_state,
        className: "w-36",
        cell: (r) => <PaymentStatusPill value={String(r.payment_state)} />,
        defaultVisible: false,
      },
      // {
      //   id: "states",
      //   label: t("invoices.columns.document_attachment"),
      //   sortable: true,
      //   sortValue: (r) => r.document_attachment.name ?? "",
      //   className: "w-36",
      //   cell: (r) => r.document_attachment.name ?? "",
      //   defaultVisible: false,
      // },
    ];
  }, [i18nReady, activeLang]);

  if (!i18nReady) return null;
  // const leftHeader = (
  //   <div className="flex items-center gap-2">
  //     <Link
  //       href="/finance/vendorbill/create"
  //       className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
  //     >
  //       {t("vendorbill.create.title") || "Create Vendor Bill"}
  //     </Link>
  //   </div>
  // );
  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<VendorBillRow>
        key={activeLang}
        fetchBase={`${BILLS_URL}?move_type=in_invoice&move_type=in_refund`}
        deleteBase={`${BILLS_URL}`}
        enableEditAction={false}
        enableDetailsAction={true}
        enableDeleteAction={false}
        // onEditAction={(id, row, index) => {
        //   const ed_url = `/vendorbill/details?id=${encodeURIComponent(
        //     String(id)
        //   )}`;
        //   router.push(ed_url);
        // }}
        onDetailsAction={(id, row, index) => {
          console.log("{1} {2} {3}", id, row, index);
        }}
        getDetailsContent={(row, index) => {
          return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  {t("vendorbills.columns.name")}
                </span>
                <span className="text-sm text-gray-900">{row.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">{t("vendorbills.columns.invoice_date")}</span>
                <span className="text-sm text-gray-900">
                  {fmtDate(row.invoice_date)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  {t("vendorbills.columns.amount_total")}
                </span>
                <span className="text-sm text-gray-900">
                  {row.amount_total}
                </span>
              </div>
            </div>
          );
        }}
        columns={columns}
        searchPlaceholder={
          t("vendorbill.search.placeholder") || "Cari vendor bill..."
        }
        rowsPerPageLabel={t("vendorbill.rowsPerPage") || "Baris per halaman"}
        // leftHeader={leftHeader}
        initialSort={{ by: "bill_date", dir: "desc" }}
        enableColumnVisibility={true}
        columnVisibilityStorageKey="vendorbills-shipper-trans"
        rowNavigateTo={(id) => ({
          pathname: "finance/vendorbill/details",
          query: { id },
        })}
      />
    </div>
  );
}
