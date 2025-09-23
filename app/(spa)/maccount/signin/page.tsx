"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.png";

const LOGIN_URL = "https://odoodev.linitekno.com/api-tms/auth/login";

// NOTE: role sementara tidak dipakai
type Role = "shipper" | "transporter";

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
  const [tab, setTab] = useState<Role>("shipper"); // UI saja, belum dipakai ke API
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // error states
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

  const canSubmit = useMemo(
    () => email.trim() !== "" && password.trim().length >= 4 && !loading,
    [email, password, loading]
  );

  function parse422(detail: Fastapi422["detail"]) {
    const next: { email?: string; password?: string } = {};
    const generic: string[] = [];

    for (const item of detail) {
      const loc = item.loc ?? [];
      const lastStr = [...loc].reverse().find((x) => typeof x === "string") as
        | "email"
        | "password"
        | "role"
        | "tab"
        | (string & {})
        | undefined;

      const msg = item.msg || item.type || "Invalid";
      switch (lastStr) {
        case "email":
          next.email = next.email ? `${next.email}; ${msg}` : msg;
          break;
        case "password":
          next.password = next.password ? `${next.password}; ${msg}` : msg;
          break;
        // role/tab diabaikan untuk sementara
        default:
          generic.push(msg);
      }
    }

    setFieldErr(next);
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
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // HANYA kirim email & password (role di-remark)
        body: JSON.stringify({ login: email, password }),
        credentials: "include",
      });

      const raw: unknown = await res.json().catch(() => null);

      if (res.status === 422) {
        const data = raw as HttpErrorPayload | null;
        if (data && isFastapi422Detail(data.detail)) {
          parse422(data.detail);
        } else {
          setFormError("Validasi gagal (422).");
        }
        return;
      }

      if (!res.ok) {
        const data = raw as HttpErrorPayload | null;
        const msg =
          (typeof data?.detail === "string" && data.detail) ||
          (typeof data?.message === "string" && data.message) ||
          `Login gagal (HTTP ${res.status}).`;
        setFormError(msg);
        return;
      }

      const ok = raw as LoginOk;
      if (
        !ok ||
        typeof ok.login !== "string" ||
        typeof ok.mail_verified !== "boolean"
      ) {
        setFormError("Format respons tidak sesuai.");
        return;
      }

      const store = remember ? localStorage : sessionStorage;
      store.setItem("llog.login", ok.login);
      store.setItem("llog.mail_verified", String(ok.mail_verified));
      // store.setItem("llog.role", tab); // <- tetap di-remark

      if (ok.mail_verified) {
        router.push("/dashboard");
      } else {
        setVerifyHint({ show: true, login: ok.login });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan jaringan.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Kiri: Form */}
      <div className="flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Image
              src={lintaslogo}
              alt="LintasLOG"
              width={180}
              height={40}
              priority
              className="mx-auto"
            />
          </div>

          {/* Tabs (UI saja, belum kirim ke API) */}
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
                Shipper
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
                Transporter
              </button>
            </nav>
            {/* Tidak render fieldErr.role lagi */}
          </div>

          {/* Form Login */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              Sign In as {tab === "shipper" ? "Shipper" : "Transporter"}
            </h2>
            <p className="mt-1 text-gray-400">Sign in to stay connected</p>
          </div>

          {/* Alert umum */}
          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          {/* Alert verify email */}
          {verifyHint.show && (
            <div
              role="status"
              className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {verifyHint.login
                ? `Akun ${verifyHint.login} belum terverifikasi. Silakan verifikasi email terlebih dahulu.`
                : "Email belum terverifikasi. Silakan verifikasi email terlebih dahulu."}
              <div className="mt-2">
                <Link
                  href="/verify-email"
                  className="text-sm font-medium text-amber-900 underline underline-offset-2"
                >
                  Buka halaman verifikasi
                </Link>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                className={`mt-1 w-full rounded-md border px-3 py-2 focus:border-primary focus:ring-primary ${
                  fieldErr.email ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
              {fieldErr.email && (
                <p className="mt-1 text-xs text-red-600">{fieldErr.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                className={`mt-1 w-full rounded-md border px-3 py-2 focus:border-primary focus:ring-primary ${
                  fieldErr.password ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="********"
                autoComplete="current-password"
                minLength={4}
                required
              />
              {fieldErr.password && (
                <p className="mt-1 text-xs text-red-600">{fieldErr.password}</p>
              )}
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
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                href="/maccount/reset"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="text-center">
              <button
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
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/maccount/signup"
                className="text-sm font-medium text-primary hover:underline"
              >
                Click here to sign up
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Kanan: Background full */}
      <div className="relative hidden min-h-screen lg:block">
        <Image src={bglintas} alt="Background" fill className="object-cover" />
      </div>
    </div>
  );
}
