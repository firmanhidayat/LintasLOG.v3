"use client";

import React, { useMemo } from "react";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import { OrderRow, POrderRow } from "@/types/orders";
import { fmtDate, fmtPrice } from "@/lib/helpers";
import { GetStatesInLine } from "@/components/ui/DeliveryState";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { TmsProfile } from "@/types/tms-profile";

const GET_ORDERS_URL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL!;
const GET_P_ORDERS_URL = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!;

export default function OrdersListPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();
  const { profile } = useAuth();
  const tz = (profile as TmsProfile)?.tz || "Asia/Jakarta";

  const userType = useMemo(() => {
    if (profile) return profile.tms_user_type;
    return undefined;
  }, [profile]);

  const columnsPO: ColumnDef<POrderRow>[] = [
    {
      id: "jo_no",
      label: t("orders.columns.joNo") || "No. JO",
      sortable: true,
      sortValue: (r) => r.name ?? "",
      className: "w-[60px]",
      mandatory: true,
      cell: (r) => <div className="font-medium text-gray-900">{r.name}</div>,
    },
    {
      id: "pickup_date",
      label: t("orders.columns.pickupDate") || "Tanggal Pickup",
      sortable: true,
      sortValue: (r) => r.pickup_date_planne ?? "",
      className: "w-[60px]",
      defaultVisible: true,
      cell: (r) =>
        r.route_ids.length > 0
          ? r.route_ids[0].is_main_route
            // ? fmtDate(r.route_ids[0].etd_date)
            ? fmtDate(r.route_ids[0].etd_date, tz)
            : "-"
          : "-",
    },
    {
      id: "pickup_to",
      label: t("orders.columns.pickupTo") || "Tujuan Pickup",
      sortable: true,
      sortValue: (r) => (r.origin_city?.name ?? "").toLowerCase(),
      className: "w-[60px]",
      defaultVisible: true,
      cell: (r) => (
        <span className="text-gray-700">{r.origin_city?.name ?? "-"}</span>
      ),
    },
    {
      id: "drop_date",
      label: t("orders.columns.dropDate") || "Tanggal Drop",
      sortable: true,
      sortValue: (r) => r.drop_off_date_planne ?? "",
      className: "w-[60px]",
      defaultVisible: true,
      cell: (r) =>
        r.route_ids.length > 0
          ? r.route_ids[0].is_main_route
            // ? fmtDate(r.route_ids[0].eta_date)
            ? fmtDate(r.route_ids[0].eta_date, tz)
            : "-"
          : "-",
    },
    {
      id: "drop_to",
      label: t("orders.columns.dropTo") || "Tujuan Drop",
      sortable: true,
      sortValue: (r) => (r.dest_city?.name ?? "").toLowerCase(),
      className: "w-[60px]",
      defaultVisible: true,
      cell: (r) => (
        <span className="text-gray-700">{r.dest_city?.name ?? "-"}</span>
      ),
    },
    {
      id: "special_request",
      label: t("orders.columns.specialRequest") || "Permintaan Khusus",
      sortable: true,
      defaultVisible: true,
      sortValue: (r) => (r.requirement_other ?? "").toLowerCase(),
      className: "w-[100px]",
      cell: (r) => r.requirement_other?.trim() || "-",
    },
    {
      id: "price",
      label: t("orders.columns.price") || "Harga",
      sortable: true,
      defaultVisible: true,
      sortValue: (r) => String(r.amount_total ?? ""),
      className: "w-[56px] text-right",
      cell: (r) => (
        <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
      ),
    },
    {
      id: "status",
      label: t("orders.columns.status") || "Status",
      sortable: true,
      mandatory: true,
      sortValue: (r) =>
        r.tms_states.find((s) => s.is_current)?.key || "unknown",
      className: "w-[32px]",
      cell: (r) =>
        r.tms_states.find((s) => s.is_current)?.is_current ? (
          <GetStatesInLine
            value={r.tms_states.find((s) => s.is_current)?.key || "unknown"}
            label={r.tms_states.find((s) => s.is_current)?.label || "unknown"}
          />
        ) : (
          <GetStatesInLine value="unknown" label="unknown" />
        ),
    },
  ];

  const columns: ColumnDef<OrderRow>[] = [
    {
      id: "jo_no",
      label: t("orders.columns.joNo") || "No. JO",
      sortable: true,
      sortValue: (r) => r.name ?? "",
      className: "min-w-[80px] max-w-[100px]",
      cell: (r) => (
        <div className="font-medium text-gray-900 truncate">{r.name}</div>
      ),
      mandatory: true,
    },
    {
      id: "pickup_date",
      label: t("orders.columns.pickupDate") || "Tanggal Pickup",
      sortable: true,
      sortValue: (r) => r.pickup_date_planne ?? "",
      className: "min-w-[100px] max-w-[120px]",
      cell: (r) => (
        <div className="truncate">
          {r.route_ids.length > 0
            ? r.route_ids[0].is_main_route
              // ? fmtDate(r.route_ids[0].etd_date)
              ? fmtDate(r.route_ids[0].etd_date, tz)
              : "-"
            : "-"}
        </div>
      ),
      defaultVisible: true,
    },
    {
      id: "pickup_to",
      label: t("orders.columns.pickupTo") || "Tujuan Pickup",
      sortable: true,
      sortValue: (r) => (r.origin_city?.name ?? "").toLowerCase(),
      className: "min-w-[120px] max-w-[150px]",
      cell: (r) => (
        <span className="text-gray-700 truncate block">
          {r.origin_city?.name ?? "-"}
        </span>
      ),
      defaultVisible: true,
    },
    {
      id: "drop_date",
      label: t("orders.columns.dropDate") || "Tanggal Drop",
      sortable: true,
      sortValue: (r) => r.drop_off_date_planne ?? "",
      className: "min-w-[100px] max-w-[120px]",
      cell: (r) => (
        <div className="truncate">
          {r.route_ids.length > 0
            ? r.route_ids[0].is_main_route
              // ? fmtDate(r.route_ids[0].eta_date)
              ? fmtDate(r.route_ids[0].eta_date, tz)
              : "-"
            : "-"}
        </div>
      ),
      defaultVisible: true,
    },
    {
      id: "drop_to",
      label: t("orders.columns.dropTo") || "Tujuan Drop",
      sortable: true,
      sortValue: (r) => (r.dest_city?.name ?? "").toLowerCase(),
      className: "min-w-[120px] max-w-[150px]",
      cell: (r) => (
        <span className="text-gray-700 truncate block">
          {r.dest_city?.name ?? "-"}
        </span>
      ),
      defaultVisible: true,
    },
    {
      id: "special_request",
      label: t("orders.columns.specialRequest") || "Permintaan Khusus",
      sortable: true,
      sortValue: (r) => (r.requirement_other ?? "").toLowerCase(),
      className: "min-w-[120px] max-w-[200px]",
      cell: (r) => (
        <div className="truncate">{r.requirement_other?.trim() || "-"}</div>
      ),
      defaultVisible: false,
    },
    {
      id: "price",
      label: t("orders.columns.price") || "Harga",
      sortable: true,
      sortValue: (r) => String(r.amount_total ?? ""),
      className: "min-w-[80px] max-w-[100px] text-right",
      cell: (r) => (
        <span className="tabular-nums truncate block">
          {fmtPrice(r.amount_total)}
        </span>
      ),
      defaultVisible: true,
    },

    {
      id: "status",
      label: t("orders.columns.status") || "Status",
      sortable: true,
      sortValue: (r) => r.states.find((s) => s.is_current)?.key || "unknown",
      className: "min-w-[120px] max-w-[180px]",
      cell: (r) => (
        <div className="truncate">
          {r.states.find((s) => s.is_current)?.is_current ? (
            <GetStatesInLine
              value={r.states.find((s) => s.is_current)?.key || "unknown"}
              label={r.states.find((s) => s.is_current)?.label || "unknown"}
            />
          ) : (
            <GetStatesInLine value="unknown" label="unknown" />
          )}
        </div>
      ),
      mandatory: true,
    },
    
  ];

  if (!i18nReady) return null;
  const isShipper = userType === "shipper" ? true : false;
  const leftHeader = (
    <div className="flex items-center gap-2">
      <Button
        size="md"
        onClick={() => router.push("/orders/create")}
        aria-label="Create Order"
        title={t("orders.create.title")}
      >
        {t("orders.create.title")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      {isShipper ? (
        <ListTemplate<OrderRow>
          key={"orders-" + (t("lang") || "id")}
          fetchBase={`${GET_ORDERS_URL}`}
          deleteBase={`${GET_ORDERS_URL}`}
          enableEditAction={true}
          enableDetailsAction={false}
          enableDeleteAction={true}
          onEditAction={(id, row, index) => {
            const ed_url = `/orders/details?id=${encodeURIComponent(
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
                    Order
                  </span>
                  <span className="text-sm text-gray-900">{row.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">
                    Origin
                  </span>
                  <span className="text-sm text-gray-900">
                    {row.origin_city?.name}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">
                    Destination
                  </span>
                  <span className="text-sm text-gray-900">
                    {row.dest_city?.name}
                  </span>
                </div>
              </div>
            );
          }}
          columns={columns}
          searchPlaceholder={t("orders.search.placeholder")}
          rowsPerPageLabel={t("orders.rowsPerPage")}
          leftHeader={leftHeader}
          initialPageSize={80}
          initialSort={{ by: "id", dir: "desc" }}
          enableColumnVisibility={true}
          columnVisibilityStorageKey="order-shipper"
          postFetchTransform={(list) => list}
          rowNavigateTo={(id) => ({
            pathname: "orders/details",
            query: { id },
          })}
        />
      ) : (
        <ListTemplate<POrderRow>
          key={"orders-" + (t("lang") || "id")}
          fetchBase={`${GET_P_ORDERS_URL}`}
          deleteBase={`${GET_P_ORDERS_URL}`}
          enableEditAction={true}
          enableDetailsAction={false}
          enableDeleteAction={true}
          onEditAction={(id, row, index) => {
            // router.push(`/edit/${id}`);
            const ed_url = `/orders/details?id=${encodeURIComponent(
              String(id)
            )}`;
            console.log("{1} {2} {3}", id, row, index);
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
                    Order
                  </span>
                  <span className="text-sm text-gray-900">{row.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">
                    Origin
                  </span>
                  <span className="text-sm text-gray-900">
                    {row.origin_city?.name}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">
                    Destination
                  </span>
                  <span className="text-sm text-gray-900">
                    {row.dest_city?.name}
                  </span>
                </div>
              </div>
            );
          }}
          columns={columnsPO}
          searchPlaceholder={t("orders.search.placeholder")}
          rowsPerPageLabel={t("orders.rowsPerPage")}
          // leftHeader={isShipper ? leftHeader : undefined}
          enableColumnVisibility={true}
          columnVisibilityStorageKey="order-transporter"
          initialPageSize={80}
          initialSort={{ by: "id", dir: "desc" }}
          postFetchTransform={(list) => list}
          rowNavigateTo={(id) => ({
            pathname: "orders/details",
            query: { id },
          })}
        />
      )}
    </div>
  );
}
// "use client";

// import React, { useMemo } from "react";
// import { t } from "@/lib/i18n";
// import { useI18nReady } from "@/hooks/useI18nReady";
// import {
//   ListTemplate,
//   type ColumnDef,
// } from "@/components/datagrid/ListTemplate";
// import { OrderRow, POrderRow } from "@/types/orders";
// import { fmtDate, fmtPrice } from "@/lib/helpers";
// import { GetStatesInLine } from "@/components/ui/DeliveryState";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/Button";
// import { useAuth } from "@/components/providers/AuthProvider";
// import { odooUtcToUser, userLocalToOdooUtc } from "@/lib/datetime";

// const GET_ORDERS_URL = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL!;
// const GET_P_ORDERS_URL = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!;

// export default function OrdersListPage() {
//   const router = useRouter();
//   const { i18nReady, activeLang } = useI18nReady();
//   const { profile } = useAuth();

//   const userType = useMemo(() => {
//     if (profile) return profile.tms_user_type;
//     return undefined;
//   }, [profile]);

//   const columnsPO: ColumnDef<POrderRow>[] = [
//     {
//       id: "jo_no",
//       label: t("orders.columns.joNo") || "No. JO",
//       sortable: true,
//       sortValue: (r) => r.name ?? "",
//       className: "w-[60px]",
//       mandatory: true,
//       cell: (r) => <div className="font-medium text-gray-900">{r.name}</div>,
//     },
//     {
//       id: "pickup_date",
//       label: t("orders.columns.pickupDate") || "Tanggal Pickup",
//       sortable: true,
//       sortValue: (r) => r.pickup_date_planne ?? "",
//       className: "w-[60px]",
//       defaultVisible: true,
//       cell: (r) =>
//         r.route_ids.length > 0
//           ? r.route_ids[0].is_main_route
//             // ? fmtDate(r.route_ids[0].etd_date)
//             ? odooUtcToUser(r.route_ids[0].etd_date,  "Asia/Jakarta")
//             : "-"
//           : "-",
//     },
//     {
//       id: "pickup_to",
//       label: t("orders.columns.pickupTo") || "Tujuan Pickup",
//       sortable: true,
//       sortValue: (r) => (r.origin_city?.name ?? "").toLowerCase(),
//       className: "w-[60px]",
//       defaultVisible: true,
//       cell: (r) => (
//         <span className="text-gray-700">{r.origin_city?.name ?? "-"}</span>
//       ),
//     },
//     {
//       id: "drop_date",
//       label: t("orders.columns.dropDate") || "Tanggal Drop",
//       sortable: true,
//       sortValue: (r) => r.drop_off_date_planne ?? "",
//       className: "w-[60px]",
//       defaultVisible: true,
//       cell: (r) =>
//         r.route_ids.length > 0
//           ? r.route_ids[0].is_main_route
//             // ? fmtDate(r.route_ids[0].eta_date)
//             ? odooUtcToUser(r.route_ids[0].eta_date,  "Asia/Jakarta")
//             : "-"
//           : "-",
//     },
//     {
//       id: "drop_to",
//       label: t("orders.columns.dropTo") || "Tujuan Drop",
//       sortable: true,
//       sortValue: (r) => (r.dest_city?.name ?? "").toLowerCase(),
//       className: "w-[60px]",
//       defaultVisible: true,
//       cell: (r) => (
//         <span className="text-gray-700">{r.dest_city?.name ?? "-"}</span>
//       ),
//     },
//     {
//       id: "special_request",
//       label: t("orders.columns.specialRequest") || "Permintaan Khusus",
//       sortable: true,
//       defaultVisible: true,
//       sortValue: (r) => (r.requirement_other ?? "").toLowerCase(),
//       className: "w-[100px]",
//       cell: (r) => r.requirement_other?.trim() || "-",
//     },
//     {
//       id: "price",
//       label: t("orders.columns.price") || "Harga",
//       sortable: true,
//       defaultVisible: true,
//       sortValue: (r) => String(r.amount_total ?? ""),
//       className: "w-[56px] text-right",
//       cell: (r) => (
//         <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
//       ),
//     },
//     {
//       id: "status",
//       label: t("orders.columns.status") || "Status",
//       sortable: true,
//       mandatory: true,
//       sortValue: (r) =>
//         r.tms_states.find((s) => s.is_current)?.key || "unknown",
//       className: "w-[32px]",
//       cell: (r) =>
//         r.tms_states.find((s) => s.is_current)?.is_current ? (
//           <GetStatesInLine
//             value={r.tms_states.find((s) => s.is_current)?.key || "unknown"}
//             label={r.tms_states.find((s) => s.is_current)?.label || "unknown"}
//           />
//         ) : (
//           <GetStatesInLine value="unknown" label="unknown" />
//         ),
//     },
//   ];

//   const columns: ColumnDef<OrderRow>[] = [
//     {
//       id: "jo_no",
//       label: t("orders.columns.joNo") || "No. JO",
//       sortable: true,
//       sortValue: (r) => r.name ?? "",
//       className: "min-w-[80px] max-w-[100px]",
//       cell: (r) => (
//         <div className="font-medium text-gray-900 truncate">{r.name}</div>
//       ),
//       mandatory: true,
//     },
//     {
//       id: "pickup_date",
//       label: t("orders.columns.pickupDate") || "Tanggal Pickup",
//       sortable: true,
//       sortValue: (r) => r.pickup_date_planne ?? "",
//       className: "min-w-[100px] max-w-[120px]",
//       cell: (r) => (
//         <div className="truncate">
//           {r.route_ids.length > 0
//             ? r.route_ids[0].is_main_route
//               // ? fmtDate(r.route_ids[0].etd_date)
//               ? odooUtcToUser(r.route_ids[0].etd_date,  "Asia/Jakarta")
//               : "-"
//             : "-"}
//         </div>
//       ),
//       defaultVisible: true,
//     },
//     {
//       id: "pickup_to",
//       label: t("orders.columns.pickupTo") || "Tujuan Pickup",
//       sortable: true,
//       sortValue: (r) => (r.origin_city?.name ?? "").toLowerCase(),
//       className: "min-w-[120px] max-w-[150px]",
//       cell: (r) => (
//         <span className="text-gray-700 truncate block">
//           {r.origin_city?.name ?? "-"}
//         </span>
//       ),
//       defaultVisible: true,
//     },
//     {
//       id: "drop_date",
//       label: t("orders.columns.dropDate") || "Tanggal Drop",
//       sortable: true,
//       sortValue: (r) => r.drop_off_date_planne ?? "",
//       className: "min-w-[100px] max-w-[120px]",
//       cell: (r) => (
//         <div className="truncate">
//           {r.route_ids.length > 0
//             ? r.route_ids[0].is_main_route
//               // ? fmtDate(r.route_ids[0].eta_date)
//               ? odooUtcToUser(r.route_ids[0].eta_date,  "Asia/Jakarta")
//               : "-"
//             : "-"}
//         </div>
//       ),
//       defaultVisible: true,
//     },
//     {
//       id: "drop_to",
//       label: t("orders.columns.dropTo") || "Tujuan Drop",
//       sortable: true,
//       sortValue: (r) => (r.dest_city?.name ?? "").toLowerCase(),
//       className: "min-w-[120px] max-w-[150px]",
//       cell: (r) => (
//         <span className="text-gray-700 truncate block">
//           {r.dest_city?.name ?? "-"}
//         </span>
//       ),
//       defaultVisible: true,
//     },
//     {
//       id: "special_request",
//       label: t("orders.columns.specialRequest") || "Permintaan Khusus",
//       sortable: true,
//       sortValue: (r) => (r.requirement_other ?? "").toLowerCase(),
//       className: "min-w-[120px] max-w-[200px]",
//       cell: (r) => (
//         <div className="truncate">{r.requirement_other?.trim() || "-"}</div>
//       ),
//       defaultVisible: false,
//     },
//     {
//       id: "price",
//       label: t("orders.columns.price") || "Harga",
//       sortable: true,
//       sortValue: (r) => String(r.amount_total ?? ""),
//       className: "min-w-[80px] max-w-[100px] text-right",
//       cell: (r) => (
//         <span className="tabular-nums truncate block">
//           {fmtPrice(r.amount_total)}
//         </span>
//       ),
//       defaultVisible: true,
//     },

//     {
//       id: "status",
//       label: t("orders.columns.status") || "Status",
//       sortable: true,
//       sortValue: (r) => r.states.find((s) => s.is_current)?.key || "unknown",
//       className: "min-w-[120px] max-w-[180px]",
//       cell: (r) => (
//         <div className="truncate">
//           {r.states.find((s) => s.is_current)?.is_current ? (
//             <GetStatesInLine
//               value={r.states.find((s) => s.is_current)?.key || "unknown"}
//               label={r.states.find((s) => s.is_current)?.label || "unknown"}
//             />
//           ) : (
//             <GetStatesInLine value="unknown" label="unknown" />
//           )}
//         </div>
//       ),
//       mandatory: true,
//     },
    
//   ];

//   if (!i18nReady) return null;
//   const isShipper = userType === "shipper" ? true : false;
//   const leftHeader = (
//     <div className="flex items-center gap-2">
//       <Button
//         size="md"
//         onClick={() => router.push("/orders/create")}
//         aria-label="Create Order"
//         title={t("orders.create.title")}
//       >
//         {t("orders.create.title")}
//       </Button>
//     </div>
//   );

//   return (
//     <div className="space-y-4" data-lang={activeLang}>
//       {isShipper ? (
//         <ListTemplate<OrderRow>
//           key={"orders-" + (t("lang") || "id")}
//           fetchBase={`${GET_ORDERS_URL}`}
//           deleteBase={`${GET_ORDERS_URL}`}
//           enableEditAction={true}
//           enableDetailsAction={false}
//           enableDeleteAction={true}
//           onEditAction={(id, row, index) => {
//             const ed_url = `/orders/details?id=${encodeURIComponent(
//               String(id)
//             )}`;
//             router.push(ed_url);
//           }}
//           onDetailsAction={(id, row, index) => {
//             console.log("{1} {2} {3}", id, row, index);
//           }}
//           getDetailsContent={(row, index) => {
//             return (
//               <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
//                 <div className="flex flex-col">
//                   <span className="text-xs font-medium text-gray-500">
//                     Order
//                   </span>
//                   <span className="text-sm text-gray-900">{row.name}</span>
//                 </div>
//                 <div className="flex flex-col">
//                   <span className="text-xs font-medium text-gray-500">
//                     Origin
//                   </span>
//                   <span className="text-sm text-gray-900">
//                     {row.origin_city?.name}
//                   </span>
//                 </div>
//                 <div className="flex flex-col">
//                   <span className="text-xs font-medium text-gray-500">
//                     Destination
//                   </span>
//                   <span className="text-sm text-gray-900">
//                     {row.dest_city?.name}
//                   </span>
//                 </div>
//               </div>
//             );
//           }}
//           columns={columns}
//           searchPlaceholder={t("orders.search.placeholder")}
//           rowsPerPageLabel={t("orders.rowsPerPage")}
//           leftHeader={leftHeader}
//           initialPageSize={80}
//           initialSort={{ by: "id", dir: "desc" }}
//           enableColumnVisibility={true}
//           columnVisibilityStorageKey="order-shipper"
//           postFetchTransform={(list) => list}
//           rowNavigateTo={(id) => ({
//             pathname: "orders/details",
//             query: { id },
//           })}
//         />
//       ) : (
//         <ListTemplate<POrderRow>
//           key={"orders-" + (t("lang") || "id")}
//           fetchBase={`${GET_P_ORDERS_URL}`}
//           deleteBase={`${GET_P_ORDERS_URL}`}
//           enableEditAction={true}
//           enableDetailsAction={false}
//           enableDeleteAction={true}
//           onEditAction={(id, row, index) => {
//             // router.push(`/edit/${id}`);
//             const ed_url = `/orders/details?id=${encodeURIComponent(
//               String(id)
//             )}`;
//             console.log("{1} {2} {3}", id, row, index);
//             router.push(ed_url);
//           }}
//           onDetailsAction={(id, row, index) => {
//             console.log("{1} {2} {3}", id, row, index);
//           }}
//           getDetailsContent={(row, index) => {
//             return (
//               <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
//                 <div className="flex flex-col">
//                   <span className="text-xs font-medium text-gray-500">
//                     Order
//                   </span>
//                   <span className="text-sm text-gray-900">{row.name}</span>
//                 </div>
//                 <div className="flex flex-col">
//                   <span className="text-xs font-medium text-gray-500">
//                     Origin
//                   </span>
//                   <span className="text-sm text-gray-900">
//                     {row.origin_city?.name}
//                   </span>
//                 </div>
//                 <div className="flex flex-col">
//                   <span className="text-xs font-medium text-gray-500">
//                     Destination
//                   </span>
//                   <span className="text-sm text-gray-900">
//                     {row.dest_city?.name}
//                   </span>
//                 </div>
//               </div>
//             );
//           }}
//           columns={columnsPO}
//           searchPlaceholder={t("orders.search.placeholder")}
//           rowsPerPageLabel={t("orders.rowsPerPage")}
//           // leftHeader={isShipper ? leftHeader : undefined}
//           enableColumnVisibility={true}
//           columnVisibilityStorageKey="order-transporter"
//           initialPageSize={80}
//           initialSort={{ by: "id", dir: "desc" }}
//           postFetchTransform={(list) => list}
//           rowNavigateTo={(id) => ({
//             pathname: "orders/details",
//             query: { id },
//           })}
//         />
//       )}
//     </div>
//   );
// }
