export type Lang = "id" | "en";
export const LANG_KEY = "llog.lang";

/** Kamus bertingkat: leaf = string, node = Dict (rekursif). */
interface Dict {
  [key: string]: string | Dict;
}

/** Cache seluruh kamus per bahasa. Null artinya belum dimuat. */
let dictionaries: Record<Lang, Dict> | null = null;

/** Event listeners untuk perubahan bahasa (reactive i18n). */
const listeners = new Set<(lang: Lang) => void>();

// ————————————————— Utils —————————————————
function getInitialLang(): Lang {
  if (typeof window === "undefined") return "id";
  const saved = localStorage.getItem(LANG_KEY) as Lang | null;
  if (saved === "id" || saved === "en") return saved;
  const nav = navigator.language.toLowerCase();
  return nav.startsWith("id") ? "id" : "en";
}

let currentLang: Lang = getInitialLang();

function isObject(v: unknown): v is Dict {
  return typeof v === "object" && v !== null;
}
function deepMerge(target: Dict, source: Dict): Dict {
  const result: Dict = { ...target };
  for (const [k, v] of Object.entries(source)) {
    const cur = result[k];
    if (isObject(cur) && isObject(v)) {
      result[k] = deepMerge(cur as Dict, v as Dict);
    } else {
      result[k] = v;
    }
  }
  return result;
}
function mergeAll(dicts: ReadonlyArray<Dict>): Dict {
  return dicts.reduce<Dict>((acc, d) => deepMerge(acc, d), {});
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
      cur = (cur as Dict)[key] as string | Dict;
    } else {
      return undefined;
    }
  }
  return cur;
}

function interpolate(
  str: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return str;
  return str.replace(/\{\{(.*?)\}\}/g, (_: string, k: string) =>
    String(vars[k.trim()] ?? "")
  );
}

// ——————————————— Namespaces (login, signup, …) ———————————————
// Tambah nama file JSON di sini jika perlu namespace baru.
type Namespace = "login" | "signup" | "reset" | "verify";

// Import eksplisit per namespace supaya bundler bisa mengikutkan file.
// (Template path dinamis sering tidak ter-trace oleh bundler.)
async function importDict(lang: Lang, ns: Namespace): Promise<Dict> {
  if (lang === "id") {
    if (ns === "login") {
      const m = await import("../locales/id/login.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "signup") {
      const m = await import("../locales/id/signup.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "reset") {
      const m = await import("../locales/id/reset.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "verify") {
      const m = await import("../locales/id/verify.json");
      return (m.default ?? {}) as unknown as Dict;
    }
  } else {
    if (ns === "login") {
      const m = await import("../locales/en/login.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "signup") {
      const m = await import("../locales/en/signup.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "reset") {
      const m = await import("../locales/en/reset.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "verify") {
      const m = await import("../locales/en/verify.json");
      return (m.default ?? {}) as unknown as Dict;
    }
  }
  // fallback aman (tidak terjadi jika mapping di atas lengkap)
  return {};
}

// ——————————————— Public API ———————————————
export async function loadDictionaries(): Promise<Record<Lang, Dict>> {
  if (dictionaries) return dictionaries;

  // Tentukan namespace yang ingin digabung
  const namespaces: Namespace[] = ["login", "signup", "reset", "verify"];

  // Muat semua namespace per bahasa, lalu deep-merge
  const [idDicts, enDicts] = await Promise.all([
    Promise.all(namespaces.map((ns) => importDict("id", ns))),
    Promise.all(namespaces.map((ns) => importDict("en", ns))),
  ]);

  dictionaries = {
    id: mergeAll(idDicts),
    en: mergeAll(enDicts),
  };

  return dictionaries;
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  if (currentLang === lang) return;
  currentLang = lang;
  if (typeof window !== "undefined") {
    localStorage.setItem(LANG_KEY, lang);
  }
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(cb: (lang: Lang) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
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
