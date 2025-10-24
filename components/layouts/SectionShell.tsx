// "use client";

// import { useEffect, useState } from "react";
// import { usePathname } from "next/navigation";
// import Header from "@/components/Header";
// import Sidebar from "@/components/Sidebar";

// import { loadDictionaries } from "@/lib/i18n";

// type SectionShellProps = {
//   children: React.ReactNode;
//   contentMaxWidthClassName?: string;
//   contentPaddingClassName?: string;
//   showSidebar?: boolean;
//   showHeader?: boolean;
//   defaultSidebarOpen?: boolean;
// };

// export default function SectionShell({
//   children,
//   contentMaxWidthClassName = "max-w-screen-2xxl",
//   contentPaddingClassName = "p-4",
//   showSidebar = true,
//   showHeader = true,
//   defaultSidebarOpen = false,
// }: SectionShellProps) {
//   const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
//   const [i18nReady, setI18nReady] = useState(false);
//   const pathname = usePathname();

//   useEffect(() => {
//     setSidebarOpen(false);
//   }, [pathname]);

//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         await loadDictionaries();
//         if (!cancelled) setI18nReady(true);
//       } catch (err) {
//         console.error("[i18n] loadDictionaries failed:", err);
//         if (!cancelled) setI18nReady(true);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   if (!i18nReady) {
//     return (
//       <div className="flex min-h-dvh">
//         {showSidebar && (
//           <div className="hidden md:flex w-64 shrink-0 h-dvh sticky top-0 border-r border-gray-200/70 bg-brand-900" />
//         )}
//         <div className="flex flex-1 flex-col">
//           {showHeader && (
//             <div className="h-14 border-b border-gray-200 bg-white" />
//           )}
//           <main
//             id="main-content"
//             className={`mx-auto w-full ${contentMaxWidthClassName} ${contentPaddingClassName}`}
//           >
//             <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
//             <div className="mt-4 h-48 w-full animate-pulse rounded bg-gray-100" />
//           </main>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex min-h-dvh">
//       {showSidebar && (
//         <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
//       )}

//       <div className="flex flex-1 flex-col">
//         <a
//           href="#main-content"
//           className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black focus:shadow"
//         >
//           Skip to content
//         </a>

//         {showHeader && (
//           <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
//         )}

//         <main
//           id="main-content"
//           className={`mx-auto w-full ${contentMaxWidthClassName} ${contentPaddingClassName} space-y-6`}
//         >
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

import { loadDictionaries } from "@/lib/i18n";

type SectionShellProps = {
  children: React.ReactNode;
  contentMaxWidthClassName?: string;
  contentPaddingClassName?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  defaultSidebarOpen?: boolean;
  /** NEW: tampilkan tombol mengambang untuk show/hide sidebar */
  showSidebarToggleButton?: boolean;
};

export default function SectionShell({
  children,
  contentMaxWidthClassName = "max-w-screen-2xl", // TIP: pastikan ini sesuai setup Tailwind Anda
  contentPaddingClassName = "p-4",
  showSidebar = true,
  showHeader = true,
  defaultSidebarOpen = false,
  showSidebarToggleButton = false, // NEW: default off agar non-breaking
}: SectionShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [i18nReady, setI18nReady] = useState(false);
  const pathname = usePathname();

  // Tutup sidebar saat route berubah (mobile-friendly)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // NEW: sinkronkan saat prop defaultSidebarOpen berubah
  useEffect(() => {
    setSidebarOpen(defaultSidebarOpen);
  }, [defaultSidebarOpen]);

  // i18n preload
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
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-48 w-full animate-pulse rounded bg-gray-100" />
          </main>
        </div>
      </div>
    );
  }

  return (
    // <div className="flex min-h-dvh">
    <div>
      {/* SIDEBAR: fixed, full-height, scroll sendiri */}
      {showSidebar && (
        <aside
          id="main-sidebar"
          className={[
            // posisi & ukuran
            "fixed inset-y-0 left-0 z-40 w-70  bg-white ",
            "h-dvh overflow-y-auto",
            // transisi & responsif (overlay di mobile, selalu terlihat di md+)
            "transition-transform duration-200 ease-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            "md:translate-x-0",
          ].join(" ")}
          aria-controls="main-sidebar"
          aria-expanded={sidebarOpen}
          aria-label="Sidebar"
        >
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </aside>
      )}

      {/* AREA KONTEN: sisihkan ruang selebar sidebar di md+ */}
      <div className="flex flex-1 flex-col md:pl-70 pb-16">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black focus:shadow"
        >
          Skip to content
        </a>

        {showHeader && (
          <Header
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />
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
  // return (
  //   <div className="flex min-h-dvh pb-16">
  //     {/* NEW: bungkus Sidebar dengan container ber-id untuk aria-controls */}
  //     <div id="main-sidebar" className="contents">
  //       {showSidebar && (
  //         <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
  //       )}
  //     </div>

  //     <div className="flex flex-1 flex-col">
  //       <a
  //         href="#main-content"
  //         className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black focus:shadow"
  //       >
  //         Skip to content
  //       </a>

  //       {showHeader && (
  //         <Header
  //           sidebarOpen={sidebarOpen}
  //           onToggleSidebar={() => setSidebarOpen((v) => !v)}
  //         />
  //       )}

  //       <main
  //         id="main-content"
  //         className={`mx-auto w-full ${contentMaxWidthClassName} ${contentPaddingClassName} space-y-6`}
  //       >
  //         {children}
  //       </main>

  //       {/* NEW: Tombol floating Show/Hide Sidebar (opsional & non-breaking) */}
  //       {/* {showSidebar && showSidebarToggleButton && (
  //         <button
  //           type="button"
  //           onClick={() => setSidebarOpen((v) => !v)}
  //           aria-controls="main-sidebar"
  //           aria-expanded={sidebarOpen}
  //           aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
  //           className="
  //             fixed bottom-4 left-4 z-40
  //             inline-flex items-center gap-2 rounded-full border border-gray-300
  //             bg-white/90 backdrop-blur px-4 py-2 shadow-md
  //             hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary
  //           "
  //         >
  //           <span className="text-sm font-medium">
  //             {sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
  //           </span>
  //         </button>
  //       )} */}
  //     </div>
  //   </div>
  // );
}
