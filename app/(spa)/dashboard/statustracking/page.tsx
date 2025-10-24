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
import StatusDelivery from "@/components/ui/StatusDelivery";

/** ===== Types ===== */
export type StatusStep = { label: string; timeISO: string };
export type RowData = {
  id: string | number;
  lokasiBongkar: string;
  armada: string;
  jenisMuatan: string;
  status: string;
  lokasiMuat: string;
  nomorDO: string;
  nomorDOInternal: string;
  driver: { name: string; phone: string };
  statusPath: StatusStep[];
};

/** ===== Dummy data (deterministik) ===== */
const demoRowsBase: RowData[] = Array.from({ length: 12 }).map((_, i) => {
  const phone = String(81234560000 + i).slice(0, 11);
  return {
    id: i + 1,
    lokasiBongkar: ["Bandara Soetta", "DC Cikarang", "Tj. Priok"][i % 3],
    armada: ["Wingbox", "Tronton", "Fuso"][i % 3],
    jenisMuatan: ["Dokumen", "Elektronik", "Kontainer 20ft"][i % 3],
    status: ["Selesai", "On Route", "Pending"][i % 3],
    lokasiMuat: ["Gudang B - Bekasi", "Gudang C - Karawang", "Pelabuhan Perak"][
      i % 3
    ],
    nomorDO: `DO-${String(100 + i).padStart(4, "0")}`,
    nomorDOInternal: `INT-${String(500 + i).padStart(5, "0")}`,
    driver: { name: `Driver ${i + 1}`, phone: `0${phone}` },
    statusPath: [
      { label: "Received", timeISO: "2025-09-12T08:30:00+07:00" },
      { label: "On Review", timeISO: "2025-09-12T10:15:00+07:00" },
      {
        label: ["On Route", "Unloading", "Done"][i % 3],
        timeISO: "2025-09-13T09:45:00+07:00",
      },
    ],
  };
});

