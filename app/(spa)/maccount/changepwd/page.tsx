"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";

// Optional: jika Anda punya guard konteks
import { useAuth } from "@/components/providers/AuthProvider";
const CHANGE_PW_URL = process.env.NEXT_PUBLIC_TMS_CHG_PWD_URL!;
type SubmitStatus = "idle" | "loading" | "success" | "error";
type ChangePwOk = {
  status?: "ok";
  message?: string;
};

type FastapiErrorItem = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

type HttpErrorPayload =
  | { detail?: string | FastapiErrorItem[]; message?: string }
  | Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeErrorMessage(payload: HttpErrorPayload): string {
  if (isRecord(payload)) {
    // FastAPI common shapes
    const d = (payload as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      const first = d[0] as unknown;
      if (isRecord(first) && typeof first.msg === "string") return first.msg;
    }
    if (typeof (payload as { message?: unknown }).message === "string") {
      return String((payload as { message: string }).message);
    }
  }
  return t("common.unknown_error") ?? "Unknown error";
}

function validateNewPassword(pw: string): string | null {
  if (pw.length < 8)
    return t("maccount.password.too_short") ?? "Password too short (min 8).";
  if (!/[A-Za-z]/.test(pw))
    return t("maccount.password.need_letter") ?? "Must contain a letter.";
  if (!/[0-9]/.test(pw))
    return t("maccount.password.need_digit") ?? "Must contain a digit.";
  return null;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { loggedIn } = useAuth() ?? { loggedIn: false };

  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());
  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDictionaries();
        if (!cancelled) setI18nReady(true);
      } catch (err) {
        console.error("[i18n] loadDictionaries failed:", err);
        if (!cancelled) setI18nReady(true); // fallback: tetap render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // form state
  const [currentPw, setCurrentPw] = useState<string>("");
  const [newPw, setNewPw] = useState<string>("");
  const [confirmPw, setConfirmPw] = useState<string>("");

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCfm, setShowCfm] = useState(false);

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [msg, setMsg] = useState<string>("");

  const pwValidationMsg = useMemo(() => validateNewPassword(newPw), [newPw]);
  const mismatch = confirmPw.length > 0 && newPw !== confirmPw;

  useEffect(() => {
    if (!loggedIn) {
      // kalau pakai guard route, ini opsional — bisa redirect manual
      // router.replace("/maccount/signin?next=/maccount/change-password");
    }
  }, [loggedIn, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setMsg("");

    // client-side validation
    if (currentPw.trim().length === 0) {
      setStatus("error");
      setMsg(
        t("maccount.password.error_current_required") ??
          "Current password is required."
      );
      return;
    }
    if (pwValidationMsg) {
      setStatus("error");
      setMsg(pwValidationMsg);
      return;
    }
    if (newPw !== confirmPw) {
      setStatus("error");
      setMsg(
        t("maccount.password.error_mismatch") ??
          "Password confirmation does not match."
      );
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch(CHANGE_PW_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // penting: bawa cookie fastapi_auth_partner
        body: JSON.stringify({
          current_password: currentPw,
          new_password: newPw,
        }),
      });

      if (!res.ok) {
        let payload: HttpErrorPayload;
        try {
          payload = (await res.json()) as HttpErrorPayload;
        } catch {
          payload = {};
        }
        throw new Error(normalizeErrorMessage(payload));
      }

      const data = (await res.json()) as ChangePwOk;
      const successMessage =
        data.message ??
        t("maccount.password.changed_success") ??
        "Password changed successfully.";
      setStatus("success");
      setMsg(successMessage);

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");

      // Opsional: redirect setelah beberapa detik
      // setTimeout(() => router.replace("/maccount/edit"), 1200);
    } catch (err) {
      console.error("[change-password] error:", err);
      setStatus("error");
      setMsg(
        err instanceof Error
          ? err.message
          : t("common.unknown_error") ?? "Unknown error"
      );
    }
  }

  const strength = useMemo(() => {
    let s = 0;
    if (newPw.length >= 8) s++;
    if (/[A-Z]/.test(newPw) && /[a-z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw) && /[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  }, [newPw]);

  if (!i18nReady) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="animate-pulse h-6 w-40 rounded bg-gray-300 mb-4" />
        <div className="animate-pulse h-28 w-full rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">
          {t("maccount.password.title") ?? "Change Password"}
        </h1>
        <p className="text-sm text-gray-500">
          {t("maccount.password.subtitle") ??
            "For your security, please use a strong, unique password."}
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800">
          {t("maccount.password.form_title") ?? "Update your password"}
        </header>
        <form className="p-4 space-y-4" onSubmit={onSubmit}>
          {/* Current password */}
          <div>
            <label htmlFor="current" className="block text-sm font-medium">
              {t("maccount.password.current") ?? "Current password"}
            </label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-primary/40">
              <input
                id="current"
                type={showCur ? "text" : "password"}
                className="w-full rounded-l-lg px-3 py-2 outline-none"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowCur((v) => !v)}
                className="rounded-r-lg px-3 text-sm text-gray-600 hover:bg-gray-100"
                aria-label={showCur ? "Hide" : "Show"}
              >
                {showCur
                  ? t("common.hide") ?? "Hide"
                  : t("common.show") ?? "Show"}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label htmlFor="new" className="block text-sm font-medium">
              {t("maccount.password.new") ?? "New password"}
            </label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-primary/40">
              <input
                id="new"
                type={showNew ? "text" : "password"}
                className="w-full rounded-l-lg px-3 py-2 outline-none"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                aria-invalid={Boolean(pwValidationMsg)}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="rounded-r-lg px-3 text-sm text-gray-600 hover:bg-gray-100"
                aria-label={showNew ? "Hide" : "Show"}
              >
                {showNew
                  ? t("common.hide") ?? "Hide"
                  : t("common.show") ?? "Show"}
              </button>
            </div>
            {/* strength bar */}
            <div className="mt-2">
              <div className="h-1.5 w-full rounded bg-gray-200">
                <div
                  className={`h-1.5 rounded ${
                    strength === 0
                      ? "w-0"
                      : strength === 1
                      ? "w-1/3 bg-red-500"
                      : strength === 2
                      ? "w-2/3 bg-yellow-500"
                      : "w-full bg-green-500"
                  }`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {pwValidationMsg
                  ? pwValidationMsg
                  : strength <= 1
                  ? t("maccount.password.strength_weak") ?? "Weak"
                  : strength === 2
                  ? t("maccount.password.strength_fair") ?? "Fair"
                  : t("maccount.password.strength_strong") ?? "Strong"}
              </p>
            </div>
          </div>

          {/* Confirm */}
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium">
              {t("maccount.password.confirm") ?? "Confirm new password"}
            </label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-primary/40">
              <input
                id="confirm"
                type={showCfm ? "text" : "password"}
                className="w-full rounded-l-lg px-3 py-2 outline-none"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                aria-invalid={mismatch}
              />
              <button
                type="button"
                onClick={() => setShowCfm((v) => !v)}
                className="rounded-r-lg px-3 text-sm text-gray-600 hover:bg-gray-100"
                aria-label={showCfm ? "Hide" : "Show"}
              >
                {showCfm
                  ? t("common.hide") ?? "Hide"
                  : t("common.show") ?? "Show"}
              </button>
            </div>
            {mismatch && (
              <p className="mt-1 text-xs text-red-600">
                {t("maccount.password.error_mismatch") ??
                  "Password confirmation does not match."}
              </p>
            )}
          </div>

          {/* Alert */}
          {status !== "idle" && msg && (
            <div
              role="alert"
              className={`rounded-lg px-3 py-2 text-sm ${
                status === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : status === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-gray-50 text-gray-700 border border-gray-200"
              }`}
            >
              {msg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "loading"
                ? t("common.saving") ?? "Saving…"
                : t("common.save_changes") ?? "Save changes"}
            </button>
            <Link
              href="/maccount/edit"
              className="text-sm text-gray-600 underline-offset-2 hover:underline"
            >
              {t("common.cancel") ?? "Cancel"}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
