// lib/uploadUtils.ts
/** Max size per file (10 MB) */
export const MAX_BYTES = 10 * 1024 * 1024;

/** Allowed extensions (lowercase, without dot) */
export const ALLOWED_EXTS = new Set([
  "doc",
  "docx",
  "xls",
  "xlsx",
  "pdf",
  "ppt",
  "pptx",
  "txt",
]);

/** Get lowercase extension (no dot). Empty string if no ext. */
export function getExt(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

export type UploadSection = "dokumen" | "sjpod";

export type ValidateAndMergeOptions = {
  /** Override ukuran maksimal per file (MB). Set <= 0 untuk abaikan limit. */
  maxFileSizeMB?: number;
  /**
   * Terima pola "accept" ala input[type=file], contoh:
   * ".pdf,.docx", "image/*", "application/pdf".
   */
  accept?: string;
  /** Izinkan file duplikat (name+size+lastModified). Default: false. */
  allowDuplicates?: boolean;
};

function parseAcceptPatterns(accept?: string): string[] | null {
  if (!accept) return null;
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  return tokens.length ? tokens : null;
}

function isMimeToken(token: string) {
  return token.includes("/");
}

function matchesAcceptToken(file: File, ext: string, token: string): boolean {
  const mime = file.type ? file.type.toLowerCase() : "";
  if (token === "*/*") return true;
  if (token.startsWith(".")) return ext === token.slice(1);
  if (token.endsWith("/*")) {
    const prefix = token.slice(0, -1); // keep trailing slash, drop *
    return mime.startsWith(prefix);
  }
  if (isMimeToken(token)) {
    return mime === token;
  }
  // fallback perlakukan token sebagai ext tanpa titik
  return ext === token;
}

/**
 * Append files with validation (size, extension/mime) and dedup.
 * Returns {accepted, rejectedMessages}. Dedup criteria: name+size+lastModified.
 */
export function validateAndMergeFiles(
  prev: File[],
  incoming: File[],
  options: ValidateAndMergeOptions = {}
): { accepted: File[]; rejectedMessages: string[] } {
  const {
    maxFileSizeMB,
    accept,
    allowDuplicates = false,
  } = options;

  const enforceSizeLimit =
    typeof maxFileSizeMB === "number" ? maxFileSizeMB > 0 : true;
  const limitMBRaw =
    typeof maxFileSizeMB === "number" && maxFileSizeMB > 0
      ? maxFileSizeMB
      : MAX_BYTES / (1024 * 1024);
  const limitMB = enforceSizeLimit
    ? Number(limitMBRaw.toFixed(limitMBRaw >= 10 ? 0 : 2))
    : limitMBRaw;
  const limitBytes = enforceSizeLimit ? limitMBRaw * 1024 * 1024 : Infinity;

  const acceptPatterns = parseAcceptPatterns(accept);

  const rejectedMessages: string[] = [];
  const acceptedIncoming: File[] = [];

  for (const f of incoming) {
    const ext = getExt(f.name);
    const allowed =
      acceptPatterns && acceptPatterns.length
        ? acceptPatterns.some((token) => matchesAcceptToken(f, ext, token))
        : ALLOWED_EXTS.has(ext);

    if (!allowed) {
      rejectedMessages.push(`${f.name} — tipe tidak diizinkan`);
      continue;
    }

    if (enforceSizeLimit && f.size > limitBytes) {
      rejectedMessages.push(
        `${f.name} — melebihi ${limitMB} MB`
      );
      continue;
    }

    acceptedIncoming.push(f);
  }

  // merge
  const next = [...prev];
  for (const f of acceptedIncoming) {
    if (allowDuplicates) {
      next.push(f);
      continue;
    }
    const exists = next.some(
      (x) =>
        x.name === f.name &&
        x.size === f.size &&
        x.lastModified === f.lastModified
    );
    if (!exists) next.push(f);
  }

  return { accepted: next, rejectedMessages };
}

/** Human readable bytes (e.g., 1.2 MB) */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0,
    n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
