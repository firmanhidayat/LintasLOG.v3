import type React from "react";
import { AddressInfo } from "@/types/addressinfo";
import IndMultiFileUpload, {
  type UploadedFileItem as IndUploadedFileItem,
} from "@/components/form/IndMultiFileUpload";

type AddressSidePanelInfo = AddressInfo & {
  // optional fields (backward compatible)
  delivery_note_uri?: string | null;
  deliveryNoteUri?: string | null;
  postCode?: string | null; // some callers still use postCode (camelCase)
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
  attachments?: AttachmentItem[] | null;
};

type AttachmentUI = {
  accept?: string;
  maxFileSizeMB?: number;
  maxFiles?: number;
  uploadButtonText?: string;
  hint?: string;
};

export type AttachmentControl<TGroup extends AttachmentGroupBase = AttachmentGroupBase> = {
  value: TGroup | null;
  onChange: (v: TGroup | null) => void;
  uploadGroup: (files: File[]) => Promise<TGroup>;
  deleteFile: (fileId: number) => Promise<TGroup | null | void>;
  ui?: AttachmentUI;
};

function readTrimmedString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function ensureOdooDownloadUri(uri: string): string {
  // keep as-is if already has download param
  if (/([?&])download=/.test(uri)) return uri;
  // Odoo common binary/content routes
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

function toUploadedItemsFromGroup<TGroup extends AttachmentGroupBase>(
  group: TGroup | null
): IndUploadedFileItem[] {
  const items = group?.attachments ?? [];
  return items
    .filter((x) => x && typeof x.id === "number" && !!x.url)
    .map((x) => ({
      id: x.id,
      name: x.name,
      url: x.url,
      mimetype: x.mimetype ?? undefined,
      groupId: group?.id,
    }));
}

export function AddressSidePanel<TGroup extends AttachmentGroupBase = AttachmentGroupBase>({
  title,
  labelPrefix,
  info,
  mode,
  attachment,
}: {
  title: string;
  labelPrefix: "Origin" | "Destination";
  info?: AddressSidePanelInfo | null;
  mode?: string;
  attachment?: AttachmentControl<TGroup>;
}) {
  const isOrigin = labelPrefix === "Origin";

  // Tone berbeda agar Origin vs Destination langsung kebaca
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
    ? ensureOdooDownloadUri(deliveryNoteRaw)
    : null;
  const deliveryNoteName = deliveryNoteUri
    ? guessFileName(deliveryNoteUri)
    : null;

  const downloadBtnClass = [
    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition",
    "bg-white/70 hover:bg-white",
    isOrigin
      ? "border-sky-200 text-sky-800 hover:bg-sky-50"
      : "border-amber-200 text-amber-800 hover:bg-amber-50",
  ].join(" ");

  const showAttachment = mode === "edit" && !!attachment;
  const uploadedItems = showAttachment
    ? toUploadedItemsFromGroup<TGroup>(attachment?.value ?? null)
    : [];

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

        {deliveryNoteUri ? (
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
                <div className="truncate text-xs font-semibold text-slate-700">
                  {deliveryNoteName}
                </div>
              ) : null}
            </div>
          </Row>
        ) : null}

        <Row label="Latitude">
          <span className="font-semibold tabular-nums">{info?.lat ?? "-"}</span>
        </Row>

        <Row label="Longitude">
          <span className="font-semibold tabular-nums">{info?.lng ?? "-"}</span>
        </Row>

        {/* PIC rows tetap adaptif */}
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

      {/* Independent uploader (edit only) */}
      {showAttachment ? (
        <div className="mt-4">
          <IndMultiFileUpload
            label={`${sideLabel} Attachment`}
            accept={uploadAccept}
            maxFileSizeMB={uploadMaxFileSizeMB}
            maxFiles={uploadMaxFiles}
            hint={uploadHint}
            uploadButtonText={uploadButtonText}
            uploadedItems={uploadedItems}
            autoUpload
            clearQueueAfterUpload
            uploadFiles={async (files) => {
              if (!attachment) return [];
              const beforeIds = new Set(
                (attachment.value?.attachments ?? []).map((a) => String(a.id))
              );
              const nextGroup = await attachment.uploadGroup(files);
              attachment.onChange(nextGroup);

              const after = toUploadedItemsFromGroup<TGroup>(nextGroup);
              const newOnes = after.filter((x) => !beforeIds.has(String(x.id)));
              return newOnes;
            }}
            onRemoveUploaded={async (item) => {
              if (!attachment) return;

              const res = await attachment.deleteFile(Number(item.id));

              if (res && typeof res === "object") {
                attachment.onChange(res as TGroup);
                return;
              }

              // fallback: optimistic update jika API delete tidak return group
              const curr = attachment.value;
              if (!curr) return;
              const nextAttachments = (curr.attachments ?? []).filter(
                (a) => String(a.id) !== String(item.id)
              );
              const patched = { ...curr, attachments: nextAttachments } as TGroup;
              attachment.onChange(patched);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
