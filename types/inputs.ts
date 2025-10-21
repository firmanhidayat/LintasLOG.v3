/** ===== Types ===== */
export type FieldSize = "sm" | "md" | "lg";
export type FieldLayout = "stack" | "inline" | "floating";
export type LabelPosition = "top" | "left" | "sr-only";

/** ===== Helpers ===== */
export const sizeClasses: Record<FieldSize, string> = {
  sm: "text-sm px-2 py-1",
  md: "text-base px-3 py-2",
  lg: "text-base px-4 py-3",
};
