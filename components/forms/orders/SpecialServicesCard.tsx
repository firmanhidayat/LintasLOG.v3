import React from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { FieldTextarea } from "@/components/form/FieldTextarea";

type Props<L extends string> = {
  layananPreset: readonly L[];
  layananKhusus: Record<L, boolean>;
  setLayananKhusus: (
    fn: (prev: Record<L, boolean>) => Record<L, boolean>
  ) => void;
  layananLainnya: string;
  setLayananLainnya: (v: string) => void;
};

export default function SpecialServicesCard<L extends string>({
  layananPreset,
  layananKhusus,
  setLayananKhusus,
  layananLainnya,
  setLayananLainnya,
}: Props<L>) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-3xl font-semibold text-gray-800">
          {t("orders.layanan_khusus")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {layananPreset.map((k) => (
            <label key={k} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={!!layananKhusus[k]}
                onChange={(e) =>
                  setLayananKhusus((prev) => ({
                    ...prev,
                    [k]: e.target.checked,
                  }))
                }
              />
              {k}
            </label>
          ))}
        </div>
        <div className="mt-4">
          <FieldTextarea
            label={t("orders.layanan_lainnya")}
            value={layananLainnya}
            onChange={setLayananLainnya}
            rows={4}
          />
        </div>
      </CardBody>
    </Card>
  );
}
