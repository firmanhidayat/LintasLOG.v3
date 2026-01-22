import type { ReactNode } from "react";
import { AddressInfo } from "@/types/addressinfo";


type AddressSidePanelInfo = AddressInfo & {
  delivery_note_uri?: string | null;
  deliveryNoteUri?: string | null;
  postCode?: string | null; // backward compat
};

function readTrimmedString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
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
    try { return decodeURIComponent(m[1]); } catch { return m[1]; }
  }
  const clean = uri.split("?")[0] ?? "";
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
  // info?: AddressInfo | null;
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
    // children: React.ReactNode;
    children: ReactNode;
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
          emphasize ? "font-semibold text-slate-900" : "font-medium text-slate-900",
        ].join(" ")}
      >
        {children}
      </dd>
    </div>
  );

  const postcode = readTrimmedString(info?.postcode) ?? readTrimmedString(info?.postCode);
  const deliveryNoteRaw =
    readTrimmedString(info?.delivery_note_uri) ?? readTrimmedString(info?.deliveryNoteUri);
  const deliveryNoteUri = deliveryNoteRaw ? ensureOdooDownloadUri(deliveryNoteRaw) : null;
  const deliveryNoteName = deliveryNoteUri ? guessFileName(deliveryNoteUri) : null;


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
            {info?.street1 ? <div className="text-slate-900">{info.street1}</div> : null}
            {info?.street2 ? <div className="text-slate-900">{info.street2}</div> : null}

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
            !info?.postcode
              ? dash
              : null}
          </div>
        </Row>

    {deliveryNoteUri ? (
      <Row label="Delivery Note" emphasize>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={deliveryNoteUri}
            className={tone.link}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            Download
          </a>
          {deliveryNoteName ? (
            <span className="max-w-[18rem] truncate text-xs font-medium text-slate-600">
              {deliveryNoteName}
            </span>
          ) : null}
        </div>
      </Row>
    ) : null}

        {/* <Row label="Mobile">{info?.mobile ? info.mobile : dash}</Row>

        <Row label="Email">
          {info?.email ? (
            <a href={`mailto:${info.email}`} className={tone.link}>
              {info.email}
            </a>
          ) : (
            dash
          )}
        </Row> */}

        <Row label="Latitude">
          <span className="font-semibold tabular-nums">{info?.lat ?? "-"}</span>
        </Row>

        <Row label="Longitude">
          <span className="font-semibold tabular-nums">{info?.lng ?? "-"}</span>
        </Row>

        {/* PIC rows tetap adaptif */}
        {info?.picName !== undefined && (
          <Row
            label={labelPrefix === "Origin" ? "Pickup PIC Name" : "Drop-off PIC Name"}
          >
            {info.picName ? info.picName : dash}
          </Row>
        )}

        {info?.picPhone !== undefined && (
          <Row
            label={labelPrefix === "Origin" ? "Pickup PIC Phone" : "Drop-off PIC Phone"}
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
