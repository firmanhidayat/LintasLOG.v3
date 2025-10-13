"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ListTemplate,
  type ColumnDef,
} from "@/components/datagrid/ListTemplate";
import { Button } from "@/components/ui/Button";
import { FieldText } from "@/components/form/FieldText";
import { useDebounced } from "@/hooks/useDebounced";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Icon } from "@/components/icons/Icon";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type DPStatus = "Pending" | "Approved" | "Paid" | "Rejected";

type DownPaymentRow = {
  id: number | string;
  jo_no: string; // No. JO
  dp_percent?: number; // Down Payment % (mis. 20 => 20%)
  amount_total?: number; // Amount Total
  status: DPStatus | string;
};

type JoItem = { id: number | string; jo_no: string };

/** ===== Helpers ===== */
function fmtPercent(p?: number) {
  if (p == null) return "-";
  return `${p}%`;
}
function fmtPrice(v?: number) {
  if (v == null) return "-";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return String(v);
  }
}
function Pill({ value }: { value: string }) {
  const color =
    value === "Approved"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : value === "Paid"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : value === "Rejected"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-amber-100 text-amber-700 border-amber-200"; // Pending/others
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {value}
    </span>
  );
}

/** ===== Dummy data ===== */
const DEMO_DP: DownPaymentRow[] = [
  {
    id: 9001,
    jo_no: "JO-2025-0015",
    dp_percent: 20,
    amount_total: 3_000_000,
    status: "Pending",
  },
  {
    id: 9002,
    jo_no: "JO-2025-0011",
    dp_percent: 50,
    amount_total: 7_500_000,
    status: "Approved",
  },
  {
    id: 9003,
    jo_no: "JO-2025-0009",
    dp_percent: 30,
    amount_total: 12_000_000,
    status: "Paid",
  },
];

