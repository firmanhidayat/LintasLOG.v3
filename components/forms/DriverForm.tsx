"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/form/FieldInput";
import LookupAutocomplete, {
  normalizeResults,
} from "@/components/form/LookupAutocomplete";
import { RecordItem } from "@/types/recorditem";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  DriverApiResponse,
  DriverFormController,
  DriverValues,
} from "@/features/driver/DriverFormController";
import { useFormController } from "@/core/useFormController";
import MultiFileUpload, {
  ExistingFileItem,
} from "@/components/form/MultiFileUpload";
import FieldPassword from "@/components/form/FieldPassword";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ModalDialog } from "../ui/ModalDialog";

const DISTRICT_URL = process.env.NEXT_PUBLIC_TMS_LOCATIONS_DISTRICT_URL!;
const ATTACHMENTS_URL =
  process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL ?? "";

type DriverDoctType = "driver_document";
type DriverAttachmentGroup = {
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

type DriverInitialData = Partial<DriverValues> & {
  driver_document_attachment?: DriverAttachmentGroup;
};

function getInitials(name?: string) {
  const s = (name ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function guessImageMimeFromBase64(raw: string): string {
  const s = raw.trim();
  if (s.startsWith("/9j/")) return "image/jpeg";
  if (s.startsWith("iVBOR")) return "image/png";
  if (s.startsWith("R0lGOD")) return "image/gif";
  if (s.startsWith("UklGR")) return "image/webp";
  if (s.startsWith("Qk")) return "image/bmp";
  return "image/jpeg";
}

function resolveImageSrc(raw?: string | null): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (v.startsWith("data:")) return v;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const cleaned = v.replace(/\s+/g, "");
  const mime = guessImageMimeFromBase64(cleaned);
  return `data:${mime};base64,${cleaned}`;
}

function DriverAvatar({ name, src }: { name?: string; src?: string | null }) {
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

export default function DriverFormPage({
  mode = "create",
  driverId,
  initialData,
  onSuccess,
}: {
  mode?: "create" | "edit";
  driverId?: number | string;
  initialData?: DriverInitialData;
  onSuccess?: (data: DriverApiResponse | null) => void;
}) {
  const { ready: i18nReady } = useI18nReady();
  const router = useRouter();
  const init: DriverValues = {
    name: initialData?.name ?? "",
    no_ktp: initialData?.no_ktp ?? "",
    mobile: initialData?.mobile ?? "",
    street: initialData?.street ?? "",
    street2: initialData?.street2 ?? "",
    district: initialData?.district ?? null,
    district_id: initialData?.district_id ?? 0,
    zip: initialData?.zip ?? "",
    drivers_license: initialData?.drivers_license ?? "",
    drivers_license_expiry: initialData?.drivers_license_expiry ?? "",
    login: initialData?.login ?? "",
    password: initialData?.password ?? "",
    driver_document_attachment_id:
      initialData?.driver_document_attachment_id ?? null,
    image_128: initialData?.image_128 ?? "",
    // driver_document_attachment: initialData?.driver_document_attachment ?? null,
  };
  const [ctrl, snap] = useFormController(
    () => new DriverFormController(mode, init)
  );
  const [submitting, setSubmitting] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");
  const [confirm, setConfirm] = useState("");

  const [driverDocumentFiles, setDriverDocumentFiles] = useState<File[]>([]);
  const [driverDocumentExistingFiles, setDriverDocumentExistingFiles] =
    useState<ExistingFileItem[]>([]);
  const [driverDocumentHeaderName, setDriverDocumentHeaderName] = useState<
    string | undefined
  >();

  // Avatar behavior (decoupled from attachments upload below):
  // - Default (no changes): display from image_128 (RAW base64 from BE)
  // - If user changes photo: send RAW base64 in image_1920
  // - If user removes photo: send image_1920 = "" (or null)
  // - If user edits without changing photo: omit image_1920 (undefined)
  const [avatarInlineDataUrl, setAvatarInlineDataUrl] =
    useState<string | null>(null);

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

  function handleClearDocumentAttachments() {
    setDriverDocumentExistingFiles([]);
    ctrl.set("driver_document_attachment_id", 0);
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
        // @ts-expect-error best-effort parse for typical API error shapes
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
    ctrl.setMany({ image_1920: undefined });
  }

  async function uploadDocumentAttachment(
    docType: DriverDoctType,
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
  function mapDriverGroupToExistingItems(
    group: DriverAttachmentGroup | null | undefined
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

  async function fetchDriverAttachmentGroup(
    groupId: number
  ): Promise<DriverAttachmentGroup | null> {
    if (!ATTACHMENTS_URL || !groupId) return null;

    // tambahin ts utk bust cache
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
    return json as DriverAttachmentGroup;
  }

  async function syncDriverDocumentAttachments(groupId?: number) {
    if (!groupId || groupId <= 0) return;

    const group = await fetchDriverAttachmentGroup(groupId);
    if (!group) return;

    setDriverDocumentHeaderName(group.name);
    setDriverDocumentExistingFiles(mapDriverGroupToExistingItems(group));

    // pastikan ctrl sinkron kalau id berubah
    ctrl.set("driver_document_attachment_id", groupId);
  }

  async function handleRemoveExistingDriverDoc(item: ExistingFileItem) {
    if (!item.groupId) {
      setDriverDocumentExistingFiles((prev) =>
        prev.filter((it) => it.id !== item.id)
      );
      return;
    }
    try {
      setSubmitting(true);
      await deleteRemoteAttachment(item.groupId, item.id);
      setDriverDocumentExistingFiles((prev) =>
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
      if (mode === "create" && snap.values.password) {
        if (snap.values.password !== confirm) {
          alert(
            t("signup.errors.passwordMismatch") ||
              "Password confirmation doesn't match."
          );
          setSubmitting(false);
          return;
        }
      }
      console.log(driverDocumentFiles);
      if (mode === "create") {
        if (driverDocumentFiles.length > 0) {
          const unitId = await uploadDocumentAttachment(
            "driver_document",
            driverDocumentFiles
          );
          groupIdToSync = unitId ?? 0;
          if (typeof unitId === "number") {
            ctrl.set("driver_document_attachment_id", unitId);
          }
        }
      } else if (mode === "edit") {
        const snapNow = ctrl.snapshot();
        console.log("BEFORE : ", snapNow);
        const currentDocumentAttachmentId =
          (snapNow.values.driver_document_attachment_id as
            | number
            | undefined) ??
          initialData?.driver_document_attachment_id ??
          0;
        groupIdToSync = currentDocumentAttachmentId
        if (driverDocumentFiles.length > 0) {
          if (currentDocumentAttachmentId && currentDocumentAttachmentId > 0) {
            await appendFilesToExistingAttachment(
              currentDocumentAttachmentId,
              driverDocumentFiles
            );
          } else {
            const unitId = await uploadDocumentAttachment(
              "driver_document",
              driverDocumentFiles
            );
            if (typeof unitId === "number") {
              ctrl.set("driver_document_attachment_id", unitId);
            }
          }
        }
        console.log("AFTER : ", snapNow);
      }

      const data = await ctrl.submit(mode, driverId);
      onSuccess?.(data);
      openSuccessDialog();
      setDriverDocumentFiles([]);
      await syncDriverDocumentAttachments(
        groupIdToSync ||
          Number(ctrl.snapshot().values.driver_document_attachment_id ?? 0)
      );
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
      name: initialData?.name ?? "",
      no_ktp: initialData?.no_ktp ?? "",
      mobile: initialData?.mobile ?? "",
      street: initialData?.street ?? "",
      street2: initialData?.street2 ?? "",
      district: initialData?.district ?? null,
      district_id: initialData?.district_id ?? 0,
      zip: initialData?.zip ?? "",
      drivers_license: initialData?.drivers_license ?? "",
      drivers_license_expiry: initialData?.drivers_license_expiry ?? "",
      login: initialData?.login ?? "",
      password: "",
      driver_document_attachment_id:
        initialData?.driver_document_attachment_id ?? null,
      // driver_document_attachment:
      //   initialData?.driver_document_attachment ?? null,
    });
    setConfirm("");
    if (mode === "edit") {
      const docGroup = initialData.driver_document_attachment;
      setDriverDocumentHeaderName(initialData.driver_document_attachment?.name);

      if (docGroup?.attachments?.length) {
        setDriverDocumentExistingFiles(
          docGroup.attachments.map((att) => ({
            id: att.id,
            name: att.name,
            url: att.url,
            mimetype: att.mimetype,
            groupId: docGroup.id,
          }))
        );
      } else {
        setDriverDocumentExistingFiles([]);
      }
      // } else {
      //   setDriverDocumentHeaderName(undefined);
      //   setDriverDocumentExistingFiles([]);
      // }
    }
  }, [initialData, ctrl, mode]);

  function handleDiscard() {
    router.push("/fleetndriver/driver/list");
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
            {mode === "edit"
              ? t("common.update") ?? "Update"
              : t("common.save") ?? "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <DriverAvatar name={snap.values.name as string} src={avatarSrc} />
            <div className="flex flex-col">
              <h4 className="text-3xl font-semibold text-gray-800">
                Driver Info
              </h4>
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
                  Personal Info
                </CardHeader>
                <CardBody>
                  <Field.Root
                    value={snap.values.name as string}
                    onChange={(v) => ctrl.set("name", v)}
                  >
                    <Field.Label>{t("driver.name")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" />
                      <Field.Error>{snap.errors.name}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <Field.Root
                    value={snap.values.mobile as string}
                    onChange={(v) => ctrl.set("mobile", v)}
                  >
                    <Field.Label>{t("driver.mobile")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-64 uppercase" />
                      <Field.Error>{snap.errors.mobile}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <Field.Root
                    value={snap.values.street as string}
                    onChange={(v) => ctrl.set("street", v)}
                  >
                    <Field.Label>{t("driver.street")}</Field.Label>
                    <Field.Control>
                      <Field.Textarea rows={1} className="w-full" />
                      <Field.Error>{snap.errors.street}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.street2 as string}
                    onChange={(v) => ctrl.set("street2", v)}
                  >
                    <Field.Label>{t("driver.street2")}</Field.Label>
                    <Field.Control>
                      <Field.Textarea rows={1} className="w-full" />
                      <Field.Error>{snap.errors.street2}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <LookupAutocomplete
                    label={t("driver.district")}
                    placeholder={t("common.search_district")}
                    value={snap.values.district as RecordItem}
                    onChange={(v) => {
                      const rec = v as RecordItem | null;
                      ctrl.setMany({
                        district: rec,
                        district_id: Number(rec?.id ?? 0),
                      });
                    }}
                    error={snap.errors.district}
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
                    cacheNamespace="district-driver"
                    prefetchQuery=""
                  />
                  <Field.Root
                    value={snap.values.zip as string}
                    onChange={(v) => ctrl.set("zip", v)}
                  >
                    <Field.Label>{t("driver.zip")}</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-64" />
                      <Field.Error>{snap.errors.zip}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                </CardBody>
              </Card>
            </div>

            <div className="md:basis-1/2 space-y-3">
              <Card>
                <CardHeader className="text-1xl font-extrabold">
                  License Info
                </CardHeader>
                <CardBody>
                  <div
                    className="grid grid-cols-1 sm:grid-cols-1 xl:grid-cols-3 2xl:grid-cols-4
                   gap-2"
                  >
                    <Field.Root
                      value={snap.values.drivers_license as string}
                      onChange={(v) => ctrl.set("drivers_license", v)}
                    >
                      <Field.Label>{t("driver.drivers_license")}</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-40" />
                        <Field.Error>{snap.errors.drivers_license}</Field.Error>
                      </Field.Control>
                    </Field.Root>

                    <Field.Root
                      value={snap.values.drivers_license_expiry as string}
                      onChange={(v) => ctrl.set("drivers_license_expiry", v)}
                    >
                      <Field.Label>
                        {t("driver.drivers_license_expiry")}
                      </Field.Label>
                      <Field.Control>
                        <Field.Input type="date" className="w-40" />
                        <Field.Error>
                          {snap.errors.drivers_license_expiry}
                        </Field.Error>
                      </Field.Control>
                    </Field.Root>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="text-1xl font-extrabold">
                  Authentication
                </CardHeader>
                <CardBody>
                  {mode === "create" && (
                    <Field.Root
                      value={snap.values.login as string}
                      onChange={(v) => ctrl.set("login", v)}
                    >
                      <Field.Label>Email</Field.Label>
                      <Field.Control>
                        <Field.Input className="w-64" />
                        <Field.Error>{snap.errors.login}</Field.Error>
                      </Field.Control>
                    </Field.Root>
                  )}
                  <FieldPassword
                    label={t("signup.form.password.label")}
                    name="password"
                    value={snap.values.password as string}
                    onChange={(v) => ctrl.set("password", v)}
                    placeholder={t("signup.form.password.placeholder")}
                    disabled={submitting}
                    a11yShow={t("signup.a11y.showPassword")}
                    a11yHide={t("signup.a11y.hidePassword")}
                  />
                  <FieldPassword
                    label={t("signup.form.confirm.label")}
                    name="confirmPassword"
                    value={confirm}
                    onChange={setConfirm}
                    placeholder={t("signup.form.confirm.placeholder")}
                    disabled={submitting}
                    a11yShow={t("signup.a11y.showConfirm")}
                    a11yHide={t("signup.a11y.hideConfirm")}
                  />
                </CardBody>
              </Card>
            </div>
          </div>
          <div className="mt-5">
            <Card>
              <CardHeader className="text-1xl font-extrabold">
                Driver Document
              </CardHeader>
              <CardBody>
                <Field.Root
                  value={snap.values.no_ktp as string}
                  onChange={(v) => ctrl.set("no_ktp", v)}
                >
                  <Field.Label>{t("driver.no_ktp")}</Field.Label>
                  <Field.Control>
                    <Field.Input className="w-64 uppercase" />
                    <Field.Error>{snap.errors.no_ktp}</Field.Error>
                  </Field.Control>
                </Field.Root>
                <MultiFileUpload
                  label={t("drivers.driver_document")}
                  value={driverDocumentFiles}
                  onChange={setDriverDocumentFiles}
                  accept=".pdf,.jpeg,.jpg,.png,.bmp"
                  maxFileSizeMB={10}
                  maxFiles={10}
                  hint={t("driver.hint_upload")}
                  existingHeader={
                    mode === "edit" ? driverDocumentHeaderName : undefined
                  }
                  existingItems={
                    mode === "edit" ? driverDocumentExistingFiles : undefined
                  }
                  onRemoveExisting={
                    mode === "edit" ? handleRemoveExistingDriverDoc : undefined
                  }
                  onReject={(msgs) => console.warn("rejected:", msgs)}
                  className="gap-3 justify-end"
                  showImagePreview
                />
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
