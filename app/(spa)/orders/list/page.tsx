"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";

export default function OrdersListPage() {
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
        setI18nReady(false);
        await loadDictionaries();
      } catch (e) {
        console.error("[i18n] loadDictionaries failed:", e);
      } finally {
        if (!cancelled) setI18nReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <Link
        href="/orders/create"
        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {/* {t("orders.create")} */}
        Create Order
      </Link>
      <p className="mt-2 text-gray-600"></p>
    </section>
  );
}
