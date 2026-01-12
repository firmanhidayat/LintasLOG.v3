"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, RefreshCw, X, ExternalLink } from "lucide-react";
import AvatarMenu from "@/components/AvatarMenu";
import { LogoutButton } from "@/components/buttons/LogoutButton";
import { UserCog, KeyRound } from "lucide-react";
import LangToggle from "@/components/LangToggle";
import { t, getLang, onLangChange, type Lang } from "@/lib/i18n";

const ICON_BTN_BASE =
  "inline-flex items-center justify-center rounded-full p-0 " +
  "hover:bg-gray-100 dark:hover:bg-gray-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const ICON_BTN = `${ICON_BTN_BASE} h-8 w-8`;

// ====== Notification Types ======
type NotifUser = { id: number; name: string };

type NotificationItem = {
  id: number;
  user_id: number;
  name: string;
  summary?: string;
  note?: string;
  res_model_id?: number;
  res_model?: string;
  res_id?: number;
  target_uri?: string;
  done: boolean;
  create_date?: string; // "2025-09-30 23:50:56"
  date_deadline?: string; // "2025-09-29"
  user?: NotifUser;
};

// function safeArray<T>(v: any): T[] {
//   return Array.isArray(v) ? (v as T[]) : [];
// }

// ===== helpers (NO any) =====
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (isRecord(e) && typeof e.message === "string") return e.message;
  return "Unknown error";
}

function parseNotifList(payload: unknown): NotificationItem[] {
  if (Array.isArray(payload)) return payload as NotificationItem[];
  if (isRecord(payload)) {
    if (Array.isArray(payload.data)) return payload.data as NotificationItem[];
    if (Array.isArray(payload.results)) return payload.results as NotificationItem[];
    if (Array.isArray(payload.items)) return payload.items as NotificationItem[];
    const result = payload.result;
    if (isRecord(result)) {
      if (Array.isArray(result.items)) return result.items as NotificationItem[];
      if (Array.isArray(result.data)) return result.data as NotificationItem[];
    }
  }
  return [];
}


function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseServerDateTime(s?: string) {
  if (!s || typeof s !== "string") return null;
  const isoLike = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? null : d;
}

