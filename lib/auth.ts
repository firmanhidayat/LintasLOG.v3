// src/lib/auth.ts
export const AUTH_KEYS = ["llog.login", "llog.mail_verified"] as const;
export const LOGOUT_URL = "https://odoodev.linitekno.com/api-tms/auth/logout";

// ---- Types ----
type ApiLogoutResponse = {
  detail?: string;
  message?: string;
};

// ---- Guards ----
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

// --- helpers ---
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
    // optional: bersihin cache PWA
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
    }
    // broadcast ke tab lain
    try {
      localStorage.setItem("llog.logout_at", String(Date.now()));
    } catch {}
  }
}

/**
 * Panggil API logout server.
 * - Selalu membersihkan auth storage & cache (via clearAuth) di finally.
 * - Mengirim cookie session (credentials: 'include').
 * - Mengembalikan status eksekusi agar UI bisa decide next step.
 */
export async function apiLogout(opts?: {
  signal?: AbortSignal;
  csrfCookieName?: string;
}): Promise<{ ok: boolean; status: number; message: string }> {
  const controller = new AbortController();
  const signal = opts?.signal ?? controller.signal;

  // Jika server butuh CSRF token via header, ambil dari cookie (opsional).
  const csrfCookieName = opts?.csrfCookieName || "csrftoken"; // sesuaikan jika berbeda
  const csrf = getCookie(csrfCookieName);

  let status = 0;
  let ok = false;
  let message = "Logged out";

  try {
    const res = await fetch(LOGOUT_URL, {
      method: "POST",
      credentials: "include", // penting agar cookie session terkirim
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: "{}", // sebagian server FastAPI mensyaratkan body JSON (meski kosong)
      signal,
    });

    status = res.status;
    ok = res.ok;

    // coba parse json, tapi jangan error kalau bukan JSON
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
    // pastikan storage & cache dibersihkan apapun hasil requestnya
    await clearAuth();
  }

  return { ok, status, message };
}
