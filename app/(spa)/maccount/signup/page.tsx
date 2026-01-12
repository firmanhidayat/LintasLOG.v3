// app/maccount/signup/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
import { FieldText } from "@/components/form/FieldText";
import { Button } from "@/components/ui/Button";
import FieldPassword from "@/components/form/FieldPassword";

const REGISTER_URL = process.env.NEXT_PUBLIC_TMS_REGISTER_URL!;

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

/** ---------- Small UI helpers ----------
 * RadioGroup & PasswordField built on top of your FieldText.
 */
function RadioGroup({
  name,
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="h-4 w-4 text-primary focus:ring-primary"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();

  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  // Controlled fields (pakai FieldText)
  const [accName, setAccName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<TmsUserType | "">("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [pwTouched, setPwTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

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

  function validateNewPassword(pw: string): string | null {
    if (pw.length < 8)
      return t("signup.errors.passwordMin") ?? "Password too short (min 8).";
    if (!/[A-Za-z]/.test(pw))
      return t("signup.errors.passwordNeedLetter") ?? "Must contain a letter.";
    if (!/[0-9]/.test(pw))
      return t("signup.errors.passwordNeedDigit") ?? "Must contain a digit.";
    return null;
  }

  // Simple client-side checks (UX saja)
  const emailLooksOk = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );
  const passwordsMatch = useMemo(
    () => password === confirm,
    [password, confirm]
  );
  //const pwdLongEnough = useMemo(() => password.length >= 8, [password]);
  const pwValidationMsg = useMemo(
    () => validateNewPassword(password),
    [password]
  );

  const formValid = useMemo(
    () =>
      accName.trim().length > 0 &&
      emailLooksOk &&
      (userType === "shipper" || userType === "transporter") &&
      passwordsMatch &&
      // pwdLongEnough &&
      !pwValidationMsg &&
      terms,
    [accName, emailLooksOk, userType, passwordsMatch, pwValidationMsg, terms]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrMsg(null);
    setOkMsg(null);

    // Server tetap sumber kebenaran; client-side guard buat UX
    if (!formValid) {
      if (!accName.trim())
        return setErrMsg(t("signup.errors.accountNameRequired"));
      if (!emailLooksOk) return setErrMsg(t("signup.errors.emailRequired"));
      if (userType !== "shipper" && userType !== "transporter")
        return setErrMsg(t("signup.errors.userTypeRequired"));
      // if (!pwdLongEnough) return setErrMsg(t("signup.errors.passwordMin"));
      if (pwValidationMsg) return setErrMsg(pwValidationMsg);
      if (!passwordsMatch)
        return setErrMsg(t("signup.errors.passwordMismatch"));
      if (!terms) return setErrMsg(t("signup.errors.termsRequired"));
      return;
    }

    const payload: RegisterPayload = {
      login: email.trim(),
      name: accName.trim(),
      mobile: phone.trim(),
      password,
      tms_user_type: userType as TmsUserType,
    };

    try {
      setSubmitting(true);
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Language": activeLang,
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

      sessionStorage.setItem("llog.emailcurrent", email.trim());
      sessionStorage.setItem(
        "llog.signup_gate",
        JSON.stringify({ ok: true, ts: Date.now() })
      );

      setOkMsg(t("signup.alerts.success"));
      // beri sedikit jeda agar user sempat melihat pesan
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
    // <div className="flex min-h-screen grid-cols-1 lg:grid-cols-2">
    //   <div>
    //     <Image
    //       src={bglintas}
    //       alt={t("app.bgAlt")}
    //       fill
    //       sizes="50vw"
    //       className="object-contain object-left"
    //       priority
    //     />
    //   </div>
    //   <div>
    //     <FieldText
    //       label={t("signup.form.accountName.label")}
    //       name="accountName"
    //       value={accName}
    //       onChange={setAccName}
    //       placeholder={t("signup.form.accountName.placeholder")}
    //       autoComplete="name"
    //       required
    //       disabled={submitting}
    //     />
    //   </div>
    // </div>

    <div className="flex min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:flex w-full h-screen overflow-hidden">
        {/* Layer belakang (blur cover) agar tidak ada area kosong */}
        <Image
          src={bglintas}
          alt=""
          fill
          sizes="50vw"
          className="object-cover blur-xl scale-110"
          priority
        />
        {/* Layer depan (gambar utuh tanpa potong, rata kiri) */}
        <Image
          src={bglintas}
          alt={t("app.bgAlt")}
          fill
          sizes="50vw"
          className="object-contain object-left"
          priority
        />
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-8 py-10">
        {/* <div className="flex items-center justify-center bg-white px-8 py-10"> */}
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
            <h2 className="text-2xl font-bold text-gray-800">
              {t("signup.title")}
            </h2>
            <p className="mt-1 text-gray-400">{t("signup.subtitle")}</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {errMsg && (
              <div
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
                aria-live="assertive"
              >
                {errMsg}
              </div>
            )}
            {okMsg && (
              <div
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                role="status"
                aria-live="polite"
              >
                {okMsg}
              </div>
            )}

            {/* Account Name */}
            <FieldText
              label={t("signup.form.accountName.label")}
              name="accountName"
              value={accName}
              onChange={setAccName}
              placeholder={t("signup.form.accountName.placeholder")}
              autoComplete="name"
              required
              disabled={submitting}
            />

            {/* Email */}
            <FieldText
              label={t("signup.form.email.label")}
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder={t("signup.form.email.placeholder")}
              autoComplete="email"
              required
              disabled={submitting}
            />

            {/* Phone (optional) */}
            <FieldText
              label={t("signup.form.phone.label")}
              name="phone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder={t("signup.form.phone.placeholder")}
              autoComplete="tel"
              inputMode="tel"
              disabled={submitting}
            />

            {/* User Type as Radio */}
            <div className="grid gap-1">
              <label className="text-sm font-medium text-gray-600">
                {t("signup.form.userType.label")}
              </label>
              <RadioGroup
                name="tms_user_type"
                ariaLabel={t("signup.form.userType.label")}
                value={userType}
                onChange={(v) => setUserType(v as TmsUserType)}
                disabled={submitting}
                options={[
                  { value: "shipper", label: t("roles.shipper") },
                  { value: "transporter", label: t("roles.transporter") },
                ]}
              />
              <input
                // hidden input to satisfy HTML5 `required` semantics if needed
                tabIndex={-1}
                className="sr-only"
                aria-hidden="true"
                required
                value={userType}
                onChange={() => {}}
              />
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldPassword
                label={t("signup.form.password.label")}
                name="password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  if (!pwTouched) setPwTouched(true);
                }}
                placeholder={t("signup.form.password.placeholder")}
                required
                disabled={submitting}
                a11yShow={t("signup.a11y.showPassword")}
                a11yHide={t("signup.a11y.hidePassword")}
              />
              <FieldPassword
                label={t("signup.form.confirm.label")}
                name="confirmPassword"
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  if (!confirmTouched) setConfirmTouched(true);
                }}
                placeholder={t("signup.form.confirm.placeholder")}
                required
                disabled={submitting}
                a11yShow={t("signup.a11y.showConfirm")}
                a11yHide={t("signup.a11y.hideConfirm")}
              />
            </div>

            {pwTouched && pwValidationMsg && (
              <div
                className="rounded-md  bg-red-50 px-3 py-2 text-xs text-red-700"
                role="alert"
                aria-live="polite"
              >
                {pwValidationMsg}
              </div>
            )}
            {confirmTouched &&
              confirm.length > 0 &&
              password.length > 0 &&
              !passwordsMatch &&
              !pwValidationMsg && (
                <div
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                  role="alert"
                  aria-live="polite"
                >
                  {t("signup.errors.passwordMismatch")}
                </div>
              )}

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                required
                disabled={submitting}
                className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                {t("signup.form.terms.text")}{" "}
                <Link
                  href="/terms"
                  className="font-medium text-primary hover:underline"
                >
                  {t("signup.form.terms.link")}
                </Link>
              </label>
            </div>

            {/* Submit */}
            <div className="text-center">
              <Button
                type="submit"
                disabled={submitting || !formValid}
                className="inline-flex items-center justify-center"
              >
                {submitting ? t("signup.ui.submitting") : t("signup.ui.submit")}
              </Button>
            </div>

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
