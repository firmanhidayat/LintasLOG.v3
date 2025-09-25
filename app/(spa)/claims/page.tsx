"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClaimsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/claims/list");
  }, [router]);
  return null; // tidak render apa-apa
}
