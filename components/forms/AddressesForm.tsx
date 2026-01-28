"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "@/components/form/FieldInput";
import LookupAutocomplete, {
  normalizeResults,
} from "@/components/form/LookupAutocomplete";
import { RecordItem } from "@/types/recorditem";
import { t, getLang } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Button } from "@/components/ui/Button";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { Alert } from "@/components/feedback/Alert"; // tetap untuk info "Compute"

// ===== NEW: Lightweight modal dialog (serupa Fleet/Driver) =====
function ModalDialog({
  open,
  kind = "success",
  title,
  message,
  onClose,
}: {
  open: boolean;
  kind?: "success" | "error";
  title: string;
  message: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  const ring = kind === "success" ? "ring-green-500" : "ring-red-500";
  const head = kind === "success" ? "text-green-700" : "text-red-700";
  const btn =
    kind === "success"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-red-600 hover:bg-red-700";
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ${ring}`}
      >
        <div className={`mb-2 text-lg font-semibold ${head}`}>{title}</div>
        <div className="mb-4 text-sm text-gray-700">{message}</div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-white ${btn} focus:outline-none focus:ring`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

const ADDRESS_POST_URL = process.env.NEXT_PUBLIC_TMS_USER_ADDRESS_URL ?? "";
const LOCATION_DISTRIC_URL =
  process.env.NEXT_PUBLIC_TMS_LOCATIONS_DISTRICT_URL ?? "";
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ===== Types =====
export type AddressFormProps = {
  mode?: "create" | "edit";
  addressId?: number | string;
  initialData?: Partial<{
    name: string;
    street: string;
    street2: string;
    zip: string;
    email: string;
    mobile: string;
    district: RecordItem | null;
    latitude: number | string | null;
    longitude: number | string | null;
    lat: number | string | null;
    lng: number | string | null;
    lon: number | string | null;
    long: number | string | null; // alias lain yg sering dipakai API
    map_description: string | null;
  }>;
  onSuccess?: (data: unknown) => void;
  className?: string;
  type: string; // jenis alamat, misal "delivery" atau "other"
};

type AddressPayload = {
  name: string;
  street: string;
  street2?: string;
  district_id: number;
  zip?: string;
  email?: string;
  mobile?: string;
  latitude?: number;
  longitude?: number;
  map_description?: string;
  type?: string;
};

// ===== Helpers =====
function toNumOrUndef(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
type CoordSource = Partial<{
  latitude: number | string | null;
  longitude: number | string | null;
  lat: number | string | null;
  lng: number | string | null;
  lon: number | string | null;
  long: number | string | null; // alias umum
}>;

function pickLat(src: unknown): number | undefined {
  if (!src || typeof src !== "object") return undefined;
  const o = src as CoordSource;
  return toNumOrUndef(o.latitude ?? o.lat);
}
function pickLng(src: unknown): number | undefined {
  if (!src || typeof src !== "object") return undefined;
  const o = src as CoordSource;
  return toNumOrUndef(o.longitude ?? o.lng ?? o.lon ?? o.long);
}

export default function AddressForm({
  mode = "create",
  addressId,
  initialData,
  onSuccess,
  className,
  type,
}: AddressFormProps) {
  const { ready: i18nReady } = useI18nReady();
  const router = useRouter();

  // ===== Form state =====
  const [name, setName] = useState(initialData?.name ?? "");
  const [street, setStreet] = useState(initialData?.street ?? "");
  const [street2, setStreet2] = useState(initialData?.street2 ?? "");
  const [district, setDistrict] = useState<RecordItem | null>(
    initialData?.district ?? null
  );
  const [zip, setZip] = useState(initialData?.zip ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [mobile, setMobile] = useState(initialData?.mobile ?? "");

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

  // ===== Map & geocode state =====
  const [lat, setLat] = useState<number | undefined>(() =>
    pickLat(initialData)
  );
  const [lng, setLng] = useState<number | undefined>(() =>
    pickLng(initialData)
  );
  const [mapDesc, setMapDesc] = useState<string>(
    () => initialData?.map_description ?? ""
  );

  // Pesan hasil "Compute" (pakai Alert.tsx)
  const [computeMsg, setComputeMsg] = useState<string>("");

  const [mapSearch, setMapSearch] = useState<string>("");
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");

  // ===== NEW: submit & dialog state =====
  const [submitting, setSubmitting] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");

  function openSuccessDialog() {
    setDlgKind("success");
    setDlgTitle(
      mode === "edit"
        ? t("common.updated") ?? "Berhasil diperbarui"
        : t("common.saved") ?? "Berhasil disimpan"
    );
    setDlgMsg(t("common.saved_desc") ?? "Data berhasil disimpan.");
    setDlgOpen(true);
  }
  function openErrorDialog(err: unknown, fallbackTitle?: string) {
    const msg =
      (typeof err === "object" &&
        err !== null &&
        // @ts-expect-error best-effort parse
        (err.detail?.[0]?.msg || err.message || err.error)) ||
      String(err);
    setDlgKind("error");
    setDlgTitle(
      fallbackTitle || (t("common.failed_to_save") ?? "Gagal menyimpan")
    );
    setDlgMsg(
      <pre className="whitespace-pre-wrap text-xs text-red-700">{msg}</pre>
    );
    setDlgOpen(true);
  }

  // ===== Map refs =====
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const mapsReadyRef = useRef(false);
  const mapListeners = useRef<google.maps.MapsEventListener[]>([]);

  // Load Google Maps
  const { ready: mapsReady, error: mapsError } = useGoogleMaps(GOOGLE_KEY, [
    "places",
  ]);

  // ===== Effects =====
  // Prefill dari initialData
  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name ?? "");
    setStreet(initialData.street ?? "");
    setStreet2(initialData.street2 ?? "");
    setDistrict(initialData.district ?? null);
    setZip(initialData.zip ?? "");
    setEmail(initialData.email ?? "");
    setMobile(initialData.mobile ?? "");
    setLat(pickLat(initialData));
    setLng(pickLng(initialData));
    setMapDesc(initialData.map_description ?? ""); // ⟵ pastikan selalu terisi
  }, [initialData]);

  // Init / refresh map saat Google ready
  useEffect(() => {
    if (!mapRef.current) return;
    if (!GOOGLE_KEY) return;
    if (mapsError) return;
    if (!mapsReady) return;

    // Cleanup previous
    mapListeners.current.forEach((l) => l.remove());
    mapListeners.current = [];
    if (markerRef.current) {
      google.maps.event.clearInstanceListeners(markerRef.current);
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    if (mapObj.current) {
      google.maps.event.clearInstanceListeners(mapObj.current);
      if (mapRef.current) mapRef.current.innerHTML = "";
      mapObj.current = null;
    }
    geocoderRef.current = null;

    // Create
    geocoderRef.current = new google.maps.Geocoder();

    const defaultCenter = new google.maps.LatLng(
      typeof lat === "number" ? lat : -6.1753924,
      typeof lng === "number" ? lng : 106.8271528
    );

    mapObj.current = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: typeof lat === "number" && typeof lng === "number" ? 16 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    markerRef.current = new google.maps.Marker({
      position: defaultCenter,
      map: mapObj.current,
      draggable: true,
    });

    // Drag pin => update lat/lng + update mapDesc
    mapListeners.current.push(
      google.maps.event.addListener(markerRef.current!, "dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (pos) {
          updateCoords(pos.lat(), pos.lng());
          void reverseGeocodeToDesc(pos.lat(), pos.lng());
        }
      })
    );

    // Click map => move marker + update mapDesc
    mapListeners.current.push(
      google.maps.event.addListener(
        mapObj.current!,
        "click",
        (e: google.maps.MapMouseEvent) => {
          const ll = e.latLng;
          if (ll) {
            updateCoords(ll.lat(), ll.lng());
            markerRef.current?.setPosition(ll);
            void reverseGeocodeToDesc(ll.lat(), ll.lng());
          }
        }
      )
    );

    mapsReadyRef.current = true;

    // Force resize setelah mount
    setTimeout(() => {
      if (mapObj.current) {
        google.maps.event.trigger(mapObj.current, "resize");
        if (markerRef.current?.getPosition()) {
          mapObj.current.setCenter(markerRef.current.getPosition()!);
        }
      }
    }, 250);

    return () => {
      mapListeners.current.forEach((l) => l.remove());
      mapListeners.current = [];
      if (markerRef.current) {
        google.maps.event.clearInstanceListeners(markerRef.current);
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapObj.current) {
        google.maps.event.clearInstanceListeners(mapObj.current);
        if (mapRef.current) mapRef.current.innerHTML = "";
        mapObj.current = null;
      }
      geocoderRef.current = null;
      mapsReadyRef.current = false;
    };
  }, [mapsReady, mapsError, GOOGLE_KEY, lat, lng]);

  // Sync marker saat lat/lng state berubah
  useEffect(() => {
    if (!mapsReadyRef.current || !markerRef.current || !mapObj.current) return;
    if (typeof lat === "number" && typeof lng === "number") {
      const pos = new google.maps.LatLng(lat, lng);
      markerRef.current.setPosition(pos);
      mapObj.current.setCenter(pos);
    }
  }, [lat, lng]);

  // ===== Map helpers =====
  function updateCoords(newLat: number, newLng: number) {
    const EPS = 1e-7;
    setLat((prev) =>
      prev == null || Math.abs(prev - newLat) > EPS ? newLat : prev
    );
    setLng((prev) =>
      prev == null || Math.abs(prev - newLng) > EPS ? newLng : prev
    );
  }

  function geocodeReq(request: google.maps.GeocoderRequest) {
    return new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
      if (!geocoderRef.current) return reject(new Error("Geocoder not ready"));
      geocoderRef.current.geocode(request, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results)
          resolve(results);
        else reject(new Error(status));
      });
    });
  }

  async function reverseGeocodeToDesc(latV: number, lngV: number) {
    if (!geocoderRef.current) return;
    try {
      const results = await geocodeReq({ location: { lat: latV, lng: lngV } });
      if (results.length > 0) setMapDesc(results[0].formatted_address ?? "");
    } catch {
      /* noop */
    }
  }

  async function geocodeText(text: string) {
    const q = text.trim();
    if (!geocoderRef.current || !q) return;

    try {
      const results = await geocodeReq({ address: q });
      if (!results.length) return;

      const best = results[0];
      const loc = best.geometry?.location;
      if (!loc) return;

      const newLat = loc.lat();
      const newLng = loc.lng();

      updateCoords(newLat, newLng);
      setMapDesc(best.formatted_address ?? "");

      mapObj.current?.panTo(loc);
      mapObj.current?.setZoom(16);

      setMapSearch("");
    } catch {
      /* noop */
    }
  }

  // Pastikan tombol Refresh selalu bekerja (auto-init bila belum ada map)
  function refreshMap() {
    if (!mapObj.current && mapsReady && mapRef.current) {
      // init minimal
      const center = new google.maps.LatLng(
        typeof lat === "number" ? lat : -6.1753924,
        typeof lng === "number" ? lng : 106.8271528
      );
      mapObj.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: typeof lat === "number" && typeof lng === "number" ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      markerRef.current = new google.maps.Marker({
        position: center,
        map: mapObj.current,
        draggable: true,
      });
      // listener dasar
      mapListeners.current.push(
        google.maps.event.addListener(markerRef.current!, "dragend", () => {
          const pos = markerRef.current?.getPosition();
          if (pos) {
            updateCoords(pos.lat(), pos.lng());
            void reverseGeocodeToDesc(pos.lat(), pos.lng());
          }
        })
      );
      mapListeners.current.push(
        google.maps.event.addListener(
          mapObj.current!,
          "click",
          (e: google.maps.MapMouseEvent) => {
            const ll = e.latLng;
            if (ll) {
              updateCoords(ll.lat(), ll.lng());
              markerRef.current?.setPosition(ll);
              void reverseGeocodeToDesc(ll.lat(), ll.lng());
            }
          }
        )
      );
      geocoderRef.current = geocoderRef.current ?? new google.maps.Geocoder();
      mapsReadyRef.current = true;
    }

    if (!mapObj.current) {
      // DULU: window.alert("Map belum siap."); -> SEKARANG: Dialog
      openErrorDialog(new Error("Map belum siap."), "Peta belum siap");
      return;
    }

    google.maps.event.trigger(mapObj.current, "resize");
    const pos =
      markerRef.current?.getPosition() ||
      (typeof lat === "number" && typeof lng === "number"
        ? new google.maps.LatLng(lat, lng)
        : null);
    if (pos) {
      mapObj.current.setCenter(pos);
      markerRef.current?.setPosition(pos);
    }
  }

  // HANYA menampilkan info (tidak mengubah koordinat/state lain)
  async function computeFromForm() {
    const parts: string[] = [];
    if (street.trim()) parts.push(street.trim()); // Street 1
    if (district?.name) parts.push(String(district.name)); // Wilayah
    if (zip.trim()) parts.push(zip.trim()); // Kode Pos
    const q = parts.join(", ");

    if (!q) {
      setComputeMsg(
        "Isi dulu minimal salah satu dari: Street 1, Wilayah, atau Kode Pos."
      );
      return;
    }
    if (!geocoderRef.current) {
      setComputeMsg("Geocoder belum siap.");
      return;
    }

    try {
      const results = await geocodeReq({ address: q });
      if (!results.length) {
        setComputeMsg(`Lokasi tidak ditemukan untuk: ${q}`);
        return;
      }
      const best = results[0];
      const loc = best.geometry.location;
      const latV = loc.lat();
      const lngV = loc.lng();
      const addr = best.formatted_address ?? "-";

      // TAMPILKAN via Alert (inline), tidak mengubah lat/lng/map state
      setComputeMsg(
        `Query: ${q}\nKoordinat: ${latV}, ${lngV}\nAlamat: ${addr}`
      );
    } catch {
      setComputeMsg("Gagal menghitung lokasi dari form.");
    }
  }

  async function handleCopyMapDesc() {
    if (!mapDesc) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(mapDesc);
      } else {
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

  // ===== Validation & submit =====
  const canSubmit = useMemo(
    () => name.trim() && street.trim() && !!district?.id,
    [name, street, district]
  );

  function validate() {
    const next: { name?: string; street?: string; district?: string } = {};
    if (!name.trim()) next.name = t("addr.validation.nameRequired");
    if (!street.trim()) next.street = t("addr.validation.streetRequired");
    if (!district?.id) next.district = t("addr.validation.districtRequired");
    setErrors(next);
    return next;
  }

  async function doSubmit(payload: AddressPayload) {
    console.log("[AddressForm] submit payload:", payload);
    const isUpdate = mode === "edit" && addressId != null;
    const url = isUpdate
      ? `${ADDRESS_POST_URL}/${addressId}`
      : ADDRESS_POST_URL;
    if (!url) throw new Error("Endpoint submit belum dikonfigurasi.");

    const res = await fetch(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": getLang(),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let reason = `Request failed: ${res.status}`;
      try {
        const j = await res.json();
        if (typeof j?.message === "string") reason = j.message;
        else if (Array.isArray(j?.detail) && j.detail[0]?.msg)
          reason = j.detail[0].msg;
        else if (typeof j?.detail === "string") reason = j.detail;
      } catch {
        /* ignore */
      }
      throw new Error(reason);
    }

    if (res.status === 204) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function handleSave() {
    let saved = false;
    const v = validate();
    if (v.name || v.street || v.district) return;

    const payload: AddressPayload = {
      name: name.trim(),
      street: street.trim(),
      street2: street2.trim() || "",
      district_id: (district?.id as number) ?? 0,
      zip: zip.trim() || "",
      email: email.trim() || "",
      mobile: mobile.trim() || "",
      latitude: typeof lat === "number" ? lat : 0,
      longitude: typeof lng === "number" ? lng : 0,
      map_description: mapDesc || "",
      type: type,
    };

    try {
      setSubmitting(true);
      const data = await doSubmit(payload);
      onSuccess?.(data); // JANGAN diubah
      openSuccessDialog();
      saved = true;
    } catch (err) {
      // tetap simpan error ke field agar kompatibel dgn existing UI
      const msg = err instanceof Error ? err.message : "Gagal menyimpan data";
      setErrors((p) => ({ ...p, name: p.name ?? msg }));
      openErrorDialog(err);
    } finally {
      setSubmitting(false);
      if (saved) router.refresh();
    }
  }

  function handleDiscard() {
    if(type === "delivery")
    router.push("/orders/addresses/list");
    else
    router.push("/fleetndriver/pool/list");
  }

  if (!i18nReady) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  const rootClass = className ? className + " pb-24" : "pb-24";

  return (
    <div className={rootClass}>
      {/* Warnings */}
      {!ADDRESS_POST_URL || !LOCATION_DISTRIC_URL ? (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          Endpoint API belum dikonfigurasi (alamat/district). Periksa env.
        </div>
      ) : null}
      {!GOOGLE_KEY ? (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          Google Maps API key belum dikonfigurasi.
        </div>
      ) : null}

      {/* Sticky action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70"
        role="region"
        aria-label="Form actions"
      >
        <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-2">
          {/* LEFT: Compute paling kiri */}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={computeFromForm}>
              Compute based on address
            </Button>
          </div>

          {/* RIGHT: Discard & Save */}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleDiscard}>
              {t("common.discard")}
            </Button>
            <Button
              type="button"
              variant="solid"
              // disabled={!canSubmit || submitting}
              disabled={submitting}
              onClick={handleSave}
            >
              {mode === "edit"
                ? t("addr.actions.update")
                : t("addr.actions.save")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* ===== Left: Form ===== */}
        <div className="md:basis-1/2 min-w-0 space-y-4">
          {/* Name */}
          <Field.Root
            value={name || ""}
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
            onBlur={() => setTouched((p) => ({ ...p, name: true }))}
            placeholder={t("addr.name.placeholder")}
            ariaLabel={t("addr.name.aria")}
            required
            error={errors.name}
            touched={touched.name}
          >
            <Field.Label>{t("addr.name.aria")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full" />
              <Field.Error />
            </Field.Control>
          </Field.Root>

          {/* Street */}
          <Field.Root
            value={street}
            onChange={(v) => {
              setStreet(v);
              if (touched.street)
                setErrors((p) => ({
                  ...p,
                  street: v.trim()
                    ? undefined
                    : t("addr.validation.streetRequired"),
                }));
            }}
            onBlur={() => setTouched((p) => ({ ...p, street: true }))}
            placeholder={t("addr.address.placeholder")}
            error={errors.street}
            touched={touched.street}
            required
            multiline
            rows={3}
          >
            <Field.Label>{t("addr.address.label")}</Field.Label>
            <Field.Control>
              <Field.Textarea className="w-full" />
              <Field.Error />
            </Field.Control>
          </Field.Root>

          {/* Street 2 */}
          <Field.Root
            value={street2}
            onChange={(v) => setStreet2(v)}
            placeholder={t("addr.street2.placeholder")}
            ariaLabel={t("addr.street2.aria")}
            multiline
            rows={2}
          >
            <Field.Label>{t("addr.street2.aria")}</Field.Label>
            <Field.Control>
              <Field.Textarea className="w-full" />
              <Field.Error />
            </Field.Control>
          </Field.Root>

          {/* District Autocomplete */}
          <LookupAutocomplete
            label={t("addr.district.aria")}
            placeholder={t("addr.district.placeholder")}
            value={district}
            onChange={(d) => {
              setDistrict(d);
              if (touched.district) {
                setErrors((p) => ({
                  ...p,
                  district: d?.id
                    ? undefined
                    : t("addr.validation.districtRequired"),
                }));
              }
            }}
            error={errors.district}
            endpoint={{
              url: `${LOCATION_DISTRIC_URL}`,
              method: "GET",
              queryParam: "query",
              pageParam: "page",
              pageSizeParam: "page_size",
              page: 1,
              pageSize: 80,
              mapResults: normalizeResults,
            }}
            cacheNamespace="kota-muat"
            prefetchQuery=""
          />

          {/* ZIP / Email / Phone */}
          <Field.Root
            value={zip}
            onChange={setZip}
            placeholder={t("addr.zip.placeholder")}
            ariaLabel={t("addr.zip.aria")}
          >
            <Field.Label>{t("addr.zip.aria")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full" />
              <Field.Error />
            </Field.Control>
          </Field.Root>

          <Field.Root
            value={email}
            onChange={setEmail}
            placeholder={t("addr.email.placeholder")}
            ariaLabel={t("addr.email.label")}
          >
            <Field.Label>{t("addr.email.label")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full" />
              <Field.Error />
            </Field.Control>
          </Field.Root>

          <Field.Root
            value={mobile}
            onChange={setMobile}
            placeholder={t("addr.phone.placeholder")}
            ariaLabel={t("addr.phone.label")}
          >
            <Field.Label>{t("addr.phone.label")}</Field.Label>
            <Field.Control>
              <Field.Input className="w-full" />
              <Field.Error />
            </Field.Control>
          </Field.Root>
        </div>

        {/* ===== Right: Map & tools ===== */}
        <div className="md:basis-1/2 min-w-0 space-y-4">
          <div className="space-y-2 rounded-xl border p-3">
            {/* Hasil Compute (Alert.tsx) */}
            {computeMsg && (
              <Alert kind="info" className="whitespace-pre-line">
                {computeMsg}
              </Alert>
            )}

            {/* Search & Refresh */}
            <div className="flex items-center gap-2">
              <input
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
              <Button type="button" variant="outline" onClick={refreshMap}>
                Refresh
              </Button>
            </div>

            {/* Map */}
            <div
              ref={mapRef}
              className="relative h-[360px] w-full min-h-[280px] rounded-lg"
              aria-label="Map"
            />

            {mapsError ? (
              <p className="text-xs text-red-600">{String(mapsError)}</p>
            ) : null}
            {!GOOGLE_KEY ? (
              <p className="text-xs text-amber-600">
                Google Maps API key belum dikonfigurasi.
              </p>
            ) : null}

            {/* Coords readonly */}
            <div className="grid grid-cols-1 gap-2">
              <Field.Root
                value={lat != null ? String(lat) : ""}
                onChange={() => {}}
                ariaLabel="Latitude"
                disabled
              >
                <Field.Label>Latitude</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full" disabled />
                  <Field.Error />
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={lng != null ? String(lng) : ""}
                onChange={() => {}}
                ariaLabel="Longitude"
                disabled
              >
                <Field.Label>Longitude</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full" disabled />
                  <Field.Error />
                </Field.Control>
              </Field.Root>
            </div>

            {/* Map description — SELALU tampil */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t("addr.map.desc")}
                </span>
                <button
                  type="button"
                  onClick={handleCopyMapDesc}
                  className="text-xs underline hover:opacity-80 focus:outline-none"
                  aria-label="Copy map address"
                  title="Copy map address"
                >
                  {copyState === "ok" ? "Copied!" : "Copy map address"}
                </button>
              </div>

              <Field.Root
                value={mapDesc}
                onChange={() => {}}
                ariaLabel={t("addr.map.desc") as string}
                multiline
                rows={3}
                disabled
              >
                <Field.Control>
                  <Field.Textarea className="w-full" disabled />
                  <Field.Error />
                </Field.Control>
              </Field.Root>

              {copyState === "err" && (
                <div className="text-xs text-amber-600">Failed to copy.</div>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Klik peta atau drag pin untuk memilih koordinat. Pencarian map
              bersifat independen & tidak mengubah field Street.
            </p>
          </div>
        </div>
      </div>

      {/* ===== NEW: Modal dialog (Success/Error) ===== */}
      <ModalDialog
        open={dlgOpen}
        kind={dlgKind}
        title={dlgTitle}
        message={dlgMsg}
        onClose={() => setDlgOpen(false)}
      />
    </div>
  );
}

// "use client";
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { Field } from "@/components/form/FieldInput";
// import LookupAutocomplete, {
//   normalizeResults,
// } from "@/components/form/LookupAutocomplete";
// import { RecordItem } from "@/types/recorditem";
// import { t, getLang } from "@/lib/i18n";
// import { useRouter } from "next/navigation";
// import { useI18nReady } from "@/hooks/useI18nReady";
// import { Button } from "@/components/ui/Button";
// import { useGoogleMaps } from "@/hooks/useGoogleMaps";
// import { Alert } from "@/components/feedback/Alert"; // ⟵ pakai Alert.tsx dari kamu

// const ADDRESS_POST_URL = process.env.NEXT_PUBLIC_TMS_USER_ADDRESS_URL ?? "";
// const LOCATION_DISTRIC_URL =
//   process.env.NEXT_PUBLIC_TMS_LOCATIONS_DISTRICT_URL ?? "";
// const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// // ===== Types =====
// export type AddressFormProps = {
//   mode?: "create" | "edit";
//   addressId?: number | string;
//   initialData?: Partial<{
//     name: string;
//     street: string;
//     street2: string;
//     zip: string;
//     email: string;
//     mobile: string;
//     district: RecordItem | null;
//     latitude: number | string | null;
//     longitude: number | string | null;
//     lat: number | string | null;
//     lng: number | string | null;
//     lon: number | string | null;
//     long: number | string | null; // alias lain yg sering dipakai API
//     map_description: string | null;
//   }>;
//   onSuccess?: (data: unknown) => void;
//   className?: string;
// };

// type AddressPayload = {
//   name: string;
//   street: string;
//   street2?: string;
//   district_id: number;
//   zip?: string;
//   email?: string;
//   mobile?: string;
//   latitude?: number;
//   longitude?: number;
//   map_description?: string;
// };

// // ===== Helpers =====
// function toNumOrUndef(v: unknown): number | undefined {
//   if (typeof v === "number" && Number.isFinite(v)) return v;
//   if (typeof v === "string") {
//     const n = Number(v.trim());
//     return Number.isFinite(n) ? n : undefined;
//   }
//   return undefined;
// }
// type CoordSource = Partial<{
//   latitude: number | string | null;
//   longitude: number | string | null;
//   lat: number | string | null;
//   lng: number | string | null;
//   lon: number | string | null;
//   long: number | string | null; // alias umum
// }>;

// function pickLat(src: unknown): number | undefined {
//   if (!src || typeof src !== "object") return undefined;
//   const o = src as CoordSource;
//   return toNumOrUndef(o.latitude ?? o.lat);
// }
// function pickLng(src: unknown): number | undefined {
//   if (!src || typeof src !== "object") return undefined;
//   const o = src as CoordSource;
//   return toNumOrUndef(o.longitude ?? o.lng ?? o.lon ?? o.long);
// }

// export default function AddressForm({
//   mode = "create",
//   addressId,
//   initialData,
//   onSuccess,
//   className,
// }: AddressFormProps) {
//   const { ready: i18nReady } = useI18nReady();
//   const router = useRouter();

//   // ===== Form state =====
//   const [name, setName] = useState(initialData?.name ?? "");
//   const [street, setStreet] = useState(initialData?.street ?? "");
//   const [street2, setStreet2] = useState(initialData?.street2 ?? "");
//   const [district, setDistrict] = useState<RecordItem | null>(
//     initialData?.district ?? null
//   );
//   const [zip, setZip] = useState(initialData?.zip ?? "");
//   const [email, setEmail] = useState(initialData?.email ?? "");
//   const [mobile, setMobile] = useState(initialData?.mobile ?? "");

//   const [errors, setErrors] = useState<{
//     name?: string;
//     street?: string;
//     district?: string;
//   }>({});
//   const [touched, setTouched] = useState<{
//     name?: boolean;
//     street?: boolean;
//     district?: boolean;
//   }>({});

//   // ===== Map & geocode state =====
//   const [lat, setLat] = useState<number | undefined>(() =>
//     pickLat(initialData)
//   );
//   const [lng, setLng] = useState<number | undefined>(() =>
//     pickLng(initialData)
//   );
//   const [mapDesc, setMapDesc] = useState<string>(
//     () => initialData?.map_description ?? ""
//   );

//   // Pesan hasil "Compute" (pakai Alert.tsx)
//   const [computeMsg, setComputeMsg] = useState<string>("");

//   const [mapSearch, setMapSearch] = useState<string>("");
//   const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");

//   // ===== Map refs =====
//   const mapRef = useRef<HTMLDivElement | null>(null);
//   const mapObj = useRef<google.maps.Map | null>(null);
//   const markerRef = useRef<google.maps.Marker | null>(null);
//   const geocoderRef = useRef<google.maps.Geocoder | null>(null);
//   const mapsReadyRef = useRef(false);
//   const mapListeners = useRef<google.maps.MapsEventListener[]>([]);

//   // Load Google Maps
//   const { ready: mapsReady, error: mapsError } = useGoogleMaps(GOOGLE_KEY, [
//     "places",
//   ]);

//   // ===== Effects =====
//   // Prefill dari initialData
//   useEffect(() => {
//     if (!initialData) return;
//     setName(initialData.name ?? "");
//     setStreet(initialData.street ?? "");
//     setStreet2(initialData.street2 ?? "");
//     setDistrict(initialData.district ?? null);
//     setZip(initialData.zip ?? "");
//     setEmail(initialData.email ?? "");
//     setMobile(initialData.mobile ?? "");
//     setLat(pickLat(initialData));
//     setLng(pickLng(initialData));
//     setMapDesc(initialData.map_description ?? ""); // ⟵ pastikan selalu terisi
//   }, [initialData]);

//   // Init / refresh map saat Google ready
//   useEffect(() => {
//     if (!mapRef.current) return;
//     if (!GOOGLE_KEY) return;
//     if (mapsError) return;
//     if (!mapsReady) return;

//     // Cleanup previous
//     mapListeners.current.forEach((l) => l.remove());
//     mapListeners.current = [];
//     if (markerRef.current) {
//       google.maps.event.clearInstanceListeners(markerRef.current);
//       markerRef.current.setMap(null);
//       markerRef.current = null;
//     }
//     if (mapObj.current) {
//       google.maps.event.clearInstanceListeners(mapObj.current);
//       if (mapRef.current) mapRef.current.innerHTML = "";
//       mapObj.current = null;
//     }
//     geocoderRef.current = null;

//     // Create
//     geocoderRef.current = new google.maps.Geocoder();

//     const defaultCenter = new google.maps.LatLng(
//       typeof lat === "number" ? lat : -6.1753924,
//       typeof lng === "number" ? lng : 106.8271528
//     );

//     mapObj.current = new google.maps.Map(mapRef.current, {
//       center: defaultCenter,
//       zoom: typeof lat === "number" && typeof lng === "number" ? 16 : 12,
//       mapTypeControl: false,
//       streetViewControl: false,
//       fullscreenControl: true,
//     });

//     markerRef.current = new google.maps.Marker({
//       position: defaultCenter,
//       map: mapObj.current,
//       draggable: true,
//     });

//     // Drag pin => update lat/lng + update mapDesc
//     mapListeners.current.push(
//       google.maps.event.addListener(markerRef.current!, "dragend", () => {
//         const pos = markerRef.current?.getPosition();
//         if (pos) {
//           updateCoords(pos.lat(), pos.lng());
//           void reverseGeocodeToDesc(pos.lat(), pos.lng());
//         }
//       })
//     );

//     // Click map => move marker + update mapDesc
//     mapListeners.current.push(
//       google.maps.event.addListener(
//         mapObj.current!,
//         "click",
//         (e: google.maps.MapMouseEvent) => {
//           const ll = e.latLng;
//           if (ll) {
//             updateCoords(ll.lat(), ll.lng());
//             markerRef.current?.setPosition(ll);
//             void reverseGeocodeToDesc(ll.lat(), ll.lng());
//           }
//         }
//       )
//     );

//     mapsReadyRef.current = true;

//     // Force resize setelah mount
//     setTimeout(() => {
//       if (mapObj.current) {
//         google.maps.event.trigger(mapObj.current, "resize");
//         if (markerRef.current?.getPosition()) {
//           mapObj.current.setCenter(markerRef.current.getPosition()!);
//         }
//       }
//     }, 250);

//     return () => {
//       mapListeners.current.forEach((l) => l.remove());
//       mapListeners.current = [];
//       if (markerRef.current) {
//         google.maps.event.clearInstanceListeners(markerRef.current);
//         markerRef.current.setMap(null);
//         markerRef.current = null;
//       }
//       if (mapObj.current) {
//         google.maps.event.clearInstanceListeners(mapObj.current);
//         if (mapRef.current) mapRef.current.innerHTML = "";
//         mapObj.current = null;
//       }
//       geocoderRef.current = null;
//       mapsReadyRef.current = false;
//     };
//   }, [mapsReady, mapsError, GOOGLE_KEY]);

//   // Sync marker saat lat/lng state berubah
//   useEffect(() => {
//     if (!mapsReadyRef.current || !markerRef.current || !mapObj.current) return;
//     if (typeof lat === "number" && typeof lng === "number") {
//       const pos = new google.maps.LatLng(lat, lng);
//       markerRef.current.setPosition(pos);
//       mapObj.current.setCenter(pos);
//     }
//   }, [lat, lng]);

//   // ===== Map helpers =====
//   function updateCoords(newLat: number, newLng: number) {
//     const EPS = 1e-7;
//     setLat((prev) =>
//       prev == null || Math.abs(prev - newLat) > EPS ? newLat : prev
//     );
//     setLng((prev) =>
//       prev == null || Math.abs(prev - newLng) > EPS ? newLng : prev
//     );
//   }

//   function geocodeReq(request: google.maps.GeocoderRequest) {
//     return new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
//       if (!geocoderRef.current) return reject(new Error("Geocoder not ready"));
//       geocoderRef.current.geocode(request, (results, status) => {
//         if (status === google.maps.GeocoderStatus.OK && results)
//           resolve(results);
//         else reject(new Error(status));
//       });
//     });
//   }

//   async function reverseGeocodeToDesc(latV: number, lngV: number) {
//     if (!geocoderRef.current) return;
//     try {
//       const results = await geocodeReq({ location: { lat: latV, lng: lngV } });
//       if (results.length > 0) setMapDesc(results[0].formatted_address ?? "");
//     } catch {
//       /* noop */
//     }
//   }

//   async function geocodeText(text: string) {
//     const q = text.trim();
//     if (!geocoderRef.current || !q) return;

//     try {
//       const results = await geocodeReq({ address: q });
//       if (!results.length) return;

//       const best = results[0];
//       const loc = best.geometry?.location;
//       if (!loc) return;

//       const newLat = loc.lat();
//       const newLng = loc.lng();

//       updateCoords(newLat, newLng);
//       setMapDesc(best.formatted_address ?? "");

//       mapObj.current?.panTo(loc);
//       mapObj.current?.setZoom(16);

//       setMapSearch("");
//     } catch {
//       /* noop */
//     }
//   }

//   // Pastikan tombol Refresh selalu bekerja (auto-init bila belum ada map)
//   function refreshMap() {
//     if (!mapObj.current && mapsReady && mapRef.current) {
//       // init minimal
//       const center = new google.maps.LatLng(
//         typeof lat === "number" ? lat : -6.1753924,
//         typeof lng === "number" ? lng : 106.8271528
//       );
//       mapObj.current = new google.maps.Map(mapRef.current, {
//         center,
//         zoom: typeof lat === "number" && typeof lng === "number" ? 16 : 12,
//         mapTypeControl: false,
//         streetViewControl: false,
//         fullscreenControl: true,
//       });
//       markerRef.current = new google.maps.Marker({
//         position: center,
//         map: mapObj.current,
//         draggable: true,
//       });
//       // listener dasar
//       mapListeners.current.push(
//         google.maps.event.addListener(markerRef.current!, "dragend", () => {
//           const pos = markerRef.current?.getPosition();
//           if (pos) {
//             updateCoords(pos.lat(), pos.lng());
//             void reverseGeocodeToDesc(pos.lat(), pos.lng());
//           }
//         })
//       );
//       mapListeners.current.push(
//         google.maps.event.addListener(
//           mapObj.current!,
//           "click",
//           (e: google.maps.MapMouseEvent) => {
//             const ll = e.latLng;
//             if (ll) {
//               updateCoords(ll.lat(), ll.lng());
//               markerRef.current?.setPosition(ll);
//               void reverseGeocodeToDesc(ll.lat(), ll.lng());
//             }
//           }
//         )
//       );
//       geocoderRef.current = geocoderRef.current ?? new google.maps.Geocoder();
//       mapsReadyRef.current = true;
//     }

//     if (!mapObj.current) {
//       // fallback terakhir
//       window.alert("Map belum siap.");
//       return;
//     }

//     google.maps.event.trigger(mapObj.current, "resize");
//     const pos =
//       markerRef.current?.getPosition() ||
//       (typeof lat === "number" && typeof lng === "number"
//         ? new google.maps.LatLng(lat, lng)
//         : null);
//     if (pos) {
//       mapObj.current.setCenter(pos);
//       markerRef.current?.setPosition(pos);
//     }
//   }

//   // HANYA menampilkan info (tidak mengubah koordinat/state lain)
//   async function computeFromForm() {
//     const parts: string[] = [];
//     if (street.trim()) parts.push(street.trim()); // Street 1
//     if (district?.name) parts.push(String(district.name)); // Wilayah
//     if (zip.trim()) parts.push(zip.trim()); // Kode Pos
//     const q = parts.join(", ");

//     if (!q) {
//       setComputeMsg(
//         "Isi dulu minimal salah satu dari: Street 1, Wilayah, atau Kode Pos."
//       );
//       return;
//     }
//     if (!geocoderRef.current) {
//       setComputeMsg("Geocoder belum siap.");
//       return;
//     }

//     try {
//       const results = await geocodeReq({ address: q });
//       if (!results.length) {
//         setComputeMsg(`Lokasi tidak ditemukan untuk: ${q}`);
//         return;
//       }
//       const best = results[0];
//       const loc = best.geometry.location;
//       const latV = loc.lat();
//       const lngV = loc.lng();
//       const addr = best.formatted_address ?? "-";

//       // TAMPILKAN via Alert (inline), tidak mengubah lat/lng/map state
//       setComputeMsg(
//         `Query: ${q}\nKoordinat: ${latV}, ${lngV}\nAlamat: ${addr}`
//       );
//     } catch {
//       setComputeMsg("Gagal menghitung lokasi dari form.");
//     }
//   }

//   async function handleCopyMapDesc() {
//     if (!mapDesc) return;
//     try {
//       if (navigator?.clipboard?.writeText) {
//         await navigator.clipboard.writeText(mapDesc);
//       } else {
//         const ta = document.createElement("textarea");
//         ta.value = mapDesc;
//         ta.setAttribute("readonly", "");
//         ta.style.position = "absolute";
//         ta.style.left = "-9999px";
//         document.body.appendChild(ta);
//         ta.select();
//         document.execCommand("copy");
//         document.body.removeChild(ta);
//       }
//       setCopyState("ok");
//     } catch {
//       setCopyState("err");
//     } finally {
//       setTimeout(() => setCopyState("idle"), 1500);
//     }
//   }

//   // ===== Validation & submit =====
//   const canSubmit = useMemo(
//     () => name.trim() && street.trim() && !!district?.id,
//     [name, street, district]
//   );

//   function validate() {
//     const next: { name?: string; street?: string; district?: string } = {};
//     if (!name.trim()) next.name = t("addr.validation.nameRequired");
//     if (!street.trim()) next.street = t("addr.validation.streetRequired");
//     if (!district?.id) next.district = t("addr.validation.districtRequired");
//     setErrors(next);
//     return next;
//   }

//   async function doSubmit(payload: AddressPayload) {
//     const isUpdate = mode === "edit" && addressId != null;
//     const url = isUpdate
//       ? `${ADDRESS_POST_URL}/${addressId}`
//       : ADDRESS_POST_URL;
//     if (!url) throw new Error("Endpoint submit belum dikonfigurasi.");

//     const res = await fetch(url, {
//       method: isUpdate ? "PUT" : "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//         "Accept-Language": getLang(),
//       },
//       credentials: "include",
//       body: JSON.stringify(payload),
//     });

//     if (!res.ok) {
//       let reason = `Request failed: ${res.status}`;
//       try {
//         const j = await res.json();
//         if (typeof j?.message === "string") reason = j.message;
//         else if (Array.isArray(j?.detail) && j.detail[0]?.msg)
//           reason = j.detail[0].msg;
//         else if (typeof j?.detail === "string") reason = j.detail;
//       } catch {
//         /* ignore */
//       }
//       throw new Error(reason);
//     }

//     if (res.status === 204) return null;
//     try {
//       return await res.json();
//     } catch {
//       return null;
//     }
//   }

//   async function handleSave() {
//     const v = validate();
//     if (v.name || v.street || v.district) return;

//     const payload: AddressPayload = {
//       name: name.trim(),
//       street: street.trim(),
//       street2: street2.trim() || undefined,
//       district_id: (district?.id as number) ?? 0,
//       zip: zip.trim() || undefined,
//       email: email.trim() || undefined,
//       mobile: mobile.trim() || undefined,
//       latitude: typeof lat === "number" ? lat : undefined,
//       longitude: typeof lng === "number" ? lng : undefined,
//       map_description: mapDesc,
//     };

//     try {
//       const data = await doSubmit(payload);
//       onSuccess?.(data);
//     } catch (err) {
//       const msg = err instanceof Error ? err.message : "Gagal menyimpan data";
//       setErrors((p) => ({ ...p, name: p.name ?? msg }));
//     }
//   }

//   function handleDiscard() {
//     router.push("/orders/addresses/list");
//   }

//   if (!i18nReady) {
//     return (
//       <div className="space-y-4">
//         <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
//         <div className="h-40 animate-pulse rounded bg-slate-100" />
//       </div>
//     );
//   }

//   const rootClass = className ? className + " pb-24" : "pb-24";

//   return (
//     <div className={rootClass}>
//       {/* Warnings */}
//       {!ADDRESS_POST_URL || !LOCATION_DISTRIC_URL ? (
//         <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
//           Endpoint API belum dikonfigurasi (alamat/district). Periksa env.
//         </div>
//       ) : null}
//       {!GOOGLE_KEY ? (
//         <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
//           Google Maps API key belum dikonfigurasi.
//         </div>
//       ) : null}

//       {/* Sticky action bar */}
//       <div
//         className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70"
//         role="region"
//         aria-label="Form actions"
//       >
//         <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-2">
//           {/* LEFT: Compute paling kiri */}
//           <div className="flex items-center gap-2">
//             <Button type="button" variant="outline" onClick={computeFromForm}>
//               Compute based on address
//             </Button>
//           </div>

//           {/* RIGHT: Discard & Save */}
//           <div className="flex items-center gap-2">
//             <Button type="button" variant="ghost" onClick={handleDiscard}>
//               {t("common.discard")}
//             </Button>
//             <Button
//               type="button"
//               variant="solid"
//               disabled={!canSubmit}
//               onClick={handleSave}
//             >
//               {mode === "edit"
//                 ? t("addr.actions.update")
//                 : t("addr.actions.save")}
//             </Button>
//           </div>
//         </div>
//       </div>

//       <div className="flex flex-col sm:flex-row gap-6">
//         {/* ===== Left: Form ===== */}
//         <div className="md:basis-1/2 min-w-0 space-y-4">
//           {/* Name */}
//           <Field.Root
//             value={name || ""}
//             onChange={(v) => {
//               setName(v);
//               if (touched.name)
//                 setErrors((p) => ({
//                   ...p,
//                   name: v.trim()
//                     ? undefined
//                     : t("addr.validation.nameRequired"),
//                 }));
//             }}
//             onBlur={() => setTouched((p) => ({ ...p, name: true }))}
//             placeholder={t("addr.name.placeholder")}
//             ariaLabel={t("addr.name.aria")}
//             required
//             error={errors.name}
//             touched={touched.name}
//           >
//             <Field.Label>{t("addr.name.aria")}</Field.Label>
//             <Field.Control>
//               <Field.Input className="w-full" />
//               <Field.Error />
//             </Field.Control>
//           </Field.Root>

//           {/* Street */}
//           <Field.Root
//             value={street}
//             onChange={(v) => {
//               setStreet(v);
//               if (touched.street)
//                 setErrors((p) => ({
//                   ...p,
//                   street: v.trim()
//                     ? undefined
//                     : t("addr.validation.streetRequired"),
//                 }));
//             }}
//             onBlur={() => setTouched((p) => ({ ...p, street: true }))}
//             placeholder={t("addr.address.placeholder")}
//             error={errors.street}
//             touched={touched.street}
//             required
//             multiline
//             rows={3}
//           >
//             <Field.Label>{t("addr.address.label")}</Field.Label>
//             <Field.Control>
//               <Field.Textarea className="w-full" />
//               <Field.Error />
//             </Field.Control>
//           </Field.Root>

//           {/* Street 2 */}
//           <Field.Root
//             value={street2}
//             onChange={(v) => setStreet2(v)}
//             placeholder={t("addr.street2.placeholder")}
//             ariaLabel={t("addr.street2.aria")}
//             multiline
//             rows={2}
//           >
//             <Field.Label>{t("addr.street2.aria")}</Field.Label>
//             <Field.Control>
//               <Field.Textarea className="w-full" />
//               <Field.Error />
//             </Field.Control>
//           </Field.Root>

//           {/* District Autocomplete */}
//           <LookupAutocomplete
//             label={t("addr.district.aria")}
//             placeholder={t("addr.district.placeholder")}
//             value={district}
//             onChange={(d) => {
//               setDistrict(d);
//               if (touched.district) {
//                 setErrors((p) => ({
//                   ...p,
//                   district: d?.id
//                     ? undefined
//                     : t("addr.validation.districtRequired"),
//                 }));
//               }
//             }}
//             error={errors.district}
//             endpoint={{
//               url: `${LOCATION_DISTRIC_URL}`,
//               method: "GET",
//               queryParam: "query",
//               pageParam: "page",
//               pageSizeParam: "page_size",
//               page: 1,
//               pageSize: 80,
//               mapResults: normalizeResults,
//             }}
//             cacheNamespace="kota-muat"
//             prefetchQuery=""
//           />

//           {/* ZIP / Email / Phone */}
//           <Field.Root
//             value={zip}
//             onChange={setZip}
//             placeholder={t("addr.zip.placeholder")}
//             ariaLabel={t("addr.zip.aria")}
//           >
//             <Field.Label>{t("addr.zip.aria")}</Field.Label>
//             <Field.Control>
//               <Field.Input className="w-full" />
//               <Field.Error />
//             </Field.Control>
//           </Field.Root>

//           <Field.Root
//             value={email}
//             onChange={setEmail}
//             placeholder={t("addr.email.placeholder")}
//             ariaLabel={t("addr.email.label")}
//           >
//             <Field.Label>{t("addr.email.label")}</Field.Label>
//             <Field.Control>
//               <Field.Input className="w-full" />
//               <Field.Error />
//             </Field.Control>
//           </Field.Root>

//           <Field.Root
//             value={mobile}
//             onChange={setMobile}
//             placeholder={t("addr.phone.placeholder")}
//             ariaLabel={t("addr.phone.label")}
//           >
//             <Field.Label>{t("addr.phone.label")}</Field.Label>
//             <Field.Control>
//               <Field.Input className="w-full" />
//               <Field.Error />
//             </Field.Control>
//           </Field.Root>
//         </div>

//         {/* ===== Right: Map & tools ===== */}
//         <div className="md:basis-1/2 min-w-0 space-y-4">
//           <div className="space-y-2 rounded-xl border p-3">
//             {/* Hasil Compute (Alert.tsx) */}
//             {computeMsg && (
//               <Alert kind="info" className="whitespace-pre-line">
//                 {computeMsg}
//               </Alert>
//             )}

//             {/* Search & Refresh */}
//             <div className="flex items-center gap-2">
//               <input
//                 value={mapSearch}
//                 onChange={(e) => setMapSearch(e.target.value)}
//                 placeholder="Search place or address…"
//                 className="w-full rounded-md border px-3 py-2 text-sm"
//                 aria-label="Search address on map"
//               />
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => geocodeText(mapSearch)}
//               >
//                 Search
//               </Button>
//               <Button type="button" variant="outline" onClick={refreshMap}>
//                 Refresh
//               </Button>
//             </div>

//             {/* Map */}
//             <div
//               ref={mapRef}
//               className="relative h-[360px] w-full min-h-[280px] rounded-lg"
//               aria-label="Map"
//             />

//             {mapsError ? (
//               <p className="text-xs text-red-600">{String(mapsError)}</p>
//             ) : null}
//             {!GOOGLE_KEY ? (
//               <p className="text-xs text-amber-600">
//                 Google Maps API key belum dikonfigurasi.
//               </p>
//             ) : null}

//             {/* Coords readonly */}
//             <div className="grid grid-cols-1 gap-2">
//               <Field.Root
//                 value={lat != null ? String(lat) : ""}
//                 onChange={() => {}}
//                 ariaLabel="Latitude"
//                 disabled
//               >
//                 <Field.Label>Latitude</Field.Label>
//                 <Field.Control>
//                   <Field.Input className="w-full" disabled />
//                   <Field.Error />
//                 </Field.Control>
//               </Field.Root>

//               <Field.Root
//                 value={lng != null ? String(lng) : ""}
//                 onChange={() => {}}
//                 ariaLabel="Longitude"
//                 disabled
//               >
//                 <Field.Label>Longitude</Field.Label>
//                 <Field.Control>
//                   <Field.Input className="w-full" disabled />
//                   <Field.Error />
//                 </Field.Control>
//               </Field.Root>
//             </div>

//             {/* Map description — SELALU tampil */}
//             <div className="grid gap-1">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium">
//                   {t("addr.map.desc")}
//                 </span>
//                 <button
//                   type="button"
//                   onClick={handleCopyMapDesc}
//                   className="text-xs underline hover:opacity-80 focus:outline-none"
//                   aria-label="Copy map address"
//                   title="Copy map address"
//                 >
//                   {copyState === "ok" ? "Copied!" : "Copy map address"}
//                 </button>
//               </div>

//               <Field.Root
//                 value={mapDesc}
//                 onChange={() => {}}
//                 ariaLabel={t("addr.map.desc") as string}
//                 multiline
//                 rows={3}
//                 disabled
//               >
//                 <Field.Control>
//                   <Field.Textarea className="w-full" disabled />
//                   <Field.Error />
//                 </Field.Control>
//               </Field.Root>

//               {copyState === "err" && (
//                 <div className="text-xs text-amber-600">Failed to copy.</div>
//               )}
//             </div>

//             <p className="mt-1 text-xs text-slate-500">
//               Klik peta atau drag pin untuk memilih koordinat. Pencarian map
//               bersifat independen & tidak mengubah field Street.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
