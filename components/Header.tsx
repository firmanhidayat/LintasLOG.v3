"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  Megaphone,
  Search as SearchIcon,
  X,
} from "lucide-react";
import AvatarMenu from "@/components/AvatarMenu";
import { LogoutButton } from "@/components/buttons/LogoutButton";
import { UserCog, KeyRound, Activity } from "lucide-react";

const ICON_BTN_BASE =
  "inline-flex items-center justify-center rounded-full p-0 " +
  "hover:bg-gray-100 dark:hover:bg-gray-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

// Samakan ukuran tombol dengan Avatar (32px)
const ICON_BTN = `${ICON_BTN_BASE} h-8 w-8`;

export default function Header({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Tutup overlay search jika viewport berubah ke md (mis. rotate/resize)
  useEffect(() => {
    const handler = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white text-black">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
          {/* KIRI: Hamburger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`${ICON_BTN} md:hidden`}
              aria-label="Toggle sidebar"
              aria-pressed={sidebarOpen}
              onClick={() => {
                setSidebarOpen((v) => !v);
                onToggleSidebar?.();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* TENGAH: Search field (desktop) */}
          <div className="flex flex-1 justify-center">
            <form
              role="search"
              className="relative hidden w-full max-w-md md:block"
            >
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="search"
                placeholder="Search…"
                className="h-9 w-full rounded-full border border-gray-300 bg-white pl-9 pr-3 text-sm text-black outline-none focus:ring-2 focus:ring-primary/40"
              />
            </form>
          </div>

          {/* KANAN: Icon Buttons + Avatar dropdown */}
          <div className="ml-auto flex items-center gap-1">
            {/* Search (mobile trigger) */}
            <button
              type="button"
              className={`md:hidden ${ICON_BTN}`}
              aria-label="Open search"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon className="h-4 w-4" />
            </button>

            {/* Notifikasi */}
            <button
              type="button"
              className={ICON_BTN}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>

            {/* Messages */}
            <button type="button" className={ICON_BTN} aria-label="Messages">
              <MessageSquare className="h-4 w-4" />
            </button>

            {/* Push Notification */}
            <button
              type="button"
              className={ICON_BTN}
              aria-label="Push notifications"
            >
              <Megaphone className="h-4 w-4" />
            </button>

            {/* Avatar + Dropdown */}
            <details className="relative group">
              <summary
                className={`${ICON_BTN_BASE} h-8 w-8 list-none cursor-pointer`}
                aria-haspopup="menu"
              >
                <AvatarMenu />
              </summary>

              <ul
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1 text-black shadow-lg"
              >
                <li role="none">
                  <Link
                    href="/maccount/edit/"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
                  >
                    <UserCog className="h-4 w-4" />
                    <span>Manage Account</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/maccount/changepwd/"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>Change Password</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/maccount/activitylog/"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity Log</span>
                  </Link>
                </li>

                <li role="none">
                  <div className="my-1 border-t border-gray-200/70" />
                </li>

                <li role="none">
                  {/* <Link
                    href="/maccount/logout/"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Link> */}

                  <LogoutButton
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-gray-100"
                  ></LogoutButton>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </header>

      {/* ===== Mobile Search Overlay ===== */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          searchOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!searchOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            searchOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSearchOpen(false)}
        />

        {/* Panel atas */}
        <div
          className={`absolute left-0 right-0 top-0 border-b border-gray-200 bg-white p-3 shadow-sm transition-transform duration-150
            ${searchOpen ? "translate-y-0" : "-translate-y-full"}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={ICON_BTN}
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <form role="search" className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                autoFocus
                type="search"
                placeholder="Search…"
                className="h-10 w-full rounded-full border border-gray-300 bg-white pl-9 pr-3 text-sm text-black outline-none focus:ring-2 focus:ring-primary/40"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                }}
              />
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
