"use client";

import Image from "next/image";
import Link from "next/link";
import imageSuccess from "@/images/success-i.png";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.png";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// i18n
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

  // i18n
  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  useEffect(() => {
    let mounted = true;

    // ---------- Guard ----------
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
        // tidak dari flow signup -> balikin ke signup
        router.replace("/maccount/signup");
        return;
      }

      // ambil email
      const savedEmail = sessionStorage.getItem(EMAIL_KEY) || "";
      setEmail(savedEmail);

      // izinkan render
      setAllowed(true);
    } catch {
      router.replace("/maccount/signup");
      return;
    }

    // ---------- i18n boot ----------
    loadDictionaries().then(() => {
      if (!mounted) return;
      setI18nReady(true);
      setActiveLang(getLang());
    });

    // reactive lang
    const off = onLangChange((lang) => {
      if (!mounted) return;
      setActiveLang(lang);
    });

    // cleanup: gate one-time
    return () => {
      mounted = false;
      sessionStorage.removeItem(GATE_KEY);
      off();
    };
  }, [router]);

  // Sembunyikan konten sampai guard & i18n siap
  if (!allowed || !i18nReady) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Kiri: Success Message */}
      <div className="flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
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

          {/* Toggle Bahasa */}
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

          {/* Success Text */}
          <h2 className="mb-3 text-4xl font-bold text-green-800">
            {t("signup.success.title")}
          </h2>
          <p className="mb-8 text-gray-600 text-sm">
            {t("signup.success.message", { email })}
          </p>

          {/* Back to Home Button */}
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

      {/* Kanan: Background full */}
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
