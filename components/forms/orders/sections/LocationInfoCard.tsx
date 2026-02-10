"use client";

import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";
import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
import type {
  AddressItem,
  CityItem,
  OrderAttachmentGroup,
} from "@/types/orders";
import MultiPickupDropSection from "../MultiPickupDropSection";
import type { ExtraStop } from "./ExtraStopCard";
import { cn } from "@/lib/cn";
import { AddressSidePanel } from "@/components/ui/AddressSidePanel";
import { fmtDate } from "@/lib/helpers";
import { Field } from "@/components/form/FieldInput";

type ExtraStopWithId = ExtraStop & { uid: string };

type DivRef =
  | React.RefObject<HTMLDivElement>
  | React.Ref<HTMLDivElement>
  | null;

type Props = {
  isReadOnly: boolean;
  userType?: string | "";
  tglMuat: string;
  setTglMuat: (v: string) => void;
  tglBongkar: string;
  setTglBongkar: (v: string) => void;

  kotaMuat: CityItem | null;
  kotaBongkar: CityItem | null;
  lokMuat: AddressItem | null;
  setLokMuat: (a: AddressItem | null) => void;
  lokBongkar: AddressItem | null;
  setLokBongkar: (a: AddressItem | null) => void;

  picMuatNama: string;
  setPicMuatNama: (v: string) => void;
  picMuatTelepon: string;
  setPicMuatTelepon: (v: string) => void;
  picBongkarNama: string;
  setPicBongkarNama: (v: string) => void;
  picBongkarTelepon: string;
  setPicBongkarTelepon: (v: string) => void;

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
  deliveryNoteUri: string;

  multiPickupDrop: boolean;
  setMultiPickupDrop: (v: boolean) => void;
  extraStops: ExtraStopWithId[];
  setExtraStops: (fn: (prev: ExtraStopWithId[]) => ExtraStopWithId[]) => void;

  errors: Record<string, string>;
  firstErrorKey?: string;
  firstErrorRef?: DivRef;

  mode: "create" | "edit";
  pickupAttachment?: OrderAttachmentGroup | null;
  setPickupAttachment?: (v: OrderAttachmentGroup | null) => void;
  uploadPickupAttachmentGroup?: (
    files: File[]
  ) => Promise<OrderAttachmentGroup>;
  deletePickupAttachmentFile?: (
    fileId: number
  ) => Promise<OrderAttachmentGroup | null>;
  dropOffAttachment?: OrderAttachmentGroup | null;
  setDropOffAttachment?: (v: OrderAttachmentGroup | null) => void;
  uploadDropOffAttachmentGroup?: (
    files: File[]
  ) => Promise<OrderAttachmentGroup>;
  deleteDropOffAttachmentFile?: (
    fileId: number
  ) => Promise<OrderAttachmentGroup | null>;
  // setPickupAttachment,
  // uploadPickupAttachmentGroup,
  // deletePickupAttachmentFile,
  // dropOffAttachment,
  // setDropOffAttachment,
  // uploadDropOffAttachmentGroup,
  // deleteDropOffAttachmentFile,

  // map by uid —> konsisten dengan MultiPickupDropSection
  extraRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
};

