"use client";

import React, { useEffect, useState } from "react";
import { Field } from "@/components/form/FieldInput";
import { t } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Button } from "@/components/ui/Button";
import {
  BillsApiResponse,
  VendorBillFormController,
  BillsValues,
} from "@/features/vendorbills/VendorBillFormController";
import { useFormController } from "@/core/useFormController";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import MultiFileUpload, {
  ExistingFileItem,
} from "@/components/form/MultiFileUpload";
import { ModalDialog } from "@/components/ui/ModalDialog";

const ATTACHMENTS_URL =
  process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL ?? "";

type BillsDocType = "invoice_document";
type BillsAttachmentGroup = {
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

type BillsInitialData = Partial<BillsValues> & {
  document_attachment?: BillsAttachmentGroup;
};
export default function VendorBillsFormPage({
  mode = "edit",
  billsId,
  initialData,
  onSuccess,
}: {
  mode?: "edit";
  billsId?: number | string;
  initialData?: BillsInitialData;
  onSuccess?: (data: BillsApiResponse | null) => void;
}) {
  const { ready: i18nReady } = useI18nReady();
  const router = useRouter();

  const init: BillsValues = {
    ref: initialData?.ref ?? "",
    document_attachment_id: initialData?.document_attachment_id ?? 0,
  };

  const [ctrl, snap] = useFormController(
    () => new VendorBillFormController(mode, init)
  );

  const [submitting, setSubmitting] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");

  const [docBillsFiles, setDocBillsFiles] = useState<File[]>([]);
  const [docExistingFiles, setDocExistingFiles] = useState<ExistingFileItem[]>(
    []
  );
  const [docHeaderName, setDocHeaderName] = useState<string | undefined>();

  function handleClearDocAttachments() {
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
    docType: BillsDocType,
    files: File[]
  ): Promise<number | undefined> {
    if (!files.length) return undefined;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

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
    files.forEach((file) => formData.append("files", file));

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

      // if (mode === "create") {
      //   if (docClaimFiles.length > 0) {
      //     const docId = await uploadDocumentAttachment(
      //       "claim_document",
      //       docClaimFiles
      //     );
      //     if (typeof docId === "number")
      //       ctrl.set("document_attachment_id", docId);
      //   } else {
      //     ctrl.setError(
      //       "document_attachment_id",
      //       "Document claim is required!"
      //     );
      //   }
      // } else

      if (mode === "edit") {
        const snapNow = ctrl.snapshot();
        const currentDocumentAttachmentId =
          (snapNow.values.document_attachment_id as number | undefined) ??
          initialData?.document_attachment_id ??
          0;

        if (docBillsFiles.length > 0) {
          if (currentDocumentAttachmentId && currentDocumentAttachmentId > 0) {
            await appendFilesToExistingAttachment(
              currentDocumentAttachmentId,
              docBillsFiles
            );
          } else {
            const docId = await uploadDocumentAttachment(
              "invoice_document",
              docBillsFiles
            );
            if (typeof docId === "number")
              ctrl.set("document_attachment_id", docId);
          }
        }
      }

      const data = await ctrl.submit(mode, billsId);
      onSuccess?.(data);
      openSuccessDialog();
      setDocBillsFiles([]);
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
      ref: initialData?.ref ?? "",
      document_attachment_id: initialData?.document_attachment_id ?? 0,
    });

    if (mode === "edit") {
      const docGroup = initialData.document_attachment;
      setDocHeaderName(initialData.document_attachment?.name);
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

  function handleDiscard() {
    router.push("/vendorbill/list");
  }

  function onHandleChangeBillsFiles(files: File[]) {
    setDocBillsFiles(files);

    if (files.length > 0) {
      ctrl.set(
        "document_attachment_id",
        ctrl.snapshot().values.document_attachment_id || -1
      );
      ctrl.setError("document_attachment_id", "");
    } else {
      ctrl.set("document_attachment_id", 0);
      ctrl.setError("document_attachment_id", "Document bills is required!");
    }
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
          <h4 className="text-3xl font-semibold text-gray-800">Bills</h4>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>Bills Detail</CardHeader>
                <CardBody>
                  <Field.Root
                    value={snap.values.ref as string}
                    onChange={(v) => ctrl.set("ref", v)}
                  >
                    <Field.Label>Invoice Number</Field.Label>
                    <Field.Control>
                      <Field.Input className="w-full" />
                      <Field.Error>{snap.errors.ref}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <MultiFileUpload
                    label={t("claims.form.fields.document")}
                    value={docBillsFiles}
                    onChange={onHandleChangeBillsFiles}
                    accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                    maxFileSizeMB={10}
                    maxFiles={10}
                    hint={
                      t("claims.form.hints.document") ??
                      "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                    }
                    onReject={(msgs) =>
                      console.warn("[DOC_BILLS] rejected:", msgs)
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
                </CardBody>
              </Card>
            </div>
          </div>
        </CardBody>
      </Card>

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
