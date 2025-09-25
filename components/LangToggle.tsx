"use client";
import { useEffect, useState } from "react";
import {
  getLang,
  setLang,
  loadDictionaries,
  LANG_KEY,
  type Lang,
} from "@/lib/i18n";

export default function LangToggle() {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    loadDictionaries().then(() => {
      const cur = getLang();
      setLangState(cur);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <div className="inline-flex rounded-md border px-1 py-1 text-sm">
      <button
        type="button"
        onClick={() => {
          setLang("id");
          setLangState("id");
        }}
        className={`px-2 py-1 rounded ${lang === "id" ? "bg-gray-200" : ""}`}
        aria-pressed={lang === "id"}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => {
          setLang("en");
          setLangState("en");
        }}
        className={`px-2 py-1 rounded ${lang === "en" ? "bg-gray-200" : ""}`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}
