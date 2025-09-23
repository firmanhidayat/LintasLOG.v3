"use client";

import Image from "next/image";
import Link from "next/link";
import imageSuccess from "@/images/success-i.png";
import lintaslogo from "@/images/lintaslog-logo.png";
import bglintas from "@/images/bg-1.png";
import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("llog.emailcurrent") || "";
    setEmail(saved);
  }, []);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Kiri: Success Message */}
      <div className="flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src={lintaslogo}
              alt="LintasLOG"
              width={180}
              height={40}
              priority
              className="mx-auto"
            />
          </div>

          <div className="mb-8">
            <Image
              src={imageSuccess}
              alt="Success Icon"
              width={64}
              height={64}
              priority
              className="mx-auto"
            />
          </div>

          {/* Success Text */}
          <h2 className="mb-4 text-5xl font-bold text-green-800">Success!</h2>
          <p className="mb-8 text-gray-600 text-xs">
            An email has been sent to your{" "}
            <span className="font-semibold">{email}</span>. Please check for
            <br />
            an email from company and click on the included link to reset your
            <br />
            password.
          </p>

          {/* Back to Home Button */}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:bg-primary/90"
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* Kanan: Background full */}
      <div className="relative hidden min-h-screen lg:block">
        <Image src={bglintas} alt="Background" fill className="object-cover" />
      </div>
    </div>
  );
}
