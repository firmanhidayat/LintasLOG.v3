"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

type SectionShellProps = {
  /** Konten halaman (wajib) */
  children: React.ReactNode;
  /** Max width konten (default: max-w-screen-2xl) */
  contentMaxWidthClassName?: string;
  /** Padding konten (default: p-4) */
  contentPaddingClassName?: string;
  /** Tampilkan sidebar? (default: true) */
  showSidebar?: boolean;
  /** Tampilkan header? (default: true) */
  showHeader?: boolean;
  /** Sidebar mobile default open? (default: false) */
  defaultSidebarOpen?: boolean;
};

export default function SectionShell({
  children,
  contentMaxWidthClassName = "max-w-screen-2xl",
  contentPaddingClassName = "p-4",
  showSidebar = true,
  showHeader = true,
  defaultSidebarOpen = false,
}: SectionShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const pathname = usePathname();

  // Tutup drawer saat route berubah (UX mobile lebih enak)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
