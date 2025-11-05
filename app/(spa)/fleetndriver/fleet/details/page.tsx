"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FleetFormPage from "@/components/forms/FleetForm";
import type { FleetValues } from "@/features/fleet/FleetFormController";

const FLEET_DETAIL_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_URL ?? "";

export default function FleetDetailPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const fleetId = sp.get("id") ?? "";

  const [initialData, setInitialData] = useState<Partial<FleetValues> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${FLEET_DETAIL_URL}/${encodeURIComponent(fleetId)}`,
          {
            headers: { Accept: "application/json" },
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const j = await res.json();
        const mapped: Partial<FleetValues> = {
          model: j?.model ?? null,
          category: j?.category ?? null,
          license_plate: j?.license_plate ?? "",
          model_year: j?.model_year ?? "",
          vin_sn: j?.vin_sn ?? "",
          engine_sn: j?.engine_sn ?? "",
          trailer_hook: !!j?.trailer_hook,
          tonnage_max: Number(j?.tonnage_max ?? 0),
          cbm_volume: Number(j?.cbm_volume ?? 0),
          color: j?.color ?? "",
          horsepower: Number(j?.horsepower ?? 0),
          axle: j?.axle ?? "",
          acquisition_date: j?.acquisition_date ?? "",
          write_off_date: j?.write_off_date ?? "",
          kir: j?.kir ?? "",
          kir_expiry: j?.kir_expiry ?? "",
        };
        if (alive) setInitialData(mapped);
      } catch (e: unknown) {
        if (alive) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fleetId]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  if (err) return <div className="p-4 text-sm text-red-600">{err}</div>;
  if (!initialData) return <div className="p-4 text-sm">No data</div>;

  return (
    <FleetFormPage
      mode="edit"
      fleetId={fleetId}
      initialData={initialData}
      onSuccess={() =>
        router.replace(
          `/fleetndriver/fleet/details?id=${encodeURIComponent(
            fleetId
          )}&updated=1`
        )
      }
    />
  );
}
