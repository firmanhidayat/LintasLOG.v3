"use client";

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsOnLoad__?: () => void;
  }
}

import { useEffect, useState } from "react";

export function useGoogleMaps(
  apiKey: string | undefined,
  libraries: Array<"places"> = ["places"]
) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (window.__googleMapsOnLoad__) {
      const id = window.setInterval(() => {
        if (window.google?.maps) {
          window.clearInterval(id);
          setReady(true);
        }
      }, 60);
      return () => window.clearInterval(id);
    }

    window.__googleMapsOnLoad__ = () => setReady(true);
    const script = document.createElement("script");
    const libs = libraries.length ? `&libraries=${libraries.join(",")}` : "";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${libs}&callback=__googleMapsOnLoad__`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setError("Failed to load Google Maps script");
    document.head.appendChild(script);

    return () => {};
  }, [apiKey, libraries]);

  return { ready, error };
}
