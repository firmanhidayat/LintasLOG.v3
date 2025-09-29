"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { withBase } from "@/lib/paths";
import { useAuth } from "@/components/providers/AuthProvider";

type Props = {
  children: React.ReactNode;
  nextPath?: string; 
};

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

  const { loggedIn } = useAuth(); 

  useEffect(() => {
    const isAuthPublic = AUTH_PUBLIC_PREFIXES.some((p) =>
      (pathname || "").startsWith(p)
    );

    const doCheck = () => {
      const logged = loggedIn ?? isLoggedIn();

      if (!logged && !isAuthPublic) {
        const target = nextPath || pathname || "/";
        const encodedNext = encodeURIComponent(withBase(target));
        const loginUrl = `/maccount/signin?next=${encodedNext}`;  
        router.replace(loginUrl);
        return;
      }
      setOk(true);
    };

    doCheck();

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (["llog.login", "llog.mail_verified"].includes(e.key)) {
        setOk(false);
        doCheck();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router, pathname, nextPath, loggedIn]);  

  if (!ok) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
