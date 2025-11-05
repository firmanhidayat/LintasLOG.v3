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
import { fmtDate } from "@/lib/helpers";
// import { RecordItem } from "@/types/recorditem";
import { Role } from "@/components/providers/AuthProvider";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
const DRIVERS_URL = process.env.NEXT_PUBLIC_TMS_DRIVERS_URL ?? "";
type DriverRow = {
  name: string;
  mobile: string;
  no_ktp: string;
  drivers_license: string;
  drivers_license_expiry: string;
  id: number | string;
  login: string;
  tms_user_type: Role;
  mail_verified: boolean;
};
export default function DriverListPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();
  const columns = useMemo<ColumnDef<DriverRow>[]>(() => {
    return [
      {
        id: "name",
        label: t("drivers.name"),
        sortable: true,
        sortValue: (info) => String(info.name ?? ""),
        cell: (info) => info.name,
        className: "w-65",
      },
      {
        id: "login",
        label: t("drivers.login"),
        sortable: true,
        sortValue: (info) => String(info.login ?? ""),
        cell: (info) => info.login,
        className: "w-65",
      },
      {
        id: "mobile",
        label: t("drivers.mobile"),
        sortable: true,
        sortValue: (info) => String(info.mobile ?? ""),
        cell: (info) => info.mobile,
        className: "w-25",
      },
      {
        id: "no_ktp",
        label: t("drivers.no_ktp"),
        sortable: true,
        sortValue: (info) => String(info.no_ktp ?? ""),
        cell: (info) => info.no_ktp,
        className: "w-35",
      },
      {
        id: "drivers_license",
        label: t("drivers.drivers_license"),
        sortable: true,
        sortValue: (info) => String(info.drivers_license ?? ""),
        cell: (info) => info.drivers_license,
        className: "w-35",
      },
      {
        id: "drivers_license_expiry",
        label: t("drivers.drivers_license_expiry"),
        sortable: true,
        sortValue: (info) => String(info.drivers_license_expiry ?? ""),
        cell: (info) => fmtDate(info.drivers_license_expiry as string),
        className: "w-30",
      },
      {
        id: "actions",
        label: "",
        header: "",
        isAction: true,
        className: "w-20",
        cell: (it) => (
          <div className="flex items-center gap-2">
            {it.id != null ? (
              <Link
                // hidden
                data-stop-rowclick
                href={`/fleetndriver/driver/details?id=${encodeURIComponent(
                  String(it.id)
                )}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
                aria-label="Edit driver"
                title="Edit"
              >
                <Icon name="pencil" className="h-3 w-3" />
              </Link>
            ) : (
              <button
                // hidden
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
                // hidden
                data-stop-rowclick
                type="button"
                onClick={() => {
                  const evt = new CustomEvent("llog.openDeleteConfirm", {
                    detail: { id: it.id, name: it.name },
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
                // hidden
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
  }, [activeLang]);
  if (!i18nReady) return null;
  const leftHeader = (
    <div className="flex items-center gap-2">
      <Button
        size="md"
        onClick={() => router.push("/fleetndriver/driver/create")}
        aria-label="Create Driver"
        title={t("drivers.create.title")}
      >
        {t("drivers.create.title")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<DriverRow>
        fetchBase={`${DRIVERS_URL}`}
        deleteBase={`${DRIVERS_URL}`}
        columns={columns}
        searchPlaceholder={t("invoices.search.placeholder")}
        rowsPerPageLabel={t("invoices.rowsPerPage")}
        leftHeader={leftHeader}
        initialSort={{ by: "id", dir: "desc" }}
        getRowName={(r) => r.name}
        rowNavigateTo={(id) => ({
          pathname: "fleetndriver/driver/details",
          query: { id },
        })}
      />
    </div>
  );
}
