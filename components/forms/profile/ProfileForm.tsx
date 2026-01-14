"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "@/components/form/FieldInput";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import { ProfileFormController } from "@/features/profile/ProfileFormController";
import type {
  ProfileApiResponse,
  ProfileValues,
} from "@/features/profile/ProfileFormController";
import { useFormController } from "@/core/useFormController";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

import MultiFileUpload from "@/components/form/MultiFileUpload";
import type { ExistingFileItem } from "@/components/form/MultiFileUpload";
import type {
  ProfileDocType,
  ProfileDocumentAttachmentGroup,
} from "@/types/tms-profile";
import { getTimeZones, tzLabel } from "@/utils/timezone";
import LookupAutocomplete, {
  normalizeResults,
} from "@/components/form/LookupAutocomplete";
import type { RecordItem } from "@/types/recorditem";
import { LookupChipsField } from "@/components/lookup/LookupChipsField";

const ATTACHMENTS_URL =
  process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL ?? "";
const DISTRICT_URL = process.env.NEXT_PUBLIC_TMS_LOCATIONS_DISTRICT_URL!;
const USER_CATEGORIES_URL =
  process.env.NEXT_PUBLIC_TMS_USERS_CATEGORIES_URL ??
  process.env.NEXT_PUBLIC_TMS_USER_CATEGORIES_URL ??
  "/api-tms/users/categories";

const LOCATIONS_STATES_URL =
  process.env.NEXT_PUBLIC_TMS_LOCATIONS_STATES_URL ??
  "/api-tms/locations/states";

type LookupItem = {
  id: number;
  name: string;
  // display_name?: string;
  // [k: string]: unknown;
};

function safeNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const it of v) {
    const n = typeof it === "number" ? it : Number(String(it ?? "").trim());
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function buildUrl(base: string, params: URLSearchParams) {
  return base.includes("?")
    ? `${base}&${params.toString()}`
    : `${base}?${params.toString()}`;
}

function parseLookupList(payload: unknown): LookupItem[] {
  const obj =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  const list: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray(obj?.items)
    ? (obj?.items as unknown[])
    : Array.isArray(obj?.data)
    ? (obj?.data as unknown[])
    : Array.isArray(obj?.results)
    ? (obj?.results as unknown[])
    : [];

  const out: LookupItem[] = [];
  for (const it of list) {
    if (!it || typeof it !== "object") continue;
    const rec = it as Record<string, unknown>;
    const rawId = rec.id;
    const id =
      typeof rawId === "number" ? rawId : Number(String(rawId ?? "").trim());
    if (!Number.isFinite(id)) continue;

    const dn = rec.display_name;
    const nm = rec.name;
    const lb = rec.label;
    const name =
      typeof dn === "string"
        ? dn
        : typeof nm === "string"
        ? nm
        : typeof lb === "string"
        ? lb
        : `ID ${id}`;

    out.push({
      ...(rec as object),
      id,
      name,
      display_name: name,
    } as LookupItem);
  }
  return out;
}

function parseNamedItems(payload: unknown): LookupItem[] {
  if (!Array.isArray(payload)) return [];
  const out: LookupItem[] = [];
  for (const it of payload) {
    if (!it || typeof it !== "object") continue;
    const rec = it as Record<string, unknown>;
    const rawId = rec.id;
    const id =
      typeof rawId === "number" ? rawId : Number(String(rawId ?? "").trim());
    if (!Number.isFinite(id)) continue;

    const nm = rec.name;
    const dn = rec.display_name;
    const name =
      typeof nm === "string" ? nm : typeof dn === "string" ? dn : `ID ${id}`;

    out.push({ id, name } as LookupItem);
  }
  return out;
}

async function fetchUserCategories(params: {
  parentType: string;
  query: string;
  signal: AbortSignal;
  pageSize?: number;
}): Promise<LookupItem[]> {
  const qs = new URLSearchParams();
  qs.set("parent_type", params.parentType);
  qs.set("query", params.query);
  qs.set("page", "1");
  qs.set("page_size", String(params.pageSize ?? 50));

  const url = buildUrl(USER_CATEGORIES_URL, qs);
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: params.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to load categories (${res.status} ${res.statusText}) ${text}`
    );
  }
  const json = (await res.json().catch(() => null)) as unknown;
  return parseLookupList(json);
}

async function fetchLocationStates(params: {
  query: string;
  signal: AbortSignal;
  pageSize?: number;
}): Promise<LookupItem[]> {
  const qs = new URLSearchParams();
  qs.set("query", params.query);
  qs.set("page", "1");
  qs.set("page_size", String(params.pageSize ?? 50));

  const url = buildUrl(LOCATIONS_STATES_URL, qs);
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: params.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to load locations/states (${res.status} ${res.statusText}) ${text}`
    );
  }
  const json = (await res.json().catch(() => null)) as unknown;
  return parseLookupList(json);
}

