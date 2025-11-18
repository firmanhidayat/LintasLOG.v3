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
import MultiFileUpload, {
  ExistingFileItem,
} from "@/components/form/MultiFileUpload";
import { ModalDialog } from "@/components/ui/ModalDialog";

const MODELS_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_MODELS_URL ?? "";
const CATEGORIES_URL = process.env.NEXT_PUBLIC_TMS_FLEETS_CATEGORIES_URL ?? "";
const ATTACHMENTS_URL =
  process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL ?? "";

type FleetDocType = "fleet_unit" | "fleet_document";
type FleetAttachmentGroup = {
  id: number;
  name: string;
  doc_type: string;
  attachments?: {
    id: number;
    name: string;
    mimetype: string;
    res_model: string;
    res_id: number;
    access_token: string;
    url: string;
  }[];
};

type FleetInitialData = Partial<FleetValues> & {
  unit_attachment?: FleetAttachmentGroup;
  document_attachment?: FleetAttachmentGroup;
};

export default function FleetFormPage({
  mode = "create",
  fleetId,
  initialData,
  onSuccess,
}: {
  mode?: "create" | "edit";
  fleetId?: number | string;
  initialData?: FleetInitialData;
  onSuccess?: (data: FleetApiResponse | null) => void;
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
    unit_attachment_id: initialData?.unit_attachment_id ?? 0,
    document_attachment_id: initialData?.document_attachment_id ?? 0,
  };
  const [ctrl, snap] = useFormController(() => new FleetFormController(init));

  const toNum = (s: string) => {
    const n = Number(s.trim().replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const [submitting, setSubmitting] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");

  const [fleetFotoFiles, setFleetFotoFiles] = useState<File[]>([]);
  const [fleetSTNKDocFiles, setFleetSTNKDocFiles] = useState<File[]>([]);
  const [unitExistingFiles, setUnitExistingFiles] = useState<
    ExistingFileItem[]
  >([]);
  const [docExistingFiles, setDocExistingFiles] = useState<ExistingFileItem[]>(
    []
  );
  const [unitHeaderName, setUnitHeaderName] = useState<string | undefined>();
  const [docHeaderName, setDocHeaderName] = useState<string | undefined>();

  function handleClearUnitAttachments() {
    setUnitExistingFiles([]);
    ctrl.set("unit_attachment_id", 0);
  }

  function handleClearDocumentAttachments() {
    setDocExistingFiles([]);
    ctrl.set("document_attachment_id", 0);
  }

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

  async function uploadDocumentAttachment(
    docType: FleetDocType,
    files: File[]
  ): Promise<number | undefined> {
    if (!files.length) return undefined;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const url = `${ATTACHMENTS_URL}?doc_type=${encodeURIComponent(docType)}`;

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to upload ${docType} attachments (${res.status} ${res.statusText}) ${text}`
      );
    }

    const json = (await res.json()) as { id?: number };
    if (typeof json.id !== "number") {
      throw new Error(
        `Unexpected response when uploading ${docType} attachments`
      );
    }
    return json.id;
  }

  async function appendFilesToExistingAttachment(
    docAttachmentId: number,
    files: File[]
  ): Promise<void> {
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const url = `${ATTACHMENTS_URL}/${encodeURIComponent(
      String(docAttachmentId)
    )}`;

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to append attachments (${res.status} ${res.statusText}) ${text}`
      );
    }
  }

  async function deleteRemoteAttachment(
    docAttachmentId: number,
    attachmentId: number
  ) {
    const url = `${ATTACHMENTS_URL}/${encodeURIComponent(
      String(docAttachmentId)
    )}/attachments/${encodeURIComponent(String(attachmentId))}`;

    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to delete attachment (${res.status} ${res.statusText}) ${text}`
      );
    }
  }

  async function handleRemoveUnitExisting(item: ExistingFileItem) {
    if (!item.groupId) {
      setUnitExistingFiles((prev) => prev.filter((it) => it.id !== item.id));
      return;
    }
    try {
      setSubmitting(true);
      await deleteRemoteAttachment(item.groupId, item.id);
      setUnitExistingFiles((prev) => prev.filter((it) => it.id !== item.id));
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveDocExisting(item: ExistingFileItem) {
    if (!item.groupId) {
      setDocExistingFiles((prev) => prev.filter((it) => it.id !== item.id));
      return;
    }
    try {
      setSubmitting(true);
      await deleteRemoteAttachment(item.groupId, item.id);
      setDocExistingFiles((prev) => prev.filter((it) => it.id !== item.id));
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave() {
    try {
      setSubmitting(true);
      if (mode === "create") {
        if (fleetFotoFiles.length > 0) {
          const unitId = await uploadDocumentAttachment(
            "fleet_unit",
            fleetFotoFiles
          );
          if (typeof unitId === "number") {
            ctrl.set("unit_attachment_id", unitId);
          }
        }

        if (fleetSTNKDocFiles.length > 0) {
          const docId = await uploadDocumentAttachment(
            "fleet_document",
            fleetSTNKDocFiles
          );
          if (typeof docId === "number") {
            ctrl.set("document_attachment_id", docId);
          }
        }
      } else if (mode === "edit") {
        const snapNow = ctrl.snapshot();
        console.log("BEFORE : ", snapNow);
        const currentUnitAttachmentId =
          (snapNow.values.unit_attachment_id as number | undefined) ??
          initialData?.unit_attachment_id ??
          0;
        const currentDocumentAttachmentId =
          (snapNow.values.document_attachment_id as number | undefined) ??
          initialData?.document_attachment_id ??
          0;

        if (fleetFotoFiles.length > 0) {
          if (currentUnitAttachmentId && currentUnitAttachmentId > 0) {
            await appendFilesToExistingAttachment(
              currentUnitAttachmentId,
              fleetFotoFiles
            );
          } else {
            const unitId = await uploadDocumentAttachment(
              "fleet_unit",
              fleetFotoFiles
            );
            if (typeof unitId === "number") {
              ctrl.set("unit_attachment_id", unitId);
            }
          }
        }

        console.log("AFTER : ", snapNow);

        // --- DOKUMEN STNK ---
        if (fleetSTNKDocFiles.length > 0) {
          if (currentDocumentAttachmentId && currentDocumentAttachmentId > 0) {
            await appendFilesToExistingAttachment(
              currentDocumentAttachmentId,
              fleetSTNKDocFiles
            );
          } else {
            // belum ada attachment → buat baru pakai doc_type=fleet_document
            const docId = await uploadDocumentAttachment(
              "fleet_document",
              fleetSTNKDocFiles
            );
            if (typeof docId === "number") {
              ctrl.set("document_attachment_id", docId);
            }
          }
        }
      }

      const data = await ctrl.submit(mode, fleetId);
      onSuccess?.(data);
      openSuccessDialog();

      setFleetFotoFiles([]);
      setFleetSTNKDocFiles([]);
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
      unit_attachment_id: initialData?.unit_attachment_id ?? 0,
      document_attachment_id: initialData?.document_attachment_id ?? 0,
    });

    if (mode === "edit") {
      const unitGroup = initialData.unit_attachment;
      const docGroup = initialData.document_attachment;

      setUnitHeaderName(initialData.document_attachment?.name);
      setDocHeaderName(initialData.unit_attachment?.name);

      if (unitGroup?.attachments?.length) {
        setUnitExistingFiles(
          unitGroup.attachments.map((att) => ({
            id: att.id,
            name: att.name,
            url: att.url,
            mimetype: att.mimetype,
            groupId: unitGroup.id,
          }))
        );
      } else {
        setUnitExistingFiles([]);
      }

      if (docGroup?.attachments?.length) {
        setDocExistingFiles(
          docGroup.attachments.map((att) => ({
            id: att.id,
            name: att.name,
            url: att.url,
            mimetype: att.mimetype,
            groupId: docGroup.id,
          }))
        );
      } else {
        setDocExistingFiles([]);
      }
    }
  }, [initialData, ctrl, mode]);
  // }, [initialData, ctrl]);

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

              {/* FLEET UNIT PHOTO → doc_type=fleet_unit */}
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
                onReject={(msgs) =>
                  console.warn("[FLEET_UNIT] rejected:", msgs)
                }
                className="gap-3 justify-end"
                showImagePreview
                existingItems={mode === "edit" ? unitExistingFiles : undefined}
                existingHeader={mode === "edit" ? unitHeaderName : undefined}
                onRemoveExisting={
                  mode === "edit" ? handleRemoveUnitExisting : undefined
                }
              />

              {/* FLEET DOCUMENT (STNK) → doc_type=fleet_document */}
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
                onReject={(msgs) =>
                  console.warn("[FLEET_DOCUMENT] rejected:", msgs)
                }
                className="gap-3 justify-end"
                showImagePreview
                existingItems={mode === "edit" ? docExistingFiles : undefined}
                existingHeader={mode === "edit" ? docHeaderName : undefined}
                onRemoveExisting={
                  mode === "edit" ? handleRemoveDocExisting : undefined
                }
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
