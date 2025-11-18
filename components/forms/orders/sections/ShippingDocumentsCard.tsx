// ShippingDocumentsCard.tsx
import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import MultiFileUpload, {
  ExistingFileItem,
} from "@/components/form/MultiFileUpload";

type Props = {
  dokumenFiles: File[];
  setDokumenFiles: (files: File[]) => void;
  sjPodFiles: File[];
  setSjPodFiles: (files: File[]) => void;
  existingPackingList?: ExistingFileItem[];
  existingDeliveryNotes?: ExistingFileItem[];
  onRemovePackingList?: (item: ExistingFileItem) => void;
  onRemoveDeliveryNote?: (item: ExistingFileItem) => void;
  existingPackingListLabel?: string;
  existingDeliveryNotesLabel?: string;
};

export default function ShippingDocumentsCard({
  dokumenFiles,
  setDokumenFiles,
  sjPodFiles,
  setSjPodFiles,
  existingPackingList = [],
  existingDeliveryNotes = [],
  onRemovePackingList,
  onRemoveDeliveryNote,
  existingPackingListLabel,
  existingDeliveryNotesLabel,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Card>
          <CardHeader>
            <h4 className="text-3xl font-semibold text-gray-800">
              {t("orders.dok_pengiriman")}
            </h4>
          </CardHeader>
          <CardBody>
            <div>
              <MultiFileUpload
                label={t("orders.lampiran_dokumen")}
                value={dokumenFiles}
                onChange={setDokumenFiles}
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
                maxFileSizeMB={10}
                maxFiles={10}
                showImagePreview
                hint={
                  t("orders.upload_hint_10mb") ??
                  "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
                }
                onReject={(msgs) => console.warn("[Dokumen] rejected:", msgs)}
                className="mb-10 gap-3 justify-end"
                existingItems={existingPackingList}
                existingHeader={
                  existingPackingListLabel || "Packing List Terlampir"
                }
                onRemoveExisting={onRemovePackingList}
              />
            </div>
          </CardBody>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <h4 className="text-3xl font-semibold text-gray-800">
              {t("orders.dok_sjpo")}
            </h4>
          </CardHeader>
          <CardBody>
            <MultiFileUpload
              label={t("orders.lampiran_sj_pod")}
              value={sjPodFiles}
              onChange={setSjPodFiles}
              accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
              maxFileSizeMB={10}
              maxFiles={10}
              hint={
                t("orders.upload_hint_10mb") ??
                "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
              }
              onReject={(msgs) => console.warn("[SJ/POD] rejected:", msgs)}
              className="gap-3 justify-end"
              showImagePreview
              existingItems={existingDeliveryNotes}
              existingHeader={
                existingDeliveryNotesLabel || "Surat Jalan/POD Terlampir"
              }
              onRemoveExisting={onRemoveDeliveryNote}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
// import React from "react";
// import { t } from "@/lib/i18n";
// import { Card, CardHeader, CardBody } from "@/components/ui/Card";
// import MultiFileUpload from "@/components/form/MultiFileUpload";

// type Props = {
//   dokumenFiles: File[];
//   setDokumenFiles: (files: File[]) => void;
//   sjPodFiles: File[];
//   setSjPodFiles: (files: File[]) => void;
// };

// export default function ShippingDocumentsCard({
//   dokumenFiles,
//   setDokumenFiles,
//   sjPodFiles,
//   setSjPodFiles,
// }: Props) {
//   return (
//     <div className="space-y-4">
//       <div>
//         <Card>
//           <CardHeader>
//             <h4 className="text-3xl font-semibold text-gray-800">
//               {t("orders.dok_pengiriman")}
//             </h4>
//           </CardHeader>
//           <CardBody>
//             <div>
//               <MultiFileUpload
//                 label={t("orders.lampiran_dokumen")}
//                 value={dokumenFiles}
//                 onChange={setDokumenFiles}
//                 accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
//                 maxFileSizeMB={10}
//                 maxFiles={10}
//                 hint={
//                   t("orders.upload_hint_10mb") ??
//                   "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
//                 }
//                 onReject={(msgs) => console.warn("[Dokumen] rejected:", msgs)}
//                 className="mb-10 gap-3 justify-end"
//               />
//             </div>
//           </CardBody>
//         </Card>
//       </div>
//       <div>
//         <Card>
//           <CardHeader>
//             <h4 className="text-3xl font-semibold text-gray-800">
//               {t("orders.dok_sjpo")}
//             </h4>
//           </CardHeader>
//           <CardBody>
//             <MultiFileUpload
//               label={t("orders.lampiran_sj_pod")}
//               value={sjPodFiles}
//               onChange={setSjPodFiles}
//               accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
//               maxFileSizeMB={10}
//               maxFiles={10}
//               hint={
//                 t("orders.upload_hint_10mb") ??
//                 "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
//               }
//               onReject={(msgs) => console.warn("[SJ/POD] rejected:", msgs)}
//               className="gap-3 justify-end"
//               showImagePreview
//             />
//           </CardBody>
//         </Card>
//       </div>
//     </div>
//   );
// }
