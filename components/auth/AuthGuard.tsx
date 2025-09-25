// src/components/auth/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { withBase } from "@/lib/paths";
import { useAuth } from "@/components/providers/AuthProvider";

type Props = {
  children: React.ReactNode;
  nextPath?: string; // jika kosong, pakai pathname aktif
};

// halaman yang tidak boleh memicu redirect loop
const AUTH_PUBLIC_PREFIXES = [
  "/maccount/signin",
  "/maccount/signup",
  "/maccount/reset",
  "/maccount/verify-email",
];

export default function AuthGuard({ children, nextPath }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  // ✅ panggil hook di top-level, tidak dibungkus function/try-catch
  const { loggedIn } = useAuth(); // pastikan AuthProvider membungkus app

  useEffect(() => {
    const isAuthPublic = AUTH_PUBLIC_PREFIXES.some((p) =>
      (pathname || "").startsWith(p)
    );

    const doCheck = () => {
      // Pakai state dari context sebagai sumber utama; fallback helper kalau perlu
      const logged = loggedIn ?? isLoggedIn();

      if (!logged && !isAuthPublic) {
        const target = nextPath || pathname || "/";
        const encodedNext = encodeURIComponent(withBase(target));
        const loginUrl = `/maccount/signin?next=${encodedNext}`; // basePath otom. ditangani Next
        router.replace(loginUrl);
        return;
      }
      setOk(true);
    };

    doCheck();

    // dengarkan perubahan login dari tab lain
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (["llog.login", "llog.mail_verified"].includes(e.key)) {
        setOk(false);
        doCheck();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router, pathname, nextPath, loggedIn]); // ✅ depend ke loggedIn dari context

  if (!ok) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