/** ===== Page ===== */
export default function StatusTrackingPage({
  rows,
  pageSize = 10,
  title,
}: {
  rows?: Partial<RowData>[];
  pageSize?: number;
  title?: string;
}) {
  // i18n
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

  // local UI states
  const [openId, setOpenId] = useState<string | number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null);

  // close menu on outside/Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-row-menu]"))
        setMenuOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenId(null);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // normalize rows to ensure id exists
  const rowsNormalized: RowData[] = useMemo(() => {
    const base = rows && rows.length ? rows : demoRowsBase;
    return base.map((r, i) => ({ ...r, id: r.id ?? `row-${i}` })) as RowData[];
  }, [rows]);

  // datetime formatter
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  // badge status (kolom utama)
  const badgeCls = (s: string) => {
    const base =
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";
    const val = s.trim().toLowerCase();
    if (val === "selesai" || val === "done")
      return `${base} bg-green-50 text-green-700 ring-green-600/20`;
    if (val === "unloading")
      return `${base} bg-violet-50 text-violet-700 ring-violet-600/20`;
    if (val === "on route")
      return `${base} bg-amber-50 text-amber-700 ring-amber-600/20`;
    if (val === "pending")
      return `${base} bg-gray-100 text-gray-700 ring-gray-500/20`;
    if (val === "received")
      return `${base} bg-slate-50 text-slate-700 ring-slate-600/20`;
    if (val === "on review")
      return `${base} bg-blue-50 text-blue-700 ring-blue-600/20`;
    return `${base} bg-slate-100 text-slate-700 ring-slate-500/20`;
  };

  // step styles (timeline)
  function stepStyles(label: string) {
    const baseChip =
      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset";
    const val = label.trim().toLowerCase();
    const Icon = ({ d }: { d: string }) => (
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d={d} />
      </svg>
    );
    if (val === "done" || val === "selesai")
      return {
        chip: `${baseChip} bg-green-50 text-green-700 ring-green-600/20`,
        dot: "bg-green-500",
        icon: <Icon d="M5 13l4 4L19 7" />,
      };
    if (val === "on review")
      return {
        chip: `${baseChip} bg-blue-50 text-blue-700 ring-blue-600/20`,
        dot: "bg-blue-500",
        icon: <Icon d="M11 11a7 7 0 109.9 9.9L20 20M11 18a7 7 0 110-14" />,
      };
    if (val === "on route")
      return {
        chip: `${baseChip} bg-amber-50 text-amber-700 ring-amber-600/20`,
        dot: "bg-amber-500",
        icon: <Icon d="M5 12h14M13 5l7 7-7 7" />,
      };
    if (val === "unloading")
      return {
        chip: `${baseChip} bg-violet-50 text-violet-700 ring-violet-600/20`,
        dot: "bg-violet-500",
        icon: <Icon d="M12 5v14M5 12l7 7 7-7" />,
      };
    if (val === "received")
      return {
        chip: `${baseChip} bg-slate-50 text-slate-700 ring-slate-600/20`,
        dot: "bg-slate-500",
        icon: <Icon d="M4 4h16l-2 10H6L4 4z" />,
      };
    return {
      chip: `${baseChip} bg-gray-100 text-gray-700 ring-gray-500/20`,
      dot: "bg-gray-500",
      icon: <Icon d="M12 7v5l3 3" />,
    };
  }

  /** ===== Columns ===== */
  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        id: "_toggle",
        label: "",
        sortable: false,
        className: "w-12",
        cell: (row) => {
          const id = String(row.id);
          const open = openId != null && String(openId) === id;
          return (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`row-detail-${id}`}
              onClick={() => setOpenId(open ? null : row.id)}
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
        className: "w-[96px]",
        cell: (r) => r.lokasiBongkar,
      },
      {
        id: "armada",
        label: t("statustracking.columns.armada"),
        sortable: true,
        sortValue: (r) => r.armada ?? "",
        className: "w-[200px]",
        cell: (r) => r.armada,
      },
      {
        id: "jenisMuatan",
        label: t("statustracking.columns.jenisMuatan"),
        sortable: true,
        sortValue: (r) => r.jenisMuatan ?? "",
        className: "w-[180px]",
        cell: (r) => r.jenisMuatan,
      },
      {
        id: "_status_actions",
        label: t("statustracking.columns.status"),
        sortable: true,
        sortValue: (r) => r.status ?? "",
        className: "w-[30px]",
        cell: (row) => {
          const id = String(row.id);
          const menuOpen = menuOpenId === row.id;
          return (
            <div className="flex items-center gap-2" data-row-menu>
              <span className={badgeCls(row.status)}>{row.status}</span>
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpen ? null : row.id);
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
                    className="absolute text-md right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
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
                    {/* <MenuItem onClick={() => alert(`Buat Order Serupa: ${id}`)}>
                      {t("statustracking.menu.duplicateOrder")}
                    </MenuItem> */}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
    ],
    [openId, menuOpenId, lang]
  );

  /** ========= EXPANDED ROW (rapi) =========
   * 1 <td colSpan={columns.length}> lalu grid 3 kolom (md+), 1 kolom di mobile.
   * Kiri: lokasi muat & DO; Tengah: driver; Kanan: timeline.
   */
  function renderExpanded(row: RowData) {
    const id = String(row.id);
    return (
      <tr id={`row-detail-${id}`} className="bg-transparent">
        <td colSpan={5} className="px-2 pb-4 pt-0 align-top">
          <div className="rounded-lg border border-gray-100 bg-white/70 p-3 md:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kolom 1 */}
              <div className="space-y-3">
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

              {/* Kolom 2 */}
              <div className="space-y-3">
                <DetailItem
                  label={t("statustracking.detail.driverNomor")}
                  value={`${row.driver.name} — ${row.driver.phone}`}
                />
              </div>

              {/* Kolom 3: Timeline */}
              <div className="pt-1">
                <div className="relative pl-4">
                  {/* garis vertikal hanya setinggi konten */}
                  <span
                    aria-hidden
                    className="absolute left-1 top-1 bottom-1 w-px bg-gray-200"
                  />
                  <ol className="space-y-0">
                    {row.statusPath.map((s, i) => {
                      const sty = stepStyles(s.label);
                      return (
                        <StatusDelivery
                          key={`${id}-step-${i}`}
                          items={[{ label: s.label, datetime: s.timeISO }]}
                          maxVisible={1}
                          className="!pl-0 !pb-0"
                          color={"green"}
                          size="sm"
                          showAllText="Show Me"
                          hideToggle={false}
                        />
                      );
                    })}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  if (!i18nReady) return null;

  return (
    <ListTemplate<RowData>
      key={lang} // reset state internal ListTemplate jika ganti bahasa
      fetchBase="/api/dummy"
      deleteBase="/api/dummy"
      columns={columns}
      searchPlaceholder={t("statustracking.searchPlaceholder")}
      rowsPerPageLabel={t("statustracking.rowsPerPage")}
      initialPageSize={pageSize}
      staticData={rowsNormalized}
      leftHeader={
        <h2 className="text-base font-semibold text-gray-900">
          {title ?? t("statustracking.title")}
        </h2>
      }
      getRowKey={(row) => row.id}
      isRowExpanded={(row) =>
        openId != null ? String(row.id) === String(openId) : false
      }
      renderExpanded={(row) => renderExpanded(row)}
    />
  );
}

/** ===== Small UI helpers ===== */
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-3 py-2 border border-gray-100">
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
