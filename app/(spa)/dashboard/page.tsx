"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const login =
      localStorage.getItem("llog.login") ||
      sessionStorage.getItem("llog.login");
    const verified =
      localStorage.getItem("llog.mail_verified") ||
      sessionStorage.getItem("llog.mail_verified");
    if (!login || verified !== "true") {
      router.replace("/maccount/signin");
    } else {
      setOk(true);
    }
  }, [router]);

  if (!ok) return <div className="p-6">Loading…</div>;

  return (
    <section>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome{" "}
        {localStorage.getItem("llog.login") ||
          sessionStorage.getItem("llog.login")}
      </p>
    </section>
  );
}
