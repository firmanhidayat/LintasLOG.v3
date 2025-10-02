export type Lang = "id" | "en";
export const LANG_KEY = "llog.lang";

interface Dict {
  [key: string]: string | Dict;
}

let dictionaries: Record<Lang, Dict> | null = null;

const listeners = new Set<(lang: Lang) => void>();

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

type Namespace =
  | "login"
  | "signup"
  | "reset"
  | "verify"
  | "ringkasanorder"
  | "nav"
  | "avatarnav"
  | "forgot"
  | "addresseslist"
  | "common";

async function importDict(lang: Lang, ns: Namespace): Promise<Dict> {
  if (lang === "id") {
    if (ns === "login") {
      const m = await import("@/locales/id/login.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "signup") {
      const m = await import("@/locales/id/signup.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "reset") {
      const m = await import("@/locales/id/reset.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "verify") {
      const m = await import("@/locales/id/verify.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "ringkasanorder") {
      const m = await import("@/locales/id/ringkasanorder.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "nav") {
      const m = await import("@/locales/id/nav.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "avatarnav") {
      const m = await import("@/locales/id/avatarnav.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "forgot") {
      const m = await import("@/locales/id/forgot.json");
      return (m.default ?? {}) as unknown as Dict;
    }

    if (ns === "addresseslist") {
      const m = await import("@/locales/id/addresseslist.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "common") {
      const m = await import("@/locales/id/common.json");
      return (m.default ?? {}) as unknown as Dict;
    }
  } else {
    if (ns === "login") {
      const m = await import("@/locales/en/login.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "signup") {
      const m = await import("@/locales/en/signup.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "reset") {
      const m = await import("@/locales/en/reset.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "verify") {
      const m = await import("@/locales/en/verify.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "ringkasanorder") {
      const m = await import("@/locales/en/ringkasanorder.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "nav") {
      const m = await import("@/locales/en/nav.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "avatarnav") {
      const m = await import("@/locales/en/avatarnav.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "forgot") {
      const m = await import("@/locales/en/forgot.json");
      return (m.default ?? {}) as unknown as Dict;
    }

    if (ns === "addresseslist") {
      const m = await import("@/locales/en/addresseslist.json");
      return (m.default ?? {}) as unknown as Dict;
    }
    if (ns === "common") {
      const m = await import("@/locales/en/common.json");
      return (m.default ?? {}) as unknown as Dict;
    }
  }
  return {};
}

export async function loadDictionaries(): Promise<Record<Lang, Dict>> {
  if (dictionaries) return dictionaries;

  const namespaces: Namespace[] = [
    "login",
    "signup",
    "reset",
    "verify",
    "ringkasanorder",
    "nav",
    "avatarnav",
    "forgot",
    "addresseslist",
    "common",
  ];

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
