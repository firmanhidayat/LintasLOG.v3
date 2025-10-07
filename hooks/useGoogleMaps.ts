"use client";

declare global {
  interface Window {
    google?: typeof google;
  }
}

import { useEffect, useMemo, useState } from "react";

const DEFAULT_LIBRARIES = ["places"] as const;
const SCRIPT_ID = "google-maps-js";

/** Loader singleton supaya script cuma di-load sekali */
let googleMapsLoading: Promise<void> | null = null;

export function useGoogleMaps(
  apiKey: string | undefined,
  libraries: ReadonlyArray<"places"> = DEFAULT_LIBRARIES
) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buat kunci stabil untuk param libraries
  const libsKey = useMemo(
    () => (libraries?.length ? Array.from(libraries).sort().join(",") : ""),
    [libraries]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!apiKey) {
      setError("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      return;
    }

    if (window.google?.maps) {
      setReady(true);
      return;
    }

    if (googleMapsLoading) {
      googleMapsLoading
        .then(() => setReady(true))
        .catch(() => setError("Failed to load Google Maps script"));
      return;
    }

    const existing = document.getElementById(
      SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existing) {
      googleMapsLoading = new Promise<void>((resolve, reject) => {
        if (window.google?.maps) {
          resolve();
        } else {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener(
            "error",
            () => reject(new Error("load error")),
            {
              once: true,
            }
          );
        }
      });

      googleMapsLoading
        .then(() => setReady(true))
        .catch(() => setError("Failed to load Google Maps script"));
      return;
    }

    // Inject script pertama kali
    const libsParam = libsKey ? `&libraries=${libsKey}` : "";
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${libsParam}`;
    script.async = true;
    script.defer = true;

    googleMapsLoading = new Promise<void>((resolve, reject) => {
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("load error")), {
        once: true,
      });
    });

    document.head.appendChild(script);

    googleMapsLoading
      .then(() => setReady(true))
      .catch(() => setError("Failed to load Google Maps script"));
  }, [apiKey, libsKey]);

  return { ready, error };
}
