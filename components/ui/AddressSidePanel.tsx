import { AddressInfo } from "@/types/addressinfo";

export function AddressSidePanel({
  title,
  labelPrefix,
  info,
}: {
  title: string;
  labelPrefix: "Origin" | "Destination";
  info?: AddressInfo | null;
}) {
  return (
    <div className="space-y-2">
      {/* Header: left title, right warehouse name */}
      <div className="grid grid-cols-[1fr,auto] items-baseline">
        <div className="text-slate-600">{title}</div>
        <div className="text-left font-semibold text-primary/100">
          {info?.name ?? "-"}
        </div>
      </div>

      <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-500">Address</dt>
        <dd className="col-start-2 min-w-0 leading-6 text-slate-700">
          {info?.street1 && <div>{info.street1}</div>}
          {info?.street2 && <div>{info.street2}</div>}
          {info?.districtLine && (
            <span className="block text-sky-600">{info.districtLine}</span>
          )}
          {info?.extraLine && (
            <span className="block text-sky-600">{info.extraLine}</span>
          )}
        </dd>

        <dt className="text-slate-500">{labelPrefix} Mobile</dt>
        <dd className="col-start-2 font-medium text-slate-900">
          {info?.mobile || "-"}
        </dd>

        <dt className="text-slate-500">{labelPrefix} Email</dt>
        <dd className="col-start-2 font-medium">
          {info?.email ? (
            <a
              href={`mailto:${info.email}`}
              className="text-sky-600 hover:underline"
            >
              {info.email}
            </a>
          ) : (
            "-"
          )}
        </dd>

        <dt className="text-slate-500">{labelPrefix} Latitude</dt>
        <dd className="col-start-2 font-semibold tabular-nums text-slate-900">
          {info?.lat ?? "-"}
        </dd>

        <dt className="text-slate-500">{labelPrefix} Longitude</dt>
        <dd className="col-start-2 font-semibold tabular-nums text-slate-900">
          {info?.lng ?? "-"}
        </dd>

        {/* PIC rows adapt label to Origin/Destination wording */}
        {info?.picName !== undefined && (
          <>
            <dt className="text-slate-500">
              {labelPrefix === "Origin"
                ? "Pickup PIC Name"
                : "Drop-off PIC Name"}
            </dt>
            <dd className="col-start-2 font-medium text-slate-900">
              {info.picName || "-"}
            </dd>
          </>
        )}
        {info?.picPhone !== undefined && (
          <>
            <dt className="text-slate-500">
              {labelPrefix === "Origin"
                ? "Pickup PIC Phone"
                : "Drop-off PIC Phone"}
            </dt>
            <dd className="col-start-2 font-semibold text-slate-900">
              {info.picPhone || "-"}
            </dd>
          </>
        )}
        {info?.timeLabel && (
          <>
            <dt className="text-slate-500">{info.timeLabel}</dt>
            <dd className="col-start-2 font-semibold text-slate-900">
              {info.timeValue || "-"}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
