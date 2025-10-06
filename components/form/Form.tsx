"use client";
import React from "react";
import clsx from "clsx";

export function Form({
  onSubmit,
  children,
  className,
  ...rest
}: React.PropsWithChildren<{
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}> &
  React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      onSubmit={onSubmit}
      className={clsx("space-y-4", className)}
      {...rest}
    >
      {children}
    </form>
  );
}

export function FormRow({
  children,
  cols = 2,
  className,
}: React.PropsWithChildren<{ cols?: 1 | 2 | 3; className?: string }>) {
  const grid =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 md:grid-cols-3";
  return <div className={clsx("grid gap-4", grid, className)}>{children}</div>;
}

export function FormActions({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("flex items-center gap-3 pt-2", className)}>
      {children}
    </div>
  );
}

// "use client";

// import React from "react";
// import clsx from "clsx";

// export function Form({
//   onSubmit,
//   children,
//   className,
// }: React.PropsWithChildren<{
//   onSubmit: (e: React.FormEvent) => void;
//   className?: string;
// }>) {
//   return (
//     <form onSubmit={onSubmit} className={clsx("space-y-6", className)}>
//       {children}
//     </form>
//   );
// }

// export function FormRow({
//   children,
//   cols = 3,
//   className,
// }: React.PropsWithChildren<{ cols?: 1 | 2 | 3; className?: string }>) {
//   const grid =
//     cols === 1
//       ? "grid-cols-1"
//       : cols === 2
//       ? "md:grid-cols-2 grid-cols-1"
//       : "md:grid-cols-3 grid-cols-1";
//   return <div className={clsx("grid gap-4", grid, className)}>{children}</div>;
// }

// export function FormActions({
//   children,
//   className,
// }: React.PropsWithChildren<{ className?: string }>) {
//   return (
//     <div className={clsx("flex items-center gap-3", className)}>{children}</div>
//   );
// }
