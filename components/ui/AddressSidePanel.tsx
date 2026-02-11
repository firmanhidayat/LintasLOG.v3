import type React from "react";
import { AddressInfo } from "@/types/addressinfo";
import IndMultiFileUpload, {
  type UploadedFileItem as IndUploadedFileItem,
} from "@/components/form/IndMultiFileUpload";

type AddressSidePanelInfo = AddressInfo & {
  delivery_note_uri?: string | null;
  deliveryNoteUri?: string | null;
  postCode?: string | null; // some callers still use postCode (camelCase)

  // current route doc-attachment ids (optional)
  pickup_attachment_id?: number | string | null;
  drop_off_attachment_id?: number | string | null;
};

type AttachmentItem = {
  id: number;
  name: string;
  url: string;
  mimetype?: string | null;
};

type AttachmentGroupBase = {
  id: number | string;
  name: string;
  doc_type?: string | null;
  attachments?: AttachmentItem[] | null;
};

type AttachmentUI = {
  accept?: string;
  maxFileSizeMB?: number;
  maxFiles?: number;
  uploadButtonText?: string;
  hint?: string;
};

export type AttachmentControl<
  TGroup extends AttachmentGroupBase = AttachmentGroupBase
> = {
  value: TGroup | null;
  onChange?: (v: TGroup | null) => void;
  uploadGroup?: (files: File[]) => Promise<TGroup>;
  deleteFile?: (fileId: number) => Promise<TGroup | null | void>;
  ui?: AttachmentUI;
};

function readTrimmedString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const TMS_FILE_BASE =
  process.env.NEXT_PUBLIC_TMS_FILE_BASE_URL ??
  process.env.NEXT_PUBLIC_TMS_FILE_BASE_URL_ALT ??
  process.env.NEXT_PUBLIC_TMS_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "";

function resolveUrlMaybe(url: string): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (url.startsWith("/") && TMS_FILE_BASE) {
    return `${TMS_FILE_BASE.replace(/\/$/, "")}${url}`;
  }
  return url;
}

function ensureOdooDownloadUri(uri: string): string {
  if (/([?&])download=/.test(uri)) return uri;
  if (/\/web\/(content|binary)\//.test(uri)) {
    return `${uri}${uri.includes("?") ? "&" : "?"}download=true`;
  }
  return uri;
}

function guessFileName(uri: string): string | null {
  const m = uri.match(/[?&]filename=([^&]+)/i);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  const clean = (uri.split("?")[0] ?? "").trim();
  const last = clean.split("/").filter(Boolean).pop();
  return last && !/^\d+$/.test(last) ? last : null;
}


export function AddressSidePanel<
  TGroup extends AttachmentGroupBase = AttachmentGroupBase