export default function LocationInfoCard({
  isReadOnly,
  userType,
  tglMuat,
  setTglMuat,
  tglBongkar,
  setTglBongkar,
  kotaMuat,
  kotaBongkar,
  lokMuat,
  setLokMuat,
  lokBongkar,
  setLokBongkar,
  picMuatNama,
  setPicMuatNama,
  picMuatTelepon,
  setPicMuatTelepon,
  picBongkarNama,
  setPicBongkarNama,
  picBongkarTelepon,
  setPicBongkarTelepon,
  originAddressName,
  originStreet,
  originStreet2,
  originDistrictName,
  originZipCode,
  originLatitude,
  originLongitude,
  destAddressName,
  destStreet,
  destStreet2,
  destDistrictName,
  destZipCode,
  destLatitude,
  destLongitude,
  deliveryNoteUri,
  mode = "create",
  pickupAttachment,
  setPickupAttachment,
  uploadPickupAttachmentGroup,
  deletePickupAttachmentFile,
  dropOffAttachment,
  setDropOffAttachment,
  uploadDropOffAttachmentGroup,
  deleteDropOffAttachmentFile,
  multiPickupDrop,
  setMultiPickupDrop,
  extraStops,
  setExtraStops,
  errors,
  firstErrorKey,
  firstErrorRef,
  extraRefs,
}: Props) {
  const lokasiMuatDisabled = !kotaMuat;
  const lokasiBongkarDisabled = !kotaBongkar;

  console.log("userType in LocationInfoCard:", userType);
  console.log("mode in LocationInfoCard:", mode);
  console.log("isReadOnly in LocationInfoCard:", isReadOnly);
  console.log("pickupAttachment in LocationInfoCard:", pickupAttachment);
  console.log("dropOffAttachment in LocationInfoCard:", dropOffAttachment);

  const refIf = (k: string) =>
    firstErrorKey === k
      ? (firstErrorRef as React.Ref<HTMLDivElement>)
      : undefined;

  const origin = {
    name: originAddressName,
    street1: originStreet,
    street2: originStreet2,
    districtLine: originDistrictName,
    province: "",
    postCode: originZipCode,
    mobile: "-",
    email: "-",
    lat: originLatitude,
    lng: originLongitude,
    picName: picMuatNama,
    picPhone: picMuatTelepon,
    timeLabel: "ETD",
    timeValue: fmtDate(tglMuat),
    pickup_attachment_id: pickupAttachment?.id ?? null,
  };

  const destination = {
    name: destAddressName,
    street1: destStreet,
    street2: destStreet2,
    districtLine: destDistrictName,
    province: "",
    postCode: destZipCode,
    mobile: "-",
    email: "-",
    lat: destLatitude,
    lng: destLongitude,
    picName: picBongkarNama,
    picPhone: picBongkarTelepon,
    timeLabel: "ETA",
    timeValue: fmtDate(tglBongkar),
    delivery_note_uri: deliveryNoteUri,
    drop_off_attachment_id: dropOffAttachment?.id ?? null,
  };

  const showSidePanels = isReadOnly ;//|| mode !== "view";
  const showOnlyTransporter = userType === "transporter" ? true : false;

  const panelMode = isReadOnly || mode === "edit" ? "edit" : "create";
  const canEditAttachment = panelMode === "edit";

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
              files
            )) as unknown as PanelGroupNonNull,
          deleteFile: async (fileId) =>
            (await deletePickupAttachmentFile(fileId)) as unknown as PanelGroup,
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
              files
            )) as unknown as PanelGroupNonNull,
          deleteFile: async (fileId) =>
            (await deleteDropOffAttachmentFile(
              fileId
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

  return (
    <Card>
      <CardHeader>
        <h4 className="text-3xl font-semibold text-gray-800">
          {t("orders.info_lokasi")}
        </h4>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          
            {/* Kolom 1 - Editable */}
            {/* <div className={cn("space-y-4", isReadOnly && "hidden")}> */}
            <div className="space-y-4">
              <div ref={refIf("tglMuat")}>
                <DateTimePickerTW
                  label={t("orders.tgl_muat")}
                  value={tglMuat}
                  onChange={setTglMuat}
                  error={errors.tglMuat}
                  touched={Boolean(errors.tglMuat)}
                  displayFormat="DD-MM-YYYY"
                />
              </div>

              <div ref={refIf("lokMuat")}>
                <AddressAutocomplete
                  label={t("orders.lokasi_muat")}
                  cityId={kotaMuat?.id ?? null}
                  value={lokMuat}
                  onChange={setLokMuat}
                  disabled={lokasiMuatDisabled}
                />
                {errors.lokMuat && (
                  <div className="mt-1 text-xs text-red-600">
                    {errors.lokMuat}
                  </div>
                )}
              </div>

              <Field.Root value={picMuatNama} onChange={setPicMuatNama}>
                <Field.Label>{t("orders.pic_muat_name")}</Field.Label>
                <Field.Input />
                <Field.Error />
              </Field.Root>

              <Field.Root
                type="tel"
                value={picMuatTelepon}
                onChange={setPicMuatTelepon}
                placeholder={t("placeholders.phone")}
              >
                <Field.Label>{t("orders.pic_muat_phone")}</Field.Label>
                <Field.Input />
                <Field.Error />
              </Field.Root>
            </div>

            {/* Kolom 2 - Editable */}
            {/* <div className={cn("space-y-4", isReadOnly && "hidden")}> */}
            <div className="space-y-4">
              <div ref={refIf("tglBongkar")}>
                <DateTimePickerTW
                  label={t("orders.tgl_bongkar")}
                  value={tglBongkar}
                  onChange={setTglBongkar}
                  error={errors.tglBongkar}
                  touched={Boolean(errors.tglBongkar)}
                  displayFormat="DD-MM-YYYY"
                />
              </div>

              <div ref={refIf("lokBongkar")}>
                <AddressAutocomplete
                  label={t("orders.lokasi_bongkar")}
                  cityId={kotaBongkar?.id ?? null}
                  value={lokBongkar}
                  onChange={setLokBongkar}
                  disabled={lokasiBongkarDisabled}
                />
                {errors.lokBongkar && (
                  <div className="mt-1 text-xs text-red-600">
                    {errors.lokBongkar}
                  </div>
                )}
              </div>

              <Field.Root value={picBongkarNama} onChange={setPicBongkarNama}>
                <Field.Label>{t("orders.pic_bongkar_name")}</Field.Label>
                <Field.Input />
                <Field.Error />
              </Field.Root>

              <Field.Root
                type="tel"
                value={picBongkarTelepon}
                onChange={setPicBongkarTelepon}
                placeholder={t("placeholders.phone")}
              >
                <Field.Label>{t("orders.pic_bongkar_phone")}</Field.Label>
                <Field.Input />
                <Field.Error />
              </Field.Root>
            </div>
          {/* Readonly panels */}
          {userType === "transporter" && (
            <>
              {/* <div className={cn("space-y-4", !showSidePanels && "hidden")}> */}
              <div className="space-y-4">
                <AddressSidePanel
                  title="Origin Address"
                  labelPrefix="Origin"
                  info={origin}
                  mode={panelMode}
                  attachment={pickupAttachmentControl}
                />
              </div>

              {/* <div className={cn("space-y-4", !showSidePanels && "hidden")}> */}
              <div className="space-y-4">
                <AddressSidePanel
                  title="Destination Address"
                  labelPrefix="Destination"
                  info={destination}
                  mode={panelMode}
                  attachment={dropOffAttachmentControl}
                />
              </div>
            </>
          )}
        </div>

        {/* ==== Multi Pickup/Drop (dipisah ke komponen) ==== */}
        <MultiPickupDropSection
          userType={userType}
          isReadOnly={isReadOnly}
          multiPickupDrop={multiPickupDrop}
          setMultiPickupDrop={setMultiPickupDrop}
          extraStops={extraStops}
          setExtraStops={setExtraStops}
          errors={errors}
          extraRefs={extraRefs}
          cityIdMuat={kotaMuat?.id ?? null}
          cityIdBongkar={kotaBongkar?.id ?? null}
          lokasiMuatDisabled={lokasiMuatDisabled}
          lokasiBongkarDisabled={lokasiBongkarDisabled}
        />
      </CardBody>
    </Card>
  );
}

// "use client";

// import React from "react";
// import { t } from "@/lib/i18n";
// import { Card, CardHeader, CardBody } from "@/components/ui/Card";
// import DateTimePickerTW from "@/components/form/DateTimePickerTW";
// import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
// import type { AddressItem, CityItem, OrderAttachmentGroup } from "@/types/orders";
// import MultiPickupDropSection from "../MultiPickupDropSection";
// import type { ExtraStop } from "./ExtraStopCard";
// import { cn } from "@/lib/cn";
// import { AddressSidePanel } from "@/components/ui/AddressSidePanel";
// import { fmtDate } from "@/lib/helpers";
// import { Field } from "@/components/form/FieldInput";

// type ExtraStopWithId = ExtraStop & { uid: string };

// type DivRef =
//   | React.RefObject<HTMLDivElement>
//   | React.Ref<HTMLDivElement>
//   | null;

// type Props = {
//   isReadOnly: boolean;
//   tglMuat: string;
//   setTglMuat: (v: string) => void;
//   tglBongkar: string;
//   setTglBongkar: (v: string) => void;

//   kotaMuat: CityItem | null;
//   kotaBongkar: CityItem | null;
//   lokMuat: AddressItem | null;
//   setLokMuat: (a: AddressItem | null) => void;
//   lokBongkar: AddressItem | null;
//   setLokBongkar: (a: AddressItem | null) => void;

//   picMuatNama: string;
//   setPicMuatNama: (v: string) => void;
//   picMuatTelepon: string;
//   setPicMuatTelepon: (v: string) => void;
//   picBongkarNama: string;
//   setPicBongkarNama: (v: string) => void;
//   picBongkarTelepon: string;
//   setPicBongkarTelepon: (v: string) => void;

//   originAddressName: string;
//   originStreet: string;
//   originStreet2: string;
//   originDistrictName: string;
//   originZipCode: string;
//   originLatitude: string;
//   originLongitude: string;

//   destAddressName: string;
//   destStreet: string;
//   destStreet2: string;
//   destDistrictName: string;
//   destZipCode: string;
//   destLatitude: string;
//   destLongitude: string;
//   deliveryNoteUri: string;

//   multiPickupDrop: boolean;
//   setMultiPickupDrop: (v: boolean) => void;
//   extraStops: ExtraStopWithId[];
//   setExtraStops: (fn: (prev: ExtraStopWithId[]) => ExtraStopWithId[]) => void;

//   errors: Record<string, string>;
//   firstErrorKey?: string;
//   firstErrorRef?: DivRef;

//     mode: "create" | "edit" | "view";
//   pickupAttachment?: OrderAttachmentGroup | null;
//   setPickupAttachment?: (v: OrderAttachmentGroup | null) => void;
//   uploadPickupAttachmentGroup?: (
//     files: File[]
//   ) => Promise<OrderAttachmentGroup>;
//   deletePickupAttachmentFile?: (fileId: number) => Promise<OrderAttachmentGroup | null>;
//   dropOffAttachment?: OrderAttachmentGroup | null;
//   setDropOffAttachment?: (v: OrderAttachmentGroup | null) => void;
//   uploadDropOffAttachmentGroup?: (
//     files: File[]
//   ) => Promise<OrderAttachmentGroup>;
//   deleteDropOffAttachmentFile?: (fileId: number) => Promise<OrderAttachmentGroup | null>;
//   // setPickupAttachment,
//   // uploadPickupAttachmentGroup,
//   // deletePickupAttachmentFile,
//   // dropOffAttachment,
//   // setDropOffAttachment,
//   // uploadDropOffAttachmentGroup,
//   // deleteDropOffAttachmentFile,

//   // map by uid —> konsisten dengan MultiPickupDropSection
//   extraRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
// };

// export default function LocationInfoCard({
//   isReadOnly,
//   tglMuat,
//   setTglMuat,
//   tglBongkar,
//   setTglBongkar,
//   kotaMuat,
//   kotaBongkar,
//   lokMuat,
//   setLokMuat,
//   lokBongkar,
//   setLokBongkar,
//   picMuatNama,
//   setPicMuatNama,
//   picMuatTelepon,
//   setPicMuatTelepon,
//   picBongkarNama,
//   setPicBongkarNama,
//   picBongkarTelepon,
//   setPicBongkarTelepon,
//   originAddressName,
//   originStreet,
//   originStreet2,
//   originDistrictName,
//   originZipCode,
//   originLatitude,
//   originLongitude,
//   destAddressName,
//   destStreet,
//   destStreet2,
//   destDistrictName,
//   destZipCode,
//   destLatitude,
//   destLongitude,
//   deliveryNoteUri,
//   mode = "create",
//   pickupAttachment,
//   setPickupAttachment,
//   uploadPickupAttachmentGroup,
//   deletePickupAttachmentFile,
//   dropOffAttachment,
//   setDropOffAttachment,
//   uploadDropOffAttachmentGroup,
//   deleteDropOffAttachmentFile,
//   multiPickupDrop,
//   setMultiPickupDrop,
//   extraStops,
//   setExtraStops,
//   errors,
//   firstErrorKey,
//   firstErrorRef,
//   extraRefs,
// }: Props) {
//   const lokasiMuatDisabled = !kotaMuat;
//   const lokasiBongkarDisabled = !kotaBongkar;

//   const refIf = (k: string) =>
//     firstErrorKey === k
//       ? (firstErrorRef as React.Ref<HTMLDivElement>)
//       : undefined;

//   const origin = {
//     name: originAddressName,
//     street1: originStreet,
//     street2: originStreet2,
//     districtLine: originDistrictName,
//     province: "",
//     postCode: originZipCode,
//     mobile: "-",
//     email: "-",
//     lat: originLatitude,
//     lng: originLongitude,
//     picName: picMuatNama,
//     picPhone: picMuatTelepon,
//     timeLabel: "ETD",
//     timeValue: fmtDate(tglMuat),
//   };

//   const destination = {
//     name: destAddressName,
//     street1: destStreet,
//     street2: destStreet2,
//     districtLine: destDistrictName,
//     province: "",
//     postCode: destZipCode,
//     mobile: "-",
//     email: "-",
//     lat: destLatitude,
//     lng: destLongitude,
//     picName: picBongkarNama,
//     picPhone: picBongkarTelepon,
//     timeLabel: "ETA",
//     timeValue: fmtDate(tglBongkar),
//     delivery_note_uri: deliveryNoteUri,
//   };

//   const showSidePanels = isReadOnly || mode === "edit";

//   const pickupAttachmentControl =
//     mode === "edit" &&
//     !!setPickupAttachment &&
//     !!uploadPickupAttachmentGroup &&
//     !!deletePickupAttachmentFile
//       ? {
//           value: pickupAttachment ?? null,
//           onChange: setPickupAttachment,
//           uploadGroup: uploadPickupAttachmentGroup,
//           deleteFile: deletePickupAttachmentFile,
//           ui: {
//             accept: "application/pdf,image/*",
//             maxFileSizeMB: 10,
//             uploadButtonText: "Upload",
//             hint: "PDF/JPG/PNG. Maks. 10 MB per file.",
//           },
//         }
//       : undefined;

//   const dropOffAttachmentControl =
//     mode === "edit" &&
//     !!setDropOffAttachment &&
//     !!uploadDropOffAttachmentGroup &&
//     !!deleteDropOffAttachmentFile
//       ? {
//           value: dropOffAttachment ?? null,
//           onChange: setDropOffAttachment,
//           uploadGroup: uploadDropOffAttachmentGroup,
//           deleteFile: deleteDropOffAttachmentFile,
//           ui: {
//             accept: "application/pdf,image/*",
//             maxFileSizeMB: 10,
//             uploadButtonText: "Upload",
//             hint: "PDF/JPG/PNG. Maks. 10 MB per file.",
//           },
//         }
//       : undefined;

//   return (
//     <Card>
//       <CardHeader>
//         <h4 className="text-3xl font-semibold text-gray-800">
//           {t("orders.info_lokasi")}
//         </h4>
//       </CardHeader>
//       <CardBody>
//         <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
//           {/* Kolom 1 - Editable */}
//           <div className={cn("space-y-4", isReadOnly && "hidden")}>
//             <div ref={refIf("tglMuat")}>
//               <DateTimePickerTW
//                 label={t("orders.tgl_muat")}
//                 value={tglMuat}
//                 onChange={setTglMuat}
//                 error={errors.tglMuat}
//                 touched={Boolean(errors.tglMuat)}
//                 displayFormat="DD-MM-YYYY"
//               />
//             </div>

//             <div ref={refIf("lokMuat")}>
//               <AddressAutocomplete
//                 label={t("orders.lokasi_muat")}
//                 cityId={kotaMuat?.id ?? null}
//                 value={lokMuat}
//                 onChange={setLokMuat}
//                 disabled={lokasiMuatDisabled}
//               />
//               {errors.lokMuat && (
//                 <div className="mt-1 text-xs text-red-600">
//                   {errors.lokMuat}
//                 </div>
//               )}
//             </div>

//             <Field.Root value={picMuatNama} onChange={setPicMuatNama}>
//               <Field.Label>{t("orders.pic_muat_name")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>

//             <Field.Root
//               type="tel"
//               value={picMuatTelepon}
//               onChange={setPicMuatTelepon}
//               placeholder={t("placeholders.phone")}
//             >
//               <Field.Label>{t("orders.pic_muat_phone")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>
//           </div>

//           {/* Kolom 2 - Editable */}
//           <div className={cn("space-y-4", isReadOnly && "hidden")}>
//             <div ref={refIf("tglBongkar")}>
//               <DateTimePickerTW
//                 label={t("orders.tgl_bongkar")}
//                 value={tglBongkar}
//                 onChange={setTglBongkar}
//                 error={errors.tglBongkar}
//                 touched={Boolean(errors.tglBongkar)}
//                 displayFormat="DD-MM-YYYY"
//               />
//             </div>

//             <div ref={refIf("lokBongkar")}>
//               <AddressAutocomplete
//                 label={t("orders.lokasi_bongkar")}
//                 cityId={kotaBongkar?.id ?? null}
//                 value={lokBongkar}
//                 onChange={setLokBongkar}
//                 disabled={lokasiBongkarDisabled}
//               />
//               {errors.lokBongkar && (
//                 <div className="mt-1 text-xs text-red-600">
//                   {errors.lokBongkar}
//                 </div>
//               )}
//             </div>

//             <Field.Root value={picBongkarNama} onChange={setPicBongkarNama}>
//               <Field.Label>{t("orders.pic_bongkar_name")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>

//             <Field.Root
//               type="tel"
//               value={picBongkarTelepon}
//               onChange={setPicBongkarTelepon}
//               placeholder={t("placeholders.phone")}
//             >
//               <Field.Label>{t("orders.pic_bongkar_phone")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>
//           </div>

//           {/* Readonly panels */}
//           <div className={cn("space-y-4", !showSidePanels && "hidden")}>
//             <AddressSidePanel
//               title="Origin Address"
//               labelPrefix="Origin"
//               info={origin}
//               mode={mode}
//               attachment={pickupAttachmentControl}
//             />
//           </div>

//           <div className={cn("space-y-4", !showSidePanels && "hidden")}>
//             <AddressSidePanel
//               title="Destination Address"
//               labelPrefix="Destination"
//               info={destination}
//               mode={mode}
//               attachment={dropOffAttachmentControl}
//             />
//           </div>
//         </div>

//         {/* ==== Multi Pickup/Drop (dipisah ke komponen) ==== */}
//         <MultiPickupDropSection
//           isReadOnly={isReadOnly}
//           multiPickupDrop={multiPickupDrop}
//           setMultiPickupDrop={setMultiPickupDrop}
//           extraStops={extraStops}
//           setExtraStops={setExtraStops}
//           errors={errors}
//           extraRefs={extraRefs}
//           cityIdMuat={kotaMuat?.id ?? null}
//           cityIdBongkar={kotaBongkar?.id ?? null}
//           lokasiMuatDisabled={lokasiMuatDisabled}
//           lokasiBongkarDisabled={lokasiBongkarDisabled}
//         />
//       </CardBody>
//     </Card>
//   );
// }

// "use client";

// import React from "react";
// import { t } from "@/lib/i18n";
// import { Card, CardHeader, CardBody } from "@/components/ui/Card";
// import DateTimePickerTW from "@/components/form/DateTimePickerTW";
// import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
// import type { AddressItem, CityItem, OrderAttachmentGroup } from "@/types/orders";
// import MultiPickupDropSection from "../MultiPickupDropSection";
// import type { ExtraStop } from "./ExtraStopCard";
// import { cn } from "@/lib/cn";
// import { AddressSidePanel } from "@/components/ui/AddressSidePanel";
// import { fmtDate } from "@/lib/helpers";
// import { Field } from "@/components/form/FieldInput";

// type ExtraStopWithId = ExtraStop & { uid: string };

// type DivRef =
//   | React.RefObject<HTMLDivElement>
//   | React.Ref<HTMLDivElement>
//   | null;

// type Props = {
//   isReadOnly: boolean;
//   tglMuat: string;
//   setTglMuat: (v: string) => void;
//   tglBongkar: string;
//   setTglBongkar: (v: string) => void;

//   kotaMuat: CityItem | null;
//   kotaBongkar: CityItem | null;
//   lokMuat: AddressItem | null;
//   setLokMuat: (a: AddressItem | null) => void;
//   lokBongkar: AddressItem | null;
//   setLokBongkar: (a: AddressItem | null) => void;

//   picMuatNama: string;
//   setPicMuatNama: (v: string) => void;
//   picMuatTelepon: string;
//   setPicMuatTelepon: (v: string) => void;
//   picBongkarNama: string;
//   setPicBongkarNama: (v: string) => void;
//   picBongkarTelepon: string;
//   setPicBongkarTelepon: (v: string) => void;

//   originAddressName: string;
//   originStreet: string;
//   originStreet2: string;
//   originDistrictName: string;
//   originZipCode: string;
//   originLatitude: string;
//   originLongitude: string;

//   destAddressName: string;
//   destStreet: string;
//   destStreet2: string;
//   destDistrictName: string;
//   destZipCode: string;
//   destLatitude: string;
//   destLongitude: string;
//   deliveryNoteUri: string;

//   multiPickupDrop: boolean;
//   setMultiPickupDrop: (v: boolean) => void;
//   extraStops: ExtraStopWithId[];
//   setExtraStops: (fn: (prev: ExtraStopWithId[]) => ExtraStopWithId[]) => void;

//   errors: Record<string, string>;
//   firstErrorKey?: string;
//   firstErrorRef?: DivRef;

//     mode: "create" | "edit" | "view";
//   pickupAttachment?: OrderAttachmentGroup | null;
//   setPickupAttachment?: (v: OrderAttachmentGroup | null) => void;
//   uploadPickupAttachmentGroup?: (
//     files: File[]
//   ) => Promise<OrderAttachmentGroup>;
//   deletePickupAttachmentFile?: (fileId: number) => Promise<OrderAttachmentGroup | null>;
//   dropOffAttachment?: OrderAttachmentGroup | null;
//   setDropOffAttachment?: (v: OrderAttachmentGroup | null) => void;
//   uploadDropOffAttachmentGroup?: (
//     files: File[]
//   ) => Promise<OrderAttachmentGroup>;
//   deleteDropOffAttachmentFile?: (fileId: number) => Promise<OrderAttachmentGroup | null>;
//   // setPickupAttachment,
//   // uploadPickupAttachmentGroup,
//   // deletePickupAttachmentFile,
//   // dropOffAttachment,
//   // setDropOffAttachment,
//   // uploadDropOffAttachmentGroup,
//   // deleteDropOffAttachmentFile,

//   // map by uid —> konsisten dengan MultiPickupDropSection
//   extraRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
// };

// export default function LocationInfoCard({
//   isReadOnly,
//   tglMuat,
//   setTglMuat,
//   tglBongkar,
//   setTglBongkar,
//   kotaMuat,
//   kotaBongkar,
//   lokMuat,
//   setLokMuat,
//   lokBongkar,
//   setLokBongkar,
//   picMuatNama,
//   setPicMuatNama,
//   picMuatTelepon,
//   setPicMuatTelepon,
//   picBongkarNama,
//   setPicBongkarNama,
//   picBongkarTelepon,
//   setPicBongkarTelepon,
//   originAddressName,
//   originStreet,
//   originStreet2,
//   originDistrictName,
//   originZipCode,
//   originLatitude,
//   originLongitude,
//   destAddressName,
//   destStreet,
//   destStreet2,
//   destDistrictName,
//   destZipCode,
//   destLatitude,
//   destLongitude,
//   deliveryNoteUri,
//   mode = "create",
//   pickupAttachment,
//   setPickupAttachment,
//   uploadPickupAttachmentGroup,
//   deletePickupAttachmentFile,
//   dropOffAttachment,
//   setDropOffAttachment,
//   uploadDropOffAttachmentGroup,
//   deleteDropOffAttachmentFile,
//   multiPickupDrop,
//   setMultiPickupDrop,
//   extraStops,
//   setExtraStops,
//   errors,
//   firstErrorKey,
//   firstErrorRef,
//   extraRefs,
// }: Props) {
//   const lokasiMuatDisabled = !kotaMuat;
//   const lokasiBongkarDisabled = !kotaBongkar;

//   const refIf = (k: string) =>
//     firstErrorKey === k
//       ? (firstErrorRef as React.Ref<HTMLDivElement>)
//       : undefined;

//   const origin = {
//     name: originAddressName,
//     street1: originStreet,
//     street2: originStreet2,
//     districtLine: originDistrictName,
//     province: "",
//     postCode: originZipCode,
//     mobile: "-",
//     email: "-",
//     lat: originLatitude,
//     lng: originLongitude,
//     picName: picMuatNama,
//     picPhone: picMuatTelepon,
//     timeLabel: "ETD",
//     timeValue: fmtDate(tglMuat),
//   };

//   const destination = {
//     name: destAddressName,
//     street1: destStreet,
//     street2: destStreet2,
//     districtLine: destDistrictName,
//     province: "",
//     postCode: destZipCode,
//     mobile: "-",
//     email: "-",
//     lat: destLatitude,
//     lng: destLongitude,
//     picName: picBongkarNama,
//     picPhone: picBongkarTelepon,
//     timeLabel: "ETA",
//     timeValue: fmtDate(tglBongkar),
//     delivery_note_uri: deliveryNoteUri,
//   };

//   const showSidePanels = isReadOnly || mode !== "view";
//   const panelMode = isReadOnly || mode === "view" ? "view" : "edit";
//   const canEditAttachment = panelMode === "edit";

//   type PanelAttachment = React.ComponentProps<typeof AddressSidePanel>["attachment"];
//   type PanelControl = NonNullable<PanelAttachment>;
//   type PanelGroup = PanelControl["value"];
//   type PanelGroupNonNull = Exclude<PanelGroup, null | undefined>;

//   const pickupAttachmentControl: PanelAttachment =
//     canEditAttachment &&
//     !!setPickupAttachment &&
//     !!uploadPickupAttachmentGroup &&
//     !!deletePickupAttachmentFile
//       ? {
//           value: (pickupAttachment ?? null) as PanelGroup,
//           onChange: (v) =>
//             setPickupAttachment(v as unknown as OrderAttachmentGroup | null),
//           uploadGroup: async (files) =>
//             (await uploadPickupAttachmentGroup(files)) as unknown as PanelGroupNonNull,
//           deleteFile: async (fileId) =>
//             (await deletePickupAttachmentFile(fileId)) as unknown as PanelGroup,
//           ui: {
//             accept: "application/pdf,image/*",
//             maxFileSizeMB: 10,
//             uploadButtonText: "Upload",
//             hint: "PDF/JPG/PNG. Maks. 10 MB per file.",
//           },
//         }
//       : undefined;

//   const dropOffAttachmentControl: PanelAttachment =
//     canEditAttachment &&
//     !!setDropOffAttachment &&
//     !!uploadDropOffAttachmentGroup &&
//     !!deleteDropOffAttachmentFile
//       ? {
//           value: (dropOffAttachment ?? null) as PanelGroup,
//           onChange: (v) =>
//             setDropOffAttachment(v as unknown as OrderAttachmentGroup | null),
//           uploadGroup: async (files) =>
//             (await uploadDropOffAttachmentGroup(files)) as unknown as PanelGroupNonNull,
//           deleteFile: async (fileId) =>
//             (await deleteDropOffAttachmentFile(fileId)) as unknown as PanelGroup,
//           ui: {
//             accept: "application/pdf,image/*",
//             maxFileSizeMB: 10,
//             uploadButtonText: "Upload",
//             hint: "PDF/JPG/PNG. Maks. 10 MB per file.",
//           },
//         }
//       : undefined;

//   return (
//     <Card>
//       <CardHeader>
//         <h4 className="text-3xl font-semibold text-gray-800">
//           {t("orders.info_lokasi")}
//         </h4>
//       </CardHeader>
//       <CardBody>
//         <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
//           {/* Kolom 1 - Editable */}
//           <div className={cn("space-y-4", isReadOnly && "hidden")}>
//             <div ref={refIf("tglMuat")}>
//               <DateTimePickerTW
//                 label={t("orders.tgl_muat")}
//                 value={tglMuat}
//                 onChange={setTglMuat}
//                 error={errors.tglMuat}
//                 touched={Boolean(errors.tglMuat)}
//                 displayFormat="DD-MM-YYYY"
//               />
//             </div>

//             <div ref={refIf("lokMuat")}>
//               <AddressAutocomplete
//                 label={t("orders.lokasi_muat")}
//                 cityId={kotaMuat?.id ?? null}
//                 value={lokMuat}
//                 onChange={setLokMuat}
//                 disabled={lokasiMuatDisabled}
//               />
//               {errors.lokMuat && (
//                 <div className="mt-1 text-xs text-red-600">
//                   {errors.lokMuat}
//                 </div>
//               )}
//             </div>

//             <Field.Root value={picMuatNama} onChange={setPicMuatNama}>
//               <Field.Label>{t("orders.pic_muat_name")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>

//             <Field.Root
//               type="tel"
//               value={picMuatTelepon}
//               onChange={setPicMuatTelepon}
//               placeholder={t("placeholders.phone")}
//             >
//               <Field.Label>{t("orders.pic_muat_phone")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>
//           </div>

//           {/* Kolom 2 - Editable */}
//           <div className={cn("space-y-4", isReadOnly && "hidden")}>
//             <div ref={refIf("tglBongkar")}>
//               <DateTimePickerTW
//                 label={t("orders.tgl_bongkar")}
//                 value={tglBongkar}
//                 onChange={setTglBongkar}
//                 error={errors.tglBongkar}
//                 touched={Boolean(errors.tglBongkar)}
//                 displayFormat="DD-MM-YYYY"
//               />
//             </div>

//             <div ref={refIf("lokBongkar")}>
//               <AddressAutocomplete
//                 label={t("orders.lokasi_bongkar")}
//                 cityId={kotaBongkar?.id ?? null}
//                 value={lokBongkar}
//                 onChange={setLokBongkar}
//                 disabled={lokasiBongkarDisabled}
//               />
//               {errors.lokBongkar && (
//                 <div className="mt-1 text-xs text-red-600">
//                   {errors.lokBongkar}
//                 </div>
//               )}
//             </div>

//             <Field.Root value={picBongkarNama} onChange={setPicBongkarNama}>
//               <Field.Label>{t("orders.pic_bongkar_name")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>

//             <Field.Root
//               type="tel"
//               value={picBongkarTelepon}
//               onChange={setPicBongkarTelepon}
//               placeholder={t("placeholders.phone")}
//             >
//               <Field.Label>{t("orders.pic_bongkar_phone")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>
//           </div>

//           {/* Readonly panels */}
//           <div className={cn("space-y-4", !showSidePanels && "hidden")}>
//             <AddressSidePanel
//               title="Origin Address"
//               labelPrefix="Origin"
//               info={origin}
//               mode={panelMode}
//               attachment={pickupAttachmentControl}
//             />
//           </div>

//           <div className={cn("space-y-4", !showSidePanels && "hidden")}>
//             <AddressSidePanel
//               title="Destination Address"
//               labelPrefix="Destination"
//               info={destination}
//               mode={panelMode}
//               attachment={dropOffAttachmentControl}
//             />
//           </div>
//         </div>

//         {/* ==== Multi Pickup/Drop (dipisah ke komponen) ==== */}
//         <MultiPickupDropSection
//           isReadOnly={isReadOnly}
//           multiPickupDrop={multiPickupDrop}
//           setMultiPickupDrop={setMultiPickupDrop}
//           extraStops={extraStops}
//           setExtraStops={setExtraStops}
//           errors={errors}
//           extraRefs={extraRefs}
//           cityIdMuat={kotaMuat?.id ?? null}
//           cityIdBongkar={kotaBongkar?.id ?? null}
//           lokasiMuatDisabled={lokasiMuatDisabled}
//           lokasiBongkarDisabled={lokasiBongkarDisabled}
//         />
//       </CardBody>
//     </Card>
//   );
// }

// "use client";

// import React from "react";
// import { t } from "@/lib/i18n";
// import { Card, CardHeader, CardBody } from "@/components/ui/Card";
// import DateTimePickerTW from "@/components/form/DateTimePickerTW";
// import AddressAutocomplete from "@/components/forms/orders/AddressAutocomplete";
// import type { AddressItem, CityItem, OrderAttachmentGroup } from "@/types/orders";
// import MultiPickupDropSection from "../MultiPickupDropSection";
// import type { ExtraStop } from "./ExtraStopCard";
// import { cn } from "@/lib/cn";
// import { AddressSidePanel } from "@/components/ui/AddressSidePanel";
// import { fmtDate } from "@/lib/helpers";
// import { Field } from "@/components/form/FieldInput";

// type ExtraStopWithId = ExtraStop & { uid: string };

// type DivRef =
//   | React.RefObject<HTMLDivElement>
//   | React.Ref<HTMLDivElement>
//   | null;

// type Props = {
//   isReadOnly: boolean;
//   tglMuat: string;
//   setTglMuat: (v: string) => void;
//   tglBongkar: string;
//   setTglBongkar: (v: string) => void;

//   kotaMuat: CityItem | null;
//   kotaBongkar: CityItem | null;
//   lokMuat: AddressItem | null;
//   setLokMuat: (a: AddressItem | null) => void;
//   lokBongkar: AddressItem | null;
//   setLokBongkar: (a: AddressItem | null) => void;

//   picMuatNama: string;
//   setPicMuatNama: (v: string) => void;
//   picMuatTelepon: string;
//   setPicMuatTelepon: (v: string) => void;
//   picBongkarNama: string;
//   setPicBongkarNama: (v: string) => void;
//   picBongkarTelepon: string;
//   setPicBongkarTelepon: (v: string) => void;

//   originAddressName: string;
//   originStreet: string;
//   originStreet2: string;
//   originDistrictName: string;
//   originZipCode: string;
//   originLatitude: string;
//   originLongitude: string;

//   destAddressName: string;
//   destStreet: string;
//   destStreet2: string;
//   destDistrictName: string;
//   destZipCode: string;
//   destLatitude: string;
//   destLongitude: string;
//   deliveryNoteUri: string;

//   multiPickupDrop: boolean;
//   setMultiPickupDrop: (v: boolean) => void;
//   extraStops: ExtraStopWithId[];
//   setExtraStops: (fn: (prev: ExtraStopWithId[]) => ExtraStopWithId[]) => void;

//   errors: Record<string, string>;
//   firstErrorKey?: string;
//   firstErrorRef?: DivRef;

//     mode: "create" | "edit" | "view";
//   pickupAttachment?: OrderAttachmentGroup | null;
//   setPickupAttachment?: (v: OrderAttachmentGroup | null) => void;
//   uploadPickupAttachmentGroup?: (
//     files: File[]
//   ) => Promise<OrderAttachmentGroup>;
//   deletePickupAttachmentFile?: (fileId: number) => Promise<OrderAttachmentGroup | null>;
//   dropOffAttachment?: OrderAttachmentGroup | null;
//   setDropOffAttachment?: (v: OrderAttachmentGroup | null) => void;
//   uploadDropOffAttachmentGroup?: (
//     files: File[]
//   ) => Promise<OrderAttachmentGroup>;
//   deleteDropOffAttachmentFile?: (fileId: number) => Promise<OrderAttachmentGroup | null>;
//   // setPickupAttachment,
//   // uploadPickupAttachmentGroup,
//   // deletePickupAttachmentFile,
//   // dropOffAttachment,
//   // setDropOffAttachment,
//   // uploadDropOffAttachmentGroup,
//   // deleteDropOffAttachmentFile,

//   // map by uid —> konsisten dengan MultiPickupDropSection
//   extraRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
// };

// export default function LocationInfoCard({
//   isReadOnly,
//   tglMuat,
//   setTglMuat,
//   tglBongkar,
//   setTglBongkar,
//   kotaMuat,
//   kotaBongkar,
//   lokMuat,
//   setLokMuat,
//   lokBongkar,
//   setLokBongkar,
//   picMuatNama,
//   setPicMuatNama,
//   picMuatTelepon,
//   setPicMuatTelepon,
//   picBongkarNama,
//   setPicBongkarNama,
//   picBongkarTelepon,
//   setPicBongkarTelepon,
//   originAddressName,
//   originStreet,
//   originStreet2,
//   originDistrictName,
//   originZipCode,
//   originLatitude,
//   originLongitude,
//   destAddressName,
//   destStreet,
//   destStreet2,
//   destDistrictName,
//   destZipCode,
//   destLatitude,
//   destLongitude,
//   deliveryNoteUri,
//   mode = "create",
//   pickupAttachment,
//   setPickupAttachment,
//   uploadPickupAttachmentGroup,
//   deletePickupAttachmentFile,
//   dropOffAttachment,
//   setDropOffAttachment,
//   uploadDropOffAttachmentGroup,
//   deleteDropOffAttachmentFile,
//   multiPickupDrop,
//   setMultiPickupDrop,
//   extraStops,
//   setExtraStops,
//   errors,
//   firstErrorKey,
//   firstErrorRef,
//   extraRefs,
// }: Props) {
//   const lokasiMuatDisabled = !kotaMuat;
//   const lokasiBongkarDisabled = !kotaBongkar;

//   const refIf = (k: string) =>
//     firstErrorKey === k
//       ? (firstErrorRef as React.Ref<HTMLDivElement>)
//       : undefined;

//   const origin = {
//     name: originAddressName,
//     street1: originStreet,
//     street2: originStreet2,
//     districtLine: originDistrictName,
//     province: "",
//     postCode: originZipCode,
//     mobile: "-",
//     email: "-",
//     lat: originLatitude,
//     lng: originLongitude,
//     picName: picMuatNama,
//     picPhone: picMuatTelepon,
//     timeLabel: "ETD",
//     timeValue: fmtDate(tglMuat),
//   };

//   const destination = {
//     name: destAddressName,
//     street1: destStreet,
//     street2: destStreet2,
//     districtLine: destDistrictName,
//     province: "",
//     postCode: destZipCode,
//     mobile: "-",
//     email: "-",
//     lat: destLatitude,
//     lng: destLongitude,
//     picName: picBongkarNama,
//     picPhone: picBongkarTelepon,
//     timeLabel: "ETA",
//     timeValue: fmtDate(tglBongkar),
//     delivery_note_uri: deliveryNoteUri,
//   };

//   const showSidePanels = isReadOnly || mode === "edit";

//   const pickupAttachmentControl =
//     mode === "edit" &&
//     !!setPickupAttachment &&
//     !!uploadPickupAttachmentGroup &&
//     !!deletePickupAttachmentFile
//       ? {
//           value: pickupAttachment ?? null,
//           onChange: setPickupAttachment,
//           uploadGroup: uploadPickupAttachmentGroup,
//           deleteFile: deletePickupAttachmentFile,
//           ui: {
//             accept: "application/pdf,image/*",
//             maxFileSizeMB: 10,
//             uploadButtonText: "Upload",
//             hint: "PDF/JPG/PNG. Maks. 10 MB per file.",
//           },
//         }
//       : undefined;

//   const dropOffAttachmentControl =
//     mode === "edit" &&
//     !!setDropOffAttachment &&
//     !!uploadDropOffAttachmentGroup &&
//     !!deleteDropOffAttachmentFile
//       ? {
//           value: dropOffAttachment ?? null,
//           onChange: setDropOffAttachment,
//           uploadGroup: uploadDropOffAttachmentGroup,
//           deleteFile: deleteDropOffAttachmentFile,
//           ui: {
//             accept: "application/pdf,image/*",
//             maxFileSizeMB: 10,
//             uploadButtonText: "Upload",
//             hint: "PDF/JPG/PNG. Maks. 10 MB per file.",
//           },
//         }
//       : undefined;

//   return (
//     <Card>
//       <CardHeader>
//         <h4 className="text-3xl font-semibold text-gray-800">
//           {t("orders.info_lokasi")}
//         </h4>
//       </CardHeader>
//       <CardBody>
//         <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
//           {/* Kolom 1 - Editable */}
//           <div className={cn("space-y-4", isReadOnly && "hidden")}>
//             <div ref={refIf("tglMuat")}>
//               <DateTimePickerTW
//                 label={t("orders.tgl_muat")}
//                 value={tglMuat}
//                 onChange={setTglMuat}
//                 error={errors.tglMuat}
//                 touched={Boolean(errors.tglMuat)}
//                 displayFormat="DD-MM-YYYY"
//               />
//             </div>

//             <div ref={refIf("lokMuat")}>
//               <AddressAutocomplete
//                 label={t("orders.lokasi_muat")}
//                 cityId={kotaMuat?.id ?? null}
//                 value={lokMuat}
//                 onChange={setLokMuat}
//                 disabled={lokasiMuatDisabled}
//               />
//               {errors.lokMuat && (
//                 <div className="mt-1 text-xs text-red-600">
//                   {errors.lokMuat}
//                 </div>
//               )}
//             </div>

//             <Field.Root value={picMuatNama} onChange={setPicMuatNama}>
//               <Field.Label>{t("orders.pic_muat_name")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>

//             <Field.Root
//               type="tel"
//               value={picMuatTelepon}
//               onChange={setPicMuatTelepon}
//               placeholder={t("placeholders.phone")}
//             >
//               <Field.Label>{t("orders.pic_muat_phone")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>
//           </div>

//           {/* Kolom 2 - Editable */}
//           <div className={cn("space-y-4", isReadOnly && "hidden")}>
//             <div ref={refIf("tglBongkar")}>
//               <DateTimePickerTW
//                 label={t("orders.tgl_bongkar")}
//                 value={tglBongkar}
//                 onChange={setTglBongkar}
//                 error={errors.tglBongkar}
//                 touched={Boolean(errors.tglBongkar)}
//                 displayFormat="DD-MM-YYYY"
//               />
//             </div>

//             <div ref={refIf("lokBongkar")}>
//               <AddressAutocomplete
//                 label={t("orders.lokasi_bongkar")}
//                 cityId={kotaBongkar?.id ?? null}
//                 value={lokBongkar}
//                 onChange={setLokBongkar}
//                 disabled={lokasiBongkarDisabled}
//               />
//               {errors.lokBongkar && (
//                 <div className="mt-1 text-xs text-red-600">
//                   {errors.lokBongkar}
//                 </div>
//               )}
//             </div>

//             <Field.Root value={picBongkarNama} onChange={setPicBongkarNama}>
//               <Field.Label>{t("orders.pic_bongkar_name")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>

//             <Field.Root
//               type="tel"
//               value={picBongkarTelepon}
//               onChange={setPicBongkarTelepon}
//               placeholder={t("placeholders.phone")}
//             >
//               <Field.Label>{t("orders.pic_bongkar_phone")}</Field.Label>
//               <Field.Input />
//               <Field.Error />
//             </Field.Root>
//           </div>

//           {/* Readonly panels */}
//           <div className={cn("space-y-4", !showSidePanels && "hidden")}>
//             <AddressSidePanel
//               title="Origin Address"
//               labelPrefix="Origin"
//               info={origin}
//               mode={mode}
//               attachment={pickupAttachmentControl}
//             />
//           </div>

//           <div className={cn("space-y-4", !showSidePanels && "hidden")}>
//             <AddressSidePanel
//               title="Destination Address"
//               labelPrefix="Destination"
//               info={destination}
//               mode={mode}
//               attachment={dropOffAttachmentControl}
//             />
//           </div>
//         </div>

//         {/* ==== Multi Pickup/Drop (dipisah ke komponen) ==== */}
//         <MultiPickupDropSection
//           isReadOnly={isReadOnly}
//           multiPickupDrop={multiPickupDrop}
//           setMultiPickupDrop={setMultiPickupDrop}
//           extraStops={extraStops}
//           setExtraStops={setExtraStops}
//           errors={errors}
//           extraRefs={extraRefs}
//           cityIdMuat={kotaMuat?.id ?? null}
//           cityIdBongkar={kotaBongkar?.id ?? null}
//           lokasiMuatDisabled={lokasiMuatDisabled}
//           lokasiBongkarDisabled={lokasiBongkarDisabled}
//         />
//       </CardBody>
//     </Card>
//   );
// }
