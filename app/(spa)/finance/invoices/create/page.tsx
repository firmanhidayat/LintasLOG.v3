"use client";
import React from "react";

type Money = number;

type InvoiceRO = {
  /** Header */
  invoiceNo: string;
  breadcrumb?: string[];
  tanggalInvoice: string;
  paymentStatus: string;
  payer: string;
  joNo: string;

  /** Informasi Order */
  order: {
    customer: string;
    armada: string;
    lokasiMuatKota: string;
    lokasiBongkarKota: string;
  };

  /** Informasi Muatan (sidebar) */
  muatan: {
    nama: string;
    deskripsi: string;
  };

  /** Lokasi Muat & Bongkar */
  lokasi: {
    tglMuat: string;
    tglBongkar: string;
    multiPickupDrop: boolean;
    lokasiMuat: string;
    lokasiBongkar: string;
  };

  /** Layanan Khusus */
  layananKhusus: {
    allOptions: string[];
    selected: string[];
  };

  /** Biaya */
  biaya: {
    biayaKirim: Money;
    biayaTambahan: Money;
    tax?: Money | null;
  };
};

function formatIDR(n: Money | undefined | null): string {
  if (n === undefined || n === null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateIndo(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const map: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
    success: "bg-green-100 text-green-700 ring-1 ring-green-200",
    warning: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    danger: "bg-red-100 text-red-700 ring-1 ring-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-4 py-2 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="text-gray-900">{value ?? "-"}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-5 py-4">
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
      </header>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </section>
  );
}

function CheckboxRO({ label, checked }: { label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        checked={checked}
        readOnly
        disabled
      />
      <span className="text-gray-900">{label}</span>
    </label>
  );
}

/** ===== Normalizer ===== */
type InvoiceInput = Partial<InvoiceRO> | undefined;

function normalizeInvoice(d: InvoiceInput): InvoiceRO {
  return {
    invoiceNo: d?.invoiceNo ?? "-",
    breadcrumb: d?.breadcrumb ?? [],
    tanggalInvoice: d?.tanggalInvoice ?? "",
    paymentStatus: d?.paymentStatus ?? "-",
    payer: d?.payer ?? "-",
    joNo: d?.joNo ?? "-",
    order: {
      customer: d?.order?.customer ?? "-",
      armada: d?.order?.armada ?? "-",
      lokasiMuatKota: d?.order?.lokasiMuatKota ?? "-",
      lokasiBongkarKota: d?.order?.lokasiBongkarKota ?? "-",
    },
    muatan: {
      nama: d?.muatan?.nama ?? "-",
      deskripsi: d?.muatan?.deskripsi ?? "-",
    },
    lokasi: {
      tglMuat: d?.lokasi?.tglMuat ?? "",
      tglBongkar: d?.lokasi?.tglBongkar ?? "",
      multiPickupDrop: Boolean(d?.lokasi?.multiPickupDrop),
      lokasiMuat: d?.lokasi?.lokasiMuat ?? "-",
      lokasiBongkar: d?.lokasi?.lokasiBongkar ?? "-",
    },
    layananKhusus: {
      allOptions: d?.layananKhusus?.allOptions ?? [],
      selected: d?.layananKhusus?.selected ?? [],
    },
    biaya: {
      biayaKirim: d?.biaya?.biayaKirim ?? 0,
      biayaTambahan: d?.biaya?.biayaTambahan ?? 0,
      tax: d?.biaya?.tax ?? 0,
    },
  };
}

/** ===== Component ===== */
export default function InvoiceReadonly({
  data,
}: {
  data?: Partial<InvoiceRO>;
}) {
  const inv = normalizeInvoice(data);
  const biaya = inv.biaya;
  const total =
    (biaya.biayaKirim ?? 0) + (biaya.biayaTambahan ?? 0) + (biaya.tax ?? 0);

  const paymentTone: "neutral" | "success" | "warning" | "danger" =
    /paid/i.test(inv.paymentStatus)
      ? "success"
      : /partial/i.test(inv.paymentStatus)
      ? "warning"
      : /unpaid|overdue/i.test(inv.paymentStatus)
      ? "danger"
      : "neutral";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* Breadcrumb */}
      {inv.breadcrumb && inv.breadcrumb.length > 0 && (
        <nav className="mb-2 text-sm text-gray-500">
          {inv.breadcrumb.map((b, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-2 text-gray-300">/</span>}
              {b}
            </span>
          ))}
        </nav>
      )}

      {/* Title */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {inv.invoiceNo}
        </h1>
      </div>

      {/* Top summary strip */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Tanggal Invoice</div>
          <div className="text-sm font-medium text-gray-900">
            {formatDateIndo(inv.tanggalInvoice)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">No. JO</div>
          <div className="text-sm font-medium text-gray-900">{inv.joNo}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Payment Status</div>
          <div className="text-sm font-medium text-gray-900">
            <Badge tone={paymentTone}>{inv.paymentStatus}</Badge>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Payer / Pembayar</div>
          <div className="text-sm font-medium text-gray-900">{inv.payer}</div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* LEFT */}
        <div className="space-y-6">
          <Section title="Informasi Order">
            <div className="grid gap-2 sm:grid-cols-2">
              <FieldRow label="No. JO" value={inv.joNo} />
              <FieldRow
                label="Lokasi Muat (Kota)"
                value={inv.order.lokasiMuatKota}
              />
              <FieldRow label="Customer" value={inv.order.customer} />
              <FieldRow
                label="Lokasi Bongkar (Kota)"
                value={inv.order.lokasiBongkarKota}
              />
              <FieldRow label="Armada" value={inv.order.armada} />
            </div>
          </Section>

          <Section title="Informasi Lokasi Muat dan Bongkar">
            <div className="grid gap-2 sm:grid-cols-2">
              <FieldRow
                label="Tanggal Muat"
                value={formatDateIndo(inv.lokasi.tglMuat)}
              />
              <FieldRow
                label="Tanggal Bongkar"
                value={formatDateIndo(inv.lokasi.tglBongkar)}
              />
              <FieldRow
                label="Multi Pickup / Drop"
                value={
                  <CheckboxRO label="" checked={inv.lokasi.multiPickupDrop} />
                }
              />
            </div>
            <div className="mt-2 grid gap-2">
              <FieldRow label="Lokasi Muat" value={inv.lokasi.lokasiMuat} />
              <FieldRow
                label="Lokasi Bongkar"
                value={inv.lokasi.lokasiBongkar}
              />
            </div>
          </Section>

          <Section title="Permintaan Layanan Khusus">
            <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
              {inv.layananKhusus.allOptions.map((opt) => (
                <CheckboxRO
                  key={opt}
                  label={opt}
                  checked={inv.layananKhusus.selected.includes(opt)}
                />
              ))}
            </div>
          </Section>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">
          <SidebarCard title="Informasi Muatan">
            <FieldRow label="Nama Muatan" value={inv.muatan.nama} />
            <FieldRow label="Deskripsi Muatan" value={inv.muatan.deskripsi} />
          </SidebarCard>

          <SidebarCard title="Detail Amount">
            <div className="text-sm">
              <div className="grid grid-cols-[1fr_auto] gap-2 py-1">
                <div className="text-gray-700">Biaya Kirim</div>
                <div className="text-right text-gray-900">
                  {formatIDR(biaya.biayaKirim)}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 py-1">
                <div className="text-gray-700">Biaya Layanan Tambahan</div>
                <div className="text-right text-gray-900">
                  {formatIDR(biaya.biayaTambahan)}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 py-1">
                <div className="text-gray-700">Tax</div>
                <div className="text-right text-gray-900">
                  {biaya.tax == null ? "-" : formatIDR(biaya.tax)}
                </div>
              </div>

              <div className="mt-3 border-t border-gray-200 pt-3">
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
                  <div className="text-gray-500">Total Harga</div>
                  <div className="text-right text-lg font-semibold text-gray-900">
                    {formatIDR(total)}
                  </div>
                </div>
              </div>
            </div>
          </SidebarCard>
        </div>
      </div>
    </div>
  );
}

/**
 * --- Cara pakai (contoh) ---
 *
 * <InvoiceReadonly
 *   data={{
 *     invoiceNo: "INV/2025/00001",
 *     breadcrumb: ["Invoice list", "INV/2025/00001"],
 *     tanggalInvoice: "2025-08-21",
 *     paymentStatus: "Unpaid",
 *     payer: "PT.Harvestindo International",
 *     joNo: "JO/2025/00001",
 *     order: {
 *       customer: "PT.Harvestindo International",
 *       armada: "Tronton",
 *       lokasiMuatKota: "Pasuruan",
 *       lokasiBongkarKota: "Tangerang",
 *     },
 *     muatan: {
 *       nama: "Kapas",
 *       deskripsi: "15 Ton dengan ukuran 4 x 5 meter",
 *     },
 *     lokasi: {
 *       tglMuat: "2025-08-21",
 *       tglBongkar: "2025-08-23",
 *       multiPickupDrop: false,
 *       lokasiMuat:
 *         "Dusun Jatitengah Kidul, SUKOREJO, KABUPATEN PASURUAN",
 *       lokasiBongkar:
 *         "PT. Harvestindo International, PASARKEMIS, KABUPATEN TANGERANG",
 *     },
 *     layananKhusus: {
 *       allOptions: ["Helm", "Sarung Tangan", "APAR", "Masker", "Safety Shoes", "Terpal"],
 *       selected: ["Helm", "APAR", "Safety Shoes"],
 *     },
 *     biaya: {
 *       biayaKirim: 6500000,
 *       biayaTambahan: 500000,
 *       tax: null, // tampil "-"
 *     },
 *   }}
 * />
 */
