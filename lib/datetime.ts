import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const ODOO_UTC_FORMAT = "YYYY-MM-DD HH:mm:ss";

// jagain format : input yang sering muncul di UI / Odoo
const INPUT_FORMATS = [
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DD HH:mm",
  "YYYY-MM-DDTHH:mm:ss",
  "YYYY-MM-DDTHH:mm",
  "YYYY-MM-DD",
];

type TzSpec =
  | { kind: "iana"; value: string }
  | { kind: "offset"; minutes: number };

function parseTzSpec(tz?: string | null): TzSpec {
  const v = (tz ?? "").trim();
  // offset seperti +07:00 atau -05:30
  const m = v.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (m) {
    const sign = m[1] === "-" ? -1 : 1;
    const hh = Number(m[2]);
    const mm = Number(m[3]);
    return { kind: "offset", minutes: sign * (hh * 60 + mm) };
  }
  // bikin default aman untuk user Indonesia bila tz kosong
  return { kind: "iana", value: v || "Asia/Jakarta" };
}

function stripFraction(s: string): string {
  // handle "2025-12-30 07:46:12.123456"
  return s.replace(/\.\d+/, "");
}

/** Parse string dari Odoo sebagai UTC */
export function parseOdooUtc(utcString?: string | null): dayjs.Dayjs | null {
  if (!utcString) return null;
  const raw = stripFraction(String(utcString).trim());
  if (!raw) return null;
  // Jika ada Z atau offset, dayjs bisa baca offsetnya -> jadikan UTC
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) {
    const d = dayjs(raw);
    return d.isValid() ? d.utc() : null;
  }
  // Odoo sering kirim tanpa timezone: anggap itu UTC
  for (const fmt of INPUT_FORMATS) {
    const d = dayjs.utc(raw, fmt, true);
    if (d.isValid()) return d;
  }
  const fallback = dayjs.utc(raw);
  return fallback.isValid() ? fallback : null;
}

function toUserZone(dUtc: dayjs.Dayjs, tzSpec: TzSpec): dayjs.Dayjs {
  return tzSpec.kind === "iana"
    ? dUtc.tz(tzSpec.value)
    : dUtc.utcOffset(tzSpec.minutes);
}

/** UTC (Odoo) -> string display di timezone user */
export function odooUtcToUser(
  odooUtc: string | null | undefined,
  userTz?: string | null,
  outFormat = "DD/MM/YYYY HH:mm"
): string {
  const dUtc = parseOdooUtc(odooUtc);
  if (!dUtc) return "-";
  const tzSpec = parseTzSpec(userTz);
  return toUserZone(dUtc, tzSpec).format(outFormat);
}
/** UTC (Odoo) -> value untuk <input type="datetime-local" /> (timezone user) */
export function odooUtcToDatetimeLocalValue(
  odooUtc: string | null | undefined,
  userTz?: string | null,
  defaultTime: string = "08:00"
): string {
  const raw = stripFraction(String(odooUtc ?? "").trim());
  if (!raw) return "";

  // If backend sends date-only, treat it as a local date (no timezone) and add defaultTime
  // so it can be bound to <input type="datetime-local">.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const t = (defaultTime || "00:00").slice(0, 5);
    return `${raw}T${t}`;
  }

  const dUtc = parseOdooUtc(raw);
  if (!dUtc) return "";
  const tzSpec = parseTzSpec(userTz);
  return toUserZone(dUtc, tzSpec).format("YYYY-MM-DDTHH:mm");
}
// function parseLocalInUserTz(raw: string, userTz: string): dayjs.Dayjs | null {
//   // Interpret raw as a datetime *in userTz* (NOT in browser timezone).
//   for (const fmt of INPUT_FORMATS) {
//     const d = dayjs.tz(raw, fmt, userTz);
//     if (d.isValid()) return d;
//   }
//   const fb = dayjs.tz(raw, userTz);
//   return fb.isValid() ? fb : null;
// }

