export type Lang = "id" | "en";
export const LANG_KEY = "llog.lang";

/** Kamus bertingkat: leaf = string, node = Dict (rekursif). */
interface Dict {
  [key: string]: string | Dict;
}

let dictionaries: Record<Lang, Dict> | null = null;

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "id";
  const saved = localStorage.getItem(LANG_KEY) as Lang | null;
  if (saved === "id" || saved === "en") return saved;
  const nav = navigator.language.toLowerCase();
  return nav.startsWith("id") ? "id" : "en";
}

let currentLang: Lang = getInitialLang();

export async function loadDictionaries() {
  if (dictionaries) return dictionaries;

  // Pastikan tsconfig.json: "resolveJsonModule": true
  const idMod = await import("../locales/id/login.json");
  const enMod = await import("../locales/en/login.json");

  const idDict = idMod.default as unknown as Dict;
  const enDict = enMod.default as unknown as Dict;

  dictionaries = { id: idDict, en: enDict };
  return dictionaries;
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  currentLang = lang;
  if (typeof window !== "undefined") {
    localStorage.setItem(LANG_KEY, lang);
  }
}

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{\{(.*?)\}\}/g, (_: string, k: string) =>
    String(vars[k.trim()] ?? "")
  );
}

/** Ambil nilai dari kamus berdasarkan path (a.b.c) */
function getFromDict(
  dict: Dict,
  path: ReadonlyArray<string>
): string | Dict | undefined {
  let cur: string | Dict | undefined = dict;
  for (const key of path) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      Object.prototype.hasOwnProperty.call(cur, key)
    ) {
      const node = (cur as Dict)[key] as string | Dict; // anotasi eksplisit, tanpa any
      cur = node;
    } else {
      return undefined;
    }
  }
  return cur;
}

export function t(
  path: string,
  vars?: Record<string, string | number>
): string {
  if (!dictionaries)
    throw new Error("Call loadDictionaries() before using t()");
  const dict = dictionaries[currentLang];
  const val = getFromDict(dict, path.split("."));
  if (typeof val === "string") return interpolate(val, vars);
  return path; // fallback jika key tidak ditemukan / bukan string
}
