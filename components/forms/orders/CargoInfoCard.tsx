import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { FieldText } from "@/components/form/FieldText";
import { FieldTextarea } from "@/components/form/FieldTextarea";

type DivRef =
  | React.RefObject<HTMLDivElement>
  | React.Ref<HTMLDivElement>
  | null;

type Props = {
  muatanNama: string;
  setMuatanNama: (v: string) => void;
  muatanDeskripsi: string;
  setMuatanDeskripsi: (v: string) => void;
  errors: Record<string, string>;
  firstErrorKey?: string;
  firstErrorRef?: DivRef;
};

export default function CargoInfoCard({
  muatanNama,
  setMuatanNama,
  muatanDeskripsi,
  setMuatanDeskripsi,
  errors,
  firstErrorKey,
  firstErrorRef,
}: Props) {
  const refIf = (k: string) =>
    firstErrorKey === k
      ? (firstErrorRef as React.Ref<HTMLDivElement>)
      : undefined;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-3xl font-semibold text-gray-800">
          {t("orders.info_muatan")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-4">
          <div ref={refIf("muatanNama")}>
            <FieldText
              label={t("orders.muatan_nama")}
              value={muatanNama}
              onChange={setMuatanNama}
              error={errors.muatanNama}
              touched={Boolean(errors.muatanNama)}
            />
          </div>
          <div ref={refIf("muatanDeskripsi")}>
            <FieldTextarea
              label={t("orders.muatan_deskripsi")}
              value={muatanDeskripsi}
              error={errors.muatanDeskripsi}
              onChange={setMuatanDeskripsi}
              rows={4}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