function parseLocalInUserTz(raw: string, userTz: string): dayjs.Dayjs | null {
  // Interpret raw as a datetime *in userTz* (NOT in browser timezone).
  // dayjs.tz() can throw RangeError ("Invalid time value") when format doesn't match input,
  // so we try likely formats first + wrap tz parsing in try/catch.
  const candidates: string[] = [];

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) {
    candidates.push("YYYY-MM-DDTHH:mm:ss");
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    candidates.push("YYYY-MM-DDTHH:mm");
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    candidates.push("YYYY-MM-DD HH:mm:ss");
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
    candidates.push("YYYY-MM-DD HH:mm");
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    candidates.push("YYYY-MM-DD");
  }

  // fallback formats (dedupe)
  for (const f of INPUT_FORMATS) {
    if (!candidates.includes(f)) candidates.push(f);
  }

  for (const fmt of candidates) {
    try {
      const d = dayjs.tz(raw, fmt, userTz);
      if (d.isValid()) return d;
    } catch {
      // ignore and continue
    }
  }

  try {
    const fb = dayjs.tz(raw, userTz);
    return fb.isValid() ? fb : null;
  } catch {
    return null;
  }
}

export function formatDatetimeLocalValue(
  localValue: unknown,
  outFormat: string = "DD/MM/YYYY HH:mm"
): string {
  const raw = stripFraction(String(localValue ?? "").trim());
  if (!raw) return "-";

  // already formatted (defensive)
  if (/^\d{2}\/\d{2}\/\d{4}/.test(raw) || /^\d{2}-\d{2}-\d{4}/.test(raw)) return raw;

  const formats = [
    "YYYY-MM-DDTHH:mm",
    "YYYY-MM-DDTHH:mm:ss",
    "YYYY-MM-DD HH:mm",
    "YYYY-MM-DD HH:mm:ss",
    "YYYY-MM-DD",
  ] as const;

  for (const fmt of formats) {
    const d = dayjs(raw, fmt, true);
    if (d.isValid()) return d.format(outFormat);
  }
  const fb = dayjs(raw);
  return fb.isValid() ? fb.format(outFormat) : "-";
}

/**
 * Value dari UI (biasanya "YYYY-MM-DDTHH:mm" dari datetime-local)
 * dianggap sebagai waktu di timezone user -> convert ke UTC format Odoo.
 */
export function userLocalToOdooUtc(
  localValue: string | null | undefined,
  userTz?: string | null
): string | null {
  const raw = stripFraction(String(localValue ?? "").trim());
  if (!raw) return null;
  const tzSpec = parseTzSpec(userTz);
  let dLocal: dayjs.Dayjs | null = null;
  if (tzSpec.kind === "iana") {
    dLocal = parseLocalInUserTz(raw, tzSpec.value);
  } else {
    for (const fmt of INPUT_FORMATS) {
      const d = dayjs(raw, fmt, true);
      if (d.isValid()) {
        dLocal = d.utcOffset(tzSpec.minutes, true);
        break;
      }
    }
    if (!dLocal) {
      const d = dayjs(raw);
      dLocal = d.isValid() ? d.utcOffset(tzSpec.minutes, true) : null;
    }
  }
  if (!dLocal || !dLocal.isValid()) return null;
  return dLocal.utc().format(ODOO_UTC_FORMAT);
}

// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
// import customParseFormat from "dayjs/plugin/customParseFormat";

// dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.extend(customParseFormat);

// const ODOO_UTC_FORMAT = "YYYY-MM-DD HH:mm:ss";

// // jagain format : input yang sering muncul di UI / Odoo
// const INPUT_FORMATS = [
//   "YYYY-MM-DD HH:mm:ss",
//   "YYYY-MM-DD HH:mm",
//   "YYYY-MM-DDTHH:mm:ss",
//   "YYYY-MM-DDTHH:mm",
//   "YYYY-MM-DD",
// ];

// type TzSpec =
//   | { kind: "iana"; value: string }
//   | { kind: "offset"; minutes: number };

// function parseTzSpec(tz?: string | null): TzSpec {
//   const v = (tz ?? "").trim();
//   // offset seperti +07:00 atau -05:30
//   const m = v.match(/^([+-])(\d{2}):?(\d{2})$/);
//   if (m) {
//     const sign = m[1] === "-" ? -1 : 1;
//     const hh = Number(m[2]);
//     const mm = Number(m[3]);
//     return { kind: "offset", minutes: sign * (hh * 60 + mm) };
//   }
//   // bikin default aman untuk user Indonesia bila tz kosong
//   return { kind: "iana", value: v || "Asia/Jakarta" };
// }

