/**
 * CONTOH IMPLEMENTASI di tsx
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * import { getInitials, nameFromLogin } from "@/lib/identity";

 * const initials = getInitials(profile?.name ?? profile?.email, { max: 2, locale: "id-ID" });
 * const displayName = (profile?.name && profile.name.trim().length > 0)
   ? profile.name
   : nameFromLogin(profile?.login ?? profile?.email, { titleCase: true, locale: "id-ID" });
 */

export type InitialsOptions = {
  /** Maksimum huruf inisial (default: 2) */
  max?: number;
  /** Locale untuk uppercase/lowercase (mis. "id-ID"); default pakai locale runtime */
  locale?: string;
};

export type NameFromLoginOptions = {
  /** Jadikan Title Case (default: false) */
  titleCase?: boolean;
  /** Locale untuk casing (opsional) */
  locale?: string;
};

/** Cek objek plain tanpa pakai any */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Split aman utk kata (collapse whitespace) */
function splitWords(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

/** Grapheme splitter (emoji/aksara kompleks) dengan fallback */
type SegmenterCtor = new (
  locale?: string,
  options?: Intl.SegmenterOptions
) => Intl.Segmenter;

function toGraphemes(input: string, locale?: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterCtor })
    .Segmenter;
  if (Segmenter) {
    const seg = new Segmenter(locale, { granularity: "grapheme" });
    const out: string[] = [];
    for (const part of seg.segment(input)) out.push(part.segment);
    return out;
  }
  // Fallback yang tetap aman untuk surrogate pair
  return Array.from(input);
}

/**
 * Ambil huruf inisial dari nama.
 * - Mengabaikan spasi berlebih
 * - Mengambil grapheme pertama dari tiap kata
 * - Default 2 huruf inisial
 */
export function getInitials(
  name?: string | null,
  opts?: InitialsOptions
): string {
  if (!name || !name.trim()) return "";
  const { max = 2, locale } = opts ?? {};

  const words = splitWords(name);
  const initials: string[] = [];

  // Hanya ambil karakter huruf/angka pertama per kata (jika ada)
  const firstAlnum = /\p{L}|\p{N}/u;

  for (const w of words) {
    // cari grapheme pertama yang termasuk huruf/angka
    const gs = toGraphemes(w, locale);
    const g = gs.find((ch) => firstAlnum.test(ch));
    if (g) initials.push(g);
    if (initials.length >= max) break;
  }

  return initials.join("").toLocaleUpperCase(locale);
}

/**
 * Ubah login/email menjadi nama tampilan sederhana.
 * - Ambil local-part (sebelum '@')
 * - Abaikan plus-addressing (+tag)
 * - Ganti dot/underscore/hyphen menjadi spasi
 * - Collapse spasi
 * - Opsi Title Case
 */
export function nameFromLogin(
  login?: string | null,
  opts?: NameFromLoginOptions
): string {
  if (!login) return "";
  const { titleCase = false, locale } = opts ?? {};

  const at = login.indexOf("@");
  const localPart = at >= 0 ? login.slice(0, at) : login;
  const plusIdx = localPart.indexOf("+");
  const beforePlus = plusIdx >= 0 ? localPart.slice(0, plusIdx) : localPart;

  const cleaned = beforePlus
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!titleCase || cleaned.length === 0) return cleaned;

  // Title Case per kata (aware grapheme)
  const words = splitWords(cleaned).map((w) => {
    const gs = toGraphemes(w, locale);
    if (gs.length === 0) return w;
    const [first, ...rest] = gs;
    return (
      first.toLocaleUpperCase(locale) + rest.join("").toLocaleLowerCase(locale)
    );
  });

  return words.join(" ");
}
