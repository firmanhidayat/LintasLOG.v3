"use client";

import { useEffect, useState } from "react";
import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";

export default function RingkasanOrderPage() {
  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());

  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDictionaries();
        if (!cancelled) setI18nReady(true);
      } catch (err) {
        console.error("[i18n] loadDictionaries failed:", err);
        if (!cancelled) setI18nReady(true);  
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!i18nReady) {
    return <section className="p-4 text-sm text-gray-500">Memuat…</section>;
  }

  const title = t("ringkasanorder.title");
  const subtitle = t("ringkasanorder.subtitle");
  const statsToday = t("ringkasanorder.statsToday");
  const orders = t("ringkasanorder.orders");

  return (
    <section className="p-4 text-black">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>

      <div className="mt-4 rounded-xl border p-4">
        <h2 className="text-base font-medium">{statsToday}</h2>
        <div className="mt-2 text-sm text-gray-700">0 {orders}</div>
      </div>
    </section>
  );
}
