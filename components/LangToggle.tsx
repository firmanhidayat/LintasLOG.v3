"use client";
import { useEffect, useState } from "react";
import { getLang, setLang, type Lang } from "@/lib/i18n";

export default function LangToggle() {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    setLangState(getLang());
    setReady(true);
  }, []);

  if (!ready) return null;

  function choose(next: Lang) {
    if (next === lang) return;
    setLang(next); 
    setLangState(next); 
  }

  return (
    <div className="inline-flex rounded-md border px-1 py-1 text-sm">
      <button
        type="button"
        onClick={() => choose("id")}
        className={`px-2 py-1 rounded ${lang === "id" ? "bg-gray-200" : ""}`}
        aria-pressed={lang === "id"}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => choose("en")}
        className={`px-2 py-1 rounded ${lang === "en" ? "bg-gray-200" : ""}`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}
