"use client";

import Link from "next/link";
import {
  useId,
  useEffect,
  useMemo,
  useState,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from "react";
import { usePathname } from "next/navigation";
import type React from "react";  

type NextLinkProps = ComponentProps<typeof Link>;
type Href = NextLinkProps["href"];

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type BaseProps = {
  label: string;
  icon?: IconType;
  className?: string;
};

function hrefToPath(href: Href): string {
  if (typeof href === "string") return href;
  return href?.pathname ?? "";
}

export type NavLinkProps = BaseProps & { href: Href };

export function NavLink({ href, label, icon: Icon, className }: NavLinkProps) {
  const pathname = usePathname();
  const base = hrefToPath(href);
  const isActive =
    pathname === base || (base && base !== "/" && pathname.startsWith(base));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-white/20 text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white",
        className
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

/* ---------- Group + submenu (bisa controlled) ---------- */
export type NavGroupItem = {
  label: string;
  href: Href;
  icon?: IconType;
};

export type NavGroupProps = BaseProps & {
  href?: Href;
  items: NavGroupItem[];
  defaultOpen?: boolean;

  open?: boolean;
  onToggle?: (next: boolean) => void;

  unmountOnExit?: boolean; // default true
  duration?: number; // default 220
  easing?: string; // default 'ease'
};

export function NavGroup(props: NavGroupProps) {
  const {
    href,
    label,
    icon: Icon,
    items,
    defaultOpen,
    open,
    onToggle,
    className,
    unmountOnExit = true,
    duration = 220,
    easing = "ease",
  } = props;

  const pathname = usePathname();
  const regionId = useId().replace(/:/g, "_");

  const isInGroup = useMemo(() => {
    const bases: string[] = [
      ...(href ? [hrefToPath(href)] : []),
      ...items.map((i) => hrefToPath(i.href)),
    ].filter(Boolean);
    return bases.some(
      (b) => b === pathname || (b && b !== "/" && pathname.startsWith(b))
    );
  }, [pathname, href, items]);

  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(
    defaultOpen ?? isInGroup
  );
  const effectiveOpen = open ?? uncontrolledOpen;

  useEffect(() => {
    if (isInGroup) {
      if (onToggle) onToggle(true);
      else setUncontrolledOpen(true);
    }
  }, [isInGroup]);

  const handleToggle = () => {
    if (onToggle) onToggle(!effectiveOpen);
    else setUncontrolledOpen((v) => !v);
  };

  return (
    <div className={cn("select-none", className)}>
      <div className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-white/10">
        {href ? (
          <NavLink
            href={href}
            label={label}
            icon={Icon}
            className="flex-1 px-1 py-0"
          />
        ) : (
          <div className="flex flex-1 items-center gap-3 px-1">
            {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
            <span className="text-sm font-medium text-white/90">{label}</span>
          </div>
        )}
        <button
          type="button"
          aria-label={`Toggle ${label} submenu`}
          aria-expanded={effectiveOpen}
          aria-controls={regionId}
          onClick={handleToggle}
          className="rounded p-1 hover:bg-white/10"
        >
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "h-4 w-4 transition-transform",
              effectiveOpen && "rotate-180"
            )}
            aria-hidden="true"
          >
            <path
              d="M8 10l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <Collapse
        id={regionId}
        open={!!effectiveOpen}
        unmountOnExit={unmountOnExit}
        duration={duration}
        easing={easing}
        className="ml-8 mt-1 space-y-1"
      >
        {items.map((it) => {
          const key = hrefToPath(it.href) || it.label;
          return (
            <NavLink
              key={key}
              href={it.href}
              label={it.label}
              icon={it.icon}
              className="px-2 py-1.5"
            />
          );
        })}
      </Collapse>
    </div>
  );
}

type CollapseProps = {
  open: boolean;
  children: React.ReactNode;
  id?: string;  
  duration?: number;  
  easing?: string;  
  unmountOnExit?: boolean; 
  className?: string;
};

export default function Collapse({
  open,
  children,
  id,
  duration = 220,
  easing = "ease",
  unmountOnExit = false,
  className,
}: CollapseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.overflow = "hidden";
    el.style.willChange = "height";
    el.style.transitionProperty = "height";
    el.style.transitionTimingFunction = easing;
    el.style.transitionDuration = `${reducedMotion ? 0 : duration}ms`;
  }, [duration, easing, reducedMotion]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onEnd = () => {
      if (open) el.style.height = "auto"; 
      el.removeEventListener("transitionend", onEnd);
    };

    if (reducedMotion) {
      el.style.height = open ? "auto" : "0px";
      return;
    }

    if (open) {
      const start = el.getBoundingClientRect().height;
      el.style.height = `${start}px`;
      requestAnimationFrame(() => {
        el.style.height = `${el.scrollHeight}px`;
      });
      el.addEventListener("transitionend", onEnd);
    } else {
      const current = el.getBoundingClientRect().height;
      el.style.height = `${current}px`;
      el.offsetHeight;
      el.style.height = "0px";
    }
  }, [open, reducedMotion]);

  if (unmountOnExit && !open) {
    return (
      <div
        id={id}
        ref={ref}
        className={className}
        hidden
        aria-hidden="true"
        data-state="closed"
        style={{ height: 0 }}
      />
    );
  }

  return (
    <div
      id={id}
      ref={ref}
      role="region"
      aria-hidden={!open}
      data-state={open ? "open" : "closed"}
      className={className}
      style={{ height: open ? "auto" : 0 }}
    >
      {children}
    </div>
  );
}
