"use client";
import React from "react";
import clsx from "clsx";

export function Alert({
  kind = "error",
  children,
  className,
}: React.PropsWithChildren<{
  kind?: "error" | "success" | "info";
  className?: string;
}>) {
  const cn =
    kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : kind === "info"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-red-200 bg-red-50 text-red-700";
  return (
    <div className={clsx("rounded-md border px-3 py-2 text-sm", cn, className)}>
      {children}
    </div>
  );
}
