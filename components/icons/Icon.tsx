"use client";
import * as React from "react";

type IconName = "pencil" | "trash";

type IconProps = Omit<React.SVGProps<SVGSVGElement>, "children"> & {
  name: IconName;
  strokeWidth?: number;
};

const PATHS: Record<IconName, React.ReactNode> = {
  pencil: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 3.487a2.1 2.1 0 0 1 2.97 2.97L7.5 18.79l-4 1 1-4 12.362-12.303z"
    />
  ),
  trash: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a 2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m4 4v8m6-8v8"
    />
  ),
};

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, className, strokeWidth = 2, ...props },
  ref
) {
  const path = PATHS[name];

  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden={props["aria-label"] ? undefined : true}
      focusable={false}
      className={className}
      {...props}
    >
      {/* apply strokeWidth via <g> supaya path reuse tetap rapih */}
      <g strokeWidth={strokeWidth}>{path}</g>
    </svg>
  );
});
