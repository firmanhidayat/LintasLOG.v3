import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/form/FieldInput";

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
        <h4 className="text-3xl font-semibold text-gray-800">
          {t("orders.info_muatan")}
        </h4>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div ref={refIf("muatanNama")}>
              <Field.Root
                value={muatanNama}
                onChange={setMuatanNama}
                error={errors.muatanNama}
                touched={Boolean(errors.muatanNama)}
                className="flex-auto"
              >
                <Field.Label>{t("orders.muatan_nama")}</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full"></Field.Input>
                  <Field.Error></Field.Error>
                </Field.Control>
              </Field.Root>
              <Field.Root value="" onChange={() => {}} className="flex-auto">
                <Field.Label>Jenis Muatan</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full"></Field.Input>
                  <Field.Error></Field.Error>
                </Field.Control>
              </Field.Root>
            </div>
          </div>
          {/** KOLOM 2 */}
          <div>
            <Field.Root value="" onChange={() => {}} className="flex-auto">
              <Field.Label>Dimensi CBM</Field.Label>
              <Field.Control>
                <Field.Input className="w-full"></Field.Input>
                <Field.Error></Field.Error>
              </Field.Control>
            </Field.Root>
            <Field.Root value="" onChange={() => {}} className="flex-auto">
              <Field.Label>Jumlah Muatan</Field.Label>
              <Field.Control>
                <Field.Input className="w-full"></Field.Input>
                <Field.Suffix>Kg</Field.Suffix>
                <Field.Error></Field.Error>
              </Field.Control>
            </Field.Root>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div ref={refIf("muatanDeskripsi")}>
            <Field.Root
              type="text"
              value={muatanDeskripsi}
              onChange={setMuatanDeskripsi}
              error={errors.muatanDeskripsi}
              touched={Boolean(errors.muatanDeskripsi)}
              rows={4}
            >
              <Field.Label>{t("orders.muatan_deskripsi")}</Field.Label>
              <Field.Control>
                <Field.Textarea className="w-full"></Field.Textarea>
                <Field.Error></Field.Error>
              </Field.Control>
            </Field.Root>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
