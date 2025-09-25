"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.png";
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

const REGISTER_URL = "https://odoodev.linitekno.com/api-tms/auth/register";

type FastapiErrorItem = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

type TmsUserType = "shipper" | "transporter";

type RegisterPayload = {
  login: string; // email
  name: string; // account name
  mobile: string;
  password: string;
  tms_user_type: TmsUserType;
};

// ---------- Type guards (tanpa any) ----------
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFastapiErrorItem(v: unknown): v is FastapiErrorItem {
  if (!isRecord(v)) return false;
  const loc = (v as Record<string, unknown>)["loc"];
  const msg = (v as Record<string, unknown>)["msg"];
  const type = (v as Record<string, unknown>)["type"];
  return (
    Array.isArray(loc) && typeof msg === "string" && typeof type === "string"
  );
}

function isFastapiErrorItems(v: unknown): v is FastapiErrorItem[] {
  return Array.isArray(v) && v.every(isFastapiErrorItem);
}
// --------------------------------------------

export default function SignUpPage() {
  const router = useRouter();

  // i18n state
  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // muat kamus (kamu bisa merge signup.json ke loader kamu)
    loadDictionaries().then(() => {
      if (!mounted) return;
      setI18nReady(true);
      setActiveLang(getLang());
    });

    // reactive i18n
    const off = onLangChange((lang) => {
      if (!mounted) return;
      // kamus sudah di-cache; cukup trigger re-render
      setActiveLang(lang);
    });

    return () => {
      mounted = false;
      off();
    };
  }, []);

  function parseFastapiError(payload: unknown): string {
    if (isRecord(payload)) {
      const detail = (payload as Record<string, unknown>)["detail"];
      if (isFastapiErrorItems(detail)) {
        const first = detail[0];
        return first?.msg ?? t("signup.alerts.validation");
      }
      if (typeof detail === "string") return detail;

      const message = (payload as Record<string, unknown>)["message"];
      if (typeof message === "string") return message;
    }
    return t("signup.alerts.failed");
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setErrMsg(null);
    setOkMsg(null);

    const form = new FormData(e.currentTarget);
    const accName = String(form.get("accountName") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const userType = String(
      form.get("tms_user_type") || ""
    ).trim() as TmsUserType;
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (!accName) {
      setErrMsg(t("signup.errors.accountNameRequired"));
      return;
    }
    if (!email) {
      setErrMsg(t("signup.errors.emailRequired"));
      return;
    }
    if (!userType || (userType !== "shipper" && userType !== "transporter")) {
      setErrMsg(t("signup.errors.userTypeRequired"));
      return;
    }
    if (password !== confirmPassword) {
      setErrMsg(t("signup.errors.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setErrMsg(t("signup.errors.passwordMin"));
      return;
    }

    const payload: RegisterPayload = {
      login: email,
      name: accName,
      mobile: phone,
      password,
      tms_user_type: userType,
    };

    try {
      setSubmitting(true);
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Language": getLang(), // kirim lang ke BE
        },
        body: JSON.stringify(payload),
      });

      let data: unknown = null;
      try {
        data = (await res.json()) as unknown;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg = parseFastapiError(data);
        setErrMsg(msg || `HTTP ${res.status} ${res.statusText}`);
        return;
      }

      // simpan email untuk halaman success / verify
      sessionStorage.setItem("llog.emailcurrent", email);
      sessionStorage.setItem(
        "llog.signup_gate",
        JSON.stringify({ ok: true, ts: Date.now() })
      );

      setOkMsg(t("signup.alerts.success"));
      setTimeout(() => {
        router.push("/maccount/signup/success");
      }, 200);
    } catch (err) {
      setErrMsg(
        err instanceof Error ? err.message : t("signup.alerts.networkError")
      );
    } finally {
      setSubmitting(false);
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
      {/* Kiri: Background full */}
      <div className="relative hidden min-h-screen lg:block">
        <Image
          src={bglintas}
          alt={t("app.bgAlt")}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Kanan: Form */}
      <div className="flex items-center justify-center bg-white px-8 py-10">
        <div className="w-full max-w-md">
          {/* Logo */}
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

          {/* Toggle Bahasa */}
          <div className="mb-6 flex items-center justify-end">
            <LangToggle />
          </div>

          {/* Judul */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {t("signup.title")}
            </h2>
            <p className="mt-1 text-gray-400">{t("signup.subtitle")}</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* Alert */}
            {errMsg && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errMsg}
              </div>
            )}
            {okMsg && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {okMsg}
              </div>
            )}

            {/* AccountName (name) */}
            <div>
              <label
                htmlFor="accountName"
                className="block text-sm font-medium text-gray-700"
              >
                {t("signup.form.accountName.label")}
              </label>
              <input
                id="accountName"
                name="accountName"
                type="text"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                placeholder={t("signup.form.accountName.placeholder")}
                autoComplete="name"
              />
            </div>

            {/* Email (login) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t("signup.form.email.label")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                placeholder={t("signup.form.email.placeholder")}
                autoComplete="email"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                {t("signup.form.phone.label")}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                placeholder={t("signup.form.phone.placeholder")}
                autoComplete="tel"
              />
            </div>

            {/* TMS User Type */}
            <div>
              <label
                htmlFor="tms_user_type"
                className="block text-sm font-medium text-gray-700"
              >
                {t("signup.form.userType.label")}
              </label>
              <select
                id="tms_user_type"
                name="tms_user_type"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                defaultValue=""
              >
                <option value="" disabled>
                  {t("signup.form.userType.placeholder")}
                </option>
                <option value="shipper">{t("roles.shipper")}</option>
                <option value="transporter">{t("roles.transporter")}</option>
              </select>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("signup.form.password.label")}
                </label>
                <div className="mt-1 flex">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full rounded-l-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                    placeholder={t("signup.form.password.placeholder")}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="rounded-r-md border border-l-0 border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                    aria-label={
                      showPwd
                        ? t("signup.a11y.hidePassword")
                        : t("signup.a11y.showPassword")
                    }
                  >
                    {showPwd ? t("signup.ui.hide") : t("signup.ui.show")}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("signup.form.confirm.label")}
                </label>
                <div className="mt-1 flex">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full rounded-l-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                    placeholder={t("signup.form.confirm.placeholder")}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="rounded-r-md border border-l-0 border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                    aria-label={
                      showConfirm
                        ? t("signup.a11y.hideConfirm")
                        : t("signup.a11y.showConfirm")
                    }
                  >
                    {showConfirm ? t("signup.ui.hide") : t("signup.ui.show")}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                {t("signup.form.terms.text")}{" "}
                <a
                  href="/terms"
                  className="font-medium text-primary hover:underline"
                >
                  {t("signup.form.terms.link")}
                </a>
              </label>
            </div>

            {/* Submit */}
            <div className="text-center">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-base font-medium text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? t("signup.ui.submitting") : t("signup.ui.submit")}
              </button>
            </div>

            {/* Link ke Sign In */}
            <p className="mt-4 text-center text-sm text-gray-500">
              {t("signup.footer.haveAccount")}{" "}
              <Link
                href="/maccount/signin"
                className="font-medium text-primary hover:underline"
              >
                {t("signup.footer.signinHere")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
