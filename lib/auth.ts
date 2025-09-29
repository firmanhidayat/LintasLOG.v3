export const AUTH_KEYS = ["llog.login", "llog.mail_verified"] as const;
export const LOGOUT_URL = "https://odoodev.linitekno.com/api-tms/auth/logout";

type ApiLogoutResponse = {
  detail?: string;
  message?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isApiLogoutResponse(v: unknown): v is ApiLogoutResponse {
  if (!isRecord(v)) return false;
  const d = v["detail"];
  const m = v["message"];
  const okDetail = typeof d === "undefined" || typeof d === "string";
  const okMessage = typeof m === "undefined" || typeof m === "string";
  return okDetail && okMessage;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export function isLoggedIn(): boolean {
  const login =
    (typeof window !== "undefined" && localStorage.getItem("llog.login")) ||
    (typeof window !== "undefined" && sessionStorage.getItem("llog.login")) ||
    null;

  const verified =
    (typeof window !== "undefined" &&
      (localStorage.getItem("llog.mail_verified") ||
        sessionStorage.getItem("llog.mail_verified"))) ||
    null;

  return !!login && verified === "true";
}

export async function clearAuth(): Promise<void> {
  if (typeof window !== "undefined") {
    for (const k of AUTH_KEYS) {
      try {
        localStorage.removeItem(k);
      } catch {}
      try {
        sessionStorage.removeItem(k);
      } catch {}
    }
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
    }
    try {
      localStorage.setItem("llog.logout_at", String(Date.now()));
    } catch {}
  }
}

export async function apiLogout(opts?: {
  signal?: AbortSignal;
  csrfCookieName?: string;
}): Promise<{ ok: boolean; status: number; message: string }> {
  const controller = new AbortController();
  const signal = opts?.signal ?? controller.signal;

  const csrfCookieName = opts?.csrfCookieName || "csrftoken";
  const csrf = getCookie(csrfCookieName);

  let status = 0;
  let ok = false;
  let message = "Logged out";

  try {
    const res = await fetch(LOGOUT_URL, {
      method: "POST",
      credentials: "include", 
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: "{}", 
      signal,
    });

    status = res.status;
    ok = res.ok;

    
    try {
      const data: unknown = await res.json();
      if (isApiLogoutResponse(data)) {
        if (typeof data.detail === "string" && data.detail.trim()) {
          message = data.detail;
        } else if (typeof data.message === "string" && data.message.trim()) {
          message = data.message;
        }
      }
    } catch {
      // abaikan jika bukan JSON
    }

    if (!ok && (!message || message === "Logged out")) {
      message = `HTTP ${res.status} ${res.statusText}`;
    }
  } catch (e: unknown) {
    message =
      e instanceof Error ? e.message : "Network error saat memanggil logout";
  } finally {
    await clearAuth();
  }

  return { ok, status, message };
}
