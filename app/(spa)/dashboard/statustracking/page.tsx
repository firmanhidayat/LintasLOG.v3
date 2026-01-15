"use client";
import React, { useMemo } from "react";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
// import Link from "next/link";
// import { Icon } from "@/components/icons/Icon";
// import { fmtDate } from "@/lib/helpers";
// import { Role } from "@/components/providers/AuthProvider";
// import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const STATUS_TRACKING_URL = process.env.NEXT_PUBLIC_TMS_DASHBOARD_STATUS_TRACK_URL ?? "";

// Types untuk nested objects
export type TransportOrder = {
  id: number;
  name: string;
};

export type Sale = {
  id: number;
  name: string;
};

export type City = {
  id: number;
  name: string;
};

export type FleetVehicle = {
  id: number;
  name: string;
};

export type DriverPartner = {
  id: number;
  name: string;
};

export type CargoType = {
  id: number;
  name: string;
};

export type TMSState = {
  key: string;
  label: string;
  is_current: boolean;
};

export type StatusTrackRow = {
  id: number;
  name: string;
  transport_order_id: number;
  sale_id: number;
  origin_city_id: number;
  dest_city_id: number;
  fleet_vehicle_id: number;
  driver_partner_id: number;
  cargo_type_id: number;
  tms_state: string;
  transport_order: TransportOrder;
  sale: Sale;
  origin_city: City;
  dest_city: City;
  fleet_vehicle: FleetVehicle;
  driver_partner: DriverPartner;
  cargo_type: CargoType;
  tms_states: TMSState[];
};

export default function StatusTrackingPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();

  const columns = useMemo<ColumnDef<StatusTrackRow>[]>(() => {
    return [
      {
        id: "name",
        label: t("status_tracking.name"),
        sortable: true,
        sortValue: (info) => String(info.name ?? ""),
        cell: (info) => info.name,
        className: "w-50",
        mandatory: true,
      },
      {
        id: "transport_order",
        label: t("status_tracking.transport_order"),
        sortable: true,
        sortValue: (info) => info.transport_order?.name ?? "",
        cell: (info) => info.transport_order?.name || "-",
        className: "w-40",
        defaultVisible: true,
      },
      {
        id: "sale",
        label: t("status_tracking.sale"),
        sortable: true,
        sortValue: (info) => info.sale?.name ?? "",
        cell: (info) => info.sale?.name || "-",
        className: "w-40",
        defaultVisible: true,
      },
      {
        id: "origin_city",
        label: t("status_tracking.origin_city"),
        sortable: true,
        sortValue: (info) => info.origin_city?.name ?? "",
        cell: (info) => info.origin_city?.name || "-",
        className: "w-30",
        defaultVisible: true,
      },
      {
        id: "dest_city",
        label: t("status_tracking.dest_city"),
        sortable: true,
        sortValue: (info) => info.dest_city?.name ?? "",
        cell: (info) => info.dest_city?.name || "-",
        className: "w-30",
        defaultVisible: true,
      },
      {
        id: "fleet_vehicle",
        label: t("status_tracking.fleet_vehicle"),
        sortable: true,
        sortValue: (info) => info.fleet_vehicle?.name ?? "",
        cell: (info) => info.fleet_vehicle?.name || "-",
        className: "w-40",
        defaultVisible: true,
      },
      {
        id: "driver_partner",
        label: t("status_tracking.driver_partner"),
        sortable: true,
        sortValue: (info) => info.driver_partner?.name ?? "",
        cell: (info) => info.driver_partner?.name || "-",
        className: "w-40",
        defaultVisible: true,
      },
      {
        id: "cargo_type",
        label: t("status_tracking.cargo_type"),
        sortable: true,
        sortValue: (info) => info.cargo_type?.name ?? "",
        cell: (info) => info.cargo_type?.name || "-",
        className: "w-35",
        defaultVisible: true,
      },
      {
        id: "tms_state",
        label: t("status_tracking.tms_state"),
        sortable: true,
        sortValue: (info) => info.tms_state ?? "",
        cell: (info) => {
          const currentState = info.tms_states?.find(state => state.is_current);
          return currentState?.label || info.tms_state || "-";
        },
        className: "w-35",
        defaultVisible: true,
      },
      
    ];
  }, [activeLang]);

  if (!i18nReady) return null;

//   const leftHeader = (
//     <div className="flex items-center gap-2">
//       <Button
//         size="md"
//         onClick={() => router.push("/status-tracking/create")}
//         aria-label="Create Status Tracking"
//         title={t("status_tracking.create.title")}
//       >
//         {t("status_tracking.create.title")}
//       </Button>
//     </div>
//   );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<StatusTrackRow>
        fetchBase={`${STATUS_TRACKING_URL}`}
        deleteBase={`${STATUS_TRACKING_URL}`}
        enableEditAction={false}
        enableDetailsAction={false}
        enableDeleteAction={false}
        // onEditAction={(id, row, index) => {
        //   const ed_url = `/status-tracking/details?id=${encodeURIComponent(
        //     String(id)
        //   )}`;
        //   router.push(ed_url);
        // }}
        onDetailsAction={(id, row, index) => {
          console.log("Details clicked for", { id, row, index });
        }}
        getDetailsContent={(row, index) => {
          return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">Name</span>
                  <span className="text-sm text-gray-900">{row.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">Status</span>
                  <span className="text-sm text-gray-900">
                    {row.tms_states?.find(s => s.is_current)?.label || row.tms_state || "-"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">Transport Order</span>
                  <span className="text-sm text-gray-900">{row.transport_order?.name || "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">Sale</span>
                  <span className="text-sm text-gray-900">{row.sale?.name || "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">Origin City</span>
                  <span className="text-sm text-gray-900">{row.origin_city?.name || "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">Destination City</span>
                  <span className="text-sm text-gray-900">{row.dest_city?.name || "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">Fleet Vehicle</span>
                  <span className="text-sm text-gray-900">{row.fleet_vehicle?.name || "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">Driver Partner</span>
                  <span className="text-sm text-gray-900">{row.driver_partner?.name || "-"}</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-xs font-medium text-gray-500">Cargo Type</span>
                  <span className="text-sm text-gray-900">{row.cargo_type?.name || "-"}</span>
                </div>
              </div>
              {row.tms_states && row.tms_states.length > 0 && (
                <div className="pt-3 border-t">
                  <span className="text-xs font-medium text-gray-500">Status History</span>
                  <div className="mt-2 space-y-1">
                    {row.tms_states.map((state, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${state.is_current ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={`text-xs ${state.is_current ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                          {state.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }}
        columns={columns}
        searchPlaceholder={t("status_tracking.search.placeholder")}
        rowsPerPageLabel={t("status_tracking.rowsPerPage")}
        // leftHeader={leftHeader}
        initialSort={{ by: "id", dir: "desc" }}
        enableColumnVisibility={true}
        columnVisibilityStorageKey="status-tracking"
        getRowName={(r) => r.name}
        // rowNavigateTo={(id) => ({
        //   pathname: "/status-tracking/details",
        //   query: { id },
        // })}
      />
    </div>
  );
}