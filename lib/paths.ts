// src/lib/paths.ts
export const BASE_PATH = "/tms"; // atau "" saat build tanpa subpath

export function withBase(p: string) {
  if (!BASE_PATH) return ensureLeadingSlash(p);
  const path = ensureLeadingSlash(p);
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path; // sudah ada
  return `${BASE_PATH}${path}`;
}

export function stripBase(p: string) {
  if (!BASE_PATH) return p;
  return p.startsWith(BASE_PATH) ? p.slice(BASE_PATH.length) || "/" : p;
}

function ensureLeadingSlash(p: string) {
  return p.startsWith("/") ? p : `/${p}`;
}
