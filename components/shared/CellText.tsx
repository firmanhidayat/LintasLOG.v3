import React from "react";
import { smartTruncate } from "@/utils/smartTruncate";

export function CellText({
  value,
  max = 80,
  className = "",
  preserveWords = true,
}: {
  value: string | number;
  max?: number;
  className?: string; // kamu bisa isi w-[..] / max-w-[..] disini
  preserveWords?: boolean;
}) {
  const raw = String(value ?? "");
  const { text, truncated } = smartTruncate(raw, max, { preserveWords });

  return (
    <span
      className={`block truncate ${className}`}
      title={truncated ? raw : undefined}
      aria-label={truncated ? raw : undefined}
    >
      {text}
    </span>
  );
}
