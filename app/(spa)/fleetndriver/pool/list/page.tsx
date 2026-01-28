"use client";

import React from "react";
// import Link from "next/link";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import { ListTemplate, ColumnDef } from "@/components/datagrid/ListTemplate";
// import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
const USER_ADDRESS_URL = process.env.NEXT_PUBLIC_TMS_USER_ADDRESS_URL!;
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

function renderDistrict(it: AddressItem) {
  const d = it.district;
  if (!d) return it.district_name ?? "-";
  if (typeof d === "string") return d;
  return d?.name ?? it.district_name ?? "-";
}

export default function AddressesListPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();

  const columns: ColumnDef<AddressItem>[] = [
    {
      id: "name",
      label: t("addresses.columns.name"),
      sortable: true,
      sortValue: (r) => (r.name ?? "").toLowerCase(),
      className: "w-[60px]",
      cell: (r) => r.name ?? "-",
      mandatory: true,
    },
    {
      id: "street",
      label: t("addresses.columns.street"),
      sortable: true,
      sortValue: (r) => (r.street ?? "").toLowerCase(),
      className: "w-[60px]",
      cell: (r) => r.street ?? "-",
      mandatory: true,
    },
    {
      id: "street2",
      label: t("addresses.columns.street2"),
      sortable: true,
      sortValue: (r) => (r.street2 ?? "").toLowerCase(),
      className: "w-[60px]",
      cell: (r) => r.street2 ?? "-",
      defaultVisible: true,
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
      className: "w-[60px]",
      cell: (r) => renderDistrict(r),
      defaultVisible: true,
    },
    {
      id: "zip",
      label: t("addresses.columns.zip"),
      sortable: true,
      sortValue: (r) => (r.zip ?? "").toLowerCase(),
      className: "w-[60px]",
      cell: (r) => r.zip ?? "-",
      defaultVisible: true,
    },
    {
      id: "email",
      label: t("addresses.columns.email"),
      sortable: true,
      sortValue: (r) => (r.email ?? "").toLowerCase(),
      className: "w-[60px]",
      cell: (r) => r.email ?? "-",
      defaultVisible: true,
    },
    {
      id: "mobile",
      label: t("addresses.columns.phone"),
      sortable: true,
      sortValue: (r) => (r.mobile ?? r.phone ?? "").toLowerCase(),
      className: "w-[60px]",
      cell: (r) => r.mobile ?? r.phone ?? "-",
      defaultVisible: true,
    },
    
  ];
  if (!i18nReady) return null;
  const leftHeader = (
    <div className="flex items-center gap-2">
      <Button
        size="md"
        onClick={() => router.push("/fleetndriver/pool/create")}
        aria-label="Create Pool Address"
        title={t("addresses.poolcreate")}
      >
        {t("addresses.poolcreate")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<AddressItem>
        key={"addresses-" + (t("lang") || "id")}
        fetchBase={`${USER_ADDRESS_URL}?type=other`}
        deleteBase={`${USER_ADDRESS_URL}`}
        enableEditAction={true}
        enableDetailsAction={true}
        enableDeleteAction={true}
        onEditAction={(id, row, index) => {
          const ed_url = `/orders/addresses/details?id=${encodeURIComponent(
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
                <span className="text-xs font-medium text-gray-500">Name</span>
                <span className="text-sm text-gray-900">{row.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  Address
                </span>
                <span className="text-sm text-gray-900">
                  {row.street} {row.street2 ?? ""}
                  <br />
                  {row.district_name}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">Email</span>
                <span className="text-sm text-gray-900">{row.email}</span>
              </div>
            </div>
          );
        }}
        columns={columns}
        searchPlaceholder={t("addresses.search.placeholder")}
        rowsPerPageLabel={t("addresses.rowsPerPage")}
        leftHeader={leftHeader}
        initialPageSize={80}
        initialSort={{ by: "id", dir: "desc" }}
        enableColumnVisibility={true}
        columnVisibilityStorageKey="addresses"
        postFetchTransform={(list) => list}
        rowNavigateTo={(id) => ({
          pathname: "orders/addresses/details",
          query: { id },
        })}
      />
    </div>
  );
}
