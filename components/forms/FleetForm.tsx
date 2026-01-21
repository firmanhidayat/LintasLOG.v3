"use client";
import React, { useEffect, useMemo, useState } from "react";
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

function getInitials(name?: string) {
  const s = (name ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}




function resolveImageSrc(raw?: string | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already a data URL
  if (trimmed.startsWith("data:")) return trimmed;

  // Absolute URLs
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Odoo relative image routes (keep this narrow; base64 JPEG may start with "/9j/")
  if (trimmed.startsWith("/web/") || trimmed.startsWith("/api/") || trimmed.startsWith("/tms/")) {
    return trimmed;
  }

  // Treat as RAW base64 (strip whitespace/newlines)
  const b64 = trimmed.replace(/\s+/g, "");

  const mime =
    b64.startsWith("/9j/") ? "image/jpeg" :
    b64.startsWith("iVBOR") ? "image/png" :
    b64.startsWith("R0lGOD") ? "image/gif" :
    b64.startsWith("UklGR") ? "image/webp" :
    "image/jpeg";

  return `data:${mime};base64,${b64}`;
}

function FleetAvatar({ name, src }: { name?: string; src?: string | null }) {
  const initials = useMemo(() => getInitials(name), [name]);

  return (
    <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm flex items-center justify-center">
      {src ? (
        <img
          src={src}
          alt={name ? `${name} avatar` : "avatar"}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-lg font-extrabold text-gray-700 select-none">
          {initials}
        </span>
      )}
    </div>
  );
}

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
    image_128: initialData?.image_128 ?? "",
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
  const [avatarInlineDataUrl, setAvatarInlineDataUrl] = useState<string | null>(null);

  const fleetNameForAvatar = useMemo(() => {
    const lp = (snap.values.license_plate as string | undefined)?.trim();
    if (lp) return lp;

    const getRecName = (v: unknown) => {
      if (!v || typeof v !== "object") return "";
      const rec = v as Record<string, unknown>;
      const a = rec["name"];
      if (typeof a === "string" && a.trim()) return a;
      const b = rec["display_name"];
      if (typeof b === "string" && b.trim()) return b;
      const c = rec["label"];
      if (typeof c === "string" && c.trim()) return c;
      return "";
    };

    const modelName = getRecName(snap.values.model);
    if (modelName) return modelName;
    const catName = getRecName(snap.values.category);
    if (catName) return catName;
    return "Fleet";
  }, [snap.values.license_plate, snap.values.model, snap.values.category]);

  // Avatar behavior:
  // - Default (no changes): display from image_128 (RAW base64 from BE)
  // - If user changes photo: send RAW base64 in image_1920
  // - If user removes photo: send image_1920 = "" (or null)
  // - If user edits without changing photo: omit image_1920 (undefined)
  const avatarRemoteSrc = useMemo(() => {
    const v =
      (snap.values.image_128 as string | undefined) ??
      (initialData?.image_128 as string | undefined) ??
      "";
    return resolveImageSrc(v);
  }, [snap.values.image_128, initialData?.image_128]);

  const avatarIsRemoved = useMemo(() => {
    const v = snap.values.image_1920 as string | null | undefined;
    return v === "" || v === null;
  }, [snap.values.image_1920]);

  const avatarSrc = avatarIsRemoved ? null : avatarInlineDataUrl ?? avatarRemoteSrc;


  // function handleClearUnitAttachments() {
  //   setUnitExistingFiles([]);
  //   ctrl.set("unit_attachment_id", 0);
  // }

  // function handleClearDocumentAttachments() {
  //   setDocExistingFiles([]);
  //   ctrl.set("document_attachment_id", 0);
  // }

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


  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Failed to read file"));
      r.onload = () => resolve(String(r.result ?? ""));
      r.readAsDataURL(file);
    });
  }

  async function handlePickAvatar(file: File) {
    // Preview using data URL and store RAW base64 to image_1920 for submit
    const dataUrl = await fileToDataUrl(file);
    setAvatarInlineDataUrl(dataUrl);

    const rawBase64 = String(dataUrl.split(",")[1] ?? "").trim();

    // set to form values; controller will include it in payload
    ctrl.set("image_1920", rawBase64);
  }

  function handleRemoveAvatar() {
    // Send empty string to clear on BE (compatible with Odoo image fields)
    setAvatarInlineDataUrl(null);
    ctrl.set("image_1920", "");
  }

  function handleResetAvatarToRemote() {
    // For edit mode: revert to remote image_128 (and omit changes)
    setAvatarInlineDataUrl(null);
    // Omit image_1920 to keep the remote image unchanged
    ctrl.setMany({ image_1920: undefined });
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

  function mapFleetGroupToExistingItems(
    group: FleetAttachmentGroup | null | undefined
  ): ExistingFileItem[] {
    const gid = typeof group?.id === "number" ? group.id : undefined;
    const atts = Array.isArray(group?.attachments) ? group.attachments : [];
    return atts
      .filter((a) => a && typeof a.id === "number")
      .map((att) => ({
        id: att.id,
        name: String(att.name ?? ""),
        url: String(att.url ?? ""),
        mimetype: String(att.mimetype ?? ""),
        groupId: gid,
      }));
  }

  async function fetchFleetAttachmentGroup(
    groupId: number
  ): Promise<FleetAttachmentGroup | null> {
    if (!ATTACHMENTS_URL || !groupId) return null;

    const url = `${ATTACHMENTS_URL}/${encodeURIComponent(
      String(groupId)
    )}?ts=${Date.now()}`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as unknown;
    if (!json || typeof json !== "object") return null;
    return json as FleetAttachmentGroup;
  }

  async function syncUnitAttachments(groupId?: number) {
    if (!groupId || groupId <= 0) return;
    const group = await fetchFleetAttachmentGroup(groupId);
    if (!group) return;
    setUnitHeaderName(group.name);
    setUnitExistingFiles(mapFleetGroupToExistingItems(group));
    ctrl.set("unit_attachment_id", groupId);
  }

  async function syncDocAttachments(groupId?: number) {
    if (!groupId || groupId <= 0) return;
    const group = await fetchFleetAttachmentGroup(groupId);
    if (!group) return;
    setDocHeaderName(group.name);
    setDocExistingFiles(mapFleetGroupToExistingItems(group));
    ctrl.set("document_attachment_id", groupId);
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
    let saved = false;
    let unitIdToSync = 0;
    let docIdToSync = 0;
    try {
      setSubmitting(true);
      if (mode === "create") {
        if (fleetFotoFiles.length > 0) {
          const unitId = await uploadDocumentAttachment(
            "fleet_unit",
            fleetFotoFiles
          );
          unitIdToSync = unitId ?? 0;
          if (typeof unitId === "number") {
            ctrl.set("unit_attachment_id", unitId);
          }
        }

        if (fleetSTNKDocFiles.length > 0) {
          const docId = await uploadDocumentAttachment(
            "fleet_document",
            fleetSTNKDocFiles
          );
          docIdToSync = docId ?? 0;
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
        unitIdToSync = currentUnitAttachmentId;

        const currentDocumentAttachmentId =
          (snapNow.values.document_attachment_id as number | undefined) ??
          initialData?.document_attachment_id ??
          0;
        docIdToSync = currentDocumentAttachmentId;

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

      await Promise.all([
        syncUnitAttachments(
          unitIdToSync || Number(ctrl.snapshot().values.unit_attachment_id ?? 0)
        ),
        syncDocAttachments(
          docIdToSync ||
            Number(ctrl.snapshot().values.document_attachment_id ?? 0)
        ),
      ]);
      saved = true;
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
      if (saved) router.refresh();
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
      image_128: initialData?.image_128 ?? "",
    });

    if (mode === "edit") {
      const unitGroup = initialData.unit_attachment;
      const docGroup = initialData.document_attachment;

      // setUnitHeaderName(initialData.document_attachment?.name);
      // setDocHeaderName(initialData.unit_attachment?.name);
      setUnitHeaderName(unitGroup?.name);
      setDocHeaderName(docGroup?.name);

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
            // disabled={!snap.canSubmit || submitting}
            disabled={submitting}
            onClick={onSave}
          >
            {mode === "edit" ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FleetAvatar name={fleetNameForAvatar} src={avatarSrc} />
            <div className="flex flex-col">
              <h4 className="text-3xl font-semibold text-gray-800">Fleet Info</h4>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.currentTarget.files?.[0];
                      e.currentTarget.value = "";
                      if (!f) return;
                      try {
                        await handlePickAvatar(f);
                      } catch (err) {
                        console.error(err);
                        openErrorDialog(err);
                      }
                    }}
                  />
                  Change Photo
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={handleRemoveAvatar}
                >
                  Remove
                </Button>

                {mode === "edit" && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={handleResetAvatarToRemote}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:basis-1/2 space-y-4">
              <Card>
                <CardHeader className="text-1xl font-extrabold">
                  Vehicle Detail
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-3">
                    <LookupAutocomplete
                      className="w-full"
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
                    <LookupAutocomplete
                      className="w-full"
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
                  </div>

                  <div className="w-full">
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      {t("fleet.trailer_hook") ?? "Truck Head"}
                    </label>

                    <label className="inline-flex w-full items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(snap.values.trailer_hook)}
                        onChange={(e) =>
                          ctrl.set("trailer_hook", e.target.checked)
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-800">
                        {Boolean(snap.values.trailer_hook)
                          ? t("common.yes") ?? "Yes"
                          : t("common.no") ?? "No"}
                      </span>
                    </label>

                    {snap.errors.trailer_hook && (
                      <div className="mt-1 text-xs text-red-600">
                        {snap.errors.trailer_hook}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-3 3xl:grid-cols-6 gap-2">
                    <Field.Root
                      value={snap.values.license_plate as string}
                      onChange={(v) => ctrl.set("license_plate", v)}
                    >
                      <Field.Label>{t("fleet.license_plate")}</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-full sm:w-40 uppercase" />
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
                          className="w-full sm:w-40"
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
                        <Field.Input className="w-full sm:w-40" />
                        <Field.Error>{snap.errors.color}</Field.Error>
                      </Field.Control>
                    </Field.Root>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="md:basis-1/2 space-y-3">
              <Card>
                <CardHeader className="text-1xl font-extrabold">
                  Engine Detail
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-1 xl:grid-cols-3 3xl:grid-cols-6 gap-2">
                    <Field.Root
                      value={snap.values.vin_sn as string}
                      onChange={(v) => ctrl.set("vin_sn", v)}
                    >
                      <Field.Label>{t("fleet.vin_sn")}</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-full  sm:w-40 uppercase" />
                        <Field.Error>{snap.errors.vin_sn}</Field.Error>
                      </Field.Control>
                    </Field.Root>

                    <Field.Root
                      value={snap.values.engine_sn as string}
                      onChange={(v) => ctrl.set("engine_sn", v)}
                    >
                      <Field.Label>{t("fleet.engine_sn")}</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-full  sm:w-40 uppercase" />
                        <Field.Error>{snap.errors.engine_sn}</Field.Error>
                      </Field.Control>
                    </Field.Root>

                    <Field.Root
                      value={String(snap.values.tonnage_max ?? 0)}
                      onChange={(v) => ctrl.set("tonnage_max", toNum(v))}
                    >
                      <Field.Label>{t("fleet.tonnage_max")} (ton)</Field.Label>
                      <Field.Control>
                        <Field.Input
                          inputMode="decimal"
                          className="w-full sm:w-40 "
                        />
                        <Field.Error>{snap.errors.tonnage_max}</Field.Error>
                      </Field.Control>
                    </Field.Root>

                    <Field.Root
                      value={String(snap.values.cbm_volume ?? 0)}
                      onChange={(v) => ctrl.set("cbm_volume", toNum(v))}
                    >
                      <Field.Label>{t("fleet.cbm_volume")} (CBM)</Field.Label>
                      <Field.Control>
                        <Field.Input
                          inputMode="decimal"
                          className="w-full sm:w-40 "
                        />
                        <Field.Error>{snap.errors.cbm_volume}</Field.Error>
                      </Field.Control>
                    </Field.Root>

                    {/* <Field.Root
                    value={String(snap.values.horsepower ?? 0)}
                    onChange={(v) => ctrl.set("horsepower", toNum(v))}
                  >
                    <Field.Label>{t("fleet.horsepower")} (HP)</Field.Label>
                    <Field.Control>
                      <Field.Input inputMode="numeric" className="w-full" />
                      <Field.Error>{snap.errors.horsepower}</Field.Error>
                    </Field.Control>
                  </Field.Root> */}

                    <Field.Root
                      value={snap.values.axle as string}
                      onChange={(v) => ctrl.set("axle", v)}
                    >
                      <Field.Label>{t("fleet.axle")}</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-full sm:w-40 " />
                        <Field.Error>{snap.errors.axle}</Field.Error>
                      </Field.Control>
                    </Field.Root>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
          <div className="mt-6">
            <Card>
              <CardHeader className="text-1xl font-extrabold">
                Vehicle Document
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-1 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
                  <Field.Root
                    value={snap.values.acquisition_date as string}
                    onChange={(v) => ctrl.set("acquisition_date", v)}
                  >
                    <Field.Label>{t("fleet.acquisition_date")}</Field.Label>
                    <Field.Control>
                      <Field.Input type="date" className="w-full sm:w-40" />
                      <Field.Error>{snap.errors.acquisition_date}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.write_off_date as string}
                    onChange={(v) => ctrl.set("write_off_date", v)}
                  >
                    <Field.Label>{t("fleet.write_off_date")}</Field.Label>
                    <Field.Control>
                      <Field.Input type="date" className="w-full sm:w-40" />
                      <Field.Error>{snap.errors.write_off_date}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.kir as string}
                    onChange={(v) => ctrl.set("kir", v)}
                  >
                    <Field.Label>{t("fleet.kir")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full sm:w-40 uppercase" />
                      <Field.Error>{snap.errors.kir}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.kir_expiry as string}
                    onChange={(v) => ctrl.set("kir_expiry", v)}
                  >
                    <Field.Label>{t("fleet.kir_expiry")}</Field.Label>
                    <Field.Control>
                      <Field.Input type="date" className="w-full sm:w-40" />
                      <Field.Error>{snap.errors.kir_expiry}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                </div>

                <div className="mt-6 space-y-6">
                  {/* FLEET UNIT PHOTO → doc_type=fleet_unit */}
                  <MultiFileUpload
                    label={t("fleet.vehicle_foto")}
                    value={fleetFotoFiles}
                    onChange={setFleetFotoFiles}
                    accept=".pdf,.jpeg,.jpg,.png,.bmp"
                    maxFileSizeMB={10}
                    maxFiles={10}
                    hint={t("fleet.hint_upload")}
                    onReject={(msgs) =>
                      console.warn("[FLEET_UNIT] rejected:", msgs)
                    }
                    className="gap-3 justify-end"
                    showImagePreview
                    existingItems={
                      mode === "edit" ? unitExistingFiles : undefined
                    }
                    existingHeader={
                      mode === "edit" ? unitHeaderName : undefined
                    }
                    onRemoveExisting={
                      mode === "edit" ? handleRemoveUnitExisting : undefined
                    }
                  />

                  {/* FLEET DOCUMENT (STNK) → doc_type=fleet_document */}
                  <MultiFileUpload
                    label={t("fleet.stnk_foto")}
                    value={fleetSTNKDocFiles}
                    onChange={setFleetSTNKDocFiles}
                    accept=".pdf,.jpeg,.jpg,.png,.bmp"
                    maxFileSizeMB={10}
                    maxFiles={10}
                    hint={t("fleet.hint_upload")}
                    onReject={(msgs) =>
                      console.warn("[FLEET_DOCUMENT] rejected:", msgs)
                    }
                    className="gap-3 justify-end"
                    showImagePreview
                    existingItems={
                      mode === "edit" ? docExistingFiles : undefined
                    }
                    existingHeader={mode === "edit" ? docHeaderName : undefined}
                    onRemoveExisting={
                      mode === "edit" ? handleRemoveDocExisting : undefined
                    }
                  />
                </div>
              </CardBody>
            </Card>
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
