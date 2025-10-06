"use client";
import { useEffect } from "react";

type AnyElRef = { current: HTMLElement | null } | null;

export function useClickOutside(
  refs: AnyElRef[],
  onOutside: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      const inside = refs.some((r) => {
        const el = (
          r && "current" in r ? r.current : null
        ) as HTMLElement | null;
        return el && (el === t || el.contains(t));
      });
      if (!inside) onOutside();
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [enabled, onOutside, refs]);
}

// "use client";
// import { useEffect } from "react";

// type AnyElRef = { current: HTMLElement | null } | null;

// export function useClickOutside(
//   refs: AnyElRef[],
//   onOutside: () => void,
//   enabled = true
// ) {
//   useEffect(() => {
//     if (!enabled) return;

//     function onDocClick(e: MouseEvent) {
//       const t = e.target as Node;
//       const inside = refs.some((r) => {
//         const el = r && "current" in r ? r.current : null;
//         return !!el && (el === t || el.contains(t));
//       });
//       if (!inside) onOutside();
//     }

//     document.addEventListener("click", onDocClick);
//     return () => document.removeEventListener("click", onDocClick);
//   }, [enabled, onOutside, refs]);
// }

// "use client";
// import { useEffect } from "react";

// export function useClickOutside(
//   refs: Array<
//     | React.MutableRefObject<HTMLElement | null>
//     | React.RefObject<HTMLElement>
//     | null
//   >,
//   onOutside: () => void,
//   enabled = true
// ) {
//   useEffect(() => {
//     if (!enabled) return;
//     function onDocClick(e: MouseEvent) {
//       const t = e.target as Node;
//       const inside = refs.some((r) => {
//         const el = (
//           r && "current" in r ? r.current : null
//         ) as HTMLElement | null;
//         return el && (el === t || el.contains(t as Node));
//       });
//       if (!inside) onOutside();
//     }
//     document.addEventListener("click", onDocClick);
//     return () => document.removeEventListener("click", onDocClick);
//   }, [enabled, onOutside, refs]);
// }
