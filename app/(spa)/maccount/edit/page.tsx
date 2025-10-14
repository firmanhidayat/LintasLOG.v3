"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getString } from "@/lib/safe-get";
import type { TmsProfile } from "@/types/tms-profile";
import { getInitials, nameFromLogin } from "@/lib/identity";
import { getLang, t } from "@/lib/i18n";
import { useI18nReady } from "@/hooks/useI18nReady";
import { Card, CardBody } from "@/components/ui/Card";
import { AvatarCircle } from "@/components/shared/AvatarCircle";
import { Form, FormActions, FormRow } from "@/components/form/Form";
import { FieldText } from "@/components/form/FieldText";
import { FieldSelect } from "@/components/form/FieldSelect";
import { getTimeZones, tzLabel } from "@/utils/timezone";

type ProfileStatus = "idle" | "loading" | "success" | "error";

function isPlainEmptyObject(v: unknown): boolean {
  return !!v && typeof v === "object" && Object.keys(v as object).length === 0;
}

const UPDATE_PROFILE_URL = process.env.NEXT_PUBLIC_TMS_USER_PROFILE_URL!;

export default function ManageAccountEditPage() {
  const { profile, profileStatus, refreshProfile, loggedIn } = useAuth() as {
    profile?: TmsProfile | undefined;
    profileStatus: ProfileStatus;
    refreshProfile?: () => void;
    loggedIn: boolean;
  };

  const { i18nReady, activeLang } = useI18nReady();

  const name =
    getString<TmsProfile>(profile, "name") ??
    getString<TmsProfile>(profile, "login");

  const email = getString<TmsProfile>(profile, "email");
  const phone = getString<TmsProfile>(profile, "phone");
  const mobile = getString<TmsProfile>(profile, "mobile");
  const vat = getString<TmsProfile>(profile, "vat");
  const tz = getString<TmsProfile>(profile, "tz");

  const avatarUrl =
    getString<TmsProfile>(profile, "avatar_url") ??
    getString<TmsProfile>(profile, "image") ??
    getString<TmsProfile>(profile, "photo");

  const displayName = useMemo(() => {
    const base =
      name ??
      getString<TmsProfile>(profile, "login") ??
      getString<TmsProfile>(profile, "email") ??
      "";
    return nameFromLogin(base);
  }, [name, profile]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const isLoading = profileStatus === "loading";
  const isError = profileStatus === "error";
  const isEmpty =
    (profileStatus === "success" &&
      (!profile || isPlainEmptyObject(profile))) ||
    false;

  type FormState = {
    name: string;
    email: string;
    phone: string;
    mobile: string;
    vat: string;
    tz: string;
  };

  const [form, setForm] = useState<FormState>({
    name: name ?? "",
    email: email ?? "",
    phone: phone ?? "",
    mobile: mobile ?? "",
    vat: vat ?? "",
    tz: tz ?? "Asia/Jakarta",
  });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    type: "ok" | "err";
    text: string;
  }>();

  useEffect(() => {
    setForm({
      name: (name ?? "").trim(),
      email: (email ?? "").trim(),
      phone: (phone ?? "").trim(),
      mobile: (mobile ?? "").trim(),
      vat: (vat ?? "").trim(),
      tz: tz ?? "Asia/Jakarta",
    });
  }, [name, email, phone, mobile, vat, tz]);

  const tzOptions = useMemo(() => {
    const zones = getTimeZones();
    const withKey = zones.map((z) => ({ value: z, label: tzLabel(z) }));
    withKey.sort((a, b) => a.label.localeCompare(b.label));
    return withKey;
  }, []);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(undefined);

    if (!loggedIn) {
      setSaveMsg({
        type: "err",
        text: t("pages.maccount.edit.note.notLoggedIn"),
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        tz: form.tz,
      };

      const resp = await fetch(UPDATE_PROFILE_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Language": getLang(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
      }

      setSaveMsg({ type: "ok", text: t("pages.maccount.edit.save.ok") });
      await refreshProfile?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("pages.maccount.edit.status.error");
      setSaveMsg({
        type: "err",
        text: t("pages.maccount.edit.save.err", { message }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!i18nReady) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-6 h-6 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
          <div className="h-44 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-44 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-4xl p-4 md:p-6"
      aria-busy={isLoading || saving || undefined}
      data-lang={activeLang}
    >
      {/* SR-only live status */}
      <p className="sr-only" aria-live="polite">
        {isLoading
          ? t("pages.maccount.edit.status.loading")
          : isError
          ? t("pages.maccount.edit.status.error")
          : saving
          ? t("pages.maccount.edit.status.saving")
          : t("pages.maccount.edit.status.ready")}
      </p>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("pages.maccount.edit.title", { name: displayName })}
        </h1>
        {/* header controls (hidden by default as before) */}
        <div hidden className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs " +
              (profileStatus === "success"
                ? "bg-emerald-100 text-emerald-700"
                : profileStatus === "loading"
                ? "bg-amber-100 text-amber-700"
                : profileStatus === "error"
                ? "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-600")
            }
            title={`Status: ${profileStatus}`}
          >
            {profileStatus}
          </span>
          <button
            type="button"
            onClick={() => refreshProfile?.()}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 active:scale-[0.99]"
            disabled={isLoading}
            aria-disabled={isLoading}
          >
            {isLoading
              ? t("pages.maccount.edit.btn.refreshing")
              : t("pages.maccount.edit.btn.refresh")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        {/* Avatar Card */}
        <Card>
          <CardBody className="flex flex-col items-center">
            <AvatarCircle
              src={avatarUrl}
              alt={name ?? email ?? "User avatar"}
              fallback={initials}
            />
            <div className="mt-3 text-center">
              <div className="text-base font-medium">{name ?? "—"}</div>
              <div className="text-sm text-slate-500">{email ?? "—"}</div>
            </div>
          </CardBody>
        </Card>

        {/* Details Card */}
        <Card bordered shadow>
          <CardBody>
            {isError && (
              <div
                className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                role="alert"
              >
                {t("pages.maccount.edit.error.load")}
              </div>
            )}
            {!loggedIn && (
              <div
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700"
                role="note"
              >
                {t("pages.maccount.edit.note.notLoggedIn")}
              </div>
            )}
            {saveMsg && (
              <div
                className={
                  "mb-4 rounded-lg p-3 text-sm " +
                  (saveMsg.type === "ok"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-rose-200 bg-rose-50 text-rose-700")
                }
                role={saveMsg.type === "ok" ? "status" : "alert"}
              >
                {saveMsg.text}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3" aria-hidden>
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-52 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
              </div>
            ) : (
              <Form onSubmit={handleSave}>
                <FormRow cols={3}>
                  <FieldText
                    label={t("pages.maccount.edit.label.name")}
                    value={form.name}
                    onChange={(v) => onChange("name", v)}
                    autoComplete="name"
                    name="name"
                  />
                  <FieldText
                    label={t("pages.maccount.edit.label.email")}
                    type="email"
                    value={form.email}
                    onChange={(v) => onChange("email", v)}
                    autoComplete="email"
                    disabled
                    name="email"
                  />
                  <FieldText
                    label={t("pages.maccount.edit.label.phone")}
                    value={form.phone}
                    onChange={(v) => onChange("phone", v)}
                    autoComplete="tel"
                    name="phone"
                  />
                </FormRow>

                <FormRow cols={3}>
                  <FieldText
                    label={t("pages.maccount.edit.label.mobile")}
                    value={form.mobile}
                    onChange={(v) => onChange("mobile", v)}
                    autoComplete="tel-national"
                    disabled
                    name="mobile"
                  />
                  <FieldText
                    label={t("pages.maccount.edit.label.vat")}
                    value={form.vat}
                    onChange={(v) => onChange("vat", v)}
                    disabled
                    name="vat"
                  />
                  <FieldSelect
                    label={t("pages.maccount.edit.label.tz")}
                    value={form.tz}
                    onChange={(v) => onChange("tz", v)}
                    options={tzOptions}
                    name="tz"
                  />
                </FormRow>

                <FormActions>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm text-white shadow-sm hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                    disabled={saving || !loggedIn}
                  >
                    {saving
                      ? t("pages.maccount.edit.btn.saving")
                      : t("pages.maccount.edit.btn.save")}
                  </button>
                </FormActions>

                {isEmpty && (
                  <div className="text-sm text-slate-500 mt-2">
                    {t("pages.maccount.edit.empty.profile")}
                  </div>
                )}
              </Form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
