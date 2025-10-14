import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import MultiFileUpload from "@/components/form/MultiFileUpload";

type Props = {
  dokumenFiles: File[];
  setDokumenFiles: (files: File[]) => void;
  sjPodFiles: File[];
  setSjPodFiles: (files: File[]) => void;
};

export default function ShippingDocumentsCard({
  dokumenFiles,
  setDokumenFiles,
  sjPodFiles,
  setSjPodFiles,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-3xl font-semibold text-gray-800">
          {t("orders.dok_pengiriman")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <MultiFileUpload
            label={t("orders.lampiran_dokumen")}
            value={dokumenFiles}
            onChange={setDokumenFiles}
            accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.txt,.jpeg,.jpg,.png,.bmp"
            maxFileSizeMB={10}
            maxFiles={10}
            hint={
              t("orders.upload_hint_10mb") ??
              "Maks. 10 MB per file. Tipe: DOC/DOCX, XLS/XLSX, PDF, PPT/PPTX, TXT, JPEG, JPG, PNG, Bitmap"
            }
            onReject={(msgs) => console.warn("[Dokumen] rejected:", msgs)}
            className="grid grid-cols-1 gap-4"
          />
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
            className="grid grid-cols-1 gap-4"
            showImagePreview
          />
        </div>
      </CardBody>
    </Card>
  );
}
