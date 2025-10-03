"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getString, getStringArray } from "@/lib/safe-get";
import type { TmsProfile } from "@/types/tms-profile";
import { getInitials, nameFromLogin } from "@/lib/identity";

export default function ManageAccountEditPage() {
  const { profile, profileStatus, refreshProfile, loggedIn } = useAuth();

  const name =
    getString<TmsProfile>(profile, "name") ??
    getString<TmsProfile>(profile, "full_name") ??
    getString<TmsProfile>(profile, "username") ??
    getString<TmsProfile>(profile, "login");

  const email =
    getString<TmsProfile>(profile, "email") ??
    getString<TmsProfile>(profile, "mail") ??
    getString<TmsProfile>(profile, "user_email");

  const phone =
    getString<TmsProfile>(profile, "phone") ??
    getString<TmsProfile>(profile, "mobile") ??
    getString<TmsProfile>(profile, "tel");

  const avatarUrl =
    getString<TmsProfile>(profile, "avatar_url") ??
    getString<TmsProfile>(profile, "image") ??
    getString<TmsProfile>(profile, "photo");

  const roles =
    getStringArray<TmsProfile>(profile, "roles") ??
    getStringArray<TmsProfile>(profile, "groups") ??
    getStringArray<TmsProfile>(profile, "user_groups");

  const displayName = useMemo(() => {
    if (name) return nameFromLogin(name);
    return "";
  }, [name]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const isLoading = profileStatus === "loading";
  const isError = profileStatus === "error";
  const isEmpty = !profile && profileStatus === "success";

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-semibold tracking-tight">
          Welcome {displayName}
        </h3>

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
          >
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name ?? email ?? "User Avatar"}
                className="h-28 w-28 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border bg-slate-50 text-2xl font-bold text-slate-600">
                {initials}
              </div>
            )}
            <div className="mt-3 text-center">
              <div className="text-base font-medium">{name ?? "—"}</div>
              <div className="text-sm text-slate-500">{email ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {isError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              Gagal memuat profil. Coba <strong>Refresh</strong>. Jika tetap
              gagal, kemungkinan sesi sudah kedaluwarsa.
            </div>
          )}

          {!loggedIn && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Kamu belum login. Silakan login kembali.
            </div>
          )}

          {isLoading && (
            <div className="space-y-3">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-52 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
            </div>
          )}

          {!isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <Field label="Name" value={name} />
                <Field label="Email" value={email} />
                <Field label="Phone" value={phone} />
              </div>

              <div>
                <div className="text-xs uppercase text-slate-500">Roles</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {roles && roles.length > 0 ? (
                    roles.map((r) => (
                      <span
                        key={r}
                        className="rounded-full border px-2 py-0.5 text-xs text-slate-700"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">—</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {isEmpty && (
            <div className="mt-4 text-sm text-slate-500">
              Profil kosong. Klik <strong>Refresh</strong> untuk memuat ulang.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  );
}
