import { AddressInfo } from "@/types/addressinfo";

type AddressSidePanelInfo = AddressInfo & {
  // optional fields (backward compatible)
  delivery_note_uri?: string | null;
  deliveryNoteUri?: string | null;
  postCode?: string | null; // some callers still use postCode (camelCase)
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

export function AddressSidePanel({
  title,
  labelPrefix,
  info,
}: {
  title: string;
  labelPrefix: "Origin" | "Destination";
  info?: AddressSidePanelInfo | null;
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

  const fileBadgeClass = [
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white/70",
    isOrigin ? "border-sky-200" : "border-amber-200",
  ].join(" ");

  const fileIconClass = [
    "h-4 w-4",
    isOrigin ? "text-sky-700" : "text-amber-700",
  ].join(" ");

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
              {/* <div className="flex min-w-0 items-center gap-2">
                <span className={fileBadgeClass} aria-hidden>
                  <svg
                    className={fileIconClass}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2v5h5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <div className="min-w-0">
                  <div
                    className="truncate text-sm font-semibold text-slate-900"
                    title={deliveryNoteName ?? "Delivery Note"}
                  >
                    {deliveryNoteName ?? "Delivery Note"}
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    File ready
                  </div>
                </div>
              </div> */}

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
    </section>
  );
}

// import { AddressInfo } from "@/types/addressinfo";

// export function AddressSidePanel({
//   title,
//   labelPrefix,
//   info,
// }: {
//   title: string;
//   labelPrefix: "Origin" | "Destination";
//   info?: AddressInfo | null;
// }) {
//   return (
//     <div className="space-y-2">
//       {/* Header: left title, right warehouse name */}
//       <div className="grid grid-cols-[1fr,auto] items-baseline">
//         <div className="text-slate-600">{title}</div>
//         <div className="text-left font-semibold text-primary/100">
//           {info?.name ?? "-"}
//         </div>
//       </div>

//       <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
//         <dt className="text-slate-500">Address</dt>
//         <dd className="col-start-2 min-w-0 leading-6 text-slate-700">
//           {info?.street1 && <div>{info.street1}</div>}
//           {info?.street2 && <div>{info.street2}</div>}
//           {info?.districtLine && (
//             <span className="block text-sky-600">{info.districtLine}</span>
//           )}
//           {info?.extraLine && (
//             <span className="block text-sky-600">{info.extraLine}</span>
//           )}
//         </dd>

//         <dt className="text-slate-500">{labelPrefix} Mobile</dt>
//         <dd className="col-start-2 font-medium text-slate-900">
//           {info?.mobile || "-"}
//         </dd>

//         <dt className="text-slate-500">{labelPrefix} Email</dt>
//         <dd className="col-start-2 font-medium">
//           {info?.email ? (
//             <a
//               href={`mailto:${info.email}`}
//               className="text-sky-600 hover:underline"
//             >
//               {info.email}
//             </a>
//           ) : (
//             "-"
//           )}
//         </dd>

//         <dt className="text-slate-500">{labelPrefix} Latitude</dt>
//         <dd className="col-start-2 font-semibold tabular-nums text-slate-900">
//           {info?.lat ?? "-"}
//         </dd>

//         <dt className="text-slate-500">{labelPrefix} Longitude</dt>
//         <dd className="col-start-2 font-semibold tabular-nums text-slate-900">
//           {info?.lng ?? "-"}
//         </dd>

//         {/* PIC rows adapt label to Origin/Destination wording */}
//         {info?.picName !== undefined && (
//           <>
//             <dt className="text-slate-500">
//               {labelPrefix === "Origin"
//                 ? "Pickup PIC Name"
//                 : "Drop-off PIC Name"}
//             </dt>
//             <dd className="col-start-2 font-medium text-slate-900">
//               {info.picName || "-"}
//             </dd>
//           </>
//         )}
//         {info?.picPhone !== undefined && (
//           <>
//             <dt className="text-slate-500">
//               {labelPrefix === "Origin"
//                 ? "Pickup PIC Phone"
//                 : "Drop-off PIC Phone"}
//             </dt>
//             <dd className="col-start-2 font-semibold text-slate-900">
//               {info.picPhone || "-"}
//             </dd>
//           </>
//         )}
//         {info?.timeLabel && (
//           <>
//             <dt className="text-slate-500">{info.timeLabel}</dt>
//             <dd className="col-start-2 font-semibold text-slate-900">
//               {info.timeValue || "-"}
//             </dd>
//           </>
//         )}
//       </dl>
//     </div>
//   );
// }
