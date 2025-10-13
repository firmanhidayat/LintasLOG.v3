"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldText } from "@/components/form/FieldText";
import { FieldTextarea } from "@/components/form/FieldTextarea";
import MultiFileUpload from "@/components/form/MultiFileUpload";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";

import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";

import { goSignIn } from "@/lib/goSignIn";

const CLAIM_CREATE_URL = process.env.NEXT_PUBLIC_TMS_CLAIMS_FORM_URL!;

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type ClaimFormState = {
  claimNo: string;
  joNo: string;
  /** simpan gabungan "YYYY-MM-DDTHH:mm" */
  claimDate: string;
  reason: string;
  amount: string; // string input; validasi numerik saat submit
  description: string; // optional
  documents: File[]; // optional
};

export default function ClaimCreatePage() {
  const router = useRouter();
  const i18nReady = useI18nReady();

  const [form, setForm] = useState<ClaimFormState>({
    claimNo: "",
    joNo: "",
    claimDate: "", // ex: "2025-10-08T13:30"
    reason: "",
    amount: "",
    description: "",
    documents: [],
  });

  const [touched, setTouched] = useState<Record<keyof ClaimFormState, boolean>>(
    {
      claimNo: false,
      joNo: false,
      claimDate: false,
      reason: false,
      amount: false,
      description: false,
      documents: false,
    }
  );

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  const errors = useMemo(() => {
    const next: Partial<Record<keyof ClaimFormState, string>> = {};
    if (!form.claimNo.trim())
      next.claimNo = t("claims.form.validations.required");
    if (!form.joNo.trim()) next.joNo = t("claims.form.validations.required");
    if (!form.claimDate.trim())
      next.claimDate = t("claims.form.validations.required");
    if (!form.reason.trim())
      next.reason = t("claims.form.validations.required");
    if (!form.amount.trim()) {
      next.amount = t("claims.form.validations.required");
    } else if (Number.isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      next.amount = t("claims.form.validations.amountInvalid");
    }
    // description & documents optional
    return next;
  }, [form]);

  const canSubmit = useMemo(() => Object.keys(errors).length === 0, [errors]);

  if (!i18nReady) {
    // skeleton singkat supaya aman dari warning hooks
    return (
      <div className="p-4">
        <div className="h-8 w-44 rounded bg-gray-200" />
        <div className="mt-4 h-48 rounded-2xl border border-gray-200 bg-white shadow-sm" />
      </div>
    );
  }

  const onChange =
    <K extends keyof ClaimFormState>(key: K) =>
    (v: string) => {
      setForm((prev) => ({ ...prev, [key]: v }));
    };

  const onBlur =
    <K extends keyof ClaimFormState>(key: K) =>
    () =>
      setTouched((prev) => ({ ...prev, [key]: true }));

  const handleDiscard = () => {
    router.replace("/claims");
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (ev) => {
    ev.preventDefault();
    setTouched({
      claimNo: true,
      joNo: true,
      claimDate: true,
      reason: true,
      amount: true,
      description: true,
      documents: true,
    });
    if (!canSubmit) return;

    try {
      setStatus("submitting");
      setErrMsg("");

      // Pakai FormData untuk upload multiple dokumen
      const fd = new FormData();
      fd.append("claim_no", form.claimNo.trim());
      fd.append("jo_no", form.joNo.trim());

      // API sebelumnya menerima date; ambil bagian tanggal saja.
      const dateOnly = form.claimDate.split("T")[0] || "";
      fd.append("claim_date", dateOnly);

      fd.append("reason", form.reason.trim());
      fd.append("amount", String(Number(form.amount)));
      fd.append("description", form.description.trim());

      // Kirim banyak file. Field "document" berulang.
      for (const f of form.documents) {
        fd.append("document", f);
        // jika backend mengharapkan array-style:
        // fd.append("documents[]", f);
      }

      const resp = await fetch(CLAIM_CREATE_URL, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (resp.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Failed to create claim");
      }

      setStatus("success");
      router.replace("/claims");
    } catch (e) {
      setStatus("error");
      setErrMsg(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <div className="p-4">
      {/* Toolbar kiri atas */}
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="submit"
          form="claim-form"
          variant="solid"
          size="md"
          disabled={!canSubmit || status === "submitting"}
        >
          {status === "submitting"
            ? t("claims.form.btn.saving")
            : t("claims.form.btn.save")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleDiscard}
        >
          {t("claims.form.btn.discard")}
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-gray-200 px-4 py-3 text-sm font-semibold">
          {t("claims.form.title")}
        </CardHeader>
        <CardBody>
          <form
            id="claim-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <FieldText
              label={t("claims.form.fields.claimNo")}
              name="claimNo"
              value={form.claimNo}
              onChange={onChange("claimNo")}
              onBlur={onBlur("claimNo")}
              required
              placeholder={t("claims.form.placeholders.claimNo")}
              error={errors.claimNo}
              touched={touched.claimNo}
            />

            <FieldText
              label={t("claims.form.fields.joNo")}
              name="joNo"
              value={form.joNo}
              onChange={onChange("joNo")}
              onBlur={onBlur("joNo")}
              required
              placeholder={t("claims.form.placeholders.joNo")}
              error={errors.joNo}
              touched={touched.joNo}
            />

            {/* Ganti input date -> DateTimePickerTW */}
            <DateTimePickerTW
              label={t("claims.form.fields.claimDate")}
              required
              value={form.claimDate}
              onChange={onChange("claimDate")}
              error={errors.claimDate}
              touched={touched.claimDate}
              className=""
              showTime={false}
            />

            <FieldText
              label={t("claims.form.fields.reason")}
              name="reason"
              value={form.reason}
              onChange={onChange("reason")}
              onBlur={onBlur("reason")}
              required
              placeholder={t("claims.form.placeholders.reason")}
              error={errors.reason}
              touched={touched.reason}
            />

            <FieldText
              label={t("claims.form.fields.amount")}
              name="amount"
              type="text"
              autoComplete="off"
              value={form.amount}
              onChange={onChange("amount")}
              onBlur={onBlur("amount")}
              required
              placeholder="0"
              error={errors.amount}
              touched={touched.amount}
            />

            {/* Upload Document (MultiFileUpload) */}
            <div className="md:col-span-2">
              <MultiFileUpload
                label={t("claims.form.fields.document")}
                value={form.documents}
                onChange={(files) => {
                  setForm((prev) => ({ ...prev, documents: files }));
                  setTouched((prev) => ({ ...prev, documents: true }));
                }}
                onReject={() =>
                  setTouched((prev) => ({ ...prev, documents: true }))
                }
                hint={t("claims.form.hints.document")}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                maxFileSizeMB={10}
                // maxFiles={5} // aktifkan jika mau batasi jumlah file
                droppable
                showImagePreview
              />
            </div>

            <div className="md:col-span-2">
              <FieldTextarea
                label={t("claims.form.fields.description")}
                name="description"
                value={form.description}
                onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, description: true }))
                }
                placeholder={t("claims.form.placeholders.description")}
                rows={4}
              />
            </div>

            {status === "error" && (
              <div className="md:col-span-2">
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {t("claims.form.errors.submitFailed")}: {errMsg}
                </div>
              </div>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
