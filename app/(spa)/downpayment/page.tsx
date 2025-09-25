"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DownpaymentPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/downpayment/list");
  }, [router]);
  return null; // tidak render apa-apa
}
