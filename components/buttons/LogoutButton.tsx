"use client";

import { useRouter } from "next/navigation";
import { clearAuth, apiLogout } from "@/lib/auth";
import { LogOut } from "lucide-react";

export function LogoutButton({
  className,
  role,
  caption,
}: {
  className?: string;
  role?: string;
  caption: string;
}) {
  const router = useRouter();
  async function onLogout() {
    const res = await apiLogout();
    console.log(res);
    // await clearAuth();
    router.replace("/maccount/signin");
  }
  return (
    <button
      onClick={onLogout}
      role={role}
      className={className ?? "text-red-600"}
    >
      <LogOut className="h-4 w-4" />
      <span>{caption}</span>
    </button>
  );
}
