/** ===== Helpers ===== */
export function fmtDate(d?: string) {
  if (!d) return "-";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// export function fmtPrice(v?: number) {
//   if (v == null) return "-";
//   try {
//     return new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       maximumFractionDigits: 0,
//     }).format(v);
//   } catch {
//     return String(v);
//   }
// }

export function fmtPrice(
  value: NumericLike,
  opts?: {
    locale?: string; // default: id-ID
    currency?: string; // default: IDR
    fractionDigits?: number; // paksa jumlah desimal (opsional)
    fallback?: string; // default: "-"
  }
): string {
  const {
    locale = "id-ID",
    currency = "IDR",
    fractionDigits,
    fallback = "-",
  } = opts ?? {};

  if (value == null || value === "") return fallback;

  const num =
    typeof value === "string" ? toNumberSafe(value) : (value as number);

  if (!isFinite(num)) return fallback;

  const nfOpts: Intl.NumberFormatOptions = { style: "currency", currency };
  if (fractionDigits != null) {
    nfOpts.minimumFractionDigits = fractionDigits;
    nfOpts.maximumFractionDigits = fractionDigits;
  }

  return new Intl.NumberFormat(locale, nfOpts).format(num);
}

function toNumberSafe(s: string): number {
  const t = s.trim();
  if (t === "") return NaN;

  // Buang simbol non-digit kecuali tanda minus, titik, koma
  // Hilangkan titik ribuan, ubah koma menjadi titik desimal
  const normalized = t
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // hapus titik sebagai pemisah ribuan
    .replace(/,(?=\d{2,})/g, "") // jika koma dipakai ribuan EN, hapus
    .replace(",", "."); // sisakan koma terakhir sbg desimal

  return Number(normalized);
}
