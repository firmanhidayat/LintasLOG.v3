"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { User } from "lucide-react";

function getInitials(name?: string | null) {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

export default function AvatarMenu() {
  const { data: session, status } = useSession();
  const avatarUrl = session?.user?.image;
  const initials = getInitials(session?.user?.name);

  // Skeleton saat loading session
  if (status === "loading") {
    return (
      <div
        aria-label="Loading profile menu"
        className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
      />
    );
  }

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={session?.user?.name || "User avatar"}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  if (initials) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
        {initials}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700">
      <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
    </div>
  );
}
