"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldText } from "@/components/form/FieldText";
import { FieldTextarea } from "@/components/form/FieldTextarea";

import { t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";

import { goSignIn } from "@/lib/goSignIn";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const CLAIM_CREATE_URL = `${API_BASE}/api-tms/claims`;

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type ClaimFormState = {
  claimNo: string;
  joNo: string;
  claimDate: string; // yyyy-mm-dd
  reason: string;
  amount: string; // string input; validasi numerik saat submit
  description: string; // optional
  document: File | null; // optional
};

export default function ClaimCreatePage() {
  const router = useRouter();
  const i18nReady = useI18nReady();

  const [form, setForm] = useState<ClaimFormState>({
    claimNo: "",
    joNo: "",
    claimDate: "",
    reason: "",
    amount: "",
    description: "",
    document: null,
  });

  const [touched, setTouched] = useState<Record<keyof ClaimFormState, boolean>>(
    {
      claimNo: false,
      joNo: false,
      claimDate: false,
      reason: false,
      amount: false,
      description: false,
      document: false,
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
    // description & document optional
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

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.currentTarget.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, document: file }));
    setTouched((prev) => ({ ...prev, document: true }));
  };

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
      document: true,
    });
    if (!canSubmit) return;

    try {
      setStatus("submitting");
      setErrMsg("");

      // Pakai FormData untuk upload dokumen
      const fd = new FormData();
      fd.append("claim_no", form.claimNo.trim());
      fd.append("jo_no", form.joNo.trim());
      fd.append("claim_date", form.claimDate);
      fd.append("reason", form.reason.trim());
      fd.append("amount", String(Number(form.amount)));
      fd.append("description", form.description.trim());
      if (form.document) fd.append("document", form.document);

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

            <FieldText
              label={t("claims.form.fields.claimDate")}
              name="claimDate"
              type="date"
              value={form.claimDate}
              onChange={onChange("claimDate")}
              onBlur={onBlur("claimDate")}
              required
              error={errors.claimDate}
              touched={touched.claimDate}
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

            {/* Upload Document */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-600">
                {t("claims.form.fields.document")}
              </label>
              <input
                name="document"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                onBlur={onBlur("document")}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1"
                aria-label={t("claims.form.fields.document")}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t("claims.form.hints.document")}
              </p>
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
