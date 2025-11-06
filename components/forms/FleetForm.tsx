"use client";
import React, { useEffect, useState } from "react";
import { Field } from "@/components/form/FieldInput";
import LookupAutocomplete, {
  normalizeResults,
} from "@/components/form/LookupAutocomplete";
import { RecordItem } from "@/types/recorditem";
import { t } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Button } from "@/components/ui/Button";
import {
  FleetApiResponse,
  FleetFormController,
  FleetValues,
} from "@/features/fleet/FleetFormController";
import { useFormController } from "@/core/useFormController";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import MultiFileUpload from "@/components/form/MultiFileUpload";
import { ModalDialog } from "../ui/ModalDialog";

const MODELS_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_MODELS_URL ?? "";
const CATEGORIES_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_CATEGORIES_URL ?? "";

// /** Lightweight modal dialog (no external deps) */
// function ModalDialog({
//   open,
//   kind = "success",
//   title,
//   message,
//   onClose,
// }: {
//   open: boolean;
//   kind?: "success" | "error";
//   title: string;
//   message: React.ReactNode;
//   onClose: () => void;
// }) {
//   if (!open) return null;
//   const ring = kind === "success" ? "ring-green-500" : "ring-red-500";
//   const head = kind === "success" ? "text-green-700" : "text-red-700";
//   const btn =
//     kind === "success"
//       ? "bg-green-600 hover:bg-green-700"
//       : "bg-red-600 hover:bg-red-700";
//   return (
//     <div
//       className="fixed inset-0 z-[100] flex items-center justify-center"
//       role="dialog"
//       aria-modal="true"
//       onKeyDown={(e) => e.key === "Escape" && onClose()}
//     >
//       <div
//         className="absolute inset-0 bg-black/40 backdrop-blur-sm"
//         onClick={onClose}
//       />
//       <div
//         className={`relative mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ${ring}`}
//       >
//         <div className={`mb-2 text-lg font-semibold ${head}`}>{title}</div>
//         <div className="mb-4 text-sm text-gray-700">{message}</div>
//         <div className="flex justify-end">
//           <button
//             type="button"
//             onClick={onClose}
//             className={`inline-flex items-center rounded-lg px-4 py-2 text-white ${btn} focus:outline-none focus:ring`}
//           >
//             OK
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

