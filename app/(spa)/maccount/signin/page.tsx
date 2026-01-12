"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.webp";

import { Role, useAuth } from "@/components/providers/AuthProvider";

import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";
import { mapFastapi422, mapCommonErrors } from "@/lib/i18n-fastapi";
import LangToggle from "@/components/LangToggle";
import { Field } from "@/components/form/FieldInput";
import Button from "@/components/ui/Button";

const LOGIN_URL = process.env.NEXT_PUBLIC_TMS_LOGIN_URL!;

type LoginOk = {
  login: string;
  mail_verified: boolean;
};

type FastapiErrorItem = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

type Fastapi422 = {
  detail: FastapiErrorItem[];
};

type HttpErrorPayload = {
  detail?: string | Fastapi422["detail"];
  message?: string;
};

function isFastapi422Detail(v: unknown): v is Fastapi422["detail"] {
  return (
    Array.isArray(v) && v.every((i) => typeof i === "object" && i !== null)
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<Role>("shipper");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login: authLogin } = useAuth();

  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [verifyHint, setVerifyHint] = useState<{
    show: boolean;
    login?: string;
  }>({ show: false });

  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    loadDictionaries().then(() => {
      if (!mounted) return;
      setI18nReady(true);
      setActiveLang(getLang()); // sinkron awal
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

  const canSubmit = useMemo(
    () => email.trim() !== "" && password.trim().length >= 4 && !loading,
    [email, password, loading]
  );

  function parse422(detail: Fastapi422["detail"]) {
    const lang = getLang();
    const { fieldErrors, generic } = mapFastapi422(detail, lang);
    setFieldErr(fieldErrors);
    setFormError(generic.length ? generic.join(" | ") : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setFormError(null);
    setFieldErr({});
    setVerifyHint({ show: false });

    try {
      // console.log("(Login) ", { login: email, password, tms_user_type: tab });
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Language": activeLang,
        },
        body: JSON.stringify({ login: email, password, tms_user_type: tab }),
        credentials: "include",
      });

      const raw: unknown = await res.json().catch(() => null);

      if (res.status === 422) {
        const data = raw as HttpErrorPayload | null;
        if (data && isFastapi422Detail(data.detail)) {
          parse422(data.detail);
        } else {
          setFormError(t("alerts.validation422"));
        }
        return;
      }

      if (!res.ok) {
        const data = raw as HttpErrorPayload | null;
        const msgFromServer =
          (typeof data?.detail === "string" && data.detail) ||
          (typeof data?.message === "string" && data.message) ||
          null;
        const msg = msgFromServer ?? mapCommonErrors("http", res.status);
        setFormError(msg);
        return;
      }

      const ok = raw as LoginOk;
      if (
        !ok ||
        typeof ok.login !== "string" ||
        typeof ok.mail_verified !== "boolean"
      ) {
        setFormError(t("alerts.formatInvalid"));
        return;
      }

      console.log("{OK : ", ok, " }");
      console.log("{Remember : ", remember, " }");
      console.log("{Tab : ", tab, " }");

      authLogin({
        login: ok.login,
        mail_verified: ok.mail_verified,
        remember: remember,
        tms_user_type: tab,
      });

      if (ok.mail_verified) {
        router.push("/dashboard");
      } else {
        setVerifyHint({ show: true, login: ok.login });
      }
    } catch {
      const msg = mapCommonErrors("network");
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!i18nReady) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  const roleLabel =
    tab === "shipper" ? t("roles.shipper") : t("roles.transporter");

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

          <div className="mb-2 flex items-center justify-end">
            <LangToggle />
          </div>

          <div className="mb-6">
            <nav className="-mb-px flex justify-center gap-8">
              <button
                type="button"
                onClick={() => setTab("shipper")}
                aria-current={tab === "shipper" ? "page" : undefined}
                className={`border-b-2 px-3 pb-2 text-base ${
                  tab === "shipper"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t("tabs.shipper")}
              </button>
              <button
                type="button"
                onClick={() => setTab("transporter")}
                aria-current={tab === "transporter" ? "page" : undefined}
                className={`border-b-2 px-3 pb-2 text-base ${
                  tab === "transporter"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t("tabs.transporter")}
              </button>
            </nav>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {t("title.signin", { role: roleLabel })}
            </h2>
            <p className="mt-1 text-gray-400">{t("subtitle.signin")}</p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          {verifyHint.show && (
            <div
              role="status"
              className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {verifyHint.login
                ? t("alerts.unverifiedWithLogin", { login: verifyHint.login })
                : t("alerts.unverified")}
              <div className="mt-2">
                <Link
                  href="/verify-email"
                  className="text-sm font-medium text-amber-900 underline underline-offset-2"
                >
                  {t("alerts.openVerifyPage")}
                </Link>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              {/* <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t("form.email.label")}
              </label> */}

              <Field.Root
                id="email"
                value={email}
                onChange={(e) => setEmail(e)}
                error={fieldErr.email}
              >
                <Field.Label>{t("form.email.label")}</Field.Label>
                <Field.Input
                  type="email"
                  autoComplete="username"
                  required
                  placeholder={t("form.email.placeholder")}
                ></Field.Input>
                <Field.Error></Field.Error>
              </Field.Root>
            </div>

            <div>
              <Field.Root
                id="password"
                value={password}
                onChange={(e) => setPassword(e)}
                error={fieldErr.password}
              >
                <Field.Label>{t("form.password.label")}</Field.Label>
                <Field.Input
                  type="password"
                  autoComplete="current-password"
                  minLength={4}
                  required
                  placeholder={t("form.password.placeholder")}
                ></Field.Input>
                <Field.Error></Field.Error>
              </Field.Root>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.currentTarget.checked)}
                  className="mr-2 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">
                  {t("form.remember")}
                </span>
              </label>
              <Link
                href="/maccount/reset"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("form.forgot")}
              </Link>
            </div>

            <div className="text-center">
              <Button
                type="submit"
                disabled={!canSubmit}
                className={`inline-flex items-center justify-center rounded-md px-4 py-3 text-base font-medium text-white ${
                  loading || !canSubmit
                    ? "bg-primary/60 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        strokeOpacity="0.25"
                        strokeWidth="4"
                      />
                      <path d="M21 12a9 9 0 0 1-9 9" strokeWidth="4" />
                    </svg>
                    {t("form.submitting")}
                  </span>
                ) : (
                  t("form.submit")
                )}
              </Button>
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              {t("form.noAccount")}{" "}
              <Link
                href="/maccount/signup"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("form.signup")}
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div className="relative hidden min-h-screen overflow-hidden bg-gray-100 lg:block">
        {/* layer belakang: ngisi layar (boleh blur supaya tidak kelihatan crop) */}
        <Image
          src={bglintas}
          alt=""
          aria-hidden="true"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover scale-110 blur-xl"
          priority
        />

        {/* layer depan: tampilkan gambar utuh (tidak terpotong) */}
        <Image
          src={bglintas}
          alt=""
          aria-hidden="true"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain"
          priority
        />
      </div>

      {/* <div className="relative hidden min-h-screen lg:block">
        <Image
          src={bglintas}
          alt={t("app.bgAlt")}
          fill
          className="object-cover"
        />
      </div> */}
    </div>
  );
}