// function stripFraction(s: string): string {
//   // handle "2025-12-30 07:46:12.123456"
//   return s.replace(/\.\d+/, "");
// }

// /** Parse string dari Odoo sebagai UTC */
// export function parseOdooUtc(utcString?: string | null): dayjs.Dayjs | null {
//   if (!utcString) return null;
//   const raw = stripFraction(String(utcString).trim());
//   if (!raw) return null;
//   // Jika ada Z atau offset, dayjs bisa baca offsetnya -> jadikan UTC
//   if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) {
//     const d = dayjs(raw);
//     return d.isValid() ? d.utc() : null;
//   }
//   // Odoo sering kirim tanpa timezone: anggap itu UTC
//   for (const fmt of INPUT_FORMATS) {
//     const d = dayjs.utc(raw, fmt, true);
//     if (d.isValid()) return d;
//   }
//   const fallback = dayjs.utc(raw);
//   return fallback.isValid() ? fallback : null;
// }

// function toUserZone(dUtc: dayjs.Dayjs, tzSpec: TzSpec): dayjs.Dayjs {
//   return tzSpec.kind === "iana"
//     ? dUtc.tz(tzSpec.value)
//     : dUtc.utcOffset(tzSpec.minutes);
// }

// /** UTC (Odoo) -> string display di timezone user */
// export function odooUtcToUser(
//   odooUtc: string | null | undefined,
//   userTz?: string | null,
//   outFormat = "DD/MM/YYYY HH:mm"
// ): string {
//   const dUtc = parseOdooUtc(odooUtc);
//   if (!dUtc) return "-";
//   const tzSpec = parseTzSpec(userTz);
//   return toUserZone(dUtc, tzSpec).format(outFormat);
// }
// /** UTC (Odoo) -> value untuk <input type="datetime-local" /> (timezone user) */
// export function odooUtcToDatetimeLocalValue(
//   odooUtc: string | null | undefined,
//   userTz?: string | null
// ): string {
//   const dUtc = parseOdooUtc(odooUtc);
//   if (!dUtc) return "";
//   const tzSpec = parseTzSpec(userTz);
//   return toUserZone(dUtc, tzSpec).format("YYYY-MM-DDTHH:mm");
// }
// function parseLocalInUserTz(raw: string, userTz: string): dayjs.Dayjs | null {
//   for (const fmt of INPUT_FORMATS) {
//     const base = dayjs(raw, fmt, true);
//     if (base.isValid()) {
//       // keepLocalTime=true => anggap raw itu memang waktu di userTz
//       return base.tz(userTz, true);
//     }
//   }
//   // fallback (kalau input format di luar list)
//   const fb = dayjs(raw);
//   return fb.isValid() ? fb.tz(userTz, true) : null;
// }

// /**
//  * Value dari UI (biasanya "YYYY-MM-DDTHH:mm" dari datetime-local)
//  * dianggap sebagai waktu di timezone user -> convert ke UTC format Odoo.
//  */
// export function userLocalToOdooUtc(
//   localValue: string | null | undefined,
//   userTz?: string | null
// ): string | null {
//   const raw = stripFraction(String(localValue ?? "").trim());
//   if (!raw) return null;
//   const tzSpec = parseTzSpec(userTz);
//   let dLocal: dayjs.Dayjs | null = null;
//   if (tzSpec.kind === "iana") {
//     dLocal = parseLocalInUserTz(raw, tzSpec.value);
//   } else {
//     for (const fmt of INPUT_FORMATS) {
//       const d = dayjs(raw, fmt, true);
//       if (d.isValid()) {
//         dLocal = d.utcOffset(tzSpec.minutes, true);
//         break;
//       }
//     }
//     if (!dLocal) {
//       const d = dayjs(raw);
//       dLocal = d.isValid() ? d.utcOffset(tzSpec.minutes, true) : null;
//     }
//   }
//   if (!dLocal || !dLocal.isValid()) return null;
//   return dLocal.utc().format(ODOO_UTC_FORMAT);
// }
