export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function getString<T extends Record<string, unknown>>(
  obj: unknown,
  key: keyof T | string
): string | undefined {
  if (!isObject(obj)) return undefined;
  const v = obj[String(key)];
  return typeof v === "string" ? v : undefined;
}

export function getStringArray<T extends Record<string, unknown>>(
  obj: unknown,
  key: keyof T | string
): readonly string[] | undefined {
  if (!isObject(obj)) return undefined;
  const v = obj[String(key)];
  if (!Array.isArray(v)) return undefined;
  return v.every((x) => typeof x === "string") ? (v as string[]) : undefined;
}
