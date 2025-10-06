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

export function tzDateToUtcISO(dateStr: string, tz: string): string {
  const [y, m, d] = dateStr.split("-").map((n) => Number(n));
  const utcGuess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const offsetMs = getOffsetMs(tz, utcGuess);
  const utcEpoch = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMs;
  return new Date(utcEpoch).toISOString();
}
