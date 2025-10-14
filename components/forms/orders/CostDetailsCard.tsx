import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

type Props = {
  biayaKirimLabel: string;
  biayaLayananTambahanLabel: string;
  taxLabel: string;
  totalHargaLabel: string;
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
        <h3 className="text-3xl font-semibold text-gray-800">
          {t("orders.detail_amount")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>{t("orders.biaya_kirim")}</span>
            <span className="font-medium">{biayaKirimLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("orders.biaya_layanan_tambahan")}</span>
            <span className="font-medium">{biayaLayananTambahanLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("orders.tax")}</span>
            <span className="font-medium">{taxLabel}</span>
          </div>
          <div className="flex items-start justify-between">
            <span>{t("orders.biaya_na")}</span>
            <span className="max-w-[60%] text-right text-gray-600">
              {t("orders.biaya_na_note")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{t("orders.total_harga")}</span>
            <span className="font-semibold">{totalHargaLabel}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
