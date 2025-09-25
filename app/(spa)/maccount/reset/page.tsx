"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.png";

const RESET_URL =
  "https://odoodev.linitekno.com/api-tms/auth/request_reset_password";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string)?.trim();
    if (!email) {
      setStatus("error");
      setMsg("Email is required.");
      return;
    }

    try {
      setStatus("loading");
      // Panggil endpoint Anda sendiri, mis. /api/auth/reset-password
      const res = await fetch(RESET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setMsg("We’ve sent reset instructions to your email.");
    } catch {
      setStatus("error");
      setMsg("Failed to send reset email. Please try again.");
    } finally {
      // optional: form.reset();
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Kiri: Reset Password Form */}
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

          {/* Title & Subtitle */}
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-black">Reset Password</h2>
            <p id="helptext" className="mt-2 text-sm text-gray-400">
              Enter your email and we will send you an email with instructions
              to reset your password
            </p>
          </div>

          {/* Form */}
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
                Email
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
                placeholder="you@example.com"
              />
            </div>

            <div className="text-center">
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-base font-medium text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {status === "loading" ? "Sending…" : "Reset"}
              </button>
            </div>

            {/* Status message */}
            <div aria-live="polite" className="min-h-6 text-center text-sm">
              {status === "success" && (
                <span className="text-green-600">{msg}</span>
              )}
              {status === "error" && (
                <span className="text-red-600">{msg}</span>
              )}
            </div>
          </form>

          {/* Optional: Back to Sign In */}
          <div className="mt-4 text-center text-sm">
            <Link
              href="/maccount/signin"
              className="text-primary hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-screen lg:block">
        <Image
          src={bglintas}
          alt="Background"
          fill
          priority
          className="object-cover object-center"
        />
      </div>
    </div>
  );
}
