"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
type EphemeralOptions<T> = {
  redirectTo?: string; // redirect kalau value kosong & required = true
  required?: boolean; // kalau true, nilai wajib ada
  parse?: (raw: string) => T; // custom parser dari string -> T
  serialize?: (value: T) => string; // custom serializer dari T -> string
  clearOnUnmount?: boolean; // default: true
  clearOnBeforeUnload?: boolean; // default: true
};
export function useEphemeralLocalStorage<T>(
  storageKey: string,
  {
    redirectTo,
    required = false,
    parse,
    serialize,
    clearOnUnmount = true,
    clearOnBeforeUnload = true,
  }: EphemeralOptions<T> = {}
) {
  const [value, setValueState] = useState<T | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      if (required && redirectTo) {
        router.replace(redirectTo);
      }
      return;
    }
    const parseFn: (s: string) => T =
      parse ?? ((json: string) => JSON.parse(json) as T);
    try {
      const parsed = parseFn(raw);
      setValueState(parsed);
    } catch (error) {
      console.error("Failed to parse localStorage value", error);
      window.localStorage.removeItem(storageKey);
      if (required && redirectTo) {
        router.replace(redirectTo);
      }
    }
    const handleBeforeUnload = () => {
      if (clearOnBeforeUnload) {
        window.localStorage.removeItem(storageKey);
      }
    };
    if (clearOnBeforeUnload) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => {
      if (clearOnBeforeUnload) {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
      if (clearOnUnmount) {
        window.localStorage.removeItem(storageKey);
      }
    };
  }, [
    storageKey,
    parse,
    redirectTo,
    required,
    clearOnUnmount,
    clearOnBeforeUnload,
    router,
  ]);

  const setValue = useCallback(
    (next: T | null) => {
      if (typeof window === "undefined") return;

      if (next === null) {
        window.localStorage.removeItem(storageKey);
        setValueState(null);
      } else {
        const serializeFn: (v: T) => string =
          serialize ?? ((v: T) => JSON.stringify(v));
        const raw = serializeFn(next);
        window.localStorage.setItem(storageKey, raw);
        setValueState(next);
      }
    },
    [storageKey, serialize]
  );

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(storageKey);
    setValueState(null);
  }, [storageKey]);

  return { value, setValue, clear };
}
