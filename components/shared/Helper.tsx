import dayjs from "dayjs";

/** Helper: isi date-time picker dari string API → "YYYY-MM-DDTHH:mm" (local) */
export function apiToLocalIsoMinute(
  s: string | null | undefined,
  fallbackTime = "08:00"
): string {
  if (!s) return "";
  const candidates = [
    "YYYY-MM-DD HH:mm:ss",
    "YYYY-MM-DDTHH:mm:ssZ",
    "YYYY-MM-DDTHH:mm:ss",
    "YYYY-MM-DDTHH:mm",
    "YYYY-MM-DD",
  ];
  for (const fmt of candidates) {
    const d = dayjs(s, fmt, true);
    if (d.isValid()) {
      const datePart = d.format("YYYY-MM-DD");
      const hasTime = fmt !== "YYYY-MM-DD";
      const timePart = hasTime ? d.format("HH:mm") : fallbackTime;
      return `${datePart}T${timePart}`;
    }
  }
  return "";
}

/** Join path aman dari double slash */
export function pathJoin(...parts: Array<string | undefined | null>): string {
  const cleaned = parts
    .filter((p): p is string => !!p)
    .map((p) => p.replace(/\/+$/g, "").replace(/^\/+/g, "/"));
  let joined = cleaned.join("/");
  joined = joined.replace(/\/{2,}/g, "/");
  if (!joined.startsWith("/")) joined = `/${joined}`;
  return joined === "" ? "/" : joined;
}

/** Build URL detail yang fleksibel:
 * - support template :id
 * - support base + /{id}
 * - support querystring ?id=...
 */
export function buildDetailUrl(
  tpl: string,
  id: string | number | undefined
): string {
  if (!tpl || id == null) return "";
  const sid = String(id);
  if (tpl.includes(":id")) return tpl.replace(":id", sid);

  if (tpl.includes("?")) {
    // Tambal / override id di querystring
    const [base, qs = ""] = tpl.split("?");
    const usp = new URLSearchParams(qs);
    usp.set("id", sid);
    return `${base}?${usp}`;
  }

  // default: base/{id}
  return `${tpl.replace(/\/$/, "")}/${sid}`;
}
