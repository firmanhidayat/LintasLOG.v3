"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/ringkasanorder");
  }, [router]);
  return null; // tidak render apa-apa
}
