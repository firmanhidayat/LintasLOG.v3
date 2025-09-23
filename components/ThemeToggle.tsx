"use client";
import { cn } from "@/lib/cn";

export default function ThemeToggle() {
  return (
    <button className={cn("btn-ghost rounded-xl")} aria-label="Toggle theme">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 3a9 9 0 0 0 9 9 9 9 0 1 1-9-9z" />
      </svg>
    </button>
  );
}
