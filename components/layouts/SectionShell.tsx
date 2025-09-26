// components/SectionShell.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

// i18n gate
import { loadDictionaries } from "@/lib/i18n";

type SectionShellProps = {
  children: React.ReactNode;
  contentMaxWidthClassName?: string;
  contentPaddingClassName?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  defaultSidebarOpen?: boolean;
};

export default function SectionShell({
  children,
  contentMaxWidthClassName = "max-w-screen-2xxl",
  contentPaddingClassName = "p-4",
  showSidebar = true,
  showHeader = true,
  defaultSidebarOpen = false,
}: SectionShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [i18nReady, setI18nReady] = useState(false);
  const pathname = usePathname();

  // Tutup drawer saat route berubah (UX mobile lebih enak)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // === I18n gate: load kamus SEKALI sebelum render Sidebar/Header yang pakai t() ===
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDictionaries(); // aman dipanggil berkali-kali; idempotent
        if (!cancelled) setI18nReady(true);
      } catch (err) {
        console.error("[i18n] loadDictionaries failed:", err);
        if (!cancelled) setI18nReady(true); // fallback: tetap render agar app tidak blank
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Skeleton ringan saat i18n belum siap (hindari memanggil t())
  if (!i18nReady) {
    return (
      <div className="flex min-h-dvh">
        {showSidebar && (
          <div className="hidden md:flex w-64 shrink-0 h-dvh sticky top-0 border-r border-gray-200/70 bg-brand-900" />
        )}
        <div className="flex flex-1 flex-col">
          {showHeader && (
            <div className="h-14 border-b border-gray-200 bg-white" />
          )}
          <main
            id="main-content"
            className={`mx-auto w-full ${contentMaxWidthClassName} ${contentPaddingClassName}`}
          >
            {/* shimmer / placeholder */}
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-48 w-full animate-pulse rounded bg-gray-100" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar: desktop (sticky) + mobile (drawer) */}
      {showSidebar && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Konten kanan */}
      <div className="flex flex-1 flex-col">
        {/* Accessibility: skip link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black focus:shadow"
        >
          Skip to content
        </a>

        {showHeader && (
          <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        )}

        <main
          id="main-content"
          className={`mx-auto w-full ${contentMaxWidthClassName} ${contentPaddingClassName} space-y-6`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
