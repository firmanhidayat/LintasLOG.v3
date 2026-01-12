export function resolveOdooImageSrc(raw?: string | null): string | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/web/") || trimmed.startsWith("/api/") || trimmed.startsWith("/images/")) {
    return trimmed;
  }
  const s = trimmed.replace(/\s+/g, "");

  const mime =
    s.startsWith("/9j/") ? "image/jpeg" :
    s.startsWith("iVBOR") ? "image/png" :
    s.startsWith("R0lGOD") ? "image/gif" :
    s.startsWith("UklGR") ? "image/webp" :
    "image/jpeg";
  return `data:${mime};base64,${s}`;
}
