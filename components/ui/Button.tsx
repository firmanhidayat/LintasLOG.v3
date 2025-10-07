"use client";
import React from "react";
import clsx from "clsx";

type Variant = "solid" | "ghost" | "primary" | "outline";
type Size = "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant = "solid",
  size = "md",
  ...rest
}: ButtonProps) {
  const sizeCls = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";

  // mapping varian (primary === solid)
  const variantCls =
    variant === "outline"
      ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      : variant === "ghost"
      ? "bg-primary/10 text-gray-700 hover:bg-primary/20 disabled:opacity-50"
      : // solid / primary
        "bg-primary text-white shadow-sm hover:brightness-110 disabled:opacity-50";

  return (
    <button
      {...rest}
      className={clsx(
        "inline-flex items-center gap-2 rounded-md transition active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        sizeCls,
        variantCls,
        className
      )}
    />
  );
}

export default Button;
