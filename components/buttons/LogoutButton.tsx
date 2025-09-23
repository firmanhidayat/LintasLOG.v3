"use client";

import { useRouter } from "next/navigation";
import { clearAuth, apiLogout } from "@/lib/auth";
// import { withBase } from "@/lib/paths";
import { LogOut } from "lucide-react";

export function LogoutButton({
  className,
  role,
}: {
  className?: string;
  role?: string;
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
      <span>Logout</span>
    </button>
  );
}
