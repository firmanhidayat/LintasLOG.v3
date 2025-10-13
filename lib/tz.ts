export function getOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUTC - date.getTime();
}

export function tzDateToUtcISO(
  dateStr: string | null | undefined,
  tz: string
): string | null {
  // Preventive: kosong → null (jangan lempar error)
  if (!dateStr) return null;

  // Terima "YYYY-MM-DD" | "YYYY-MM-DDTHH:mm" | "YYYY-MM-DDTHH:mm:ss"
  const m = dateStr.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!m) return null; // format tidak valid → null

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = m[4] ? Number(m[4]) : 0;
  const mm = m[5] ? Number(m[5]) : 0;
  const ss = m[6] ? Number(m[6]) : 0;

  const guess = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss));
  if (Number.isNaN(guess.getTime())) return null;

  const offsetMs = getOffsetMs(tz, guess);
  if (typeof offsetMs !== "number" || Number.isNaN(offsetMs)) return null;

  const utcEpoch = Date.UTC(y, mo - 1, d, hh, mm, ss) - offsetMs;
  return new Date(utcEpoch).toISOString();
}
