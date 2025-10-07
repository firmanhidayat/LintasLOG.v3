"use client";

import React from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import { ListTemplate, ColumnDef } from "@/components/datagrid/ListTemplate";

const USER_ADDRESS_URL = process.env.NEXT_PUBLIC_TMS_USER_ADDRESS_URL!;

// ============ Types (tetap sama) ============
export type AddressItem = {
  id?: number | string;
  name?: string;
  street?: string;
  street2?: string;
  zip?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  district?: { id?: number; name?: string } | string | null;
  district_id?: number;
  district_name?: string;
};

// ============ Helpers spesifik Address ============
function renderDistrict(it: AddressItem) {
  const d = it.district;
  if (!d) return it.district_name ?? "-";
  if (typeof d === "string") return d;
  return d?.name ?? it.district_name ?? "-";
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 3.487a2.1 2.1 0 0 1 2.97 2.97L7.5 18.79l-4 1 1-4 12.362-12.303z"
      />
    </svg>
  );
}
function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m4 4v8m6-8v8"
      />
    </svg>
  );
}

export default function AddressesListPage() {
  const { i18nReady, activeLang } = useI18nReady();

  if (!i18nReady) {
    return (
      <div className="space-y-4" data-lang={activeLang}>
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-64 animate-pulse rounded-lg border bg-slate-100" />
      </div>
    );
  }

  // ----- Kolom dinamis utk Address -----
  const columns: ColumnDef<AddressItem>[] = [
    {
      id: "actions",
      label: "",
      isAction: true,
      className: "w-20",
      cell: (it) => (
        <div className="flex items-center gap-2">
          {it.id != null ? (
            <Link
              href={`/orders/addresses/details?id=${encodeURIComponent(
                String(it.id)
              )}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
              aria-label="Edit address"
              title="Edit"
            >
              <PencilIcon className="h-3 w-3" />
            </Link>
          ) : (
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border opacity-50"
              title="Edit (unavailable)"
              disabled
            >
              <PencilIcon className="h-3 w-3" />
            </button>
          )}

          {it.id != null ? (
            <button
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
              <TrashIcon className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border opacity-50"
              title="Delete (unavailable)"
              disabled
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      ),
    },
    {
      id: "name",
      label: t("addresses.columns.name"),
      sortable: true,
      sortValue: (r) => (r.name ?? "").toLowerCase(),
      cell: (r) => r.name ?? "-",
    },
    {
      id: "street",
      label: t("addresses.columns.street"),
      sortable: true,
      sortValue: (r) => (r.street ?? "").toLowerCase(),
      cell: (r) => r.street ?? "-",
    },
    {
      id: "street2",
      label: t("addresses.columns.street2"),
      sortable: true,
      sortValue: (r) => (r.street2 ?? "").toLowerCase(),
      cell: (r) => r.street2 ?? "-",
    },
    {
      id: "district",
      label: t("addresses.columns.district"),
      sortable: true,
      sortValue: (r) => {
        const d = r.district;
        if (!d) return (r.district_name ?? "").toLowerCase();
        if (typeof d === "string") return d.toLowerCase();
        return String(d.name ?? r.district_name ?? "").toLowerCase();
      },
      cell: (r) => renderDistrict(r),
    },
    {
      id: "zip",
      label: t("addresses.columns.zip"),
      sortable: true,
      sortValue: (r) => (r.zip ?? "").toLowerCase(),
      cell: (r) => r.zip ?? "-",
    },
    {
      id: "email",
      label: t("addresses.columns.email"),
      sortable: true,
      sortValue: (r) => (r.email ?? "").toLowerCase(),
      cell: (r) => r.email ?? "-",
    },
    {
      id: "mobile",
      label: t("addresses.columns.phone"),
      sortable: true,
      sortValue: (r) => (r.mobile ?? r.phone ?? "").toLowerCase(),
      cell: (r) => r.mobile ?? r.phone ?? "-",
    },
  ];

  const leftHeader = (
    <Link
      href="/orders/addresses/create"
      className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
    >
      {t("addresses.create")}
    </Link>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<AddressItem>
        fetchBase={`${USER_ADDRESS_URL}`}
        deleteBase={`${USER_ADDRESS_URL}`}
        columns={columns}
        searchPlaceholder={t("addresses.search.placeholder")}
        rowsPerPageLabel={t("addresses.rowsPerPage")}
        leftHeader={leftHeader}
        initialPageSize={10}
        initialSort={{ by: "name", dir: "asc" }}
        postFetchTransform={(list) => list}
      />
    </div>
  );
}
