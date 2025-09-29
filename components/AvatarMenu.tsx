"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

function getInitials(name?: string | null) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

function nameFromLogin(login?: string | null) {
  if (!login) return "";
  const [left] = login.split("@");
  return left.replace(/[._-]+/g, " ").trim();
}

export default function AvatarMenu() {
  const { loggedIn } = useAuth();

  const profileName =
    (typeof window !== "undefined" &&
      localStorage.getItem("llog.profile_name")) ||
    (typeof window !== "undefined" &&
      sessionStorage.getItem("llog.profile_name")) ||
    null;

  const profileImage =
    (typeof window !== "undefined" &&
      localStorage.getItem("llog.profile_image")) ||
    (typeof window !== "undefined" &&
      sessionStorage.getItem("llog.profile_image")) ||
    null;

  const loginId =
    (typeof window !== "undefined" && localStorage.getItem("llog.login")) ||
    (typeof window !== "undefined" && sessionStorage.getItem("llog.login")) ||
    null;

  const displayName = useMemo(() => {
    if (profileName && profileName.trim()) return profileName;
    if (loginId) return nameFromLogin(loginId);
    return "";
  }, [profileName, loginId]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  if (!loggedIn) {
    return (
      <div
        aria-label="User avatar (guest)"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700"
      >
        <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
      </div>
    );
  }

  // Jika ada foto profil
  if (profileImage) {
    return (
      <Image
        src={profileImage}
        alt={displayName || "User avatar"}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover"
        // NOTE: jika pakai output: "export", pastikan next.config.ts:
        // images: { unoptimized: true } atau tambahkan domain ke images.domains
        unoptimized
      />
    );
  }

  // Jika ada inisial
  if (initials) {
    return (
      <div
        aria-label={`User avatar: ${displayName}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary"
      >
        {initials}
      </div>
    );
  }

  // Fallback default
  return (
    <div
      aria-label="User avatar"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700"
    >
      <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
    </div>
  );
}

// "use client";

// import Image from "next/image";
// import { useSession } from "next-auth/react";
// import { User } from "lucide-react";

// function getInitials(name?: string | null) {
//   if (!name) return "";
//   return name
//     .split(" ")
//     .filter(Boolean)
//     .map((n) => n[0]!.toUpperCase())
//     .join("")
//     .slice(0, 2);
// }

// export default function AvatarMenu() {
//   const { data: session, status } = useSession();
//   const avatarUrl = session?.user?.image;
//   const initials = getInitials(session?.user?.name);

//   // Skeleton saat loading session
//   if (status === "loading") {
//     return (
//       <div
//         aria-label="Loading profile menu"
//         className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
//       />
//     );
//   }

//   if (avatarUrl) {
//     return (
//       <Image
//         src={avatarUrl}
//         alt={session?.user?.name || "User avatar"}
//         width={32}
//         height={32}
//         className="h-8 w-8 rounded-full object-cover"
//       />
//     );
//   }

//   if (initials) {
//     return (
//       <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
//         {initials}
//       </div>
//     );
//   }

//   return (
//     <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700">
//       <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
//     </div>
//   );
// }
