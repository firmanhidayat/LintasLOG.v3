"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";

export type StatusStep = {
  label: string; // "Done" | "On Review" | "Received" | ...
  timeISO: string; // ISO, contoh: "2025-09-13T09:30:00+07:00"
};

export type RowData = {
  id?: string | number;
  lokasiBongkar: string;
  armada: string;
  jenisMuatan: string;
  status: string; // "Pending" | "On Route" | "Unloading" | "Selesai" | ...
  // Detail:
  lokasiMuat: string;
  nomorDO: string;
  nomorDOInternal: string;
  driver: { name: string; phone: string };
  statusPath: StatusStep[]; // urutan status dgn tanggal & jam
};

/** ===== Data Dummy (fallback jika props.rows tidak diberikan) ===== */
const demoRows: RowData[] = Array.from({ length: 18 }).map((_, i) => ({
  id: i + 1,
  lokasiBongkar: [
    "Gudang A - Jakarta",
    "Pelabuhan Tj. Priok",
    "DC Cikarang",
    "Bandara Soetta",
  ][i % 4],
  armada: ["Tronton", "Fuso", "CDD", "Wingbox"][i % 4],
  jenisMuatan: ["Besi", "Kontainer 20ft", "Elektronik", "Dokumen"][i % 4],
  status: ["Pending", "On Route", "Unloading", "Selesai"][i % 4],
  lokasiMuat: [
    "Gudang B - Bekasi",
    "Gudang C - Karawang",
    "Pelabuhan Tj. Perak",
    "Bandara Juanda",
  ][i % 4],
  nomorDO: `DO-${String(i + 101).padStart(4, "0")}`,
  nomorDOInternal: `INT-${String(i + 501).padStart(5, "0")}`,
  driver: {
    name: `Driver ${i + 1}`,
    phone: `08${(Math.random() * 1e10).toFixed(0).slice(0, 10)}`,
  },
  statusPath: [
    { label: "Received", timeISO: "2025-09-12T08:30:00+07:00" },
    { label: "On Review", timeISO: "2025-09-12T10:15:00+07:00" },
    {
      label: ["On Route", "Unloading", "Done", "Pending"][i % 4],
      timeISO: "2025-09-13T09:45:00+07:00",
    },
  ],
}));

