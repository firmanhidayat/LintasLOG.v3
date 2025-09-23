"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.png";
import { useRouter } from "next/navigation";

const REGISTER_URL = "https://odoodev.linitekno.com/api-tms/auth/register";

type FastapiErrorItem = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

// type Fastapi422 = {
//   detail: FastapiErrorItem[];
// };

// type HttpErrorPayload = {
//   detail?: string | Fastapi422["detail"];
//   message?: string;
// };

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
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function parseFastapiError(payload: unknown): string {
    if (isRecord(payload)) {
      const detail = (payload as Record<string, unknown>)["detail"];
      if (isFastapiErrorItems(detail)) {
        const first = detail[0];
        return first?.msg ?? "Validation error";
      }
      if (typeof detail === "string") return detail;

      const message = (payload as Record<string, unknown>)["message"];
      if (typeof message === "string") return message;
    }
    return "Registration failed";
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setErrMsg(null);
    setOkMsg(null);

    const form = new FormData(e.currentTarget);
    const accName = String(form.get("accountName") || "").trim(); // name
    const email = String(form.get("email") || "").trim(); // login
    const phone = String(form.get("phone") || "").trim();
    const userType = String(
      form.get("tms_user_type") || ""
    ).trim() as TmsUserType;
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (!accName) {
      setErrMsg("Complete Name wajib diisi.");
      return;
    }
    if (!email) {
      setErrMsg("Email (sebagai login) wajib diisi.");
      return;
    }
    if (!userType || (userType !== "shipper" && userType !== "transporter")) {
      setErrMsg("Pilih jenis user: shipper atau transporter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrMsg("Password dan konfirmasi tidak sama.");
      return;
    }
    if (password.length < 8) {
      setErrMsg("Password minimal 8 karakter.");
      return;
    }

    const payload: RegisterPayload = {
      login: email, // <- dipisah: login = email
      name: accName, // <- name = account name
      mobile: phone,
      password,
      tms_user_type: userType,
    };

    try {
      setSubmitting(true);
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const store = sessionStorage;
      if (res.ok) {
        store.setItem("llog.emailcurrent", email);
      }

      setOkMsg("Registrasi berhasil.");
      setTimeout(() => {
        router.push("/maccount/signup/success");
      }, 200);
    } catch (err) {
      setErrMsg(
        err instanceof Error ? err.message : "Network error. Coba lagi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Kiri: Background full */}
      <div className="relative hidden min-h-screen lg:block">
        <Image
          src={bglintas}
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Kanan: Form */}
      <div className="flex items-center justify-center bg-white px-8 py-10">
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

          <form className="space-y-6" onSubmit={handleSubmit}>
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
                Complete Name
              </label>
              <input
                id="accountName"
                name="accountName"
                type="text"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                placeholder="Nama akun / perusahaan / display name"
                autoComplete="name"
              />
            </div>

            {/* Email (login) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email / Username
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone no
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                placeholder="+62 812-xxxx-xxxx"
                autoComplete="tel"
              />
            </div>

            {/* TMS User Type */}
            <div>
              <label
                htmlFor="tms_user_type"
                className="block text-sm font-medium text-gray-700"
              >
                User Type
              </label>
              <select
                id="tms_user_type"
                name="tms_user_type"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                defaultValue=""
              >
                <option value="" disabled>
                  Pilih tipe user
                </option>
                <option value="shipper">Shipper</option>
                <option value="transporter">Transporter</option>
              </select>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1 flex">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full rounded-l-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="rounded-r-md border border-l-0 border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm password
                </label>
                <div className="mt-1 flex">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full rounded-l-md border border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary"
                    placeholder="Re-type your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="rounded-r-md border border-l-0 border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                    aria-label={
                      showConfirm
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirm ? "Hide" : "Show"}
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
                I agree to the{" "}
                <a
                  href="/terms"
                  className="font-medium text-primary hover:underline"
                >
                  Terms & Privacy
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
                {submitting ? "Signing Up…" : "Sign Up"}
              </button>
            </div>

            {/* Link ke Sign In */}
            <p className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/maccount/signin"
                className="font-medium text-primary hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
