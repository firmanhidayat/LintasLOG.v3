"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.png";

import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";


const VERIFY_EMAIL_URL = process.env.NEXT_PUBLIC_TMS_VERIFY_EMAIL_URL!;
interface VerifyOk {
  status: "ok";
  email?: string;
  message?: string;
}
interface FastapiErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}
interface HttpErrorPayload {
  detail?: string | FastapiErrorItem[];
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
  let detail: string | FastapiErrorItem[] | undefined;
  const d = rec["detail"];
  if (typeof d === "string") detail = d;
  else if (Array.isArray(d) && d.every(isFastapiErrorItem)) {
    detail = d as FastapiErrorItem[];
  }
  const message =
    typeof rec["message"] === "string" ? (rec["message"] as string) : undefined;
  return { detail, message };
}

export default function VerifyEmailPage() {
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
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "verifying" }
    | { kind: "success"; email?: string; note?: string }
    | { kind: "error"; reason: string }
  >({ kind: "idle" });

  const disabled = useMemo(() => state.kind === "verifying", [state.kind]);

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
      return;
    }
    let aborted = false;
    const verify = async () => {
      setState({ kind: "verifying" });
      try {
        const res = await fetch(VERIFY_EMAIL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Language": getLang(), 
          },
          body: JSON.stringify({ token }),
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
          if (!aborted) setState({ kind: "error", reason });
          return;
        }

        const raw = (await res.json()) as unknown;
        const rec = isRecord(raw) ? (raw as Record<string, unknown>) : {};
        const email =
          typeof rec["email"] === "string"
            ? (rec["email"] as string)
            : undefined;
        const message =
          typeof rec["message"] === "string"
            ? (rec["message"] as string)
            : undefined;

        if (!aborted) setState({ kind: "success", email, note: message });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : t("verify.errors.network");
        if (!aborted) setState({ kind: "error", reason: msg });
      }
    };

    verify();
    return () => {
      aborted = true;
    };
  }, [token, activeLang]);

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
              {t("verify.title")}
            </h1>
            <p className="mb-6 text-center text-sm text-gray-600">
              {t("verify.subtitle")}
            </p>

            {state.kind === "verifying" && (
              <div className="flex flex-col items-center gap-3">
                <Spinner ariaLabel={t("verify.a11y.verifying")} />
                <p className="text-sm text-gray-600">
                  {t("verify.ui.pleaseWait")}
                </p>
              </div>
            )}

            {state.kind === "success" && (
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
            )}

            {state.kind === "error" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <ErrorIcon />
                <div>
                  <p className="text-base font-medium text-red-600">
                    {t("verify.result.failed")}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{state.reason}</p>
                </div>
                <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link
                    href="/maccount/signin/"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50"
                  >
                    {t("verify.cta.backSignin")}
                  </Link>
                  <button
                    disabled={disabled}
                    onClick={() => router.refresh()}
                    className="inline-flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-primary hover:bg-primary/15 disabled:opacity-50"
                  >
                    {t("verify.cta.tryAgain")}
                  </button>
                </div>
              </div>
            )}

            {state.kind === "idle" && (
              <div className="text-center text-sm text-gray-600">
                {t("verify.ui.waitingToken")}
              </div>
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
      className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary"
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