export default function StatusTrackingPage({
  rows,
  pageSize = 10,
  title,
}: {
  rows?: RowData[];
  pageSize?: number;
  title?: string;
}) {
  // i18n bootstrap + live language switch
  const [i18nReady, setI18nReady] = useState(false);
  const [lang, setLang] = useState<Lang>(getLang());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDictionaries();
      } finally {
        if (!cancelled) setI18nReady(true);
      }
    })();
    const off = onLangChange((l) => setLang(l));
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  const [openId, setOpenId] = useState<string | number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-row-menu]")) setMenuOpenId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const getRowId = (r: RowData, idx: number) => r.id ?? `row-${idx}`;

  // locale-aware datetime (pakai lang aktif)
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  const badgeCls = (s: string) => {
    const base =
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";
    if (/^selesai$/i.test(s))
      return `${base} bg-green-50 text-green-700 ring-green-600/20`;
    if (/^unloading$/i.test(s))
      return `${base} bg-blue-50 text-blue-700 ring-blue-600/20`;
    if (/^on route$/i.test(s))
      return `${base} bg-amber-50 text-amber-700 ring-amber-600/20`;
    if (/^pending$/i.test(s))
      return `${base} bg-gray-100 text-gray-700 ring-gray-500/20`;
    return `${base} bg-slate-100 text-slate-700 ring-slate-500/20`;
  };

  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        id: "_toggle",
        label: "",
        sortable: false,
        className: "w-12",
        cell: (row) => {
          const id = String(row.id ?? "");
          const open = openId != null && String(openId) === id;
          return (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`row-detail-${id}`}
              onClick={() =>
                setOpenId(open ? null : (row.id as string | number))
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              title={
                open
                  ? t("statustracking.actions.hideDetail")
                  : t("statustracking.actions.showDetail")
              }
              aria-label={t("statustracking.actions.toggleDetail")}
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 transition-transform ${
                  open ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 5l8 7-8 7" />
              </svg>
            </button>
          );
        },
      },
      {
        id: "lokasiBongkar",
        label: t("statustracking.columns.lokasiBongkar"),
        sortable: true,
        sortValue: (r) => r.lokasiBongkar ?? "",
        className: "min-w-[260px]",
        cell: (r) => r.lokasiBongkar,
      },
      {
        id: "armada",
        label: t("statustracking.columns.armada"),
        sortable: true,
        sortValue: (r) => r.armada ?? "",
        className: "min-w-[180px]",
        cell: (r) => r.armada,
      },
      {
        id: "jenisMuatan",
        label: t("statustracking.columns.jenisMuatan"),
        sortable: true,
        sortValue: (r) => r.jenisMuatan ?? "",
        className: "min-w-[200px]",
        cell: (r) => r.jenisMuatan,
      },
      {
        id: "_status_actions",
        label: t("statustracking.columns.status"),
        sortable: true,
        sortValue: (r) => r.status ?? "",
        className: "min-w-[280px]",
        cell: (row) => {
          const id = getRowId(row, 0);
          const menuOpen = menuOpenId === id;
          return (
            <div className="flex items-center gap-2" data-row-menu>
              <span className={badgeCls(row.status)}>{row.status}</span>

              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpen ? null : id);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  title={t("statustracking.actions.actionMenu")}
                  aria-label={t("statustracking.actions.actionMenu")}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                  >
                    <MenuItem onClick={() => alert(`Lihat Order: ${id}`)}>
                      {t("statustracking.menu.viewOrder")}
                    </MenuItem>
                    <MenuItem onClick={() => alert(`Lihat Surat Jalan: ${id}`)}>
                      {t("statustracking.menu.viewDO")}
                    </MenuItem>
                    <MenuItem onClick={() => alert(`Lihat Invoice: ${id}`)}>
                      {t("statustracking.menu.viewInvoice")}
                    </MenuItem>
                    <div className="h-px bg-gray-100" />
                    <MenuItem onClick={() => alert(`Buat Order Serupa: ${id}`)}>
                      {t("statustracking.menu.duplicateOrder")}
                    </MenuItem>
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
    ],
    [openId, menuOpenId, lang] // ← recompute label saat bahasa berubah
  );

  function renderExpanded(row: RowData, meta: { index: number }) {
    const id = getRowId(row, meta.index);
    return (
      <tr id={`row-detail-${id}`} className="transition-all">
        {/* [1] spacer kolom toggle */}
        <td className="px-2 pt-0 pb-3 align-top">
          <div className="grid grid-rows-[1fr] mt-2">
            <div className="overflow-hidden" />
          </div>
        </td>

        {/* [2] Lokasi Muat + Nomor DO + DO Internal */}
        <td className="px-4 pt-0 pb-3 align-top">
          <div className="grid grid-rows-[1fr] mt-2">
            <div className="overflow-hidden">
              <div className="grid gap-3">
                <DetailItem
                  label={t("statustracking.detail.lokasiMuat")}
                  value={row.lokasiMuat}
                />
                <DetailItem
                  label={t("statustracking.detail.nomorDO")}
                  value={row.nomorDO}
                />
                <DetailItem
                  label={t("statustracking.detail.nomorDOInternal")}
                  value={row.nomorDOInternal}
                />
              </div>
            </div>
          </div>
        </td>

        {/* [3] Driver & Nomor */}
        <td className="px-4 pt-0 pb-3 align-top">
          <div className="grid grid-rows-[1fr] mt-2">
            <div className="overflow-hidden">
              <DetailItem
                label={t("statustracking.detail.driverNomor")}
                value={`${row.driver.name} — ${row.driver.phone}`}
              />
            </div>
          </div>
        </td>

        {/* [4] sejajar Jenis Muatan (kosong sesuai desain) */}
        <td className="px-4 pt-0 pb-3 align-top">
          <div className="grid grid-rows-[1fr] mt-2">
            <div className="overflow-hidden" />
          </div>
        </td>

        {/* [5] Status Path */}
        <td className="px-4 pt-0 pb-3 align-top">
          <div className="grid grid-rows-[1fr] mt-2">
            <div className="overflow-hidden">
              <ol className="relative space-y-3">
                {row.statusPath.map((s, i) => (
                  <li key={`${id}-step-${i}`} className="pl-6">
                    <span className="absolute left-0 top-1.5 inline-flex h-3 w-3 rounded-full bg-gray-400" />
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700">
                        {s.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {fmt(s.timeISO)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  const rowsToUse = rows && rows.length ? rows : demoRows;

  // render setelah dictionary siap
  if (!i18nReady) return null;

  return (
    <ListTemplate<RowData>
      fetchBase="/api/dummy" // tidak dipakai karena staticData diisi
      deleteBase="/api/dummy"
      columns={columns}
      searchPlaceholder={t("statustracking.searchPlaceholder")}
      rowsPerPageLabel={t("statustracking.rowsPerPage")}
      initialPageSize={pageSize}
      staticData={rowsToUse}
      leftHeader={
        <h2 className="text-base font-semibold text-gray-900">
          {title ?? t("statustracking.title")}
        </h2>
      }
      getRowKey={(row, idx) => getRowId(row, idx)}
      isRowExpanded={(row) =>
        openId != null ? String(row.id ?? "") === String(openId) : false
      }
      renderExpanded={(row, meta) => renderExpanded(row, meta)}
    />
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900">{value || "-"}</div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
      role="menuitem"
    >
      {children}
    </button>
  );
}
