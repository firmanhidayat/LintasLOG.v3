"use client";

import Image from "next/image";
import Link from "next/link";
import imageSuccess from "@/images/success-i.png";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.png";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

type SignupGate = { ok: boolean; ts: number };

const GATE_KEY = "llog.signup_gate";
const EMAIL_KEY = "llog.emailcurrent";
const WINDOW_MS = 5 * 60 * 1000; // 5 menit

export default function SuccessPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [allowed, setAllowed] = useState(false);

  const [i18nReady, setI18nReady] = useState(false);
  const [, setActiveLang] = useState<Lang>(getLang());

  useEffect(() => {
    let mounted = true;

    try {
      const raw = sessionStorage.getItem(GATE_KEY);
      const gate = raw ? (JSON.parse(raw) as SignupGate) : null;
      const now = Date.now();

      const valid =
        !!gate &&
        gate.ok === true &&
        typeof gate.ts === "number" &&
        now - gate.ts <= WINDOW_MS;

      if (!valid) {
        router.replace("/maccount/signup");
        return;
      }

      const savedEmail = sessionStorage.getItem(EMAIL_KEY) || "";
      setEmail(savedEmail);

      setAllowed(true);
    } catch {
      router.replace("/maccount/signup");
      return;
    }

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
      sessionStorage.removeItem(GATE_KEY);
      off();
    };
  }, [router]);

  if (!allowed || !i18nReady) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
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

          <div className="mb-6">
            <Image
              src={imageSuccess}
              alt={t("signup.success.iconAlt")}
              width={64}
              height={64}
              priority
              className="mx-auto"
            />
          </div>

          <h2 className="mb-3 text-4xl font-bold text-green-800">
            {t("signup.success.title")}
          </h2>
          <p className="mb-8 text-gray-600 text-sm">
            {t("signup.success.message", { email })}
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:bg-primary/90"
          >
            {t("signup.success.ctaHome")}
          </Link>

          {/* Optional: ke halaman verifikasi */}
          {/* <p className="mt-4 text-xs text-gray-500">
            {t("signup.success.didntReceive")}{" "}
            <Link href="/verify-email" className="text-primary hover:underline">
              {t("signup.success.openVerifyPage")}
            </Link>
          </p> */}
        </div>
      </div>
      <div className="relative hidden min-h-screen lg:block">
        <Image
          src={bglintas}
          alt={t("app.bgAlt")}
          fill
          className="object-cover"
        />
      </div>
    </div>
  );
}
