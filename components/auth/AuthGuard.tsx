// src/components/auth/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { withBase } from "@/lib/paths";

type Props = {
  children: React.ReactNode;
  nextPath?: string; // untuk ?next=... saat redirect ke login
};

export default function AuthGuard({ children, nextPath }: Props) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      // const loginUrl = withBase(
      //   `/maccount/signin/${
      //     nextPath ? `?next=${encodeURIComponent(withBase(nextPath))}` : ""
      //   }`
      // );
      // router.replace(loginUrl);
      const loginUrl = `/maccount/signin/${
        nextPath ? `?next=${encodeURIComponent(withBase(nextPath))}` : ""
      }`;

      router.replace(loginUrl);
      return;
    }
    setOk(true);
  }, [router, nextPath]);

  if (!ok) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
