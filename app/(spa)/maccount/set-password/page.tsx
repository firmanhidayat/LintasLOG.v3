"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.webp";

import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

const SET_PASSWORD_URL = process.env.NEXT_PUBLIC_TMS_SET_PASSWORD_URL!;

// interface VerifyOk {
//   status: "ok";
//   email?: string;
//   message?: string;
// }
interface FastapiErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}
interface HttpErrorPayload {
  detail?: string | FastapiErrorItem[] | string;
  message?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isFastapiErrorItem(v: unknown): v is FastapiErrorItem {
  return (
    isRecord(v) &&
    Array.isArray((v as Record<string, unknown>).loc) &&
    typeof (v as Record<string, unknown>).msg === "string" &&
    typeof (v as Record<string, unknown>).type === "string"
  );
}
function parseHttpErrorPayload(v: unknown): HttpErrorPayload | null {
  if (!isRecord(v)) return null;
  const rec = v as Record<string, unknown>;
  const d = rec["detail"];
  let detail: string | FastapiErrorItem[] | undefined;
  if (typeof d === "string") detail = d;
  else if (Array.isArray(d) && d.every(isFastapiErrorItem)) {
    detail = d as FastapiErrorItem[];
  }
  const message =
    typeof rec["message"] === "string" ? (rec["message"] as string) : undefined;
  return { detail, message };
}

export default function VerifyForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-svh w-full overflow-hidden bg-white text-black">
          <Image
            src={bglintas}
            alt="bg"
            priority
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-20"
          />
          <div className="relative mx-auto flex min-h-svh max-w-7xl items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
              <div className="mb-8 flex items-center justify-center gap-3">
                <Image
                  src={lintaslogo}
                  alt="LintasLOG"
                  className="h-10 w-auto"
                />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
                  <p className="text-sm text-gray-600">Loading…</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <VerifyTokenForgotPwdInner />
    </Suspense>
  );
}
function VerifyTokenForgotPwdInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "submitting" }
    | { kind: "success"; email?: string; note?: string }
    | { kind: "error"; reason: string }
  >({ kind: "idle" });

  const disabled = useMemo(() => state.kind === "submitting", [state.kind]);

  const minLen = 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < minLen;
  const formInvalid = !password || !confirm || mismatch || tooShort;
  useEffect(() => {
    let mounted = true;

    loadDictionaries().then(() => {
      if (!mounted) return;
      setI18nReady(true);
      setActiveLang(getLang());
    });

    const off = onLangChange((lang) => {
      if (!mounted) return;
      setActiveLang(lang);
    });

    return () => {
      mounted = false;
      off();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", reason: t("verify.errors.tokenMissing") });
    }
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formInvalid || !token) return;

    setState({ kind: "submitting" });
    try {
      const res = await fetch(SET_PASSWORD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Language": activeLang,
        },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        let reason = t("verify.errors.http", { code: res.status });
        try {
          const payload = (await res.json()) as unknown;
          const p = parseHttpErrorPayload(payload);
          if (p?.message) {
            reason = p.message;
          } else if (Array.isArray(p?.detail) && p.detail.length) {
            const first = p.detail.find(isFastapiErrorItem);
            if (first?.msg) reason = first.msg;
          } else if (typeof p?.detail === "string") {
            reason = p.detail;
          }
        } catch {
          /* ignore */
        }
        setState({ kind: "error", reason });
        return;
      }
      const raw = (await res.json()) as unknown;
      const rec = isRecord(raw) ? (raw as Record<string, unknown>) : {};
      const email =
        typeof rec["email"] === "string" ? (rec["email"] as string) : undefined;
      const message =
        typeof rec["message"] === "string"
          ? (rec["message"] as string)
          : undefined;

      setState({ kind: "success", email, note: message });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("verify.errors.network");
      setState({ kind: "error", reason: msg });
    }
  }

  if (!i18nReady) {
    return (
      <div className="relative min-h-svh w-full overflow-hidden bg-white text-black">
        <Image
          src={bglintas}
          alt="bg"
          priority
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-20"
        />
        <div className="relative mx-auto flex min-h-svh max-w-7xl items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
                <p className="text-sm text-gray-600">Loading…</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-white text-black">
      <Image
        src={bglintas}
        alt="bg"
        priority
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-20"
      />

      <div className="relative mx-auto flex min-h-svh max-w-7xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Image
              src={lintaslogo}
              alt={t("app.brand")}
              className="h-10 w-auto"
            />
          </div>

          <div className="mb-4 flex items-center justify-end">
            <LangToggle />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
            <h1 className="mb-1 text-center text-2xl font-bold">
              {t("setPwd.title", { default: "Set New Password" })}
            </h1>
            <p className="mb-6 text-center text-sm text-gray-600">
              {t("setPwd.subtitle", {
                default: "Enter a new password for your account.",
              })}
            </p>

            {state.kind === "success" ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <SuccessIcon />
                <div>
                  <p className="text-base font-medium">
                    {t("verify.result.success")}
                  </p>
                  {state.email && (
                    <p className="text-sm text-gray-600">{state.email}</p>
                  )}
                  {state.note && (
                    <p className="mt-1 text-sm text-gray-600">{state.note}</p>
                  )}
                </div>
                <div className="mt-2 flex w-full gap-2">
                  <Link
                    href="/maccount/signin/"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-primary/30 bg-primary/90 px-4 py-2 text-white hover:bg-primary"
                  >
                    {t("verify.cta.goSignin")}
                  </Link>
                </div>
              </div>
            ) : state.kind === "error" && !token ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <ErrorIcon />
                <div>
                  <p className="text-base font-medium text-red-600">
                    {t("verify.result.failed")}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {t("verify.errors.tokenMissing")}
                  </p>
                </div>
                <div className="mt-2 w-full">
                  <Link
                    href="/maccount/signin/"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50"
                  >
                    {t("verify.cta.backSignin")}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    {t("forgot.form.password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      inputMode="text"
                      autoComplete="new-password"
                      required
                      minLength={minLen}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("forgot.form.placeholders.password", {
                        default: "Enter new password",
                      })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 pr-11 outline-none ring-0 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                      aria-label={showPwd ? t("a11y.hide") : t("a11y.show")}
                    >
                      {showPwd ? t("forgot.ui.hide") : t("forgot.ui.show")}
                    </button>
                  </div>
                  {tooShort && (
                    <p className="text-xs text-red-600">
                      {t("forgot.form.errors.minLength", {
                        default: "Minimum {n} characters",
                        n: minLen,
                      })}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    {t("forgot.form.confirmPassword", {
                      default: "Confirm Password",
                    })}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      inputMode="text"
                      autoComplete="new-password"
                      required
                      minLength={minLen}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder={t(
                        "forgot.form.placeholders.confirmPassword",
                        {
                          default: "Re-enter new password",
                        }
                      )}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 pr-11 outline-none ring-0 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                      aria-label={
                        showConfirm
                          ? t("forgot.a11y.hide")
                          : t("forgot.a11y.show")
                      }
                    >
                      {showConfirm ? t("forgot.ui.hide") : t("forgot.ui.show")}
                    </button>
                  </div>
                  {mismatch && (
                    <p className="text-xs text-red-600">
                      {t("forgot.form.errors.passwordMismatch", {
                        default: "Passwords do not match",
                      })}
                    </p>
                  )}
                </div>

                {state.kind === "error" && token && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.reason}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={disabled || formInvalid || !token}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-primary/30 bg-primary/90 px-4 py-2 text-white hover:bg-primary disabled:opacity-50"
                >
                  {state.kind === "submitting" ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner ariaLabel={t("verify.a11y.verifying")} />
                      <span>
                        {t("setPwd.cta.setting", { default: "Saving…" })}
                      </span>
                    </span>
                  ) : (
                    t("setPwd.cta.save", { default: "Set Password" })
                  )}
                </button>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link
                    href="/maccount/signin/"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50"
                  >
                    {t("verify.cta.backSignin")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    disabled={disabled}
                    className="inline-flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-primary hover:bg-primary/15 disabled:opacity-50"
                  >
                    {t("verify.cta.tryAgain")}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-xs text-gray-500">
              {t("verify.footer.help")}
            </div>
          </div>

          <div className="mt-4 text-center text-sm">
            <Link
              href="/maccount/signup/"
              className="text-primary hover:underline"
            >
              {t("verify.cta.createAccount")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
function Spinner({ ariaLabel = "Loading" }: { ariaLabel?: string }) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary"
    />
  );
}
function SuccessIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-12 w-12 text-green-600"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="9" className="opacity-20" />
      <path
        d="M8 12.5l2.5 2.5L16 9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ErrorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-12 w-12 text-red-600"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="9" className="opacity-20" />
      <path d="M12 7v6m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
