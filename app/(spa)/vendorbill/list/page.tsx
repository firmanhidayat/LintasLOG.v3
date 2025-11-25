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
import { fmtDate, fmtPrice } from "@/lib/helpers";

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
  states: keyStates;
};

export default function VendorBillListPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();
  const columns = useMemo<ColumnDef<VendorBillRow>[]>(() => {
    return [
      {
        id: "name",
        label: t("vendorbill.columns.name"),
        sortable: true,
        sortValue: (r) => r.name.toLowerCase(),
        className: "w-44",
        cell: (r) => <div className="font-medium text-gray-900">{r.name}</div>,
        mandatory: true,
      },
      {
        id: "invoice_date",
        label: t("vendorbill.columns.invoice_date"),
        sortable: true,
        sortValue: (r) => r.invoice_date ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.invoice_date),
        defaultVisible: true,
      },
      {
        id: "invoice_date_due",
        label: t("vendorbill.columns.invoice_date_due"),
        sortable: true,
        sortValue: (r) => r.invoice_date_due ?? "",
        className: "w-36",
        cell: (r) => fmtDate(r.invoice_date_due),
        defaultVisible: true,
      },
      {
        id: "ref",
        label: t("vendorbill.columns.ref"),
        sortable: true,
        sortValue: (r) => r.ref ?? "",
        className: "w-36",
        cell: (r) => r.ref,
        defaultVisible: false,
      },
      {
        id: "invoice_origin",
        label: t("vendorbill.columns.invoice_origin"),
        sortable: true,
        sortValue: (r) => r.invoice_origin ?? "",
        className: "w-36",
        cell: (r) => r.invoice_origin,
        defaultVisible: false,
      },
      {
        id: "amount_untaxed",
        label: t("vendorbill.columns.amount_untaxed"),
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
        label: t("vendorbill.columns.amount_tax"),
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
        label: t("vendorbill.columns.amount_total"),
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
        label: t("vendorbill.columns.state"),
        sortable: true,
        sortValue: (r) => r.state,
        className: "w-36",
        cell: (r) => r.state,
        defaultVisible: true,
      },
      {
        id: "payment_state",
        label: t("vendorbill.columns.payment_state"),
        sortable: true,
        sortValue: (r) => r.payment_state,
        className: "w-36",
        cell: (r) => r.payment_state,
        defaultVisible: false,
      },
      {
        id: "states",
        label: t("vendorbill.columns.states"),
        sortable: true,
        sortValue: (r) => r.states?.label ?? "",
        className: "w-36",
        cell: (r) => r.states?.label ?? "",
        defaultVisible: false,
      },
    ];
  }, [i18nReady, activeLang]);

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
        key={activeLang}
        fetchBase={`${BILLS_URL}?move_type=in_invoice`}
        deleteBase={`${BILLS_URL}`}
        enableEditAction={false}
        enableDetailsAction={true}
        enableDeleteAction={false}
        onEditAction={(id, row, index) => {
          const ed_url = `/vendorbill/details?id=${encodeURIComponent(
            String(id)
          )}`;
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
                  Bill Name
                </span>
                <span className="text-sm text-gray-900">{row.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">Date</span>
                <span className="text-sm text-gray-900">
                  {fmtDate(row.invoice_date)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  Amount Total
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
        leftHeader={leftHeader}
        initialSort={{ by: "bill_date", dir: "desc" }}
        enableColumnVisibility={true}
        columnVisibilityStorageKey="vendorbills-shipper-trans"
        rowNavigateTo={(id) => ({
          pathname: "vendorbill/details",
          query: { id },
        })}
      />
    </div>
  );
}
