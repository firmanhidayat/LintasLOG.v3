"use client";

/* global google */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { t, getLang } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Form, FormActions, FormRow } from "@/components/form/Form";
import { FieldText } from "@/components/form/FieldText";
import {
  FieldAutocomplete,
  type AutoItem,
} from "@/components/form/FieldAutoComplete";
import { Alert } from "@/components/feedback/Alert";
import { Button } from "@/components/ui/Button";
import { useDebounced } from "@/hooks/useDebounced";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { Copy } from "lucide-react";

const ADDRESS_POST_URL = process.env.NEXT_PUBLIC_TMS_USER_ADDRESS_URL ?? "";
const LOCATION_DISTRIC_URL =
  process.env.NEXT_PUBLIC_TMS_LOCATIONS_DISTRICT_URL ?? "";
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// === TYPES ===
export type AddressPayload = {
  name: string;
  street: string;
  street2?: string;
  district_id: number;
  zip?: string;
  email?: string;
  mobile?: string;
  latitude?: number;
  longitude?: number;
  /** formatted address dari Google (opsional, non-breaking) */
  map_description?: string;
};

export type AddressFormProps = {
  addressId?: number | string;
  initialValue?: Partial<{
    name: string;
    street: string;
    street2: string;
    zip: string;
    email: string;
    mobile: string;
    district: { id: number; name: string } | null;
    latitude: number;
    longitude: number;
  }>;
  onSuccess?: (data: unknown) => void;
  className?: string;
};

interface DistrictItem {
  id: number;
  name: string;
}

type LatLng = { lat: number; lng: number };

