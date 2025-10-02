// export const BASE_PATH = "/tms";
export const BASE_PATH = process.env.NEXT_PUBLIC_URL_BASE ?? "/tms";

export function withBase(p: string) {
  if (!BASE_PATH) return ensureLeadingSlash(p);
  const path = ensureLeadingSlash(p);
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

export function stripBase(p: string) {
  if (!BASE_PATH) return p;
  return p.startsWith(BASE_PATH) ? p.slice(BASE_PATH.length) || "/" : p;
}

function ensureLeadingSlash(p: string) {
  return p.startsWith("/") ? p : `/${p}`;
}