>({
  title,
  labelPrefix,
  info,
  mode,
  attachment,
  orderId,
  currentRouteId,
}: {
  title: string;
  labelPrefix: "Origin" | "Destination";
  info?: AddressSidePanelInfo | null;
  mode?: string;
  attachment?: AttachmentControl<TGroup>;
  orderId?: number | string;
  currentRouteId?: number | string;
}) {
  const isOrigin = labelPrefix === "Origin";

  const tone = isOrigin
    ? {
        wrap: "border-sky-200 bg-sky-50/60",
        badge: "border-sky-200 bg-sky-100 text-sky-800",
        link: "text-sky-700 hover:underline",
        soft: "text-sky-700",
      }
    : {
        wrap: "border-amber-200 bg-amber-50/60",
        badge: "border-amber-200 bg-amber-100 text-amber-800",
        link: "text-amber-700 hover:underline",
        soft: "text-amber-700",
      };

  const sideLabel = isOrigin ? "Pickup" : "Drop-off";

  const dash = <span className="text-slate-400">-</span>;

  const Row = ({
    label,
    children,
    emphasize,
  }: {
    label: string;
    children: React.ReactNode;
    emphasize?: boolean;
  }) => (
    <div className="grid grid-cols-[8.5rem_1fr] items-start gap-x-3 gap-y-1 rounded-lg bg-white/60 p-2 hover:bg-white/80">
      <dt
        className={[
          "text-[11px] font-semibold uppercase tracking-wide",
          emphasize ? tone.soft : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </dt>
      <dd
        className={[
          "min-w-0 rounded-md bg-white/70 px-2 py-1 text-sm",
          emphasize
            ? "font-semibold text-slate-900"
            : "font-medium text-slate-900",
        ].join(" ")}
      >
        {children}
      </dd>
    </div>
  );

  const postcode =
    readTrimmedString(info?.postcode) ?? readTrimmedString(info?.postCode);

  const deliveryNoteRaw =
    readTrimmedString(info?.delivery_note_uri) ??
    readTrimmedString(info?.deliveryNoteUri);

  const deliveryNoteUri = deliveryNoteRaw
    ? ensureOdooDownloadUri(resolveUrlMaybe(deliveryNoteRaw))
    : null;

  const deliveryNoteName = deliveryNoteUri ? guessFileName(deliveryNoteUri) : null;

  const downloadBtnClass = [
    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition",
    "bg-white/70 hover:bg-white",
    isOrigin
      ? "border-sky-200 text-sky-800 hover:bg-sky-50"
      : "border-amber-200 text-amber-800 hover:bg-amber-50",
  ].join(" ");

  // IndMultiFileUpload melakukan upload sendiri (independent), jadi tidak perlu
  // mensyaratkan attachment.uploadGroup ada untuk menampilkan uploader.
  const showUploader = mode === "edit" && !!attachment?.onChange;

  const ui = attachment?.ui;
  const uploadAccept = ui?.accept ?? "application/pdf,image/*";
  const uploadMaxFileSizeMB = ui?.maxFileSizeMB ?? 10;
  const uploadMaxFiles = ui?.maxFiles;
  const uploadHint = ui?.hint ?? "PDF/JPG/PNG. Maks. 10 MB per file.";
  const uploadButtonText = ui?.uploadButtonText ?? "Upload";

  return (
    <section className={["rounded-xl border p-4", tone.wrap].join(" ")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={[
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              tone.badge,
            ].join(" ")}
          >
            {sideLabel}
          </span>

          <div className="min-w-0 truncate text-sm font-semibold text-slate-700">
            {title}
          </div>
        </div>

        <div className="max-w-[14rem] truncate rounded-md bg-white/70 px-2 py-1 text-sm font-semibold text-slate-900 shadow-sm">
          {info?.name ?? "-"}
        </div>
      </div>

      {/* Content */}
      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Address" emphasize>
          <div className="min-w-0 leading-6">
            {info?.street1 ? (
              <div className="text-slate-900">{info.street1}</div>
            ) : null}
            {info?.street2 ? (
              <div className="text-slate-900">{info.street2}</div>
            ) : null}

            {info?.districtLine ? (
              <div className={["text-sm font-medium", tone.soft].join(" ")}>
                {info.districtLine}
              </div>
            ) : null}

            {info?.extraLine ? (
              <div className={["text-sm font-medium", tone.soft].join(" ")}>
                {info.extraLine}
              </div>
            ) : null}

            {postcode ? (
              <div className="text-xs font-semibold text-slate-600">
                Postal Code: <span className="tabular-nums">{postcode}</span>
              </div>
            ) : null}

            {!info?.street1 &&
            !info?.street2 &&
            !info?.districtLine &&
            !info?.extraLine &&
            !postcode
              ? dash
              : null}
          </div>
        </Row>

        {info?.picName !== undefined && (
          <Row
            label={
              labelPrefix === "Origin" ? "Pickup PIC Name" : "Drop-off PIC Name"
            }
          >
            {info.picName ? info.picName : dash}
          </Row>
        )}

        {info?.picPhone !== undefined && (
          <Row
            label={
              labelPrefix === "Origin"
                ? "Pickup PIC Phone"
                : "Drop-off PIC Phone"
            }
          >
            {info.picPhone ? info.picPhone : dash}
          </Row>
        )}

        {/* Time highlight */}
        {info?.timeLabel ? (
          <Row label={info.timeLabel} emphasize>
            {info.timeValue ? info.timeValue : dash}
          </Row>
        ) : null}

        
      </dl>

      {deliveryNoteUri ? (
        <div className="mt-4">
          <Row label="Delivery Note" emphasize>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
              <a
                href={deliveryNoteUri}
                className={[downloadBtnClass, "w-full sm:w-auto"].join(" ")}
                target="_blank"
                rel="noopener noreferrer"
                download
                aria-label="Download delivery note"
                title="Download delivery note"
              >
                Download
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M12 3v10m0 0 4-4m-4 4-4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 21h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </a>
              {deliveryNoteName ? (
                <div className="truncate text-sm font-semibold text-slate-700">
                  {deliveryNoteName}
                </div>
              ) : null}
            </div>
          </Row>
        </div>
      ) : null}

      {/* Independent uploader (edit only) */}
      {showUploader ? (
        <div className="mt-4">
<IndMultiFileUpload
  orderId={orderId}
  routeId={currentRouteId}
  // gunakan null (bukan undefined) agar props groupId selalu "controlled" dan stabil
  groupId={attachment.value?.id ?? null}
  // preserve the other side when PATCH-ing route doc-attachment
  routePickupAttachmentId={info?.pickup_attachment_id ?? null}
  routeDropOffAttachmentId={info?.drop_off_attachment_id ?? null}
  docType={isOrigin ? "route_purchase_pickup" : "route_purchase_drop_off"}
  label={`${sideLabel} Attachment`}
  accept={uploadAccept}
  maxFileSizeMB={uploadMaxFileSizeMB}
  maxFiles={uploadMaxFiles}
  hint={uploadHint}
  uploadButtonText={uploadButtonText}
  autoUpload={true}
  clearQueueAfterUpload
  onGroupLoaded={(g) => {
    // keep parent attachment state in sync (so other panel won't lose its id)
    attachment?.onChange?.(g as unknown as TGroup);
  }}
  onGroupIdChange={(_, g) => {
    if (g) attachment?.onChange?.(g as unknown as TGroup);
  }}
/>
        </div>
      ) : null}
    </section>
  );
}
