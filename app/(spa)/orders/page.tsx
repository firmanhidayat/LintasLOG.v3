"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrdersPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/orders/list");
  }, [router]);
  return null; // tidak render apa-apa
}
