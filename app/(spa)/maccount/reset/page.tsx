"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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

const RESET_URL = process.env.NEXT_PUBLIC_TMS_RESET_URL!;

export default function ResetPasswordPage() {
  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [msg, setMsg] = useState<string>("");

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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string)?.trim();

    if (!email) {
      setStatus("error");
      setMsg(t("reset.errors.emailRequired"));
      return;
    }

    try {
      setStatus("loading");
      setMsg("");
      const res = await fetch(RESET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Language": activeLang,
        },
        body: JSON.stringify({ login: email }),
      });
      if (!res.ok) throw new Error(String(res.status));

      setStatus("success");
      setMsg(t("reset.alerts.sent"));
    } catch {
      setStatus("error");
      setMsg(t("reset.alerts.failed"));
    } finally {
      // optional: form.reset();
    }
  }

  if (!i18nReady) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-md">
          <div className="mb-4 text-center">
            <Image
              src={lintaslogo}
              alt={t("app.brand")}
              width={180}
              height={40}
              priority
              className="mx-auto"
            />
          </div>

          <div className="mb-6 flex items-center justify-end">
            <LangToggle />
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-black">
              {t("reset.title")}
            </h2>
            <p id="helptext" className="mt-2 text-sm text-gray-400">
              {t("reset.subtitle")}
            </p>
          </div>

          <form
            className="space-y-4"
            method="post"
            onSubmit={onSubmit}
            noValidate
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t("reset.form.email.label")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                aria-describedby="helptext"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                placeholder={t("reset.form.email.placeholder")}
              />
            </div>

            <div className="text-center">
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-base font-medium text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {status === "loading"
                  ? t("reset.ui.sending")
                  : t("reset.ui.submit")}
              </button>
            </div>

            <div aria-live="polite" className="min-h-6 text-center text-sm">
              {status === "success" && (
                <span className="text-green-600">{msg}</span>
              )}
              {status === "error" && (
                <span className="text-red-600">{msg}</span>
              )}
            </div>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link
              href="/maccount/signin"
              className="text-primary hover:underline"
            >
              {t("reset.footer.backToSignin")}
            </Link>
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-screen lg:block">
        <Image
          src={bglintas}
          alt={t("app.bgAlt")}
          fill
          priority
          className="object-cover object-center"
        />
      </div>
    </div>
  );
}
