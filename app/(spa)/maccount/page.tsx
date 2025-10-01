"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ManagementAccountPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/maccount/edit");
  }, [router]);
  return null;
}