function parseServerDateOnly(s?: string) {
  if (!s || typeof s !== "string") return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDMYHM(d: Date | null) {
  if (!d) return "-";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

function fmtDMY(d: Date | null) {
  if (!d) return "-";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE ??
    process.env.NEXT_PUBLIC_API_BASE ??
    "").replace(/\/$/, "");

const NOTIF_LIST_URL = `${API_BASE}/notifications`;
const NOTIF_DONE_URL = (id: number) => `${API_BASE}/notifications/${id}/done`;

export default function Header({
  onToggleSidebar,
  sidebarOpen,
}: {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(() => getLang());

  const notifWrapRef = useRef<HTMLDivElement | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifErr, setNotifErr] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const unreadCount = useMemo(
    () => notifs.filter((n) => n?.done === false).length,
    [notifs]
  );

  const loadNotifications = useCallback(async () => {
    setNotifErr(null);
    setNotifLoading(true);
    try {
      // console.log("Fetching notifications from", NOTIF_LIST_URL);
      const res = await fetch(NOTIF_LIST_URL, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Fetch notifications failed (${res.status})`);
      }
      const data = await res.json();
      // console.log("Raw notification data:", data);

      const list = parseNotifList(data);
      list.sort((a, b) => {
        const da = parseServerDateTime(a.create_date)?.getTime() ?? 0;
        const db = parseServerDateTime(b.create_date)?.getTime() ?? 0;
        return db - da;
      });
      // console.log("Loaded notifications:", list);

      setNotifs(list);
    } catch (e: unknown) {
      setNotifErr(getErrorMessage(e) ?? "Failed to load notifications");
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const markDone = useCallback(
    async (id: number) => {
      if (!id) return;

      // optimistic update
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, done: true } : n)));
      setSelected((prev) => (prev?.id === id ? { ...prev, done: true } : prev));
      setMarkingId(id);

      try {
        const res = await fetch(NOTIF_DONE_URL(id), {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error(`Mark done failed (${res.status})`);
        }
      } catch (e: unknown) {
  setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, done: false } : n)));
  setSelected((prev) => (prev?.id === id ? { ...prev, done: false } : prev));
  setNotifErr(getErrorMessage(e) ?? "Failed to mark done");
      } finally {
        setMarkingId(null);
      }
    },
    []
  );
  const handleOnClickNotification = useCallback(async () => {
    setNotifOpen((v) => {
      const next = !v;
      return next;
    });
  }, []);

  useEffect(() => {
    if (notifOpen) loadNotifications();
  }, [notifOpen, loadNotifications]);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = notifWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setDetailOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const openDetail = useCallback(
    (n: NotificationItem) => {
      setSelected(n);
      setDetailOpen(true);
      setNotifOpen(false);

      if (n?.done === false && typeof n?.id === "number") {
        markDone(n.id);
      }
    },
    [markDone]
  );

  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);

  useEffect(() => {
    const handler = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [searchOpen]);

  return (
    <>
      <header className="sticky top-0 z-60 w-full border-b border-gray-200 bg-white text-black">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`${ICON_BTN} md:hidden`}
              aria-label="Toggle sidebar"
              aria-controls="main-sidebar"
              aria-pressed={!!sidebarOpen}
              aria-expanded={!!sidebarOpen}
              onClick={() => onToggleSidebar?.()}
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

          <div className="ml-auto flex items-center gap-1">
            <div className="mr-1">
              <LangToggle />
            </div>

            {/* Notifications */}
            <div ref={notifWrapRef} className="relative">
              <button
                type="button"
                className={ICON_BTN}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={handleOnClickNotification}
              >
                <span className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
              </button>

              {notifOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-xl border border-gray-200 bg-white text-black shadow-lg z-50"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-gray-100"
                      onClick={loadNotifications}
                      disabled={notifLoading}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </button>
                  </div>

                  {notifErr && (
                    <div className="px-3 py-2 text-xs font-semibold text-red-600">
                      {notifErr}
                    </div>
                  )}

                  <div className="max-h-[420px] overflow-auto">
                    {notifLoading && notifs.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-600">Loading...</div>
                    ) : notifs.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-600">
                        No notifications.
                      </div>
                    ) : (
                      <ul className="py-1">
                        {notifs.map((n) => {
                          const created = fmtDMYHM(parseServerDateTime(n.create_date));
                          const isUnread = n.done === false;

                          return (
                            <li key={n.id} className="px-1">
                              <button
                                type="button"
                                onClick={() => openDetail(n)}
                                className={
                                  "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-100 " +
                                  (isUnread ? "bg-red-50/40" : "")
                                }
                              >
                                <div className="mt-0.5">
                                  {n.done ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-extrabold">
                                        {n.name || "Notification"}
                                      </div>
                                      {n.summary ? (
                                        <div className="truncate text-xs text-gray-700">
                                          {n.summary}
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="shrink-0 text-[11px] font-semibold text-gray-600">
                                      {created}
                                    </div>
                                  </div>

                                  <div className="mt-1 flex items-center gap-2">
                                    {isUnread ? (
                                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-red-700">
                                        NEW
                                      </span>
                                    ) : (
                                      <span className="rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-extrabold text-green-700">
                                        DONE
                                      </span>
                                    )}
                                    {n.date_deadline ? (
                                      <span className="text-[11px] font-semibold text-gray-600">
                                        Deadline: {fmtDMY(parseServerDateOnly(n.date_deadline))}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar menu (existing) */}
            <details className="relative group">
              <summary
                className={`${ICON_BTN_BASE} h-8 w-8 list-none cursor-pointer`}
                aria-haspopup="menu"
              >
                <AvatarMenu />
              </summary>

              <ul
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1 text-black shadow-lg z-50"
              >
                <li role="none">
                  <Link
                    href="/maccount/edit/"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
                  >
                    <UserCog className="h-4 w-4" />
                    <span>{t("avatarnav.mgtacc")}</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/maccount/changepwd/"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>{t("avatarnav.mgtchg")}</span>
                  </Link>
                </li>

                <li role="none">
                  <div className="my-1 border-t border-gray-200/70" />
                </li>

                <li role="none">
                  <LogoutButton
                    caption={t("avatarnav.mgtlou")}
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-gray-100"
                  />
                </li>
              </ul>
            </details>
          </div>
        </div>
      </header>

      {/* ====== Detail Modal ====== */}
      {detailOpen && selected && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailOpen(false)}
          />
          <div className="relative w-[560px] max-w-[92vw] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-extrabold">{selected.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {selected.done ? (
                    <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-extrabold text-green-700">
                      DONE
                    </span>
                  ) : (
                    <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-extrabold text-red-700">
                      NEW
                    </span>
                  )}
                  <span className="text-xs font-semibold text-gray-600">
                    Created: {fmtDMYHM(parseServerDateTime(selected.create_date))}
                  </span>
                  {selected.date_deadline ? (
                    <span className="text-xs font-semibold text-gray-600">
                      Deadline: {fmtDMY(parseServerDateOnly(selected.date_deadline))}
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                className="rounded-lg p-2 hover:bg-gray-100"
                aria-label="Close"
                onClick={() => setDetailOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selected.summary ? (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-extrabold text-gray-700">Summary</div>
                <div className="mt-1 text-sm text-gray-800">{selected.summary}</div>
              </div>
            ) : null}

            {selected.note ? (
              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs font-extrabold text-gray-700">Note</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {selected.note}
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-xs font-extrabold text-gray-700">User</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {selected.user?.name ?? "-"}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-xs font-extrabold text-gray-700">Resource</div>
                <div className="mt-1 text-gray-900">
                  <span className="font-semibold">{selected.res_model ?? "-"}</span>
                  {typeof selected.res_id === "number" ? (
                    <span className="ml-2 text-gray-700">#{selected.res_id}</span>
                  ) : null}
                </div>

                {selected.target_uri ? (
                  <a
                    href={selected.target_uri}
                    // target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-extrabold hover:bg-gray-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open target
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              {!selected.done && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-60"
                  onClick={() => markDone(selected.id)}
                  disabled={markingId === selected.id}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {markingId === selected.id ? "Marking..." : "Mark Done"}
                </button>
              )}
              <button
                type="button"
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-extrabold hover:bg-gray-50"
                onClick={() => setDetailOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { Bell } from "lucide-react";
// import AvatarMenu from "@/components/AvatarMenu";
// import { LogoutButton } from "@/components/buttons/LogoutButton";
// import { UserCog, KeyRound, Activity } from "lucide-react";
// import LangToggle from "@/components/LangToggle";
// import { t, getLang, onLangChange, type Lang } from "@/lib/i18n";

// const ICON_BTN_BASE =
//   "inline-flex items-center justify-center rounded-full p-0 " +
//   "hover:bg-gray-100 dark:hover:bg-gray-200 " +
//   "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

// const ICON_BTN = `${ICON_BTN_BASE} h-8 w-8`;


// function handleOnClickNotification() {
//   //
// }

// export default function Header({
//   onToggleSidebar,
//   sidebarOpen,
// }: {
//   onToggleSidebar?: () => void;
//   sidebarOpen?: boolean; // NEW
// }) {
//   //const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [searchOpen, setSearchOpen] = useState(false);
//   const [activeLang, setActiveLang] = useState<Lang>(() => getLang());
//   useEffect(() => {
//     const off = onLangChange((lang) => setActiveLang(lang));
//     return () => off?.();
//   }, []);

//   useEffect(() => {
//     const handler = () => {
//       if (window.matchMedia("(min-width: 768px)").matches) {
//         setSearchOpen(false);
//       }
//     };
//     window.addEventListener("resize", handler);
//     return () => window.removeEventListener("resize", handler);
//   }, [searchOpen]);

//   return (
//     <>
//       <header className="sticky top-0 z-60 w-full border-b border-gray-200 bg-white text-black">
//         <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
//           <div className="flex items-center gap-2">
//             <button
//               type="button"
//               className={`${ICON_BTN} md:hidden`}
//               // className={`${ICON_BTN} hidden md:inline-flex`}
//               aria-label="Toggle sidebar"
//               aria-controls="main-sidebar" // NEW
//               aria-pressed={!!sidebarOpen} // NEW
//               aria-expanded={!!sidebarOpen} // NEW
//               onClick={() => onToggleSidebar?.()}
//               // onClick={() => {
//               //   setSidebarOpen((v) => !v);
//               //   onToggleSidebar?.();
//               // }}
//             >
//               <svg
//                 viewBox="0 0 24 24"
//                 className="h-5 w-5"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeWidth="2"
//               >
//                 <path d="M4 6h16M4 12h16M4 18h16" />
//               </svg>
//             </button>
//           </div>

//           {/* <div className="flex flex-1 justify-center">
//             <form
//               role="search"
//               className="relative hidden w-full max-w-md md:block"
//             >
//               <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
//               <input
//                 type="search"
//                 placeholder={t("header.search.placeholder")}
//                 className="h-9 w-full rounded-full border border-gray-300 bg-white pl-9 pr-3 text-sm text-black outline-none focus:ring-2 focus:ring-primary/40"
//               />
//             </form>
//           </div> */}

//           <div className="ml-auto flex items-center gap-1">
//             <div className="mr-1">
//               <LangToggle />
//             </div>

//             {/* <button
//               type="button"
//               className={`md:hidden ${ICON_BTN}`}
//               aria-label="Open search"
//               aria-expanded={searchOpen}
//               onClick={() => setSearchOpen(true)}
//             >
//               <SearchIcon className="h-4 w-4" />
//             </button> */}

//             <button
//               type="button"
//               className={ICON_BTN}
//               aria-label="Notifications"
//               onClick={handleOnClickNotification}
//             >
//               <Bell className="h-4 w-4" />
//             </button>

//             <details className="relative group">
//               <summary
//                 className={`${ICON_BTN_BASE} h-8 w-8 list-none cursor-pointer`}
//                 aria-haspopup="menu"
//               >
//                 <AvatarMenu />
//               </summary>

//               <ul
//                 role="menu"
//                 className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1 text-black shadow-lg z-50"
//               >
//                 <li role="none">
//                   <Link
//                     href="/maccount/edit/"
//                     role="menuitem"
//                     className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
//                   >
//                     <UserCog className="h-4 w-4" />
//                     <span>{t("avatarnav.mgtacc")}</span>
//                   </Link>
//                 </li>
//                 <li role="none">
//                   <Link
//                     href="/maccount/changepwd/"
//                     role="menuitem"
//                     className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
//                   >
//                     <KeyRound className="h-4 w-4" />
//                     <span>{t("avatarnav.mgtchg")}</span>
//                   </Link>
//                 </li>
//                 {/* <li role="none">
//                   <Link
//                     href="/maccount/activitylog/"
//                     role="menuitem"
//                     className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
//                   >
//                     <Activity className="h-4 w-4" />
//                     <span>{t("avatarnav.mgtacl")}</span>
//                   </Link>
//                 </li> */}

//                 <li role="none">
//                   <div className="my-1 border-t border-gray-200/70" />
//                 </li>

//                 <li role="none">
//                   <LogoutButton
//                     caption={t("avatarnav.mgtlou")}
//                     role="menuitem"
//                     className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-gray-100"
//                   />
//                 </li>
//               </ul>
//             </details>
//           </div>
//         </div>
//       </header>

//       {/* <div
//         className={`fixed inset-0 z-50 md:hidden ${
//           searchOpen ? "pointer-events-auto" : "pointer-events-none"
//         }`}
//         aria-hidden={!searchOpen}
//       >
//         <div
//           className={`absolute inset-0 bg-black/40 transition-opacity ${
//             searchOpen ? "opacity-100" : "opacity-0"
//           }`}
//           onClick={() => setSearchOpen(false)}
//         />

//         <div
//           className={`absolute left-0 right-0 top-0 border-b border-gray-200 bg-white p-3 shadow-sm transition-transform duration-150
//             ${searchOpen ? "translate-y-0" : "-translate-y-full"}`}
//           role="dialog"
//           aria-modal="true"
//         >
//           <div className="flex items-center gap-2">
//             <button
//               type="button"
//               className={ICON_BTN}
//               aria-label="Close search"
//               onClick={() => setSearchOpen(false)}
//             >
//               <X className="h-4 w-4" />
//             </button>
//             <form role="search" className="relative flex-1">
//               <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
//               <input
//                 autoFocus
//                 type="search"
//                 placeholder={t("header.search.placeholder")}
//                 className="h-10 w-full rounded-full border border-gray-300 bg-white pl-9 pr-3 text-sm text-black outline-none focus:ring-2 focus:ring-primary/40"
//                 onKeyDown={(e) => {
//                   if (e.key === "Escape") setSearchOpen(false);
//                 }}
//               />
//             </form>
//           </div>
//         </div>
//       </div> */}
//     </>
//   );
// }
