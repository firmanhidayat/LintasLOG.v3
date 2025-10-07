// hooks/useClickOutside.ts
"use client";
import { useEffect } from "react";

type AnyElRef = { current: HTMLElement | null } | null;

/**
 * Bisa dipakai dengan:
 * - useClickOutside(singleRef, onOutside)
 * - useClickOutside([ref1, ref2], onOutside)
 */
export function useClickOutside(
  refsOrRef: AnyElRef | AnyElRef[],
  onOutside: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const refs = Array.isArray(refsOrRef) ? refsOrRef : [refsOrRef];

    function onDocClick(e: MouseEvent) {
      const t = e.target as Node | null;
      if (!t) return;

      const inside = refs.some((r) => {
        const el = (
          r && "current" in r ? r.current : null
        ) as HTMLElement | null;
        return !!(el && (el === t || el.contains(t)));
      });

      if (!inside) onOutside();
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
    // refs .current tidak memicu re-render, jadi aman tidak dijadikan dependency
  }, [enabled, onOutside, refsOrRef]);
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
//         const el = (
//           r && "current" in r ? r.current : null
//         ) as HTMLElement | null;
//         return el && (el === t || el.contains(t));
//       });
//       if (!inside) onOutside();
//     }
//     document.addEventListener("click", onDocClick);
//     return () => document.removeEventListener("click", onDocClick);
//   }, [enabled, onOutside, refs]);
// }