type AvatarMode = "remote" | "preview" | "removed";

function guessImageMimeFromBase64(b64: string): string {
  const s = b64.trim().replace(/\s+/g, "");
  if (s.startsWith("/9j/")) return "image/jpeg";
  if (s.startsWith("iVBOR")) return "image/png";
  if (s.startsWith("R0lGOD")) return "image/gif";
  if (s.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

function toImageSrc(v?: string | null): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/web/") || trimmed.startsWith("/api/")) {
    return trimmed;
  }
  const cleaned = trimmed.replace(/\s+/g, "");
  const mime = guessImageMimeFromBase64(cleaned);
  return `data:${mime};base64,${cleaned}`;
}

function initialsFromName(name?: string): string {
  const s = (name ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
type ProfileInitialData = Partial<ProfileValues>;

type ExtendedProfileInitialData = ProfileInitialData & {
  transporter_coverage_area_ids?: number[];
  desired_delivery_category_ids?: number[];
  desired_industry_category_ids?: number[];
  certification_category_ids?: number[];

  transporter_coverage_area?: LookupItem[];
  desired_delivery_category?: LookupItem[];
  desired_industry_category?: LookupItem[];
  certification_category?: LookupItem[];
};

export default function ProfileFormPage({
  mode = "edit",
  profileId,
  initialData,
  onSuccess,
}: {
  mode?: "edit";
  profileId: number | string;
  initialData: ExtendedProfileInitialData;
  onSuccess: (data: ProfileApiResponse | null) => void;
}) {
  const { ready: i18nReady } = useI18nReady();
  const router = useRouter();
  const init: ProfileValues = {
    name: initialData?.name ?? "",
    street: initialData?.street ?? "",
    street2: initialData?.street2 ?? "",
    district_id: initialData?.district_id ?? 0,
    zip: initialData?.zip ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    mobile: initialData?.mobile ?? "",
    vat: initialData?.vat ?? "",
    no_ktp: initialData?.no_ktp ?? "",
    tz: initialData?.tz ?? "",
    transporter_verified: initialData?.transporter_verified ?? false,
    tms_user_type: initialData.tms_user_type ?? "",
    transporter_document_upload_instruction:
      initialData.transporter_document_upload_instruction ?? "",
    shipper_transporter_document_attachment:
      initialData.shipper_transporter_document_attachment as ProfileDocumentAttachmentGroup,
    shipper_transporter_document_attachment_id:
      initialData.shipper_transporter_document_attachment_id ?? 0,
    has_deliver_telco_medicaldevice_dangergoods:
      initialData.has_deliver_telco_medicaldevice_dangergoods ?? false,
    district: initialData?.district ?? null,
    image_128: initialData?.image_128,
    delivered_telco_medicaldevice_dangergoods:
      initialData?.delivered_telco_medicaldevice_dangergoods ?? "",

    transporter_coverage_area_ids: safeNumberArray(
      initialData?.transporter_coverage_area_ids
    ),
    desired_delivery_category_ids: safeNumberArray(
      initialData?.desired_delivery_category_ids
    ),
    desired_industry_category_ids: safeNumberArray(
      initialData?.desired_industry_category_ids
    ),
    certification_category_ids: safeNumberArray(
      initialData?.certification_category_ids
    ),
  };
  const tzOptions = useMemo(() => {
    const zones = getTimeZones();
    const withKey = zones.map((z) => ({ value: z, label: tzLabel(z) }));
    withKey.sort((a, b) => a.label.localeCompare(b.label));
    return withKey;
  }, []);

  const [ctrl, snap] = useFormController(() => new ProfileFormController(init));
  const [submitting, setSubmitting] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarMode, setAvatarMode] = useState<AvatarMode>("remote");
  const [avatarPreviewSrc, setAvatarPreviewSrc] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // --- Lookup chips selected items (UI) ---
  const [coverageAreaItems, setCoverageAreaItems] = useState<LookupItem[]>([]);
  const [desiredDeliveryItems, setDesiredDeliveryItems] = useState<
    LookupItem[]
  >([]);
  const [desiredIndustryItems, setDesiredIndustryItems] = useState<
    LookupItem[]
  >([]);
  const [certificationItems, setCertificationItems] = useState<LookupItem[]>(
    []
  );

  const remoteAvatarSrc = useMemo(() => {
    // Prefer the latest value in the form snapshot; fallback to initialData
    const raw =
      (snap.values.image_128 as string | undefined) ??
      (initialData?.image_128 as string | undefined);
    return toImageSrc(raw ?? null);
  }, [snap.values.image_128, initialData?.image_128]);

  const avatarSrc = useMemo(() => {
    if (avatarMode === "removed") return null;
    if (avatarMode === "preview") return avatarPreviewSrc;
    return remoteAvatarSrc;
  }, [avatarMode, avatarPreviewSrc, remoteAvatarSrc]);

  const avatarInitials = useMemo(() => {
    const nm =
      (snap.values.name as string | undefined) ??
      (initialData?.name as string | undefined) ??
      "";
    return initialsFromName(nm);
  }, [snap.values.name, initialData?.name]);

  async function handlePickAvatar(file: File) {
    setAvatarError(null);
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file (PNG/JPG/WEBP).");
      }
      const dataUrl = await fileToDataUrl(file);
      const parts = dataUrl.split(",");
      const rawBase64 = parts.length >= 2 ? parts.slice(1).join(",") : "";
      if (!rawBase64) throw new Error("Invalid image data");
      ctrl.setMany({ image_1920: rawBase64 });
      setAvatarPreviewSrc(dataUrl);
      setAvatarMode("preview");
    } catch (e) {
      console.error(e);
      setAvatarError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleRemoveAvatar() {
    setAvatarError(null);
    ctrl.setMany({ image_1920: "" });
    setAvatarPreviewSrc(null);
    setAvatarMode("removed");
  }

  function handleResetAvatarToRemote() {
    setAvatarError(null);
    ctrl.setMany({ image_1920: undefined });
    setAvatarPreviewSrc(null);
    setAvatarMode("remote");
  }

  const [profileDocumentFiles, setProfileDocumentFiles] = useState<File[]>([]);
  const [profileDocumentExistingFiles, setProfileDocumentExistingFiles] =
    useState<ExistingFileItem[]>([]);
  const [documentHeaderName, setDocumentHeaderName] = useState<
    string | undefined
  >();

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
    docType: ProfileDocType,
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

  function mapGroupToExistingItems(
    group: ProfileDocumentAttachmentGroup | null | undefined
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

  async function fetchAttachmentGroup(
    groupId: number
  ): Promise<ProfileDocumentAttachmentGroup | null> {
    if (!ATTACHMENTS_URL || !groupId) return null;
    const url = `${ATTACHMENTS_URL}/${encodeURIComponent(String(groupId))}`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as unknown;
    if (!json || typeof json !== "object") return null;
    return json as ProfileDocumentAttachmentGroup;
  }

  async function syncDocumentAttachments(groupId?: number) {
    if (!groupId || groupId <= 0) return;
    const group = await fetchAttachmentGroup(groupId);
    if (!group) return;

    setDocumentHeaderName(group.name);
    setProfileDocumentExistingFiles(mapGroupToExistingItems(group));
    ctrl.setMany({
      shipper_transporter_document_attachment_id: groupId,
      shipper_transporter_document_attachment: group,
    });
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

  async function handleRemoveDocumentExisting(item: ExistingFileItem) {
    if (!item.groupId) {
      setProfileDocumentExistingFiles((prev) =>
        prev.filter((it) => it.id !== item.id)
      );
      return;
    }
    try {
      setSubmitting(true);
      await deleteRemoteAttachment(item.groupId, item.id);
      setProfileDocumentExistingFiles((prev) =>
        prev.filter((it) => it.id !== item.id)
      );
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave() {
    let saved = false;
    let groupIdToSync = 0;

    try {
      setSubmitting(true);
      if (mode === "edit") {
        const snapNow = ctrl.snapshot();
        console.log("BEFORE : ", snapNow);
        const currenDocumentAttachmentId =
          (snapNow.values.shipper_transporter_document_attachment_id as
            | number
            | undefined) ??
          initialData?.shipper_transporter_document_attachment_id ??
          0;
        groupIdToSync = currenDocumentAttachmentId;
        if (profileDocumentFiles.length > 0) {
          console.log("profileDocumentFiles : ", profileDocumentFiles);
          if (currenDocumentAttachmentId && currenDocumentAttachmentId > 0) {
            await appendFilesToExistingAttachment(
              currenDocumentAttachmentId,
              profileDocumentFiles
            );
          } else {
            const docId = await uploadDocumentAttachment(
              "shipper_transporter_document",
              profileDocumentFiles
            );
            console.log(docId);
            if (typeof docId === "number") {
              ctrl.set("shipper_transporter_document_attachment_id", docId);
            }
          }
        }
        console.log("AFTER : ", snapNow);
      }
      console.log("CTRL : ", ctrl);
      console.log("ID: ", profileId);
      const data = await ctrl.submit(mode, profileId);
      onSuccess?.(data);
      openSuccessDialog();
      setProfileDocumentFiles([]);
      await syncDocumentAttachments(groupIdToSync);
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
    console.log("Initialdata : ", initialData);
    ctrl.setMany({
      name: initialData?.name ?? "",
      email: initialData?.email,
      mobile: initialData?.mobile ?? "",
      tz: initialData?.tz,
      vat: initialData?.vat,
      phone: initialData?.phone,
      tms_user_type: initialData?.tms_user_type,
      shipper_transporter_document_attachment_id:
        initialData?.shipper_transporter_document_attachment_id ?? 0,
      has_deliver_telco_medicaldevice_dangergoods:
        initialData.has_deliver_telco_medicaldevice_dangergoods ?? false,
      delivered_telco_medicaldevice_dangergoods:
        initialData?.delivered_telco_medicaldevice_dangergoods ?? "",

      transporter_coverage_area_ids: safeNumberArray(
        initialData?.transporter_coverage_area_ids
      ),
      desired_delivery_category_ids: safeNumberArray(
        initialData?.desired_delivery_category_ids
      ),
      desired_industry_category_ids: safeNumberArray(
        initialData?.desired_industry_category_ids
      ),
      certification_category_ids: safeNumberArray(
        initialData?.certification_category_ids
      ),
      district_id: initialData?.district_id ?? 0,
      street: initialData?.street ?? "",
      street2: initialData?.street2 ?? "",
      zip: initialData?.zip ?? "",
      image_128: initialData?.image_128,
      district: (initialData?.district as RecordItem | null) ?? null,
    });

    // Prefill chips from profile GET (server already provides name arrays)
    setCoverageAreaItems(
      parseNamedItems(initialData?.transporter_coverage_area)
    );
    setDesiredDeliveryItems(
      parseNamedItems(initialData?.desired_delivery_category)
    );
    setDesiredIndustryItems(
      parseNamedItems(initialData?.desired_industry_category)
    );
    setCertificationItems(parseNamedItems(initialData?.certification_category));

    if (mode === "edit") {
      const docGroup = initialData.shipper_transporter_document_attachment;
      setDocumentHeaderName(
        initialData.shipper_transporter_document_attachment?.name
      );
      if (docGroup?.attachments?.length) {
        setProfileDocumentExistingFiles(
          docGroup.attachments.map((att) => ({
            id: att.id,
            name: att.name,
            url: att.url,
            mimetype: att.mimetype,
            groupId: docGroup.id,
          }))
        );
      } else {
        setProfileDocumentExistingFiles([]);
      }
    }
  }, [initialData, ctrl, mode]);

  // Clear detail when unchecked (keeps payload clean)
  useEffect(() => {
    const checked = Boolean(
      snap.values.has_deliver_telco_medicaldevice_dangergoods
    );
    const detail = String(
      snap.values.delivered_telco_medicaldevice_dangergoods ?? ""
    );
    if (!checked && detail.trim()) {
      ctrl.set("delivered_telco_medicaldevice_dangergoods", "");
    }
  }, [
    snap.values.has_deliver_telco_medicaldevice_dangergoods,
    snap.values.delivered_telco_medicaldevice_dangergoods,
    ctrl,
  ]);

  function handleDiscard() {
    router.push("/");
  }
  if (!i18nReady) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  }
  return (
    <div className="pb-24">
      {dlgOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close dialog"
            onClick={() => setDlgOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <div
                  className={
                    "text-sm font-extrabold " +
                    (dlgKind === "error" ? "text-red-700" : "text-emerald-700")
                  }
                >
                  {dlgTitle}
                </div>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setDlgOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 text-sm text-gray-800">{dlgMsg}</div>
            <div className="flex justify-end gap-2 px-4 py-3">
              <Button
                type="button"
                variant="solid"
                onClick={() => setDlgOpen(false)}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

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
          <h4 className="text-3xl font-semibold text-gray-800">Profile Info</h4>
        </CardHeader>
        <CardBody>
          <div className="gap-6 space-y-6 mb-6">
            <Card>
              <CardBody>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt="Profile photo"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-extrabold text-gray-500">
                          {avatarInitials}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold text-gray-800">
                        {(snap.values.name as string) || "—"}
                      </div>
                      <div className="truncate text-sm text-gray-500">
                        {(snap.values.email as string) || "—"}
                      </div>

                      {avatarError && (
                        <div className="mt-2 text-xs font-semibold text-red-700">
                          {avatarError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.currentTarget.files?.[0] ?? null;
                        // allow picking the same file again
                        e.currentTarget.value = "";
                        if (f) void handlePickAvatar(f);
                      }}
                    />

                    <Button
                      type="button"
                      variant="solid"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                    >
                      Change Photo
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResetAvatarToRemote}
                      disabled={submitting}
                    >
                      Reset
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveAvatar}
                      disabled={submitting}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {/* <div className="mt-3 text-xs text-gray-500">
                Jika diminta redaksi apa pun terkait foto profil
              </div> */}
              </CardBody>
            </Card>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>Name & Address</CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <Field.Root
                    value={snap.values.name as string}
                    onChange={(v) => ctrl.set("name", v)}
                  >
                    <Field.Label>
                      {t("pages.maccount.edit.label.name")}
                    </Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" placeholder="Fullname" />
                      <Field.Error>{snap.errors.name}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.street as string}
                    onChange={(v) => ctrl.set("street", v)}
                  >
                    <Field.Label>Address</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" placeholder="Street" />
                      <Field.Error>{snap.errors.street}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.street2 as string}
                    onChange={(v) => ctrl.set("street2", v)}
                  >
                    <Field.Control>
                      <Field.Input className="w-full" placeholder="Street 2" />
                      <Field.Error>{snap.errors.street2}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <LookupAutocomplete
                    label="District"
                    placeholder={t("common.search_district")}
                    value={(snap.values.district as RecordItem | null) ?? null}
                    onChange={(v) => {
                      const rec = v as RecordItem | null;
                      ctrl.setMany({
                        district: rec,
                        district_id: Number(rec?.id ?? 0),
                      });
                    }}
                    error={
                      (snap.errors.district as string) ??
                      snap.errors.district_id
                    }
                    endpoint={{
                      url: DISTRICT_URL,
                      method: "GET",
                      queryParam: "query",
                      pageParam: "page",
                      pageSizeParam: "page_size",
                      page: 1,
                      pageSize: 50,
                      mapResults: normalizeResults,
                    }}
                    cacheNamespace="district-profile"
                    prefetchQuery=""
                  />

                  <Field.Root
                    value={snap.values.zip as string}
                    onChange={(v) => ctrl.set("zip", v)}
                  >
                    <Field.Label>ZIP</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" placeholder="Zip" />
                      <Field.Error>{snap.errors.zip}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>Contact & Other Info</CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <Field.Root
                    value={snap.values.email as string}
                    onChange={(v) => ctrl.set("email", v)}
                    readOnly={mode === "edit"}
                  >
                    <Field.Label>
                      {t("pages.maccount.edit.label.email")}
                    </Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" placeholder="Email" />
                      <Field.Error>{snap.errors.email}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <Field.Root
                    value={snap.values.vat as string}
                    onChange={(v) => ctrl.set("vat", v)}
                  >
                    <Field.Label>NPWP Number</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" placeholder="NPWP" />
                      <Field.Error>{snap.errors.vat}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <Field.Root
                    value={snap.values.mobile as string}
                    onChange={(v) => ctrl.set("mobile", v)}
                  >
                    <Field.Label>
                      {t("pages.maccount.edit.label.mobile")}
                    </Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" placeholder="Mobile" />
                      <Field.Error>{snap.errors.mobile}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <Field.Root
                    value={snap.values.phone as string}
                    onChange={(v) => ctrl.set("phone", v)}
                  >
                    <Field.Label>
                      {t("pages.maccount.edit.label.phone")}
                    </Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" placeholder="Phone" />
                      <Field.Error>{snap.errors.phone}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.tz as string}
                    onChange={(v) => ctrl.set("tz", v)}
                  >
                    <Field.Label>
                      {t("pages.maccount.edit.label.tz")}
                    </Field.Label>
                    <Field.Control>
                      <Field.DropDownSelect
                        placeholderOption="Timezone"
                        options={tzOptions}
                      />
                      <Field.Error>{snap.errors.tz}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                </div>
              </CardBody>
            </Card>

            {/* Group 2.5: Preferences */}
            <Card className="lg:col-span-2">
              <CardHeader>Preferences</CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Transporter capability */}
                  {snap.values.tms_user_type === "transporter" && (
                    <div className="space-y-4">
                      <div className="w-full">
                        <label className="mb-1 mt-0 block text-xs font-semibold text-gray-700">
                          {
                            "Has deliver telco, medical device, dangerous goods?"
                          }
                        </label>
                        <label className="inline-flex w-full items-center gap-3 rounded-md bg-white px-3 py-2">
                          <input
                            type="checkbox"
                            checked={Boolean(
                              snap.values
                                .has_deliver_telco_medicaldevice_dangergoods
                            )}
                            onChange={(e) =>
                              ctrl.set(
                                "has_deliver_telco_medicaldevice_dangergoods",
                                e.target.checked
                              )
                            }
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-gray-800">
                            {Boolean(
                              snap.values
                                .has_deliver_telco_medicaldevice_dangergoods
                            )
                              ? t("common.yes") ?? "Yes"
                              : t("common.no") ?? "No"}
                          </span>
                        </label>
                        {snap.errors
                          .has_deliver_telco_medicaldevice_dangergoods && (
                          <div className="mt-1 text-xs text-red-600">
                            {
                              snap.errors
                                .has_deliver_telco_medicaldevice_dangergoods
                            }
                          </div>
                        )}
                      </div>

                      {Boolean(
                        snap.values.has_deliver_telco_medicaldevice_dangergoods
                      ) && (
                        <Field.Root
                          value={
                            (snap.values
                              .delivered_telco_medicaldevice_dangergoods as string) ??
                            ""
                          }
                          onChange={(v) =>
                            ctrl.set(
                              "delivered_telco_medicaldevice_dangergoods",
                              v
                            )
                          }
                        >
                          <Field.Label>
                            Delivered telco/medical/dangerous goods detail
                          </Field.Label>
                          <Field.Control>
                            <Field.Input
                              className="w-full"
                              placeholder="Contoh: Telco equipment, medical device, DG (SOP/handling)"
                            />
                            <Field.Error>
                              {
                                snap.errors
                                  .delivered_telco_medicaldevice_dangergoods
                              }
                            </Field.Error>
                          </Field.Control>
                        </Field.Root>
                      )}
                    </div>
                  )}

                  {/* Coverage area */}
                  {snap.values.tms_user_type === "transporter" && (
                    <div className="space-y-2">
                      <LookupChipsField<LookupItem>
                        label="Transporter Coverage Area"
                        value={coverageAreaItems}
                        onChange={(next) => {
                          setCoverageAreaItems(next);
                          ctrl.set(
                            "transporter_coverage_area_ids",
                            next.map((x) => x.id)
                          );
                        }}
                        fetcher={({ query, signal }) =>
                          fetchLocationStates({ query, signal })
                        }
                        getId={(it) => it.id}
                        getLabel={(it) => it.name}
                        placeholder="Cari area cakupan (provinsi/state)..."
                      />
                      {snap.errors.transporter_coverage_area_ids && (
                        <div className="text-xs text-red-600">
                          {snap.errors.transporter_coverage_area_ids as string}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Desired delivery category */}
                  {snap.values.tms_user_type === "transporter" && (
                    <div className="space-y-2">
                      <LookupChipsField<LookupItem>
                        label="Desired Delivery Category"
                        value={desiredDeliveryItems}
                        onChange={(next) => {
                          setDesiredDeliveryItems(next);
                          ctrl.set(
                            "desired_delivery_category_ids",
                            next.map((x) => x.id)
                          );
                        }}
                        fetcher={({ query, signal }) =>
                          fetchUserCategories({
                            parentType: "desired_delivery",
                            query,
                            signal,
                          })
                        }
                        getId={(it) => it.id}
                        getLabel={(it) => it.name}
                        placeholder="Cari kategori delivery..."
                      />
                      {snap.errors.desired_delivery_category_ids && (
                        <div className="text-xs text-red-600">
                          {snap.errors.desired_delivery_category_ids as string}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Desired industry category */}
                  {/* {snap.values.tms_user_type === "transporter" && (} */}
                  <div className="space-y-2">
                    <LookupChipsField<LookupItem>
                      label={snap.values.tms_user_type === "transporter" ? "Desired Industry Category" : "Industries"}
                      value={desiredIndustryItems}
                      onChange={(next) => {
                        setDesiredIndustryItems(next);
                        ctrl.set(
                          "desired_industry_category_ids",
                          next.map((x) => x.id)
                        );
                      }}
                      fetcher={({ query, signal }) =>
                        fetchUserCategories({
                          parentType: "desired_delivery_industry",
                          query,
                          signal,
                        })
                      }
                      getId={(it) => it.id}
                      getLabel={(it) => it.name}
                      placeholder="Cari kategori industry..."
                    />
                    {snap.errors.desired_industry_category_ids && (
                      <div className="text-xs text-red-600">
                        {snap.errors.desired_industry_category_ids as string}
                      </div>
                    )}
                  </div>

                  {/* Certification category */}
                  {snap.values.tms_user_type === "transporter" && (
                    <div className="space-y-2">
                      <LookupChipsField<LookupItem>
                        label="Certification Category"
                        value={certificationItems}
                        onChange={(next) => {
                          setCertificationItems(next);
                          ctrl.set(
                            "certification_category_ids",
                            next.map((x) => x.id)
                          );
                        }}
                        fetcher={({ query, signal }) =>
                          fetchUserCategories({
                            parentType: "certification",
                            query,
                            signal,
                          })
                        }
                        getId={(it) => it.id}
                        getLabel={(it) => it.name}
                        placeholder="Cari sertifikasi..."
                      />
                      {snap.errors.certification_category_ids && (
                        <div className="text-xs text-red-600">
                          {snap.errors.certification_category_ids as string}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Group 3: Upload Document */}
            <Card className="lg:col-span-2">
              <CardHeader>Upload Document</CardHeader>
              <CardBody>
                <MultiFileUpload
                  label="Document"
                  value={profileDocumentFiles}
                  onChange={setProfileDocumentFiles}
                  accept=".pdf,.jpeg,.jpg,.png,.bmp"
                  maxFileSizeMB={10}
                  maxFiles={20}
                  otherTerms={`${snap.values.transporter_document_upload_instruction}`}
                  hint={`Maks. 10 MB per file. Tipe: PDF, JPEG, PNG, BMP.`}
                  onReject={(msgs) =>
                    console.warn("[PROFILE DOCUMENT] rejected:", msgs)
                  }
                  className="gap-3 justify-end"
                  showImagePreview
                  existingItems={
                    mode === "edit" ? profileDocumentExistingFiles : undefined
                  }
                  existingHeader={
                    mode === "edit" ? documentHeaderName : undefined
                  }
                  onRemoveExisting={
                    mode === "edit" ? handleRemoveDocumentExisting : undefined
                  }
                />
              </CardBody>
            </Card>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
