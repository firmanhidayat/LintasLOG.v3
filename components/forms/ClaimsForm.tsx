"use client";

import React, { useEffect, useState } from "react";
import { Field } from "@/components/form/FieldInput";
import { t } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Button } from "@/components/ui/Button";
import {
  ClaimApiResponse,
  ClaimsFormController,
  ClaimValues,
} from "@/features/claims/ClaimsFormController";
import { useFormController } from "@/core/useFormController";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import MultiFileUpload, {
  ExistingFileItem,
} from "@/components/form/MultiFileUpload";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { TmsUserType } from "@/types/tms-profile";

const ATTACHMENTS_URL =
  process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL ?? "";
const CLAIMS_APPROVAL_URL = process.env.NEXT_PUBLIC_TMS_CLAIMS_URL ?? "";

type ClaimDocType = "claim_document";
type ClaimAttachmentGroup = {
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

type ClaimInitialData = Partial<ClaimValues> & {
  document_attachment?: ClaimAttachmentGroup;
};

export default function ClaimFormPage({
  mode = "create",
  claimId,
  initialData,
  userType,
  onSuccess,
}: {
  mode?: "create" | "edit";
  claimId?: number | string;
  initialData?: ClaimInitialData;
  userType: TmsUserType;
  onSuccess?: (data: ClaimApiResponse | null) => void;
}) {
  const { ready: i18nReady } = useI18nReady();
  const router = useRouter();
  console.log("Goes here ln.60 : ", initialData);
  const init: ClaimValues = {
    amount: initialData?.amount ?? 0,
    description: initialData?.description ?? "",
    document_attachment_id: initialData?.document_attachment_id ?? 0,
    state: initialData?.state ?? "",
    purchase_order: initialData?.purchase_order ?? null,
  };

  const [ctrl, snap] = useFormController(
    () => new ClaimsFormController(mode, init)
  );

  const parseMoney = (raw: string) => {
    const s = raw
      .trim()
      .replace(/\s/g, "")
      .replace(/[^\d.,-]/g, "");

    if (!s) return 0;

    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    let normalized = s;

    if (hasComma && hasDot) {
      // pemisah desimal ditentukan dari yang paling kanan
      const lastComma = s.lastIndexOf(",");
      const lastDot = s.lastIndexOf(".");
      if (lastComma > lastDot) {
        // 1.234,56 -> 1234.56
        normalized = s.replace(/\./g, "").replace(",", ".");
      } else {
        // 1,234.56 -> 1234.56
        normalized = s.replace(/,/g, "");
      }
    } else if (hasComma) {
      const parts = s.split(",");
      if (parts.length > 2) {
        normalized = s.replace(/,/g, "");
      } else if ((parts[1] ?? "").length === 3) {
        // 1,234 -> 1234
        normalized = s.replace(/,/g, "");
      } else {
        // 1234,56 -> 1234.56
        normalized = s.replace(",", ".");
      }
    } else if (hasDot) {
      const parts = s.split(".");
      if (parts.length > 2) {
        normalized = s.replace(/\./g, "");
      } else if ((parts[1] ?? "").length === 3) {
        // 1.234 -> 1234
        normalized = s.replace(/\./g, "");
      } else {
        // 1234.56 -> 1234.56
        normalized = s;
      }
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const moneyFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
  const formatMoney = (value: number) => moneyFmt.format(value || 0);

  const [amountText, setAmountText] = useState(() => formatMoney(init.amount));

  const [submitting, setSubmitting] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");

  const [docClaimFiles, setDocClaimFiles] = useState<File[]>([]);
  const [docExistingFiles, setDocExistingFiles] = useState<ExistingFileItem[]>(
    []
  );
  const [docHeaderName, setDocHeaderName] = useState<string | undefined>();

  function handleClearDocAttachments() {
    setDocExistingFiles([]);
    setDocHeaderName(undefined);
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
    docType: ClaimDocType,
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

  async function fetchAttachmentGroup(
    groupId: number
  ): Promise<ClaimAttachmentGroup | null> {
    if (!groupId) return null;
    const url = `${ATTACHMENTS_URL}/${encodeURIComponent(
      String(groupId)
    )}?t=${Date.now()}`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    try {
      return (await res.json()) as ClaimAttachmentGroup;
    } catch {
      return null;
    }
  }

  function applyDocGroupToState(docGroup: ClaimAttachmentGroup | null) {
    setDocHeaderName(docGroup?.name);
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

  async function syncDocAttachmentGroup(groupId: number) {
    if (!groupId) {
      applyDocGroupToState(null);
      return;
    }
    try {
      const docGroup = await fetchAttachmentGroup(groupId);
      applyDocGroupToState(docGroup);
    } catch (e) {
      // best-effort: jangan blokir UX kalau fetch group gagal
      console.warn("[CLAIM_DOC] Failed to sync attachment group", e);
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

  async function doApprovalState(id: string, state: string): Promise<void> {
    try {
      setSubmitting(true);
      const url =
        state === "approve"
          ? `${CLAIMS_APPROVAL_URL}/${id}/approve`
          : `${CLAIMS_APPROVAL_URL}/${id}/reject`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Failed to ${state} claim (${res.status} ${res.statusText}) ${text}`
        );
      }
      const updatedData = await fetchUpdatedClaimData(id);
      if (updatedData) {
        ctrl.setMany({
          state: updatedData.state,
          amount: updatedData.amount ?? 0,
          description: updatedData.description ?? "",
          document_attachment_id: updatedData.document_attachment_id ?? 0,
          purchase_order: updatedData.purchase_order ?? null,
        });

        // pastikan list attachment di UI ikut update (router.refresh sering tidak cukup di SPA)
        await syncDocAttachmentGroup(
          Number(updatedData.document_attachment_id ?? 0)
        );
      }
      openSuccessDialog();
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
      router.refresh();
    }
  }
  async function fetchUpdatedClaimData(claimId: string) {
    try {
      const res = await fetch(`${CLAIMS_APPROVAL_URL}/${claimId}`, {
        credentials: "include",
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.error("Failed to fetch updated claim data:", error);
    }
    return null;
  }

  async function onSave() {
    let saved = false;
    try {
      setSubmitting(true);

      if (mode === "create") {
        if (docClaimFiles.length > 0) {
          const docId = await uploadDocumentAttachment(
            "claim_document",
            docClaimFiles
          );
          if (typeof docId === "number") {
            ctrl.set("document_attachment_id", docId);
            await syncDocAttachmentGroup(docId);
          }
        } else {
          ctrl.setError(
            "document_attachment_id",
            "Document claim is required!"
          );
          return;
        }
      } else if (mode === "edit") {
        const snapNow = ctrl.snapshot();
        const currentDocumentAttachmentId =
          (snapNow.values.document_attachment_id as number | undefined) ??
          initialData?.document_attachment_id ??
          0;

        if (docClaimFiles.length > 0) {
          if (currentDocumentAttachmentId && currentDocumentAttachmentId > 0) {
            await appendFilesToExistingAttachment(
              currentDocumentAttachmentId,
              docClaimFiles
            );
            await syncDocAttachmentGroup(currentDocumentAttachmentId);
          } else {
            const docId = await uploadDocumentAttachment(
              "claim_document",
              docClaimFiles
            );
            if (typeof docId === "number") {
              ctrl.set("document_attachment_id", docId);
              await syncDocAttachmentGroup(docId);
            }
          }
        }
      }

      const data = await ctrl.submit(mode, claimId);
      onSuccess?.(data);

      // jaga-jaga backend mengganti group id / isi attachment, sync lagi (best-effort)
      const gid = Number(
        (ctrl.snapshot().values.document_attachment_id as number | undefined) ?? 0
      );
      if (gid) await syncDocAttachmentGroup(gid);

      openSuccessDialog();
      setDocClaimFiles([]);
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

    console.log("InitialData useffect : ", initialData);

    ctrl.setMany({
      amount: initialData?.amount ?? 0,
      description: initialData?.description ?? "",
      document_attachment_id: initialData?.document_attachment_id ?? 0,
      state: initialData?.state ?? "",
      purchase_order: initialData?.purchase_order ?? null,
    });

    setAmountText(formatMoney(initialData?.amount ?? 0));

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
    router.push("/claims/list");
  }

  async function onHandleApprove() {
    try {
      setSubmitting(true);
      await doApprovalState(claimId as string, "approve");
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function onHandleReject() {
    try {
      setSubmitting(true);
      await doApprovalState(claimId as string, "reject");
    } catch (e) {
      console.error(e);
      openErrorDialog(e);
    } finally {
      setSubmitting(false);
    }
  }

  function onHandleChangeClaimFiles(files: File[]) {
    setDocClaimFiles(files);

    if (files.length > 0) {
      ctrl.set(
        "document_attachment_id",
        ctrl.snapshot().values.document_attachment_id || -1
      );
      ctrl.setError("document_attachment_id", "");
    } else {
      ctrl.set("document_attachment_id", 0);
      ctrl.setError("document_attachment_id", "Document claim is required!");
    }
  }
  return (
    <div className="pb-24">
      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-end gap-2">
          {userType === "shipper" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={handleDiscard}
              >
                {t("common.discard")}
              </Button>
              {snap.values.state === "reviewed" && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={submitting}
                    onClick={onHandleReject}
                  >
                    {t("common.reject")}
                  </Button>
                  <Button
                    onClick={onHandleApprove}
                    disabled={!snap.canSubmit || submitting}
                    variant="solid"
                  >
                    Aprove
                  </Button>
                </div>
              )}
            </div>
          )}

          {userType === "transporter" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={handleDiscard}
              >
                {t("common.discard")}
              </Button>
              {snap.values.state === "draft" && (
                <Button
                  type="button"
                  variant="solid"
                  disabled={!snap.canSubmit || submitting}
                  onClick={onSave}
                >
                  {mode === "edit" ? "Update" : "Save"}
                </Button>
              )}
              {mode === "create" && (
                <Button
                  type="button"
                  variant="solid"
                  disabled={!snap.canSubmit || submitting}
                  onClick={onSave}
                >
                  Save
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <h4 className="text-3xl font-semibold text-gray-800">Claim</h4>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-semibold">
                      Claim Detail
                    </span>

                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {t("claims.form.fields.state")}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-extrabold uppercase text-gray-800">
                        {String(snap.values.state || "-")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <Field.Root
                    value={amountText}
                    onChange={(v) => {
                      setAmountText(v);
                      ctrl.set("amount", parseMoney(v));
                    }}
                  >
                    <Field.Label>{t("claims.form.fields.amount")}</Field.Label>
                    <Field.Control>
                      <Field.Input
                        inputMode="decimal"
                        className="w-full"
                        onBlur={() =>
                          setAmountText(
                            formatMoney(
                              Number(ctrl.snapshot().values.amount ?? 0)
                            )
                          )
                        }
                      />
                      <Field.Error>{snap.errors.amount}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <Field.Root
                    value={snap.values.description as string}
                    onChange={(v) => ctrl.set("description", v)}
                  >
                    <Field.Label>{t("claims.form.fields.reason")}</Field.Label>
                    <Field.Control>
                      <Field.Textarea rows={4} className="w-full" />
                      <Field.Error>{snap.errors.description}</Field.Error>
                    </Field.Control>
                  </Field.Root>

                  <MultiFileUpload
                    label={t("claims.form.fields.document")}
                    value={docClaimFiles}
                    onChange={onHandleChangeClaimFiles}
                    accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                    maxFileSizeMB={10}
                    maxFiles={10}
                    disabled={
                      userType === "shipper" &&
                      (snap.values.state === "reviewed" ||
                        snap.values.state === "approve")
                    }
                    hint={
                      t("claims.form.hints.document") ??
                      "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                    }
                    onReject={(msgs) =>
                      console.warn("[DOC_CLAIM] rejected:", msgs)
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
