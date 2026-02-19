import React from "react";
import { t } from "@/lib/i18n";
import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
import { FieldText } from "@/components/form/FieldText";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";
import type { AddressItem, OrderAttachmentGroup } from "@/types/orders";
import FieldPhone from "@/components/form/FieldPhone";
import { cn } from "@/lib/cn";
import { AddressSidePanel } from "@/components/ui/AddressSidePanel";
import { fmtDate } from "@/lib/helpers";

export type ExtraStop = {
  id?: number;
  lokMuat: AddressItem | null;
  lokBongkar: AddressItem | null;
  originPicName: string;
  originPicPhone: string;
  destPicName: string;
  destPicPhone: string;

  tglETDMuat: string; // "YYYY-MM-DDTHH:mm" (local)
  tglETABongkar: string; // "YYYY-MM-DDTHH:mm" (local)

  originAddressName: string;
  originStreet: string;
  originStreet2: string;
  originDistrictName: string;
  originZipCode: string;
  originLatitude: string;
  originLongitude: string;

  destAddressName: string;
  destStreet: string;
  destStreet2: string;
  destDistrictName: string;
  destZipCode: string;
  destLatitude: string;
  destLongitude: string;

  delivery_note_uri: string;

  // attachment group dari backend route (untuk render list file di AddressSidePanel)
  pickupAttachment?: OrderAttachmentGroup | null;
  dropOffAttachment?: OrderAttachmentGroup | null;
};

type AddressSidePanelAttachment = React.ComponentProps<
  typeof AddressSidePanel
>["attachment"];

type Props = {
  id?: number;
  orderId?: number | string;
  mode?: "create" | "edit";
  userType?: string | "";
  isReadOnly: boolean;
  idx: number;
  stop: ExtraStop;
  onChange: (patch: Partial<ExtraStop>) => void;
  error?: string;
  cityIdMuat: number | null;
  cityIdBongkar: number | null;
  lokasiMuatDisabled: boolean;
  lokasiBongkarDisabled: boolean;
  tglETDMuat: string;
  setTglETDMuat: (v: string) => void;
  tglETABongkar: string;
  setTglETABongkar: (v: string) => void;
  // pickupAttachment?: AddressSidePanelAttachment;
  // dropOffAttachment?: AddressSidePanelAttachment;

  pickupAttachment?: OrderAttachmentGroup | null;
  setPickupAttachment?: (v: OrderAttachmentGroup | null) => void;
  uploadPickupAttachmentGroup?: (
    files: File[],
  ) => Promise<OrderAttachmentGroup>;
  deletePickupAttachmentFile?: (
    fileId: number,
  ) => Promise<OrderAttachmentGroup | null>;
  dropOffAttachment?: OrderAttachmentGroup | null;
  setDropOffAttachment?: (v: OrderAttachmentGroup | null) => void;
  uploadDropOffAttachmentGroup?: (
    files: File[],
  ) => Promise<OrderAttachmentGroup>;
  deleteDropOffAttachmentFile?: (
    fileId: number,
  ) => Promise<OrderAttachmentGroup | null>;
};