/** ===== Small UI: Modal ===== */
function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => {
    if (open) onClose();
  });
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={ref}
        className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-lg"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function DPPercentCombo({
  label,
  value,
  onChange,
  disabled,
  options = [0, 10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100],
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  /** daftar opsi persen yang ditampilkan di dropdown */
  options?: number[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState<string>(String(value ?? ""));
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false));

  useEffect(() => {
    // sinkronkan ketika value dari luar berubah (mis. reset form)
    setQ(String(value ?? ""));
  }, [value]);

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return options;
    return options.filter((n) => String(n).startsWith(s));
  }, [q, options]);

  function commitFromInput() {
    const n = parseInt(q || "0", 10);
    if (Number.isNaN(n)) return;
    const clamped = Math.min(100, Math.max(0, n));
    onChange(clamped);
    setQ(String(clamped));
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <FieldText
        label={label}
        value={q}
        type="number"
        onChange={(v) => {
          setQ(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Pilih / ketik persen (0–100)"
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        onBlur={() => {
          // saat blur, commit nilai yang diketik (clamp 0–100)
          commitFromInput();
        }}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Tidak ada opsi
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((pct) => (
                <li key={pct}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(pct);
                      setQ(String(pct));
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {pct}%
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** ===== Searchable JO Select (async) ===== */
function JOSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: JoItem | null;
  onChange: (v: JoItem | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState<string>(value?.jo_no ?? "");
  const [items, setItems] = useState<JoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(q, 300);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!debounced) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api-tms/orders/jo/search?q=${encodeURIComponent(
            debounced
          )}`,
          {
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data: { items?: Array<{ id: number | string; jo_no: string }> } =
          await res.json();
        if (!cancelled) {
          setItems(
            (data.items ?? []).map((it) => ({ id: it.id, jo_no: it.jo_no }))
          );
        }
      } catch {
        // fallback demo bila API gagal
        if (!cancelled) {
          const demo: JoItem[] = [
            { id: 1, jo_no: "JO-2025-0018" },
            { id: 2, jo_no: "JO-2025-0015" },
            { id: 3, jo_no: "JO-2025-0009" },
          ].filter((d) =>
            d.jo_no.toLowerCase().includes(debounced.toLowerCase())
          );
          setItems(demo);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className="relative" ref={wrapRef}>
      <FieldText
        label={label}
        value={q}
        onChange={(v) => {
          setQ(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cari No. JO…"
        disabled={disabled}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-md">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Tidak ada data
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it) => (
                <li key={String(it.id)}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(it);
                      setQ(it.jo_no);
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {it.jo_no}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** ===== Form State Type ===== */
type CreateDPForm = {
  jo: JoItem | null;
  dpPercent: number;
  amount: number;
};

export default function DownPaymentListPage() {
  const { i18nReady, activeLang } = useI18nReady();
  const [rows, setRows] = useState<DownPaymentRow[]>(DEMO_DP);
  const [openCreate, setOpenCreate] = useState(false);

  // ===== Columns: tetap sama seperti sebelumnya =====
  const columns = useMemo<ColumnDef<DownPaymentRow>[]>(() => {
    const L = (key: string, fallback: string) =>
      i18nReady && activeLang ? t(key) || fallback : fallback;

    return [
      {
        id: "jo_no",
        label: L("downpayment.columns.joNo", "No. JO"),
        sortable: true,
        sortValue: (r) => r.jo_no.toLowerCase(),
        className: "w-40",
        cell: (r) => <div className="font-medium text-gray-900">{r.jo_no}</div>,
      },
      {
        id: "dp_percent",
        label: L("downpayment.columns.dpPercent", "Down Payment %"),
        sortable: true,
        sortValue: (r) => String(r.dp_percent ?? ""),
        className: "w-40 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPercent(r.dp_percent)}</span>
        ),
      },
      {
        id: "amount_total",
        label: L("downpayment.columns.amountTotal", "Amount Total"),
        sortable: true,
        sortValue: (r) => String(r.amount_total ?? ""),
        className: "w-44 text-right",
        cell: (r) => (
          <span className="tabular-nums">{fmtPrice(r.amount_total)}</span>
        ),
      },
      {
        id: "status",
        label: L("downpayment.columns.status", "Status"),
        sortable: true,
        sortValue: (r) => String(r.status),
        className: "w-40",
        cell: (r) => <Pill value={String(r.status)} />,
      },
      {
        id: "actions",
        label: "",
        isAction: true,
        className: "w-20",
        cell: (it) => (
          <div className="flex items-center gap-2">
            {it.id != null ? (
              <Link
                href={`/claims/details?id=${encodeURIComponent(String(it.id))}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border hover:bg-gray-100"
                aria-label="Edit address"
                title="Edit"
              >
                <Icon name="pencil" className="h-3 w-3" />
              </Link>
            ) : (
              <button
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
                type="button"
                onClick={() => {
                  // ListTemplate kini menangani event ini & membuka modal konfirmasi
                  const evt = new CustomEvent("llog.openDeleteConfirm", {
                    detail: { id: it.id, name: it.jo_no },
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
  }, [i18nReady, activeLang]);

  // Guard render setelah semua hooks terpanggil
  if (!i18nReady) return null;

  /** ===== Header left: Button open modal ===== */
  const leftHeader = (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setOpenCreate(true)}
        className="inline-flex items-center"
      >
        {t("downpayment.create.title") || "Create Down Payment"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4" data-lang={activeLang}>
      <ListTemplate<DownPaymentRow>
        fetchBase={`${API_BASE}/api-tms/finance/downpayments`} // diabaikan saat staticData dipakai
        deleteBase={`${API_BASE}/api-tms/finance/downpayments`} // diabaikan saat staticData dipakai
        columns={columns}
        searchPlaceholder={
          t("downpayment.search.placeholder") || "Cari down payment..."
        }
        rowsPerPageLabel={t("downpayment.rowsPerPage") || "Baris per halaman"}
        leftHeader={leftHeader}
        initialSort={{ by: "jo_no", dir: "desc" }}
        getRowName={(r) => r.jo_no}
        staticData={rows}
        staticSearch={(row, q) =>
          row.jo_no.toLowerCase().includes(q) ||
          String(row.dp_percent ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.amount_total ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.status).toLowerCase().includes(q)
        }
      />

      {/* ===== Modal Create DP ===== */}
      <CreateDPModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={(newRow) => {
          // Append ke list demo
          setRows((prev) => [newRow, ...prev]);
          setOpenCreate(false);
        }}
      />
    </div>
  );
}

/** ====== Create DP Modal Component ====== */
function CreateDPModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (row: DownPaymentRow) => void;
}) {
  const [form, setForm] = useState<CreateDPForm>({
    jo: null,
    dpPercent: 20,
    amount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // reset tiap kali dibuka
      setForm({ jo: null, dpPercent: 20, amount: 0 });
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!form.jo) return;
    setSubmitting(true);
    try {
      // === Integrasi real API (aktifkan sesuai backend):
      // const res = await fetch(`${API_BASE}/api-tms/finance/downpayments`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify({
      //     jo_id: form.jo.id,
      //     dp_percent: form.dpPercent,
      //     amount_total: form.amount,
      //   }),
      // });
      // if (!res.ok) throw new Error(String(res.status));
      // const saved: { id: number | string; jo_no: string } = await res.json();

      // DEMO ONLY: buat row baru lokal
      const newRow: DownPaymentRow = {
        id: Date.now(),
        jo_no: form.jo.jo_no,
        dp_percent: form.dpPercent,
        amount_total: form.amount,
        status: "Pending",
      };
      onCreated(newRow);
    } catch {
      // Bisa tampilkan toast/error UI di sini
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("downpayment.create.title") || "Create Down Payment"}
    >
      <div className="space-y-4">
        {/* No. JO (searchable dropdown) */}
        <JOSelect
          label={t("downpayment.form.joNo") || "No. JO"}
          value={form.jo}
          onChange={(jo) => setForm((f) => ({ ...f, jo }))}
        />

        {/* DP % (numeric up/down) */}
        <DPPercentCombo
          label={t("downpayment.form.dpPercent") || "Down Payment %"}
          value={form.dpPercent}
          onChange={(v) => setForm((f) => ({ ...f, dpPercent: v }))}
        />

        {/* Amount (angka) */}
        <FieldText
          label={t("downpayment.form.amount") || "Amount"}
          type="number"
          value={String(form.amount)}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              amount: Math.max(0, parseInt(v || "0", 10)),
            }))
          }
          min={0}
          step={1000}
          placeholder="0"
        />

        {/* === Keterangan (readonly) === */}
        <div className="space-y-1">
          <label className="text-xs font-light text-gray-600">
            Syarat &amp; Ketentuan DP (Down Payment)
          </label>
          <div
            className="rounded-md p-2 font-light text-xs leading-relaxed text-gray-700 max-h-40 overflow-auto"
            aria-readonly="true"
          >
            <ol className="list-decimal text-xs pl-5 space-y-1">
              <li>
                DP adalah tanda jadi pemesanan dan akan dipotong dari total
                harga
              </li>
              <li>
                DP yang sudah dibayarkan tidak dapat dikembalikan bila
                pembatalan dilakukan oleh pembeli
              </li>
              <li>
                Jika pembatalan dari pihak kami, maka DP dikembalikan penuh
              </li>
              <li>
                Sisa pembayaran wajib dilunasi sesuai waktu yang disepakati
              </li>
              <li>
                Jika pelunasan tidak dilakukan tepat waktu maka DP dianggap
                hangus dan pemesanan dibatalkan
              </li>
              <li>
                Dengan membayar DP, pembeli dianggap setuju dengan ketentuan ini
              </li>
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.jo}
          >
            {submitting
              ? t("common.submitting") || "Submitting…"
              : t("common.submit") || "Submit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// /** ===== Utils ===== */
// function clampInt(n: number, min: number, max: number) {
//   if (Number.isNaN(n)) return min;
//   return Math.min(max, Math.max(min, n));
// }
