// core/forms/useFormController.ts
"use client";

import { useRef, useSyncExternalStore } from "react";
import type {
  AbstractFormController,
  FormSnapshot,
} from "@/core/AbstractFormController";

/**
 * Hook adaptor: cache snapshot agar getSnapshot return referensi stabil,
 * dan update cache hanya ketika store meng-emit perubahan.
 */
export function useFormController<
  TV extends Record<string, unknown>,
  TE extends Partial<Record<keyof TV, string>>,
  TP,
  TR,
  C extends AbstractFormController<TV, TE, TP, TR>
>(factory: () => C): readonly [C, FormSnapshot<TV, TE>] {
  // 1) instansiasi controller sekali
  const ref = useRef<C | null>(null);
  if (ref.current === null) {
    ref.current = factory();
  }
  const ctrl = ref.current as C;

  // 2) CACHE snapshot pertama
  const cacheRef = useRef<FormSnapshot<TV, TE>>(ctrl.snapshot());

  // 3) subscribe: update cache + notify React
  const subscribe = (notify: () => void) => {
    const handler = () => {
      // ambil snapshot BARU lalu simpan ke cache
      cacheRef.current = ctrl.snapshot();
      notify(); // beri tahu React untuk membaca getSnapshot lagi
    };
    const unsubscribe = ctrl.subscribe(handler);
    return unsubscribe;
  };

  // 4) getSnapshot: selalu return dari CACHE (referensi stabil)
  const getSnapshot = () => cacheRef.current;

  // 5) gunakan cache untuk client & server
  const snap = useSyncExternalStore<FormSnapshot<TV, TE>>(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  return [ctrl, snap] as const;
}