const ExtraStopCard = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      orderId,
      isReadOnly,
      idx,
      userType,
      stop,
      onChange,
      error,
      cityIdMuat,
      cityIdBongkar,
      lokasiMuatDisabled,
      lokasiBongkarDisabled,
      tglETDMuat,
      setTglETDMuat,
      tglETABongkar,
      setTglETABongkar,
      mode,
      pickupAttachment,
      setPickupAttachment,
      uploadPickupAttachmentGroup,
      deletePickupAttachmentFile,
      dropOffAttachment,
      setDropOffAttachment,
      uploadDropOffAttachmentGroup,
      deleteDropOffAttachmentFile,
    },
    ref,
  ) => {
    const origin = {
      name: stop.originAddressName,
      street1: stop.originStreet,
      street2: stop.originStreet2,
      districtLine: stop.originDistrictName,
      province: "",
      postcode: stop.originZipCode,
      mobile: "-",
      email: "-",
      lat: stop.originLatitude,
      lng: stop.originLongitude,
      picName: stop.originPicName,
      picPhone: stop.originPicPhone,
      timeLabel: "ETD",
      timeValue: fmtDate(stop.tglETDMuat),
      pickup_attachment_id: pickupAttachment?.id ?? null,
      pickupAttachment: pickupAttachment,
    };

    const destination = {
      name: stop.destAddressName,
      street1: stop.destStreet,
      street2: stop.destStreet2,
      districtLine: stop.destDistrictName,
      province: "",
      postcode: stop.destZipCode,
      mobile: "-",
      email: "-",
      lat: stop.destLatitude,
      lng: stop.destLongitude,
      picName: stop.destPicName,
      picPhone: stop.destPicPhone,
      timeLabel: "ETA",
      timeValue: fmtDate(stop.tglETABongkar),
      delivery_note_uri: stop.delivery_note_uri,
      drop_off_attachment_id: dropOffAttachment?.id ?? null,
      dropOffAttachment: dropOffAttachment,
    };

    console.log("render ExtraStopCard", { isReadOnly, userType });
    console.log("origin", origin);
    console.log("destination", destination);

    const isTransporter = userType === "transporter";

    // Tampilkan panel jika:
    // - readonly (review/detail)
    // - transporter (butuh panel)
    // - attachment control sudah ada
    // - atau address sudah keisi (biar user lihat preview)
    const hasAnyAddress =
      !!stop.originAddressName?.trim() || !!stop.destAddressName?.trim();

    // const showSidePanels =
    //   isReadOnly ||
    //   isTransporter ||
    //   !!pickupAttachment ||
    //   !!dropOffAttachment ||
    //   hasAnyAddress;

    // // mode yg masuk akal:
    // // - readonly => view
    // // - selain itu => edit (jangan "create" kecuali AddressSidePanel memang support)
    // // const sidePanelMode = isReadOnly ? "view" : "edit";
    // const sidePanelMode = "edit";

    const panelMode = isReadOnly || mode === "edit" ? "edit" : "create";
    const canEditAttachment = panelMode === "edit";

    console.log("Data Stop on ExtraStopCard : ",stop);

    type PanelAttachment = React.ComponentProps<
      typeof AddressSidePanel
    >["attachment"];
    type PanelControl = NonNullable<PanelAttachment>;
    type PanelGroup = PanelControl["value"];
    type PanelGroupNonNull = Exclude<PanelGroup, null | undefined>;

    const pickupAttachmentControl: PanelAttachment = {
      value: (pickupAttachment ?? null) as PanelGroup,
      ...(canEditAttachment &&
      !!setPickupAttachment &&
      !!uploadPickupAttachmentGroup &&
      !!deletePickupAttachmentFile
        ? {
            onChange: (v) =>
              setPickupAttachment(v as unknown as OrderAttachmentGroup | null),
            uploadGroup: async (files) =>
              (await uploadPickupAttachmentGroup(
                files,
              )) as unknown as PanelGroupNonNull,
            deleteFile: async (fileId) =>
              (await deletePickupAttachmentFile(
                fileId,
              )) as unknown as PanelGroup,
            ui: {
              accept: "application/pdf,image/*",
              maxFileSizeMB: 10,
              uploadButtonText: "Upload",
              hint: "PDF/JPG/PNG. Maks. 10 MB per file.",
            },
          }
        : {}),
    };

    const dropOffAttachmentControl: PanelAttachment = {
      value: (dropOffAttachment ?? null) as PanelGroup,
      ...(canEditAttachment &&
      !!setDropOffAttachment &&
      !!uploadDropOffAttachmentGroup &&
      !!deleteDropOffAttachmentFile
        ? {
            onChange: (v) =>
              setDropOffAttachment(v as unknown as OrderAttachmentGroup | null),
            uploadGroup: async (files) =>
              (await uploadDropOffAttachmentGroup(
                files,
              )) as unknown as PanelGroupNonNull,
            deleteFile: async (fileId) =>
              (await deleteDropOffAttachmentFile(
                fileId,
              )) as unknown as PanelGroup,
            ui: {
              accept: "application/pdf,image/*",
              maxFileSizeMB: 10,
              uploadButtonText: "Upload",
              hint: "PDF/JPG/PNG. Maks. 10 MB per file.",
            },
          }
        : {}),
    };

    type AttachmentItemLite = {
      id?: number | string;
      name?: string;
      url?: string;
      mimetype?: string;
    };

    const toAttachmentItems = (
      group?: OrderAttachmentGroup | null,
    ): AttachmentItemLite[] => {
      // backend biasanya kirim `attachments`, tapi beberapa response bisa beda key
      // (mis. `attachment_ids` / `files`). Fallback biar list tidak dianggap kosong.
      const g = group as unknown as Record<string, unknown> | null | undefined;
      const raw = g?.attachments ?? g?.attachment_ids ?? g?.files;
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(
          (x): x is Record<string, unknown> => !!x && typeof x === "object",
        )
        .map((o) => {
          const id = o["id"];
          const name = o["name"];
          const url = o["url"];
          const mimetype = o["mimetype"];
          return {
            id:
              typeof id === "number" || typeof id === "string" ? id : undefined,
            name: typeof name === "string" ? name : undefined,
            url: typeof url === "string" ? url : undefined,
            mimetype: typeof mimetype === "string" ? mimetype : undefined,
          };
        });
    };

    // sumber data attachment yang paling update biasanya dari props (state parent),
    // sedangkan `stop.pickupAttachment` / `stop.dropOffAttachment` sering belum ikut ter-update.
    const pickupGroup = pickupAttachment ?? stop.pickupAttachment ?? null;
    const dropOffGroup = dropOffAttachment ?? stop.dropOffAttachment ?? null;

    const pickupItems = toAttachmentItems(pickupGroup);
    const dropOffItems = toAttachmentItems(dropOffGroup);

    console.log("pickupItems", pickupItems);
    console.log("dropOffItems", dropOffItems);



    const showPickupDropDocList =
      userType === "shipper" &&
      mode === "edit" &&
      (pickupGroup != null || dropOffGroup != null);

    console.log("showPickupDropDocList", showPickupDropDocList);

    const renderDocList = (items: AttachmentItemLite[]) => {
      
      console.log("renderDocList", { items });

      if (items.length === 0) {
        return <div className="text-xs text-slate-500">-</div>;
      }
      return (
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const key =
              typeof it.id === "number" || typeof it.id === "string"
                ? String(it.id)
                : `idx-${idx}`;
            const label = it.name ?? `File ${idx + 1}`;
            const href = it.url;
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {label}
                </span>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    Download
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400">
                    No link
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      );
    };

    return (
      <div ref={ref}>
        {/* {showSidePanels && ( */}

        {userType === "transporter" && (
          <>
            <div className={cn("grid grid-cols-1 gap-8 lg:grid-cols-2")}>
              <AddressSidePanel
                title="Origin Address"
                labelPrefix="Origin"
                info={origin}
                mode={panelMode}
                attachment={pickupAttachmentControl}
                orderId={orderId}
                currentRouteId={stop.id}
                routePickupAttachmentId={pickupAttachment?.id ?? null}
                routeDropOffAttachmentId={dropOffAttachment?.id ?? null}
              />
              <AddressSidePanel
                title="Destination Address"
                labelPrefix="Destination"
                info={destination}
                mode={panelMode}
                attachment={dropOffAttachmentControl}
                orderId={orderId}
                currentRouteId={stop.id}
                routePickupAttachmentId={pickupAttachment?.id ?? null}
                routeDropOffAttachmentId={dropOffAttachment?.id ?? null}
              />
            </div>
          </>
        )}

        {/* )} */}

        {/* <div
          className={cn(
            "rounded-xl border border-gray-200 p-3 ",
            isReadOnly && "hidden",
          )}
        > */}
        <div>
          {userType === "shipper" && (
            <>
              <div className="mb-2 text-sm font-semibold">
                {t("orders.set_ke") ?? "Set ke"} {idx + 1}
              </div>

              {error && (
                <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <DateTimePickerTW
                    disabled={isReadOnly}
                    label={
                      (t("orders.tgl_muat") ?? "Tgl Muat") + ` (${idx + 1})`
                    }
                    value={tglETDMuat}
                    onChange={setTglETDMuat}
                    displayFormat="DD-MM-YYYY"
                  />
                  <AddressAutocomplete
                    label={
                      (t("orders.lokasi_muat") ?? "Lokasi Muat") +
                      ` (${idx + 1})`
                    }
                    cityId={cityIdMuat}
                    value={stop.lokMuat}
                    onChange={(v) => onChange({ lokMuat: v })}
                    disabled={!!lokasiMuatDisabled}
                  />
                  <FieldText
                    label={
                      (t("orders.pic_muat_name") ?? "PIC Muat - Nama") +
                      ` (${idx + 1})`
                    }
                    value={stop.originPicName}
                    onChange={(v) => onChange({ originPicName: v })}
                    disabled={isReadOnly}
                  />
                  <FieldPhone
                    label={
                      (t("orders.pic_muat_phone") ?? "PIC Muat - Telepon") +
                      ` (${idx + 1})`
                    }
                    value={stop.originPicPhone}
                    onChange={(v) => onChange({ originPicPhone: v })}
                    kind="mobile"
                    placeholder={t("placeholders.phone") ?? "08xx atau +628xx"}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-4">
                  <DateTimePickerTW
                    disabled={isReadOnly}
                    label={
                      (t("orders.tgl_bongkar") ?? "Tgl Bongkar") +
                      ` (${idx + 1})`
                    }
                    value={tglETABongkar}
                    onChange={setTglETABongkar}
                    displayFormat="DD-MM-YYYY"
                  />
                  <AddressAutocomplete
                    label={
                      (t("orders.lokasi_bongkar") ?? "Lokasi Bongkar") +
                      ` (${idx + 1})`
                    }
                    cityId={cityIdBongkar}
                    value={stop.lokBongkar}
                    onChange={(v) => onChange({ lokBongkar: v })}
                    disabled={!!lokasiBongkarDisabled}
                  />
                  <FieldText
                    label={
                      (t("orders.pic_bongkar_name") ?? "PIC Bongkar - Nama") +
                      ` (${idx + 1})`
                    }
                    value={stop.destPicName}
                    onChange={(v) => onChange({ destPicName: v })}
                    disabled={isReadOnly}
                  />
                  <FieldPhone
                    label={
                      (t("orders.pic_bongkar_phone") ??
                        "PIC Bongkar - Telepon") + ` (${idx + 1})`
                    }
                    value={stop.destPicPhone}
                    onChange={(v) => onChange({ destPicPhone: v })}
                    kind="mobile"
                    placeholder={t("placeholders.phone") ?? "08xx atau +628xx"}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {showPickupDropDocList && userType === "shipper" && (
          <div className="mt-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  Pickup Document
                </div>
                {renderDocList(pickupItems)}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  Drop Off Document
                </div>
                {renderDocList(dropOffItems)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

ExtraStopCard.displayName = "ExtraStopCard";
export default ExtraStopCard;