export default function AddressForm({
  addressId,
  initialValue,
  onSuccess,
  className,
}: AddressFormProps) {
  const { ready: i18nReady, lang: activeLang } = useI18nReady();
  const router = useRouter();

  // ====== Form states ======
  const [name, setName] = useState(initialValue?.name ?? "");
  const [street, setStreet] = useState(initialValue?.street ?? "");
  const [street2, setStreet2] = useState(initialValue?.street2 ?? "");
  const [zip, setZip] = useState(initialValue?.zip ?? "");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [mobile, setMobile] = useState(initialValue?.mobile ?? "");

  const [districtQuery, setDistrictQuery] = useState(
    initialValue?.district?.name ?? ""
  );
  const [districtSel, setDistrictSel] = useState<AutoItem | null>(
    initialValue?.district ?? null
  );

  const [options, setOptions] = useState<DistrictItem[]>([]);
  const [optOpen, setOptOpen] = useState(false);
  const [loadingOpt, setLoadingOpt] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  const [errors, setErrors] = useState<{
    name?: string;
    street?: string;
    district?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    street?: boolean;
    district?: boolean;
  }>({});

  // ====== Map states ======
  const [lat, setLat] = useState<number | undefined>(initialValue?.latitude);
  const [lng, setLng] = useState<number | undefined>(initialValue?.longitude);
  const [mapDesc, setMapDesc] = useState<string | undefined>(undefined);

  // Map search (independen)
  const [mapSearch, setMapSearch] = useState<string>("");

  // Snapshot awal (untuk discard)
  const initialSnap = useRef({
    name: initialValue?.name ?? "",
    street: initialValue?.street ?? "",
    street2: initialValue?.street2 ?? "",
    zip: initialValue?.zip ?? "",
    email: initialValue?.email ?? "",
    mobile: initialValue?.mobile ?? "",
    districtQuery: initialValue?.district?.name ?? "",
    districtSel: (initialValue?.district ?? null) as AutoItem | null,
    latitude: initialValue?.latitude,
    longitude: initialValue?.longitude,
  });

  const debouncedQuery = useDebounced(districtQuery, 300);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const streetRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ====== Google Maps refs ======
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const mapsReadyRef = useRef(false);
  const mapListeners = useRef<google.maps.MapsEventListener[]>([]);

  // Places Autocomplete
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Pakai loader hook (singleton)
  const { ready: mapsReady, error: mapsError } = useGoogleMaps(GOOGLE_KEY, [
    "places",
  ]);

  // --- consistency guard states & utils ---
  const KM_WARN = 1; // di atas 1 km beri peringatan
  const KM_BLOCK = 30; // di atas 30 km wajib compute dulu

  function haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // Helpers: normalisasi teks utk fuzzy match Street vs MapDesc
  const STREET_STOPWORDS = new Set([
    "jalan",
    "jl",
    "jl.",
    "jln",
    "rt",
    "rw",
    "no",
    "nomor",
    "gang",
    "gg",
    "kp",
    "kel",
    "kec",
    "kab",
    "kota",
    "desa",
    "dusun",
    "prov",
    "provinsi",
  ]);

  function normalizeText(s: string): string {
    return s
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()\[\]"']+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function streetMatchesMapDesc(
    streetVal: string,
    desc: string
  ): {
    pass: boolean;
    tokens: number;
    hits: number;
  } {
    const s = normalizeText(streetVal);
    const d = normalizeText(desc);
    const toks = s
      .split(" ")
      .filter((x) => x.length >= 3 && !STREET_STOPWORDS.has(x));
    if (toks.length === 0) return { pass: true, tokens: 0, hits: 0 }; // nothing to check
    const hits = toks.filter((x) => d.includes(x)).length;
    const ratio = hits / toks.length;
    const pass = toks.length >= 2 ? ratio >= 0.5 : hits >= 1; // heuristik ringan
    return { pass, tokens: toks.length, hits };
  }

  // koordinat hasil compute alamat terakhir (sebagai baseline sinkronisasi)
  const [addrBaseline, setAddrBaseline] = useState<LatLng | null>(null);
  // timestamps
  const [lastComputeAt, setLastComputeAt] = useState<number>(0);
  const [lastAddrEditAt, setLastAddrEditAt] = useState<number>(0);
  const [lastMapMoveAt, setLastMapMoveAt] = useState<number>(0);

  // flag mismatch & detail konfirmasi
  const [outOfSync, setOutOfSync] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState<{
    distanceKm: number | null;
    streetMismatch: boolean;
    reason: string[];
  } | null>(null);

  function geocodeReq(
    request: google.maps.GeocoderRequest
  ): Promise<google.maps.GeocoderResult[]> {
    const geocoder = geocoderRef.current!;
    return new Promise((resolve, reject) => {
      geocoder.geocode(request, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results) {
          resolve(results);
        } else {
          reject(new Error(`Geocode failed: ${status}`));
        }
      });
    });
  }

  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");

  async function handleCopyMapDesc() {
    if (!mapDesc) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(mapDesc);
      } else {
        // Fallback jika Clipboard API tidak tersedia
        const ta = document.createElement("textarea");
        ta.value = mapDesc;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyState("ok");
    } catch {
      setCopyState("err");
    } finally {
      setTimeout(() => setCopyState("idle"), 1500);
    }
  }

  // === FETCH DISTRICTS ===
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q || q.length < 2) {
      setOptions([]);
      return;
    }
    let abort = false;
    (async () => {
      try {
        setLoadingOpt(true);
        const url = `${LOCATION_DISTRIC_URL}?query=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`District search failed: ${res.status}`);
        const data = (await res.json()) as
          | { items?: DistrictItem[] }
          | DistrictItem[];
        const list = Array.isArray(data) ? data : data?.items ?? [];
        if (!abort) setOptions(list);
      } catch (err) {
        console.error("[districts]", err);
        if (!abort) setOptions([]);
      } finally {
        if (!abort) setLoadingOpt(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [debouncedQuery]);

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 && street.trim().length > 0 && !!districtSel?.id,
    [name, street, districtSel]
  );

  function validate() {
    const next: { name?: string; street?: string; district?: string } = {};
    if (!name.trim()) next.name = t("addr.validation.nameRequired");
    if (!street.trim()) next.street = t("addr.validation.streetRequired");
    if (!districtSel?.id) next.district = t("addr.validation.districtRequired");
    setErrors(next);
    return next;
  }

  function markTouched(field: "name" | "street" | "district") {
    setTouched((p) => ({ ...p, [field]: true }));
  }

  const [mapError, setMapError] = useState<string | null>(null);

  // === INIT MAP ===
  useEffect(() => {
    if (!mapRef.current) return;

    if (!GOOGLE_KEY) {
      setMapError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY belum dikonfigurasi");
      return;
    }
    if (mapsError) {
      setMapError(mapsError);
      return;
    }
    if (!mapsReady) return;

    try {
      // CLEANUP instance lama (antisipasi form dibuka berkali-kali)
      mapListeners.current.forEach((l) => l.remove());
      mapListeners.current = [];
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapObj.current) {
        // kosongkan container untuk menghindari stale canvas
        if (mapRef.current) mapRef.current.innerHTML = "";
        mapObj.current = null;
      }
      geocoderRef.current = null;
      autocompleteRef.current = null;

      geocoderRef.current = new google.maps.Geocoder();

      const defaultCenter = new google.maps.LatLng(
        lat ?? -6.1753924, // Monas fallback
        lng ?? 106.8271528
      );

      mapObj.current = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: lat && lng ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      markerRef.current = new google.maps.Marker({
        position: defaultCenter,
        map: mapObj.current,
        draggable: true,
      });

      // Drag pin => reverse geocode (hanya set lat/lng + mapDesc)
      mapListeners.current.push(
        google.maps.event.addListener(
          markerRef.current,
          "dragend",
          async () => {
            const pos = markerRef.current!.getPosition();
            if (!pos) return;
            const newLat = pos.lat();
            const newLng = pos.lng();
            updateCoords(newLat, newLng);
            setLastMapMoveAt(Date.now());
            await reverseGeocodeToDesc(newLat, newLng);
          }
        )
      );

      // Click map => move pin + reverse geocode (independen)
      mapListeners.current.push(
        google.maps.event.addListener(
          mapObj.current!,
          "click",
          async (e: google.maps.MapMouseEvent) => {
            if (!e.latLng || !markerRef.current || !mapObj.current) return;
            markerRef.current.setPosition(e.latLng);
            mapObj.current.panTo(e.latLng);
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            updateCoords(newLat, newLng);
            setLastMapMoveAt(Date.now());
            await reverseGeocodeToDesc(newLat, newLng);
          }
        )
      );

      // Setup Places Autocomplete pada search bar (independen)
      if (searchInputRef.current && google.maps.places) {
        const ac = new google.maps.places.Autocomplete(searchInputRef.current, {
          fields: ["formatted_address", "geometry"],
        });
        mapListeners.current.push(
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            const loc = place.geometry?.location;
            if (loc && mapObj.current) {
              const newLat = loc.lat();
              const newLng = loc.lng();
              updateCoords(newLat, newLng);
              setLastMapMoveAt(Date.now());
              mapObj.current.panTo(loc);
              mapObj.current.setZoom(16);
              setMapDesc(place.formatted_address ?? undefined);
            } else if (searchInputRef.current?.value) {
              void geocodeText(searchInputRef.current.value);
            }
          })
        );
        autocompleteRef.current = ac;
      }

      mapsReadyRef.current = true;

      // Address baseline compute on mount
      const shouldUpdateMap = !(lat && lng);
      void geocodeFromAddressParts(shouldUpdateMap);

      // Create form: jika belum ada koordinat, coba geolocation
      if (
        !(lat && lng) &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: gLat, longitude: gLng } = pos.coords;
            updateCoords(gLat, gLng);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      // Force re-render tiles (atasi kasus map kadang tidak muncul)
      setTimeout(() => {
        if (mapObj.current) {
          google.maps.event.trigger(mapObj.current, "resize");
          if (markerRef.current?.getPosition()) {
            mapObj.current.setCenter(markerRef.current.getPosition()!);
          }
        }
      }, 250);
    } catch (err) {
      console.error("[GoogleMaps init]", err);
      setMapError(
        err instanceof Error ? err.message : "Gagal inisialisasi Google Maps"
      );
    }

    // CLEANUP saat unmount atau re-init
    return () => {
      mapListeners.current.forEach((l) => l.remove());
      mapListeners.current = [];
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapObj.current) {
        if (mapRef.current) mapRef.current.innerHTML = "";
        mapObj.current = null;
      }
      geocoderRef.current = null;
      autocompleteRef.current = null;
      mapsReadyRef.current = false;
    };
  }, [mapsReady, mapsError, GOOGLE_KEY]);

  // Update marker ketika lat/lng berubah
  useEffect(() => {
    if (!mapsReadyRef.current || !markerRef.current || !mapObj.current) return;
    if (typeof lat === "number" && typeof lng === "number") {
      const pos = new google.maps.LatLng(lat, lng);
      markerRef.current.setPosition(pos);
      mapObj.current.setCenter(pos);
    }
  }, [lat, lng]);

  // Debounce saat street/district berubah: hitung baseline saja (map independen)
  const debouncedStreetDistrict = useDebounced(
    `${street}|${districtSel?.name ?? ""}|${zip ?? ""}`,
    600
  );

  useEffect(() => {
    if (!mapsReadyRef.current) return;
    const sLen = street.trim().length + (street2?.trim().length ?? 0);
    if (sLen < 5 && !(districtSel?.name || zip)) return;
    void geocodeFromAddressParts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedStreetDistrict]);

  function updateCoords(newLat: number, newLng: number) {
    const EPS = 1e-7; // stabilisasi koordinat
    setLat((prev) =>
      prev == null || Math.abs(prev - newLat) > EPS ? newLat : prev
    );
    setLng((prev) =>
      prev == null || Math.abs(prev - newLng) > EPS ? newLng : prev
    );
  }

  // === Geocode text bebas (untuk search bar & compute-click) ===
  async function geocodeText(text: string) {
    const q = text.trim();
    if (!q) return;
    try {
      const results = await geocodeReq({ address: q });
      if (results.length > 0) {
        const best = results[0];
        const loc = best.geometry.location;
        const newLat = loc.lat();
        const newLng = loc.lng();
        updateCoords(newLat, newLng);
        setLastMapMoveAt(Date.now());
        setMapDesc(best.formatted_address ?? undefined);
        if (mapObj.current) {
          mapObj.current.panTo(loc);
          mapObj.current.setZoom(16);
        }
      }
    } catch (err) {
      console.warn("[geocodeText] gagal:", err);
    }
  }

  // === Geocode berdasarkan bagian alamat form ===
  async function geocodeFromAddressParts(updateMap: boolean = true) {
    if (!geocoderRef.current) return;
    const parts: string[] = [];
    const s1 = street.trim();
    const s2 = street2.trim();
    if (s1) parts.push(s1);
    if (s2) parts.push(s2);
    const d = districtSel?.name?.trim();
    if (d) parts.push(d);
    if (zip.trim()) parts.push(zip.trim());
    parts.push("Indonesia");
    const address = parts.join(", ");

    try {
      const results = await geocodeReq({ address });
      if (results.length > 0) {
        const best = results[0];
        const loc = best.geometry.location;
        const newLat = loc.lat();
        const newLng = loc.lng();

        // baseline konsistensi selalu di-set
        setAddrBaseline({ lat: newLat, lng: newLng });
        setLastComputeAt(Date.now());

        if (updateMap) {
          // sinkronkan MAP ke alamat
          updateCoords(newLat, newLng);
          if (best.formatted_address) setMapDesc(best.formatted_address);
          if (mapObj.current) {
            mapObj.current.panTo(loc);
            mapObj.current.setZoom(16);
          }
        }
      }
    } catch (err) {
      console.warn("[geocodeFromAddressParts] gagal:", err);
    }
  }

  // === Reverse geocode ke deskripsi saja (TIDAK mengubah street) ===
  async function reverseGeocodeToDesc(latV: number, lngV: number) {
    if (!geocoderRef.current) return;
    try {
      const results = await geocodeReq({ location: { lat: latV, lng: lngV } });
      if (results.length > 0) {
        const best = results[0];
        if (best.formatted_address) {
          setMapDesc(best.formatted_address);
        }
      }
    } catch (err) {
      console.warn("[reverseGeocodeToDesc] gagal:", err);
    }
  }

  // === CONSISTENCY EVALUATION ===
  useEffect(() => {
    const reason: string[] = [];
    let mismatch = false;

    if (lastAddrEditAt > lastComputeAt) {
      mismatch = true;
      reason.push("Street/Address berubah setelah sinkronisasi terakhir.");
    }

    let distanceKm: number | null = null;
    if (addrBaseline && typeof lat === "number" && typeof lng === "number") {
      distanceKm = haversineKm(addrBaseline, { lat, lng });
      if (distanceKm > KM_WARN) {
        mismatch = true;
        reason.push(
          `Koordinat peta bergeser ${distanceKm.toFixed(
            2
          )} km dari hasil compute alamat.`
        );
      }
    }

    let streetMismatch = false;
    if (street.trim().length >= 5 && mapDesc) {
      const { pass, tokens, hits } = streetMatchesMapDesc(street, mapDesc);
      streetMismatch = !pass;
      if (streetMismatch) {
        mismatch = true;
        reason.push(
          `Street dari form kurang cocok dengan Map Description (cocok ${hits}/${tokens} token).`
        );
      }
    }

    setOutOfSync(mismatch);
    setConfirmInfo({ distanceKm, streetMismatch, reason });
  }, [addrBaseline, lat, lng, mapDesc, street, lastAddrEditAt, lastComputeAt]);

  // === SUBMIT HELPERS ===
  async function doSubmit(payload: AddressPayload, isUpdate: boolean) {
    const url = isUpdate
      ? `${ADDRESS_POST_URL}/${addressId}`
      : `${ADDRESS_POST_URL}`;
    const res = await fetch(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": getLang(),
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let reason = `Request failed: ${res.status}`;
      try {
        const j = await res.json();
        if (typeof j?.message === "string") reason = j.message;
        else if (Array.isArray(j?.detail)) {
          const first = j.detail[0];
          if (first?.msg) reason = first.msg;
        } else if (typeof j?.detail === "string") {
          reason = j.detail;
        }
      } catch {
        /* ignore */
      }
      throw new Error(reason);
    }
    return res.json();
  }

  async function submitNow() {
    setSubmitStatus("submitting");
    setErrMsg("");
    const payload: AddressPayload = {
      name: name.trim(),
      street: street.trim(),
      street2: street2.trim() || undefined,
      district_id: districtSel?.id ?? 0,
      zip: zip.trim() || undefined,
      email: email.trim() || undefined,
      mobile: mobile.trim() || undefined,
      latitude: typeof lat === "number" ? lat : undefined,
      longitude: typeof lng === "number" ? lng : undefined,
      map_description: mapDesc,
    };

    const isUpdate = typeof addressId !== "undefined" && addressId !== null;
    try {
      const data = await doSubmit(payload, isUpdate);
      setSubmitStatus("success");
      onSuccess?.(data);
    } catch (err: unknown) {
      console.error("[submit]", err);
      setErrMsg(err instanceof Error ? err.message : "Gagal menyimpan data");
      setSubmitStatus("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v.name || v.street || v.district) {
      if (v.name) nameRef.current?.focus();
      else if (v.street) streetRef.current?.focus();
      else inputRef.current?.focus();
      return;
    }

    // GUARD: blokir jika mismatch ekstrem
    if (
      outOfSync &&
      confirmInfo?.distanceKm != null &&
      confirmInfo.distanceKm > KM_BLOCK
    ) {
      setErrMsg(
        `Perbedaan koordinat ${confirmInfo.distanceKm.toFixed(
          2
        )} km (> ${KM_BLOCK} km). ` +
          'Lakukan "Compute Based on Address" sebelum menyimpan.'
      );
      return;
    }

    // Jika masih outOfSync (non-ekstrem), munculkan konfirmasi detail
    if (outOfSync) {
      setConfirmOpen(true);
      return;
    }

    await submitNow();
  }

  // === HANDLERS ===
  function onPickDistrict(d: AutoItem) {
    setDistrictSel({ id: d.id, name: d.name });
    setDistrictQuery(d.name);
    setOptOpen(false);
    setErrors((p) => ({ ...p, district: undefined }));
    setLastAddrEditAt(Date.now());
  }

  function onDistrictInput(v: string) {
    setDistrictQuery(v);
    setDistrictSel(null);
    setOptOpen(true);
    setLastAddrEditAt(Date.now());
  }

  function handleDiscard() {
    const s = initialSnap.current;
    setName(s.name);
    setStreet(s.street);
    setStreet2(s.street2);
    setZip(s.zip);
    setEmail(s.email);
    setMobile(s.mobile);
    setDistrictQuery(s.districtQuery);
    setDistrictSel(s.districtSel);
    setLat(s.latitude);
    setLng(s.longitude);
    setMapDesc(undefined);
    setOptions([]);
    setOptOpen(false);
    setErrors({});
    setTouched({});
    setErrMsg("");
    setSubmitStatus("idle");
    router.push("/orders/addresses/list");
  }

  async function handleComputeBasedOnAddress() {
    await geocodeFromAddressParts(true);
  }

  if (!i18nReady) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <div className={className ?? ""}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div>
          {/* LEFT: FORM */}
          <Card>
            <CardBody className="p-4">
              <Form
                onSubmit={handleSubmit}
                className="space-y-4 min-w-0"
                aria-busy={submitStatus === "submitting"}
                data-lang={activeLang}
              >
                {/* Name */}
                <FieldText
                  inputRef={nameRef}
                  value={name}
                  onChange={(v) => {
                    setName(v);
                    if (touched.name)
                      setErrors((p) => ({
                        ...p,
                        name: v.trim()
                          ? undefined
                          : t("addr.validation.nameRequired"),
                      }));
                  }}
                  onBlur={() => markTouched("name")}
                  placeholder={t("addr.name.placeholder")}
                  ariaLabel={t("addr.name.aria")}
                  required
                  error={errors.name}
                  touched={touched.name}
                />

                <FormRow cols={2}>
                  <div className="grid gap-4">
                    {/* Street (MULTILINE) */}
                    <FieldText
                      inputRef={
                        streetRef as unknown as React.RefObject<HTMLInputElement>
                      }
                      label={t("addr.address.label")}
                      value={street}
                      onChange={(v) => {
                        setStreet(v);
                        setLastAddrEditAt(Date.now());
                        if (touched.street)
                          setErrors((p) => ({
                            ...p,
                            street: v.trim()
                              ? undefined
                              : t("addr.validation.streetRequired"),
                          }));
                      }}
                      onBlur={() => markTouched("street")}
                      placeholder={t("addr.address.placeholder")}
                      error={errors.street}
                      touched={touched.street}
                      required
                      multiline
                      rows={3}
                    />

                    {/* Street 2 */}
                    <FieldText
                      value={street2}
                      onChange={(v) => {
                        setStreet2(v);
                        setLastAddrEditAt(Date.now());
                      }}
                      placeholder={t("addr.street2.placeholder")}
                      ariaLabel={t("addr.street2.aria")}
                    />

                    {/* District Autocomplete */}
                    <FieldAutocomplete
                      value={districtQuery}
                      onChange={onDistrictInput}
                      placeholder={t("addr.district.placeholder")}
                      ariaLabel={t("addr.district.aria")}
                      options={options}
                      loading={loadingOpt}
                      open={optOpen}
                      setOpen={setOptOpen}
                      selected={districtSel}
                      onPick={(d) => onPickDistrict(d)}
                      error={errors.district}
                      touched={touched.district}
                      onBlurValidate={() => {
                        markTouched("district");
                        setErrors((p) => ({
                          ...p,
                          district: districtSel?.id
                            ? undefined
                            : t("addr.validation.districtRequired"),
                        }));
                      }}
                      inputRef={inputRef}
                      listboxId="district-listbox"
                    />

                    {/* ZIP */}
                    <FieldText
                      value={zip}
                      onChange={(v) => {
                        setZip(v);
                        setLastAddrEditAt(Date.now());
                      }}
                      placeholder={t("addr.zip.placeholder")}
                      ariaLabel={t("addr.zip.aria")}
                    />
                  </div>

                  <div className="grid gap-4">
                    {/* Phone */}
                    <FieldText
                      label={t("addr.phone.label")}
                      value={mobile}
                      onChange={setMobile}
                      placeholder={t("addr.phone.placeholder")}
                      type="tel"
                    />
                    {/* Email */}
                    <FieldText
                      label={t("addr.email.label")}
                      value={email}
                      onChange={setEmail}
                      placeholder={t("addr.email.placeholder")}
                      type="email"
                    />

                    {/* Readonly koordinat: VERTICAL (atas-bawah) */}
                    <div className="grid grid-cols-1 gap-3">
                      <FieldText
                        label="Latitude"
                        value={typeof lat === "number" ? String(lat) : ""}
                        onChange={() => {}}
                        placeholder="-6.2"
                        disabled
                      />
                      <FieldText
                        label="Longitude"
                        value={typeof lng === "number" ? String(lng) : ""}
                        onChange={() => {}}
                        placeholder="106.8"
                        disabled
                      />
                    </div>

                    {/* Map description (MULTILINE, readonly) */}
                    {mapDesc && (
                      <div className="grid gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-600">
                            {t("addr.map.desc")}
                          </label>
                          <button
                            type="button"
                            onClick={handleCopyMapDesc}
                            className="inline-flex items-center rounded-md px-1.5 py-1 text-xs
                   hover:bg-gray-100 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-slate-300"
                            title="Copy"
                            aria-label="Copy"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>

                        <FieldText
                          value={mapDesc}
                          onChange={() => {}}
                          placeholder=""
                          disabled
                          multiline
                          rows={3}
                        />

                        {copyState === "ok" && (
                          <div className="text-xs text-emerald-600">
                            Copied!
                          </div>
                        )}
                        {copyState === "err" && (
                          <div className="text-xs text-amber-600">
                            Gagal menyalin.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FormRow>

                {/* Satu-satunya trigger persistennya ada di sini */}
                <div className="text-xs">
                  <button
                    type="button"
                    onClick={handleComputeBasedOnAddress}
                    className="underline text-blue-600 hover:text-blue-700"
                  >
                    Compute Based on Address
                  </button>
                </div>

                {/* Konsistensi banner */}
                {outOfSync ? (
                  <Alert kind="warning">
                    <div className="text-sm">
                      <b>Alamat & Peta belum sinkron.</b>
                      <ul className="list-disc ml-5 mt-1 space-y-1">
                        {confirmInfo?.reason.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                      {confirmInfo?.distanceKm != null &&
                      confirmInfo.distanceKm > KM_BLOCK ? (
                        <div className="mt-2 text-xs text-red-700">
                          Perbedaan &gt; {KM_BLOCK} km — wajib lakukan{" "}
                          <i>Compute Based on Address</i> sebelum simpan.
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-600">
                          Gunakan <i>Compute Based on Address</i> di atas tombol
                          aksi untuk menyelaraskan peta.
                        </div>
                      )}
                    </div>
                  </Alert>
                ) : (
                  <div className="text-xs text-emerald-700">
                    Alamat & Peta sudah sinkron.
                  </div>
                )}

                {/* Panel konfirmasi detail */}
                {confirmOpen && (
                  <Alert kind="warning">
                    <div className="space-y-2 text-sm">
                      <b>Konfirmasi: Data belum sepenuhnya sinkron.</b>
                      <div>
                        <div>Ringkasan:</div>
                        <ul className="list-disc ml-5">
                          {confirmInfo?.reason.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                          {confirmInfo?.distanceKm != null && (
                            <li>
                              Perbedaan jarak peta vs hasil compute:{" "}
                              <b>{confirmInfo.distanceKm.toFixed(2)} km</b>
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          onClick={async () => {
                            setConfirmOpen(false);
                            await handleComputeBasedOnAddress();
                          }}
                        >
                          Compute Based on Address
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            setConfirmOpen(false);
                            await submitNow();
                          }}
                        >
                          {t("addr.actions.confirm")}
                        </Button>
                      </div>
                    </div>
                  </Alert>
                )}

                {errMsg && <Alert kind="error">{errMsg}</Alert>}

                <FormActions>
                  <Button
                    type="submit"
                    disabled={!canSubmit || submitStatus === "submitting"}
                    variant="solid"
                  >
                    {submitStatus === "submitting"
                      ? t("addr.actions.saving")
                      : addressId
                      ? t("addr.actions.update")
                      : t("addr.actions.create")}
                  </Button>

                  <Button type="button" onClick={handleDiscard} variant="ghost">
                    {t("common.discard")}
                  </Button>

                  {districtSel?.id ? (
                    <span hidden className="text-xs text-gray-500">
                      {t("addr.selectedDistrict")}: <b>{districtSel.id}</b>
                    </span>
                  ) : null}
                </FormActions>
              </Form>
            </CardBody>
          </Card>
        </div>

        <div>
          {/* RIGHT: MAP */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {t("addr.map.title") ?? "Map"}
                </div>
                {outOfSync ? (
                  <span className="text-[11px] rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">
                    Out of sync
                  </span>
                ) : (
                  <span className="text-[11px] rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">
                    In sync
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody className="p-4">
              {/* Search bar di atas maps */}
              <div className="mb-2 flex items-center gap-2">
                <input
                  ref={searchInputRef}
                  value={mapSearch}
                  onChange={(e) => setMapSearch(e.target.value)}
                  placeholder="Search place or address…"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  aria-label="Search address on map"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => geocodeText(mapSearch)}
                >
                  Search
                </Button>
              </div>

              <div
                ref={mapRef}
                className="relative h-[360px] w-full min-h-[280px] rounded-xl"
                aria-label="Map"
              />
              {!GOOGLE_KEY && (
                <p className="mt-2 text-xs text-amber-600">
                  Google Maps API key belum dikonfigurasi.
                </p>
              )}
              {mapError && (
                <p className="mt-2 text-xs text-red-600">
                  {mapError} — periksa Google Cloud Console (Maps JavaScript API
                  & Geocoding API aktif, referrer domain diizinkan).
                </p>
              )}

              <p className="mt-2 text-xs text-slate-500">
                Klik peta atau drag pin untuk memilih koordinat. Pencarian map
                bersifat independen & tidak mengubah field Street.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
