type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => readonly string[];
};

export function getTimeZones(): string[] {
  const intl = globalThis.Intl as IntlWithSupportedValues;
  const supported = intl.supportedValuesOf?.("timeZone");
  if (supported && supported.length) return supported.slice() as string[];
  return [
    "Pacific/Midway",
    "America/Adak",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "America/Bogota",
    "America/Mexico_City",
    "America/Sao_Paulo",
    "Atlantic/Azores",
    "Europe/London",
    "Europe/Berlin",
    "Europe/Paris",
    "Europe/Moscow",
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Asia/Dubai",
    "Asia/Karachi",
    "Asia/Dhaka",
    "Asia/Jakarta",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Perth",
    "Australia/Brisbane",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];
}

export function getTzOffsetLabel(tz: string): string {
  try {
    const now = new Date();
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      timeZoneName: "shortOffset",
    });
    const parts = dtf.formatToParts(now);
    const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    const label = off.replace("UTC", "GMT");
    return label.startsWith("GMT") ? label : `(${label})`;
  } catch {
    return "(GMT)";
  }
}

export function tzLabel(tz: string): string {
  return `${getTzOffsetLabel(tz)} ${tz}`;
}
