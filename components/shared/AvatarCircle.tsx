"use client";

import Image from "next/image";
import React from "react";

export function AvatarCircle({
  src,
  alt,
  fallback,
  size = 112, // px
}: {
  src?: string | null;
  alt: string;
  fallback: string; // initials
  size?: number;
}) {
  const className = "rounded-full object-cover";
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        className={className + ` h-28 w-28`}
        width={size}
        height={size}
        unoptimized={false}
      />
    );
  }
  return (
    <div
      className="flex h-28 w-28 items-center justify-center rounded-full border bg-slate-50 text-2xl font-bold text-slate-600"
      aria-label="User initials"
    >
      {fallback || "?"}
    </div>
  );
}
