"use client";
import React, { useEffect, useState } from "react";
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
import MultiFileUpload from "@/components/form/MultiFileUpload";
import FieldPassword from "@/components/form/FieldPassword";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

const DISTRICT_URL = process.env.NEXT_PUBLIC_TMS_LOCATIONS_DISTRICT_URL!;

/** Lightweight modal dialog (no external deps) */
function ModalDialog({
  open,
  kind = "success",
  title,
  message,
  onClose,
}: {
  open: boolean;
  kind?: "success" | "error";
  title: string;
  message: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  const ring = kind === "success" ? "ring-green-500" : "ring-red-500";
  const head = kind === "success" ? "text-green-700" : "text-red-700";
  const btn =
    kind === "success"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-red-600 hover:bg-red-700";
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ${ring}`}
      >
        <div className={`mb-2 text-lg font-semibold ${head}`}>{title}</div>
        <div className="mb-4 text-sm text-gray-700">{message}</div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-white ${btn} focus:outline-none focus:ring`}
          >
            OK
          </button>
        </div>
      </div>
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
  initialData?: Partial<DriverValues>;
  onSuccess?: (data: DriverApiResponse | null) => void;
}) {
  const { ready: i18nReady } = useI18nReady();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [driverDocumentFiles, setDriverDocumentFiles] = useState<File[]>([]);

  // NEW: dialog state
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgKind, setDlgKind] = useState<"success" | "error">("success");
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");

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
  };

  const [ctrl, snap] = useFormController(
    () => new DriverFormController(mode, init)
  );

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

  async function onSave() {
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

      const data = await ctrl.submit(mode, fleetId);
      onSuccess?.(data); // JANGAN diubah: tetap panggil onSuccess bila ada
      openSuccessDialog();
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
    });
    setConfirm("");
  }, [initialData, ctrl]);

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
        <CardHeader>
          <h4 className="text-3xl font-semibold text-gray-800">Driver Info</h4>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:basis-1/2 space-y-4">
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
                value={snap.values.no_ktp as string}
                onChange={(v) => ctrl.set("no_ktp", v)}
              >
                <Field.Label>{t("driver.no_ktp")}</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full uppercase" />
                  <Field.Error>{snap.errors.no_ktp}</Field.Error>
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={snap.values.mobile as string}
                onChange={(v) => ctrl.set("mobile", v)}
              >
                <Field.Label>{t("driver.mobile")}</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full uppercase" />
                  <Field.Error>{snap.errors.mobile}</Field.Error>
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={snap.values.street as string}
                onChange={(v) => ctrl.set("street", v)}
              >
                <Field.Label>{t("driver.street")}</Field.Label>
                <Field.Control>
                  <Field.Textarea rows={4} className="w-full" />
                  <Field.Error>{snap.errors.street}</Field.Error>
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={snap.values.street2 as string}
                onChange={(v) => ctrl.set("street2", v)}
              >
                <Field.Label>{t("driver.street2")}</Field.Label>
                <Field.Control>
                  <Field.Textarea rows={4} className="w-full" />
                  <Field.Error>{snap.errors.street2}</Field.Error>
                </Field.Control>
              </Field.Root>
            </div>

            <div className="md:basis-1/2 space-y-3">
              <Field.Root
                value={snap.values.zip as string}
                onChange={(v) => ctrl.set("zip", v)}
              >
                <Field.Label>{t("driver.zip")}</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full" />
                  <Field.Error>{snap.errors.zip}</Field.Error>
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={snap.values.drivers_license as string}
                onChange={(v) => ctrl.set("drivers_license", v)}
              >
                <Field.Label>{t("driver.drivers_license")}</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full" />
                  <Field.Error>{snap.errors.drivers_license}</Field.Error>
                </Field.Control>
              </Field.Root>

              <Field.Root
                value={snap.values.drivers_license_expiry as string}
                onChange={(v) => ctrl.set("drivers_license_expiry", v)}
              >
                <Field.Label>{t("driver.drivers_license_expiry")}</Field.Label>
                <Field.Control>
                  <Field.Input type="date" className="w-full" />
                  <Field.Error>
                    {snap.errors.drivers_license_expiry}
                  </Field.Error>
                </Field.Control>
              </Field.Root>

              {mode === "create" && (
                <Field.Root
                  value={snap.values.login as string}
                  onChange={(v) => ctrl.set("login", v)}
                >
                  <Field.Label>Email</Field.Label>
                  <Field.Control>
                    <Field.Input className="w-full" />
                    <Field.Error>{snap.errors.login}</Field.Error>
                  </Field.Control>
                </Field.Root>
              )}

              {mode === "create" && (
                <>
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
                </>
              )}

              <MultiFileUpload
                label={t("fleet.stnk_foto")}
                value={driverDocumentFiles}
                onChange={setDriverDocumentFiles}
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                maxFileSizeMB={10}
                maxFiles={10}
                hint={
                  t("orders.upload_hint_10mb") ??
                  "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                }
                onReject={(msgs) => console.warn("rejected:", msgs)}
                className="gap-3 justify-end"
                showImagePreview
              />
            </div>
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

// "use client";
// import React, { useEffect, useState } from "react";
// import { Field } from "@/components/form/FieldInput";
// import LookupAutocomplete, {
//   normalizeResults,
// } from "@/components/form/LookupAutocomplete";
// import { RecordItem } from "@/types/recorditem";
// import { t } from "@/lib/i18n";
// import { useI18nReady } from "@/hooks/useI18nReady";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/Button";
// import {
//   DriverApiResponse,
//   DriverFormController,
//   DriverValues,
// } from "@/features/driver/DriverFormController";
// import { useFormController } from "@/core/useFormController";
// import MultiFileUpload from "@/components/form/MultiFileUpload";
// import FieldPassword from "@/components/form/FieldPassword";
// import { Card, CardBody, CardHeader } from "@/components/ui/Card";

// const DISTRICT_URL = process.env.NEXT_PUBLIC_TMS_LOCATIONS_DISTRICT_URL!;

// export default function FleetFormPage({
//   mode = "create",
//   fleetId,
//   initialData,
//   onSuccess,
// }: {
//   mode?: "create" | "edit";
//   fleetId?: number | string;
//   initialData?: Partial<DriverValues>;
//   onSuccess?: (data: DriverApiResponse | null) => void;
// }) {
//   const { ready: i18nReady } = useI18nReady();
//   const router = useRouter();

//   const [submitting, setSubmitting] = useState(false);
//   const [confirm, setConfirm] = useState("");
//   const [driverDocumentFiles, setDriverDocumentFiles] = useState<File[]>([]);

//   const init: DriverValues = {
//     name: initialData?.name ?? "",
//     no_ktp: initialData?.no_ktp ?? "",
//     mobile: initialData?.mobile ?? "",
//     street: initialData?.street ?? "",
//     street2: initialData?.street2 ?? "",
//     district: initialData?.district ?? null,
//     district_id: initialData?.district_id ?? 0,
//     zip: initialData?.zip ?? "",
//     drivers_license: initialData?.drivers_license ?? "",
//     drivers_license_expiry: initialData?.drivers_license_expiry ?? "",
//     login: initialData?.login ?? "",
//     password: initialData?.password ?? "",
//   };

//   const [ctrl, snap] = useFormController(
//     () => new DriverFormController(mode, init)
//   );

//   async function onSave() {
//     try {
//       setSubmitting(true);
//       if (mode === "create" && snap.values.password) {
//         if (snap.values.password !== confirm) {
//           alert(
//             t("signup.errors.passwordMismatch") ||
//               "Password confirmation doesn't match."
//           );
//           setSubmitting(false);
//           return;
//         }
//       }

//       const data = await ctrl.submit(mode, fleetId);
//       onSuccess?.(data);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   useEffect(() => {
//     if (!initialData) return;
//     ctrl.setMany({
//       name: initialData?.name ?? "",
//       no_ktp: initialData?.no_ktp ?? "",
//       mobile: initialData?.mobile ?? "",
//       street: initialData?.street ?? "",
//       street2: initialData?.street2 ?? "",
//       district: initialData?.district ?? null,
//       district_id: initialData?.district_id ?? 0,
//       zip: initialData?.zip ?? "",
//       drivers_license: initialData?.drivers_license ?? "",
//       drivers_license_expiry: initialData?.drivers_license_expiry ?? "",
//       login: initialData?.login ?? "",
//       password: "",
//     });
//     setConfirm("");
//   }, [initialData, ctrl]);

//   function handleDiscard() {
//     router.push("/fleetndriver/driver/list");
//   }

//   if (!i18nReady) {
//     return <div className="p-4 text-sm text-gray-500">Loading…</div>;
//   }

//   return (
//     <div className="pb-24">
//       {/* Sticky action bar */}
//       <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-end gap-2">
//           <Button type="button" variant="ghost" onClick={handleDiscard}>
//             {t("common.discard")}
//           </Button>
//           <Button
//             type="button"
//             variant="solid"
//             disabled={!snap.canSubmit || submitting}
//             onClick={onSave}
//           >
//             {mode === "edit"
//               ? t("common.update") ?? "Update"
//               : t("common.save") ?? "Save"}
//           </Button>
//         </div>
//       </div>

//       <Card>
//         <CardHeader>
//           <h4 className="text-3xl font-semibold text-gray-800">Driver Info</h4>
//         </CardHeader>
//         <CardBody>
//           <div className="flex flex-col md:flex-row gap-6">
//             <div className="md:basis-1/2 space-y-4">
//               <LookupAutocomplete
//                 label={t("driver.district")}
//                 placeholder={t("common.search_district")}
//                 value={snap.values.district as RecordItem}
//                 onChange={(v) => {
//                   const rec = v as RecordItem | null;
//                   ctrl.setMany({
//                     district: rec,
//                     district_id: Number(rec?.id ?? 0),
//                   });
//                 }}
//                 error={snap.errors.district}
//                 endpoint={{
//                   url: DISTRICT_URL,
//                   method: "GET",
//                   queryParam: "query",
//                   pageParam: "page",
//                   pageSizeParam: "page_size",
//                   page: 1,
//                   pageSize: 50,
//                   mapResults: normalizeResults,
//                 }}
//                 cacheNamespace="district-driver"
//                 prefetchQuery=""
//               />

//               <Field.Root
//                 value={snap.values.name as string}
//                 onChange={(v) => ctrl.set("name", v)}
//               >
//                 <Field.Label>{t("driver.name")}</Field.Label>
//                 <Field.Control>
//                   <Field.Input className="w-full" />
//                   <Field.Error>{snap.errors.name}</Field.Error>
//                 </Field.Control>
//               </Field.Root>

//               <Field.Root
//                 value={snap.values.no_ktp as string}
//                 onChange={(v) => ctrl.set("no_ktp", v)}
//               >
//                 <Field.Label>{t("driver.no_ktp")}</Field.Label>
//                 <Field.Control>
//                   <Field.Input className="w-full uppercase" />
//                   <Field.Error>{snap.errors.no_ktp}</Field.Error>
//                 </Field.Control>
//               </Field.Root>

//               <Field.Root
//                 value={snap.values.mobile as string}
//                 onChange={(v) => ctrl.set("mobile", v)}
//               >
//                 <Field.Label>{t("driver.mobile")}</Field.Label>
//                 <Field.Control>
//                   <Field.Input className="w-full uppercase" />
//                   <Field.Error>{snap.errors.mobile}</Field.Error>
//                 </Field.Control>
//               </Field.Root>

//               <Field.Root
//                 value={snap.values.street as string}
//                 onChange={(v) => ctrl.set("street", v)}
//               >
//                 <Field.Label>{t("driver.street")}</Field.Label>
//                 <Field.Control>
//                   <Field.Textarea rows={4} className="w-full" />
//                   <Field.Error>{snap.errors.street}</Field.Error>
//                 </Field.Control>
//               </Field.Root>

//               <Field.Root
//                 value={snap.values.street2 as string}
//                 onChange={(v) => ctrl.set("street2", v)}
//               >
//                 <Field.Label>{t("driver.street2")}</Field.Label>
//                 <Field.Control>
//                   <Field.Textarea rows={4} className="w-full" />
//                   <Field.Error>{snap.errors.street2}</Field.Error>
//                 </Field.Control>
//               </Field.Root>
//             </div>

//             <div className="md:basis-1/2 space-y-3">
//               <Field.Root
//                 value={snap.values.zip as string}
//                 onChange={(v) => ctrl.set("zip", v)}
//               >
//                 <Field.Label>{t("driver.zip")}</Field.Label>
//                 <Field.Control>
//                   <Field.Input className="w-full" />
//                   <Field.Error>{snap.errors.zip}</Field.Error>
//                 </Field.Control>
//               </Field.Root>

//               <Field.Root
//                 value={snap.values.drivers_license as string}
//                 onChange={(v) => ctrl.set("drivers_license", v)}
//               >
//                 <Field.Label>{t("driver.drivers_license")}</Field.Label>
//                 <Field.Control>
//                   <Field.Input className="w-full" />
//                   <Field.Error>{snap.errors.drivers_license}</Field.Error>
//                 </Field.Control>
//               </Field.Root>

//               <Field.Root
//                 value={snap.values.drivers_license_expiry as string}
//                 onChange={(v) => ctrl.set("drivers_license_expiry", v)}
//               >
//                 <Field.Label>{t("driver.drivers_license_expiry")}</Field.Label>
//                 <Field.Control>
//                   <Field.Input type="date" className="w-full" />
//                   <Field.Error>
//                     {snap.errors.drivers_license_expiry}
//                   </Field.Error>
//                 </Field.Control>
//               </Field.Root>

//               {/* Login hanya dibutuhkan saat create */}
//               {mode === "create" && (
//                 <Field.Root
//                   value={snap.values.login as string}
//                   onChange={(v) => ctrl.set("login", v)}
//                 >
//                   <Field.Label>Email</Field.Label>
//                   <Field.Control>
//                     <Field.Input className="w-full" />
//                     <Field.Error>{snap.errors.login}</Field.Error>
//                   </Field.Control>
//                 </Field.Root>
//               )}

//               {/* Password & Confirm hanya ditampilkan saat create (opsional di edit) */}
//               {mode === "create" && (
//                 <>
//                   <FieldPassword
//                     label={t("signup.form.password.label")}
//                     name="password"
//                     value={snap.values.password as string}
//                     onChange={(v) => ctrl.set("password", v)}
//                     placeholder={t("signup.form.password.placeholder")}
//                     disabled={submitting}
//                     a11yShow={t("signup.a11y.showPassword")}
//                     a11yHide={t("signup.a11y.hidePassword")}
//                   />
//                   <FieldPassword
//                     label={t("signup.form.confirm.label")}
//                     name="confirmPassword"
//                     value={confirm}
//                     onChange={setConfirm}
//                     placeholder={t("signup.form.confirm.placeholder")}
//                     disabled={submitting}
//                     a11yShow={t("signup.a11y.showConfirm")}
//                     a11yHide={t("signup.a11y.hideConfirm")}
//                   />
//                 </>
//               )}

//               <MultiFileUpload
//                 label={t("fleet.stnk_foto")}
//                 value={driverDocumentFiles}
//                 onChange={setDriverDocumentFiles}
//                 accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
//                 maxFileSizeMB={10}
//                 maxFiles={10}
//                 hint={
//                   t("orders.upload_hint_10mb") ??
//                   "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
//                 }
//                 onReject={(msgs) => console.warn("rejected:", msgs)}
//                 className="gap-3 justify-end"
//                 showImagePreview
//               />
//             </div>
//           </div>
//         </CardBody>
//       </Card>
//     </div>
//   );
// }
