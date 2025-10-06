"use client";

import React, { JSX } from "react";
import clsx from "clsx";

type CardProps = React.PropsWithChildren<{
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  bordered?: boolean;
  shadow?: boolean;
}>;

export function Card({
  as: Tag = "div",
  className,
  bordered = true,
  shadow = true,
  children,
}: CardProps) {
  return (
    <Tag
      className={clsx(
        "rounded-2xl bg-white",
        bordered && "border border-gray-200",
        shadow && "shadow-sm",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardBody({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("p-4", className)}>{children}</div>;
}

export function CardHeader({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("p-4 border-b border-gray-100", className)}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("p-4 border-t border-gray-100", className)}>
      {children}
    </div>
  );
}
