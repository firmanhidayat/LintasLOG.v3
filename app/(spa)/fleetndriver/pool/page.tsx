"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddressesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/order/addresses/list");
  }, [router]);
  return null; // tidak render apa-apa
}
