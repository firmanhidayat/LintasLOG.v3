import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { fmtPrice } from "@/lib/helpers";

// ===== Props ===== Readonly data only
type Props = {
  biayaKirimLabel: number | string | undefined;
  biayaLayananTambahanLabel: number | string | undefined;
  taxLabel: number | string | undefined;
  totalHargaLabel: number | string | undefined;
};

export default function CostDetailsCard({
  biayaKirimLabel,
  biayaLayananTambahanLabel,
  taxLabel,
  totalHargaLabel,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <h4 className="text-3xl font-semibold text-gray-800">
          {t("orders.detail_amount")}
        </h4>
      </CardHeader>
      <CardBody>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>{t("orders.biaya_kirim")}</span>
            <span className="font-extrabold">{fmtPrice(biayaKirimLabel)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("orders.biaya_layanan_tambahan")}</span>
            <span className="font-extrabold">
              {fmtPrice(biayaLayananTambahanLabel)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("orders.tax")}</span>
            <span className="font-extrabold">{fmtPrice(taxLabel)}</span>
          </div>
          <div className="flex items-start justify-between">
            <span>{t("orders.biaya_na")}</span>
            <span className="max-w-[60%] text-right text-gray-600">
              {t("orders.biaya_na_note")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-extrabold">{t("orders.total_harga")}</span>
            <span className="font-extrabold">{fmtPrice(totalHargaLabel)}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
