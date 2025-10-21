// utils/field-classes.ts
import { FieldLayout, FieldSize, sizeClasses } from "@/types/inputs";
import clsx, { type ClassValue } from "clsx";
// (opsional) kalau pakai tailwind-merge:
// import { twMerge } from "tailwind-merge";

export type FieldStyleOptions = {
  disabled?: boolean;
  readOnly?: boolean;
  isInvalid?: boolean;
  hasPrefix?: boolean;
  hasSuffix?: boolean;
  size?: FieldSize;
  layout?: FieldLayout;
};

/** Base token (mudah di-override bila perlu) */
export const FIELD_BASE =
  "rounded-md border-1 outline-none border-gray-600 " +
  "focus:ring-1 focus:ring-primary focus:bg-primary/5 " +
  "transition font-sans";

/** Builder murni: aman dipakai di mana saja (termasuk di luar context) */
export function fieldClasses(
  opts: FieldStyleOptions = {},
  ...extra: ClassValue[]
): string {
  const {
    disabled,
    readOnly,
    isInvalid,
    hasPrefix,
    hasSuffix,
    size = "md",
    layout,
  } = opts;

  const invalid = isInvalid
    ? "border-red-500 border-1 border-dotted focus:ring-red-500"
    : "";

  const state = disabled
    ? "bg-gray-100 text-gray-500 cursor-not-allowed !border-gray-300 !text-gray-800"
    : readOnly
    ? "bg-gray-50 text-gray-700"
    : "bg-white text-gray-900";

  const cutLeft = hasPrefix ? "rounded-l-none border-l-0" : "";
  const cutRight = hasSuffix ? "rounded-r-none border-r-0" : "";
  const peer = layout === "floating" ? "peer" : "";

  const built = clsx(
    FIELD_BASE,
    sizeClasses[size],
    invalid,
    state,
    cutLeft,
    cutRight,
    peer,
    extra
  );

  // Jika pakai tailwind-merge: return twMerge(built);
  return built;
}
