"use client";

import { useEffect, useState } from "react";
import { loadDictionaries, getLang, onLangChange, type Lang } from "@/lib/i18n";

export function useI18nReady() {
  const [i18nReady, setReady] = useState(false);
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
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { i18nReady, activeLang, ready: i18nReady, lang: activeLang };
}
