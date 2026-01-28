"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddressesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/fleetndriver/pool/list");
  }, [router]);
  return null; // tidak render apa-apa
}