export default function FleetFormPage({
  mode = "create",
  fleetId,
  initialData,
  onSuccess,
}: // className,
{
  mode?: "create" | "edit";
  fleetId?: number | string;
  initialData?: Partial<FleetValues>;
  onSuccess?: (data: FleetApiResponse | null) => void;
  // className?: string;
}) {
  const { ready: i18nReady } = useI18nReady();
  const router = useRouter();
  const init: FleetValues = {
    model: initialData?.model ?? null,
    model_year: initialData?.model_year ?? "",
    category: initialData?.category ?? null,
    license_plate: initialData?.license_plate ?? "",
    vin_sn: initialData?.vin_sn ?? "",
    engine_sn: initialData?.engine_sn ?? "",
    trailer_hook: initialData?.trailer_hook ?? false,
    tonnage_max: initialData?.tonnage_max ?? 0,
    cbm_volume: initialData?.cbm_volume ?? 0,
    color: initialData?.color ?? "",
    horsepower: initialData?.horsepower ?? 0,
    axle: initialData?.axle ?? "",
    acquisition_date: initialData?.acquisition_date ?? "",
    write_off_date: initialData?.write_off_date ?? "",
    kir: initialData?.kir ?? "",
    kir_expiry: initialData?.kir_expiry ?? "",
  };
  const [ctrl, snap] = useFormController(() => new FleetFormController(init));

  const toNum = (s: string) => {
    const n = Number(s.trim().replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  // NEW: submitting & dialog states
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

  function openErrorDialog(err: unknown) {
    const msg =
      (typeof err === "object" &&
        err !== null &&
        // @ts-expect-error best-effort parse
        (err.detail?.[0]?.msg || err.message || err.error)) ||
      String(err);
    setDlgKind("error");
    setDlgTitle(t("common.failed_to_save") ?? "Gagal menyimpan");
    setDlgMsg(
      <pre className="whitespace-pre-wrap text-xs text-red-700">{msg}</pre>
    );
    setDlgOpen(true);
  }

  async function onSave() {
    try {
      setSubmitting(true);
      const data = await ctrl.submit(mode, fleetId);
      onSuccess?.(data); // JANGAN diubah
      openSuccessDialog();
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!initialData) return;
    ctrl.setMany({
      model: initialData?.model ?? null,
      model_year: initialData?.model_year ?? "",
      category: initialData?.category ?? null,
      license_plate: initialData?.license_plate ?? "",
      vin_sn: initialData?.vin_sn ?? "",
      engine_sn: initialData?.engine_sn ?? "",
      trailer_hook: initialData?.trailer_hook ?? false,
      tonnage_max: initialData?.tonnage_max ?? 0,
      cbm_volume: initialData?.cbm_volume ?? 0,
      color: initialData?.color ?? "",
      horsepower: initialData?.horsepower ?? 0,
      axle: initialData?.axle ?? "",
      acquisition_date: initialData?.acquisition_date ?? "",
      write_off_date: initialData?.write_off_date ?? "",
      kir: initialData?.kir ?? "",
      kir_expiry: initialData?.kir_expiry ?? "",
    });
  }, [initialData, ctrl]);

  const [fleetFotoFiles, setFleetFotoFiles] = useState<File[]>([]);
  const [fleetSTNKDocFiles, setFleetSTNKDocFiles] = useState<File[]>([]);

  function handleDiscard() {
    router.push("/fleetndriver/fleet/list");
  }

  if (!i18nReady) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="pb-24">
      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleDiscard}>
            {t("common.discard")}
          </Button>
          <Button
            type="button"
            variant="solid"
            disabled={!snap.canSubmit || submitting}
            onClick={onSave}
          >
            {mode === "edit" ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h4 className="text-3xl font-semibold text-gray-800">Fleet Info</h4>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:basis-1/2 space-y-4">
              <Card>
                <CardHeader>Vehicle Detail</CardHeader>
                <CardBody>
                  <LookupAutocomplete
                    label={t("fleet.model")}
                    placeholder={t("common.search_model")}
                    value={snap.values.model as RecordItem}
                    onChange={(v) => ctrl.set("model", v as RecordItem)}
                    error={snap.errors.model}
                    endpoint={{
                      url: MODELS_URL,
                      method: "GET",
                      queryParam: "query",
                      pageParam: "page",
                      pageSizeParam: "page_size",
                      page: 1,
                      pageSize: 50,
                      mapResults: normalizeResults,
                    }}
                    cacheNamespace="fleet-models"
                    prefetchQuery=""
                  />

                  <Field.Root
                    value={snap.values.license_plate as string}
                    onChange={(v) => ctrl.set("license_plate", v)}
                  >
                    <Field.Label>{t("fleet.license_plate")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full uppercase" />
                      <Field.Error>{snap.errors.license_plate}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.model_year as string}
                    onChange={(v) => ctrl.set("model_year", v)}
                  >
                    <Field.Label>{t("fleet.model_year")}</Field.Label>
                    <Field.Control>
                      <Field.Input
                        inputMode="numeric"
                        className="w-full"
                        maxLength={4}
                      />
                      <Field.Error>{snap.errors.model_year}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.color as string}
                    onChange={(v) => ctrl.set("color", v)}
                  >
                    <Field.Label>{t("fleet.color")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" />
                      <Field.Error>{snap.errors.color}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <LookupAutocomplete
                    label={t("fleet.category")}
                    placeholder={t("common.search_category")}
                    value={snap.values.category as RecordItem}
                    onChange={(v) => ctrl.set("category", v as RecordItem)}
                    error={snap.errors.category}
                    endpoint={{
                      url: CATEGORIES_URL,
                      method: "GET",
                      queryParam: "query",
                      pageParam: "page",
                      pageSizeParam: "page_size",
                      page: 1,
                      pageSize: 50,
                      mapResults: normalizeResults,
                    }}
                    cacheNamespace="fleet-categories"
                    prefetchQuery=""
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader>Engine Detail</CardHeader>
                <CardBody>
                  <Field.Root
                    value={snap.values.vin_sn as string}
                    onChange={(v) => ctrl.set("vin_sn", v)}
                  >
                    <Field.Label>{t("fleet.vin_sn")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full uppercase" />
                      <Field.Error>{snap.errors.vin_sn}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.engine_sn as string}
                    onChange={(v) => ctrl.set("engine_sn", v)}
                  >
                    <Field.Label>{t("fleet.engine_sn")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full uppercase" />
                      <Field.Error>{snap.errors.engine_sn}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={String(snap.values.tonnage_max ?? 0)}
                    onChange={(v) => ctrl.set("tonnage_max", toNum(v))}
                  >
                    <Field.Label>{t("fleet.tonnage_max")} (ton)</Field.Label>
                    <Field.Control>
                      <Field.Input inputMode="decimal" className="w-full" />
                      <Field.Error>{snap.errors.tonnage_max}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={String(snap.values.cbm_volume ?? 0)}
                    onChange={(v) => ctrl.set("cbm_volume", toNum(v))}
                  >
                    <Field.Label>{t("fleet.cbm_volume")} (CBM)</Field.Label>
                    <Field.Control>
                      <Field.Input inputMode="decimal" className="w-full" />
                      <Field.Error>{snap.errors.cbm_volume}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={String(snap.values.horsepower ?? 0)}
                    onChange={(v) => ctrl.set("horsepower", toNum(v))}
                  >
                    <Field.Label>{t("fleet.horsepower")} (HP)</Field.Label>
                    <Field.Control>
                      <Field.Input inputMode="numeric" className="w-full" />
                      <Field.Error>{snap.errors.horsepower}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.axle as string}
                    onChange={(v) => ctrl.set("axle", v)}
                  >
                    <Field.Label>{t("fleet.axle")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" />
                      <Field.Error>{snap.errors.axle}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                </CardBody>
              </Card>
            </div>

            <div className="md:basis-1/2 space-y-3">
              <Field.Root
                value={snap.values.acquisition_date as string}
                onChange={(v) => ctrl.set("acquisition_date", v)}
              >
                <Field.Label>{t("fleet.acquisition_date")}</Field.Label>
                <Field.Control>
                  <Field.Input type="date" className="w-full" />
                  <Field.Error>{snap.errors.acquisition_date}</Field.Error>
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={snap.values.write_off_date as string}
                onChange={(v) => ctrl.set("write_off_date", v)}
              >
                <Field.Label>{t("fleet.write_off_date")}</Field.Label>
                <Field.Control>
                  <Field.Input type="date" className="w-full" />
                  <Field.Error>{snap.errors.write_off_date}</Field.Error>
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={snap.values.kir as string}
                onChange={(v) => ctrl.set("kir", v)}
              >
                <Field.Label>{t("fleet.kir")}</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full uppercase" />
                  <Field.Error>{snap.errors.kir}</Field.Error>
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={snap.values.kir_expiry as string}
                onChange={(v) => ctrl.set("kir_expiry", v)}
              >
                <Field.Label>{t("fleet.kir_expiry")}</Field.Label>
                <Field.Control>
                  <Field.Input type="date" className="w-full" />
                  <Field.Error>{snap.errors.kir_expiry}</Field.Error>
                </Field.Control>
              </Field.Root>

              <MultiFileUpload
                label={t("fleet.vehicle_foto")}
                value={fleetFotoFiles}
                onChange={setFleetFotoFiles}
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                maxFileSizeMB={10}
                maxFiles={10}
                hint={
                  t("orders.upload_hint_10mb") ??
                  "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                }
                onReject={(msgs) => console.warn("[SJ/POD] rejected:", msgs)}
                className="gap-3 justify-end"
                showImagePreview
              />

              <MultiFileUpload
                label={t("fleet.stnk_foto")}
                value={fleetSTNKDocFiles}
                onChange={setFleetSTNKDocFiles}
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                maxFileSizeMB={10}
                maxFiles={10}
                hint={
                  t("orders.upload_hint_10mb") ??
                  "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                }
                onReject={(msgs) => console.warn("[SJ/POD] rejected:", msgs)}
                className="gap-3 justify-end"
                showImagePreview
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* NEW: Modal dialog */}
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
