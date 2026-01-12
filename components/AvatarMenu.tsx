"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getInitials, nameFromLogin } from "@/lib/identity";
import { resolveOdooImageSrc } from "@/lib/image";

export default function AvatarMenu() {
  const { profile, loggedIn } = useAuth();
  const profileName = profile?.name;
  const profileImageRaw = profile?.image_128;
  const profileImageSrc = useMemo(
    () => resolveOdooImageSrc(profileImageRaw),
    [profileImageRaw]
  );
  const loginId = profile?.email;

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
  if (profileImageSrc) {
    return (
      <Image
        src={profileImageSrc}
        alt={displayName || "User avatar"}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover"
        unoptimized
      />
    );
  }

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

  return (
    <div
      aria-label="User avatar"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700"
    >
      <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
    </div>
  );
}
