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
import { RecordItem } from "@/types/recorditem";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
const FLEETS_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_URL ?? "";
type FleetsRow = {
  id: number;
  model_id: number | string;
  license_plate: string;
  model_year: string;
  vin_sn: string;
  engine_sn: string;
  trailer_hook: boolean;
  tonnage_max: number;
  cbm_volume: number;
  category_id: number;
  color: string;
  horsepower: number;
  axle: string;
  acquisition_date: string;
  write_off_date: string;
  kir: string;
  kir_expiry: string;
  name: string;
  model: RecordItem;
  category: RecordItem;
};
export default function FleetListPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();
  const columns = useMemo<ColumnDef<FleetsRow>[]>(() => {
    return [
      {
        id: "name",
        label: t("fleets.model_name"),
        sortable: true,
        sortValue: (info) => String(info.name ?? ""),
        cell: (info) => info.name,
        className: "w-65",
      },
      {
        id: "model_year",
        label: t("fleets.model_year"),
        sortable: true,
        sortValue: (info) => String(info.model_year ?? ""),
        cell: (info) => info.model_year,
        className: "w-25",
      },
      {
        id: "license_plate",
        label: t("fleets.license_plate"),
        sortable: true,
        sortValue: (info) => String(info.license_plate ?? ""),
        cell: (info) => info.license_plate,
        className: "w-35",
      },
      {
        id: "acquisition_date",
        label: t("fleets.acquisition_date"),
        sortable: true,
        sortValue: (info) => String(info.acquisition_date ?? ""),
        cell: (info) => fmtDate(info.acquisition_date as string),
        className: "w-30",
      },
      {
        id: "write_off_date",
        label: t("fleets.write_off_date"),
        sortable: true,
        sortValue: (info) => String(info.write_off_date ?? ""),
        cell: (info) => fmtDate(info.write_off_date as string),
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
                href={`/fleetndriver/fleet/details?id=${encodeURIComponent(
                  String(it.id)
                )}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
                aria-label="Edit fleet"
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
                  // ListTemplate kini menangani event ini & membuka modal konfirmasi
                  const evt = new CustomEvent("llog.openDeleteConfirm", {
                    detail: { id: it.id, name: it.model.name },
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
        onClick={() => router.push("/fleetndriver/fleet/create")}
        aria-label="Create"
        title={t("fleet.create.title")}
      >
        {t("fleets.create.title")}
      </Button>
    </div>
  );
  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<FleetsRow>
        fetchBase={`${FLEETS_URL}`}
        deleteBase={`${FLEETS_URL}`}
        columns={columns}
        searchPlaceholder={t("invoices.search.placeholder")}
        rowsPerPageLabel={t("invoices.rowsPerPage")}
        leftHeader={leftHeader}
        initialSort={{ by: "id", dir: "desc" }}
        getRowName={(r) => r.model.name}
        rowNavigateTo={(id) => ({
          pathname: "fleetndriver/fleet/details",
          query: { id },
        })}
      />
    </div>
  );
}
