"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/form/FieldInput";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import {
  ProfileApiResponse,
  ProfileFormController,
  ProfileValues,
} from "@/features/profile/ProfileFormController";
import { useFormController } from "@/core/useFormController";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import MultiFileUpload, {
  ExistingFileItem,
} from "@/components/form/MultiFileUpload";
// import { ModalDialog } from "@/components/ui/ModalDialog";
import {
  ProfileDocType,
  ProfileDocumentAttachmentGroup,
} from "@/types/tms-profile";
import { getTimeZones, tzLabel } from "@/utils/timezone";
// import { FieldSelect } from "@/components/form/FieldSelect";

const ATTACHMENTS_URL =
  process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL ?? "";

type ProfileInitialData = Partial<ProfileValues>;

export default function ProfileFormPage({
  mode = "edit",
  profileId,
  initialData,
  onSuccess,
}: {
  mode?: "edit";
  profileId: number | string;
  initialData: ProfileInitialData;
  onSuccess: (data: ProfileApiResponse | null) => void;
}) {
  const { ready: i18nReady } = useI18nReady();
  const router = useRouter();
  const init: ProfileValues = {
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    vat: initialData?.vat ?? "",
    tz: initialData?.tz ?? "",
    tms_user_type: initialData.tms_user_type ?? "",
    shipper_transporter_document_attachment:
      initialData.shipper_transporter_document_attachment as ProfileDocumentAttachmentGroup,
    shipper_transporter_document_attachment_id:
      initialData.shipper_transporter_document_attachment_id ?? 0,
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
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
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
    });
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

  function handleDiscard() {
    router.push("/");
  }
  if (!i18nReady) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  }
  return (
    <div className="pb-24">
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleDiscard}>
            {t("common.discard")}
          </Button>
          <Button
            type="button"
            variant="solid"
            // disabled={!snap.canSubmit || submitting}
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
          <div className="flex flex-col md:flex-row gap-6">
            {/* <div className="md:basis-1/2 space-y-4"> */}
            <div className="space-y-4">
              <Card>
                <CardHeader>Detail</CardHeader>
                <CardBody>
                  <Field.Root
                    value={snap.values.name as string}
                    onChange={(v) => ctrl.set("name", v)}
                  >
                    <Field.Label>
                      {t("pages.maccount.edit.label.name")}
                    </Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full " />
                      <Field.Error>{snap.errors.name}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <Field.Root
                    value={snap.values.email as string}
                    onChange={(v) => ctrl.set("email", v)}
                  >
                    <Field.Label>
                      {t("pages.maccount.edit.label.email")}
                    </Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full " />
                      <Field.Error>{snap.errors.email}</Field.Error>
                    </Field.Control>
                  </Field.Root>
                  <Field.Root
                    value={snap.values.vat as string}
                    onChange={(v) => ctrl.set("vat", v)}
                  >
                    <Field.Label>
                      {t("pages.maccount.edit.label.vat")}
                    </Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" />
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
                      <Field.Input className="w-full" />
                      <Field.Error>{snap.errors.mobile}</Field.Error>
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
                  {/* <FieldSelect
                    label={t("pages.maccount.edit.label.tz")}
                    value={snap.values.tz as string}
                    onChange={(v) => ctrl.set("tz", v)}
                    options={tzOptions}
                    name="tz"
                  /> */}
                </CardBody>
              </Card>
            {/* </div> */}
            {/* <div className="md:basis-1/2 space-y-4"> */}
              <MultiFileUpload
                label="Document"
                value={profileDocumentFiles}
                onChange={setProfileDocumentFiles}
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                maxFileSizeMB={10}
                maxFiles={10}
                hint={
                  t("orders.upload_hint_10mb") ??
                  "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                }
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
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
