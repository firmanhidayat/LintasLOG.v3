import { odooUtcToUser, formatDatetimeLocalValue } from "@/lib/datetime";

/** ===== Helpers ===== */
// export function fmtDate(d?: string) {
//   if (!d) return "-";
//   const dt = new Date(d);
//   const dd = String(dt.getDate()).padStart(2, "0");
//   const mm = String(dt.getMonth() + 1).padStart(2, "0");
//   const yyyy = dt.getFullYear();
//   return `${dd}/${mm}/${yyyy}`;
// }

// export function fmtDate(d?: string, tz?: string) {
//   if (!d) return "-";
//   try {
//     const dt = new Date(d);
//     const options: Intl.DateTimeFormatOptions = {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: false,
//       timeZone: tz || "Asia/Jakarta", // fallback jika TZ belum ada
//     };
//     return new Intl.DateTimeFormat("id-ID", options).format(dt);
//   } catch (e) {
//     return "-";
//   }
// }

export function fmtDate(value?: string | null, tz?: string) {
  // // if (!d) return "-";
  // // try {
  // //   const tglMuatConverted = odooUtcToUser(
  // //     d,
  // //     tz ?? "Asia/Jakarta",
  // //     "DD/MM/YYYY HH:mm"
  // //   );
  // //   return tglMuatConverted;
  // //   // return new Intl.DateTimeFormat("id-ID", options).format(dt);
  // // } catch (e) {
  // //   return "-";
  // // }
  //   return odooUtcToUser(
  //     d,
  //     tz ?? "Asia/Jakarta",
  //     "DD/MM/YYYY HH:mm"
  //   ) || undefined;

  const raw = String(value ?? "").trim();
  if (!raw) return "-";

  // if already formatted by UI (defensive)
  if (/^\d{2}\/\d{2}\/\d{4}/.test(raw) || /^\d{2}-\d{2}-\d{4}/.test(raw)) {
    return raw;
  }

  // <input type="datetime-local"> value
  if (raw.includes("T")) {
    return formatDatetimeLocalValue(raw, "DD/MM/YYYY HH:mm");
  }

  // Odoo UTC string (YYYY-MM-DD HH:mm:ss) -> user tz
  return odooUtcToUser(raw, tz ?? "Asia/Jakarta", "DD/MM/YYYY HH:mm");
}
// odooUtcToUser

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

export function capitalizeIfLowercase(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  const isAllLowercase = trimmed === trimmed.toLowerCase();
  return isAllLowercase
    ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    : trimmed;
}
