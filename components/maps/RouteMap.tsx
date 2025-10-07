"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type Summary = { distanceText: string; durationText: string };

export default function RouteMap({
  origin,
  destination,
  waypoints = [],
  showSummary = true,
  height = 340,
}: {
  origin: string | null;
  destination: string | null;
  waypoints?: string[];
  showSummary?: boolean;
  height?: number;
}) {
  const { ready, error } = useGoogleMaps(GOOGLE_KEY, ["places"]);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const mapObj = useRef<google.maps.Map | null>(null);
  const renderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const service = useRef<google.maps.DirectionsService | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);

  const hasRoute = useMemo(
    () => Boolean(origin && destination),
    [origin, destination]
  );

  // Inisialisasi Map + Renderer + Service (sekali saat ready)
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    if (!mapObj.current) {
      mapObj.current = new google.maps.Map(mapRef.current, {
        center: { lat: -2.5, lng: 118 }, // tengah Indonesia
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      renderer.current = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        preserveViewport: false,
        map: mapObj.current,
      });

      service.current = new google.maps.DirectionsService();
    } else {
      renderer.current?.setMap(mapObj.current);
    }
  }, [ready]);

  // ==== Stabilkan request & cegah spam calls ====

  // NOTE: gunakan join untuk menstabilkan dependensi array
  const waypointsKey = useMemo(
    () =>
      waypoints && waypoints.length ? waypoints.filter(Boolean).join("|") : "",
    [waypoints]
  );

  const request = useMemo<google.maps.DirectionsRequest | null>(() => {
    if (!hasRoute || !origin || !destination) return null;

    return {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
      waypoints: waypoints
        .filter(Boolean)
        .map((w) => ({ location: w, stopover: true })),
      provideRouteAlternatives: false,
    };
    // penting: pakai waypointsKey, bukan objek array
  }, [hasRoute, origin, destination, waypointsKey]);

  const requestKey = useMemo(
    () => (request ? JSON.stringify(request) : ""),
    [request]
  );
  const lastKeyRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready || !renderer.current || !service.current) {
      setSummary(null);
      return;
    }
    if (!request) return;

    // Skip jika request identik dengan terakhir
    if (lastKeyRef.current === requestKey) return;

    // Debounce supaya input (autocomplete/ketik) tidak spam
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      lastKeyRef.current = requestKey;

      service.current!.route(request, (res, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !res) {
          setSummary(null);
          return;
        }

        renderer.current!.setDirections(res);

        // Ringkas jarak & durasi (pakai route[0])
        const route = res.routes[0];
        const legs = route.legs || [];
        const totalMeters = legs.reduce(
          (acc, l) => acc + (l.distance?.value ?? 0),
          0
        );
        const totalSecs = legs.reduce(
          (acc, l) => acc + (l.duration?.value ?? 0),
          0
        );

        setSummary({
          distanceText: metersToKmText(totalMeters),
          durationText: secsToHms(totalSecs),
        });

        // Fit bounds
        const bounds = new google.maps.LatLngBounds();
        (route.overview_path || []).forEach((p) => bounds.extend(p));
        mapObj.current?.fitBounds(bounds);
      });
    }, 400); // 300–500 ms enak

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [ready, request, requestKey]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-xl border border-gray-200"
      />
      {showSummary && summary && (
        <div className="text-xs text-gray-600">
          <strong>Ringkasan Rute:</strong>{" "}
          <span>Jarak {summary.distanceText}</span>{" "}
          <span className="mx-2">•</span>
          <span>Estimasi {summary.durationText}</span>
        </div>
      )}
      {!hasRoute && (
        <div className="text-xs text-gray-500">
          Pilih <em>Lokasi Muat</em> dan <em>Lokasi Bongkar</em> untuk melihat
          rute di peta.
        </div>
      )}
    </div>
  );
}

function metersToKmText(m: number): string {
  if (m < 1000) return `${m} m`;
  const km = m / 1000;
  return `${km.toFixed(km >= 100 ? 0 : km >= 10 ? 1 : 2)} km`;
}

function secsToHms(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} mnt`;
}
