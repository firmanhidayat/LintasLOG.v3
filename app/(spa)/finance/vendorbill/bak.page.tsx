"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VendorBillPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/vendorbill/list");
  }, [router]);
  return null; // tidak render apa-apa
}
