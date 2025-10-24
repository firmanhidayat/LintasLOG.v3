"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/form/FieldInput";
import LookupAutocomplete, {
  normalizeResults,
} from "@/components/form/LookupAutocomplete";
import { RecordItem } from "@/types/recorditem";
import type { OrderTypeItem } from "@/types/orders";

const CARGO_TYPE_URL = process.env.NEXT_PUBLIC_TMS_CARGO_TYPE_URL!;

type DivRef =
  | React.RefObject<HTMLDivElement>
  | React.Ref<HTMLDivElement>
  | null;

type Props = {
  jenisOrder: OrderTypeItem | null;

  muatanNama: string;
  setMuatanNama: (v: string) => void;
  muatanDeskripsi: string;
  setMuatanDeskripsi: (v: string) => void;

  jenisMuatan: RecordItem | null;
  setJenisMuatan: (v: RecordItem | null) => void;

  cargoCBM: number;
  setCargoCBM: (v: number) => void;

  jumlahMuatan: number;
  setJumlahMuatan: (v: number) => void;

  errors: Record<string, string>;
  firstErrorKey?: string;
  firstErrorRef?: DivRef;
};

/** keep only digits, allow 1 comma/dot, max 2 decimals */
function keepDecimal2(s: string) {
  const x = s.replace(/[^\d.,]/g, "");
  const iComma = x.indexOf(",");
  const iDot = x.indexOf(".");
  const i = [iComma, iDot].filter((v) => v >= 0).sort((a, b) => a - b)[0] ?? -1;
  if (i < 0) return x.replace(/[^\d]/g, "");
  const sep = x[i];
  const head = x.slice(0, i).replace(/[^\d]/g, "");
  const tail = x
    .slice(i + 1)
    .replace(/[^\d]/g, "")
    .slice(0, 2);
  return tail ? `${head}${sep}${tail}` : `${head}${sep}`;
}

/** parse string dengan koma/titik ke number (relaxed saat blur) */
function toNumber2Relaxed(s: string): number | null {
  if (!s) return null;
  let y = s.replace(",", ".");
  if (/[.]$/.test(y)) y = y.slice(0, -1); // trailing separator → buang
  const n = parseFloat(y);
  return Number.isFinite(n) ? n : null;
}

/** format number => "x,yy" 2 desimal (koma) */
function format2comma(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return n.toFixed(2).replace(".", ",");
}

/** valid untuk pola 0..n dengan optional ,/., maks 2 desimal */
const DEC2_REGEX = /^\d*(?:[.,]\d{0,2})?$/;

export default function CargoInfoCard({
  jenisOrder,
  muatanNama,
  setMuatanNama,
  muatanDeskripsi,
  setMuatanDeskripsi,
  jenisMuatan,
  setJenisMuatan,
  cargoCBM,
  setCargoCBM,
  setJumlahMuatan,
  jumlahMuatan,

  errors,
  firstErrorKey,
  firstErrorRef,
}: Props) {
  const refIf = (k: string) =>
    firstErrorKey === k
      ? (firstErrorRef as React.Ref<HTMLDivElement>)
      : undefined;

  // ===== Local state untuk 2 field desimal =====
  const [cargoCBMText, setCargoCBMText] = useState<string>(() =>
    format2comma(cargoCBM)
  );
  const [jumlahMuatanText, setJumlahMuatanText] = useState<string>(() =>
    format2comma(jumlahMuatan)
  );

  // Track fokus supaya tidak "menimpa" input saat user sedang mengetik
  const [cargoCBMFocused, setCargoCBMFocused] = useState(false);
  const [jumlahFocused, setJumlahFocused] = useState(false);

  // Sinkron dari props → text hanya saat TIDAK fokus
  useEffect(() => {
    if (!cargoCBMFocused) setCargoCBMText(format2comma(cargoCBM));
  }, [cargoCBM, cargoCBMFocused]);
  useEffect(() => {
    if (!jumlahFocused) setJumlahMuatanText(format2comma(jumlahMuatan));
  }, [jumlahMuatan, jumlahFocused]);

  // ===== Cargo CBM handlers =====
  const onChangeCargoCBM = (raw: string) => {
    const s = keepDecimal2(raw);
    if (!DEC2_REGEX.test(s)) return;
    setCargoCBMText(s); // JANGAN push ke parent di onChange
  };
  const onBlurCargoCBM = () => {
    setCargoCBMFocused(false);
    const n = toNumber2Relaxed(cargoCBMText);
    if (n == null) {
      // biarkan kosong (validasi dari luar yang tentukan)
      setCargoCBMText("");
      return;
    }
    setCargoCBM(Number(n.toFixed(2)));
    setCargoCBMText(format2comma(n));
  };

  // ===== Jumlah Muatan handlers =====
  const onChangeJumlah = (raw: string) => {
    const s = keepDecimal2(raw);
    if (!DEC2_REGEX.test(s)) return;
    setJumlahMuatanText(s); // JANGAN push ke parent di onChange
  };
  const onBlurJumlah = () => {
    setJumlahFocused(false);
    const n = toNumber2Relaxed(jumlahMuatanText);
    if (n == null) {
      setJumlahMuatanText("");
      return;
    }
    setJumlahMuatan(Number(n.toFixed(2)));
    setJumlahMuatanText(format2comma(n));
  };

  const orderTypeId = useMemo(() => {
    const src =
      (jenisOrder as unknown as Partial<
        Record<"id" | "code" | "value" | "slug", string | number>
      >) || {};
    const v = src.code ?? src.id ?? src.value ?? src.slug;
    return v ? String(v) : "";
  }, [jenisOrder]);

  const cargoEndpoint = useMemo(() => {
    const base = CARGO_TYPE_URL ?? "";
    try {
      const u = new URL(base);
      if (orderTypeId) u.searchParams.set("order_type_id", orderTypeId);
      else u.searchParams.delete("order_type_id");
      return {
        url: u.toString(),
        method: "GET" as const,
        queryParam: "query",
        pageParam: "page",
        pageSizeParam: "page_size",
        page: 1,
        pageSize: 80,
        mapResults: normalizeResults,
        onUnauthorized: () => {},
      };
    } catch {
      const withParam = orderTypeId
        ? `${base}?order_type_id=${encodeURIComponent(orderTypeId)}`
        : base;
      return {
        url: withParam,
        method: "GET" as const,
        queryParam: "query",
        pageParam: "page",
        pageSizeParam: "page_size",
        page: 1,
        pageSize: 80,
        mapResults: normalizeResults,
        onUnauthorized: () => {},
      };
    }
  }, [orderTypeId]);

  const prevOrderTypeId = useRef<string | null>(null);
  useEffect(() => {
    if (prevOrderTypeId.current === null) {
      prevOrderTypeId.current = orderTypeId;
      return;
    }
    if (prevOrderTypeId.current !== orderTypeId) {
      setJenisMuatan(null);
      prevOrderTypeId.current = orderTypeId;
    }
  }, [orderTypeId, setJenisMuatan]);
  const cargoDisabled = !orderTypeId;

  return (
    <Card>
      <CardHeader>
        <h4 className="text-3xl font-semibold text-gray-800">
          {t("orders.info_muatan")}
        </h4>
      </CardHeader>
      <CardBody>
        {/* Grid utama: 2 kolom */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kiri: Cargo Name */}
          <div>
            <div ref={refIf("muatanNama")}>
              <Field.Root
                value={muatanNama}
                onChange={setMuatanNama}
                touched={Boolean(errors.muatanNama)}
                className="flex-auto"
              >
                <Field.Label>{t("orders.muatan_nama")}</Field.Label>
                <Field.Control>
                  <Field.Input className="w-full" />
                  <Field.Error />
                </Field.Control>
              </Field.Root>
            </div>
          </div>

          {/* Kanan: Dimensi CBM (wajib 2 desimal) */}
          <div>
            <Field.Root
              value={cargoCBMText}
              onChange={onChangeCargoCBM}
              error={errors.cargoCBM}
              touched={Boolean(errors.cargoCBM)}
              className="flex-auto"
            >
              <Field.Label>Dimensi CBM</Field.Label>
              <Field.Control>
                <Field.Input
                  className="w-full"
                  inputMode="decimal"
                  placeholder="0,00"
                  pattern="^\d*(?:[.,]\d{0,2})?$"
                  onFocus={() => setCargoCBMFocused(true)}
                  onBlur={onBlurCargoCBM}
                />
                <Field.Error />
              </Field.Control>
            </Field.Root>
          </div>

          {/* BARIS KHUSUS (span 2 kolom): Cargo Type + Jumlah Muatan */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr),160px]">
              {/* Cargo Type */}
              <div ref={refIf("jenisMuatan")}>
                <LookupAutocomplete
                  label={t("orders.jenis_cargo")}
                  placeholder={
                    cargoDisabled
                      ? t("orders.select_order_type_first") ??
                        "Pilih Jenis Order dulu"
                      : t("orders.search_cargo_type")
                  }
                  value={jenisMuatan}
                  onChange={setJenisMuatan}
                  error={errors.jenisMuatan}
                  endpoint={cargoEndpoint}
                  cacheNamespace={`cargo-types:${orderTypeId || "none"}`}
                  prefetchQuery=""
                  disabled={cargoDisabled}
                />
              </div>

              {/* Jumlah Muatan (wajib 2 desimal) */}
              <div>
                <Field.Root
                  value={jumlahMuatanText}
                  onChange={onChangeJumlah}
                  error={errors.jumlahMuatan}
                  touched={Boolean(errors.jumlahMuatan)}
                  className="flex-auto"
                >
                  <Field.Label>Jumlah Muatan</Field.Label>
                  <Field.Control>
                    <Field.Input
                      className="w-full"
                      inputMode="decimal"
                      placeholder="0,00"
                      pattern="^\d*(?:[.,]\d{0,2})?$"
                      onFocus={() => setJumlahFocused(true)}
                      onBlur={onBlurJumlah}
                    />
                    <Field.Suffix>Kg</Field.Suffix>
                    <Field.Error />
                  </Field.Control>
                </Field.Root>
              </div>
            </div>
          </div>
        </div>

        {/* Deskripsi */}
        <div className="grid grid-cols-1 gap-4">
          <div ref={refIf("muatanDeskripsi")}>
            <Field.Root
              type="text"
              value={muatanDeskripsi}
              onChange={setMuatanDeskripsi}
              touched={Boolean(errors.muatanDeskripsi)}
              rows={4}
            >
              <Field.Label>{t("orders.muatan_deskripsi")}</Field.Label>
              <Field.Control>
                <Field.Textarea className="w-full" />
                <Field.Error />
              </Field.Control>
            </Field.Root>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// "use client";

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { t } from "@/lib/i18n";
// import { Card, CardHeader, CardBody } from "@/components/ui/Card";
// import { Field } from "@/components/form/FieldInput";
// import LookupAutocomplete, {
//   normalizeResults,
// } from "@/components/form/LookupAutocomplete";
// import { RecordItem } from "@/types/recorditem";
// import type { OrderTypeItem } from "@/types/orders";

// const CARGO_TYPE_URL = process.env.NEXT_PUBLIC_TMS_CARGO_TYPE_URL!;

// type DivRef =
//   | React.RefObject<HTMLDivElement>
//   | React.Ref<HTMLDivElement>
//   | null;

// type Props = {
//   jenisOrder: OrderTypeItem | null;

//   muatanNama: string;
//   setMuatanNama: (v: string) => void;
//   muatanDeskripsi: string;
//   setMuatanDeskripsi: (v: string) => void;

//   jenisMuatan: RecordItem | null;
//   setJenisMuatan: (v: RecordItem | null) => void;

//   cargoCBM: number;
//   setCargoCBM: (v: number) => void;

//   jumlahMuatan: number;
//   setJumlahMuatan: (v: number) => void;

//   errors: Record<string, string>;
//   firstErrorKey?: string;
//   firstErrorRef?: DivRef;
// };

// /** keep only digits, allow 1 comma/dot, max 2 decimals */
// function keepDecimal2(s: string) {
//   const x = s.replace(/[^\d.,]/g, "");
//   const iComma = x.indexOf(",");
//   const iDot = x.indexOf(".");
//   const i = [iComma, iDot].filter((v) => v >= 0).sort((a, b) => a - b)[0] ?? -1;
//   if (i < 0) return x.replace(/[^\d]/g, ""); // hanya angka kalau belum ada pemisah
//   const sep = x[i];
//   const head = x.slice(0, i).replace(/[^\d]/g, ""); // integer
//   const tail = x
//     .slice(i + 1)
//     .replace(/[^\d]/g, "")
//     .slice(0, 2); // 2 desimal
//   return tail ? `${head}${sep}${tail}` : `${head}${sep}`;
// }

// /** parse string dengan koma/titik ke number */
// function toNumber2(s: string): number | null {
//   if (!s) return null;
//   // hindari parse di kondisi berakhir separator (misal "12," / "12.")
//   const endsWithSep = /[.,]$/.test(s);
//   if (endsWithSep) return null;
//   const n = parseFloat(s.replace(",", "."));
//   return Number.isFinite(n) ? n : null;
// }

// /** format number => "x,yy" 2 desimal (koma) */
// function format2comma(n: number | null | undefined): string {
//   if (n == null || !Number.isFinite(n)) return "";
//   return n.toFixed(2).replace(".", ",");
// }

// /** valid untuk pola 0..n dengan optional ,/., maks 2 desimal */
// const DEC2_REGEX = /^\d*(?:[.,]\d{0,2})?$/;

// export default function CargoInfoCard({
//   jenisOrder,
//   muatanNama,
//   setMuatanNama,
//   muatanDeskripsi,
//   setMuatanDeskripsi,
//   jenisMuatan,
//   setJenisMuatan,
//   cargoCBM,
//   setCargoCBM,
//   setJumlahMuatan,
//   jumlahMuatan,

//   errors,
//   firstErrorKey,
//   firstErrorRef,
// }: Props) {
//   const refIf = (k: string) =>
//     firstErrorKey === k
//       ? (firstErrorRef as React.Ref<HTMLDivElement>)
//       : undefined;

//   // ===== Local state untuk 2 field desimal: tampilkan nice-typing, sinkron ke parent number =====
//   const [cargoCBMText, setCargoCBMText] = useState<string>(() =>
//     format2comma(cargoCBM)
//   );
//   const [jumlahMuatanText, setJumlahMuatanText] = useState<string>(() =>
//     format2comma(jumlahMuatan)
//   );

//   // Sinkron saat props dari luar berubah (misal saat Edit / load data)
//   useEffect(() => {
//     setCargoCBMText(format2comma(cargoCBM));
//   }, [cargoCBM]);
//   useEffect(() => {
//     setJumlahMuatanText(format2comma(jumlahMuatan));
//   }, [jumlahMuatan]);

//   const onChangeCargoCBM = (raw: string) => {
//     const s = keepDecimal2(raw);
//     if (!DEC2_REGEX.test(s)) return; // guard tambahan
//     setCargoCBMText(s);
//     const n = toNumber2(s);
//     if (n != null) setCargoCBM(n);
//   };
//   const onBlurCargoCBM = () => {
//     const n = toNumber2(cargoCBMText);
//     if (n == null) {
//       // kosongkan bila tidak valid
//       setCargoCBMText("");
//     } else {
//       setCargoCBM(n);
//       setCargoCBMText(format2comma(n)); // paksa 2 desimal
//     }
//   };

//   const onChangeJumlah = (raw: string) => {
//     const s = keepDecimal2(raw);
//     if (!DEC2_REGEX.test(s)) return;
//     setJumlahMuatanText(s);
//     const n = toNumber2(s);
//     if (n != null) setJumlahMuatan(n);
//   };
//   const onBlurJumlah = () => {
//     const n = toNumber2(jumlahMuatanText);
//     if (n == null) {
//       setJumlahMuatanText("");
//     } else {
//       setJumlahMuatan(n);
//       setJumlahMuatanText(format2comma(n));
//     }
//   };

//   const orderTypeId = useMemo(() => {
//     const src =
//       (jenisOrder as unknown as Partial<
//         Record<"id" | "code" | "value" | "slug", string | number>
//       >) || {};
//     const v = src.code ?? src.id ?? src.value ?? src.slug;
//     return v ? String(v) : "";
//   }, [jenisOrder]);

//   const cargoEndpoint = useMemo(() => {
//     const base = CARGO_TYPE_URL ?? "";
//     try {
//       const u = new URL(base);
//       if (orderTypeId) u.searchParams.set("order_type_id", orderTypeId);
//       else u.searchParams.delete("order_type_id");
//       return {
//         url: u.toString(),
//         method: "GET" as const,
//         queryParam: "query",
//         pageParam: "page",
//         pageSizeParam: "page_size",
//         page: 1,
//         pageSize: 80,
//         mapResults: normalizeResults,
//         onUnauthorized: () => {},
//       };
//     } catch {
//       const withParam = orderTypeId
//         ? `${base}?order_type_id=${encodeURIComponent(orderTypeId)}`
//         : base;
//       return {
//         url: withParam,
//         method: "GET" as const,
//         queryParam: "query",
//         pageParam: "page",
//         pageSizeParam: "page_size",
//         page: 1,
//         pageSize: 80,
//         mapResults: normalizeResults,
//         onUnauthorized: () => {},
//       };
//     }
//   }, [orderTypeId]);

//   const prevOrderTypeId = useRef<string | null>(null);
//   useEffect(() => {
//     if (prevOrderTypeId.current === null) {
//       prevOrderTypeId.current = orderTypeId;
//       return;
//     }
//     if (prevOrderTypeId.current !== orderTypeId) {
//       setJenisMuatan(null);
//       prevOrderTypeId.current = orderTypeId;
//     }
//   }, [orderTypeId, setJenisMuatan]);
//   const cargoDisabled = !orderTypeId;

//   return (
//     <Card>
//       <CardHeader>
//         <h4 className="text-3xl font-semibold text-gray-800">
//           {t("orders.info_muatan")}
//         </h4>
//       </CardHeader>
//       <CardBody>
//         {/* Grid utama: 2 kolom */}
//         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//           {/* Kiri: Cargo Name */}
//           <div>
//             <div ref={refIf("muatanNama")}>
//               <Field.Root
//                 value={muatanNama}
//                 onChange={setMuatanNama}
//                 // error={errors.muatanNama}
//                 touched={Boolean(errors.muatanNama)}
//                 className="flex-auto"
//               >
//                 <Field.Label>{t("orders.muatan_nama")}</Field.Label>
//                 <Field.Control>
//                   <Field.Input className="w-full" />
//                   <Field.Error />
//                 </Field.Control>
//               </Field.Root>
//             </div>
//           </div>

//           {/* Kanan: Dimensi CBM (wajib 2 desimal) */}
//           <div>
//             <Field.Root
//               value={cargoCBMText}
//               onChange={onChangeCargoCBM}
//               error={errors.cargoCBM}
//               touched={Boolean(errors.cargoCBM)}
//               className="flex-auto"
//             >
//               <Field.Label>Dimensi CBM</Field.Label>
//               <Field.Control>
//                 <Field.Input
//                   className="w-full"
//                   inputMode="decimal"
//                   placeholder="0,00"
//                   pattern="^\d*(?:[.,]\d{0,2})?$"
//                   onBlur={onBlurCargoCBM}
//                 />
//                 <Field.Error />
//               </Field.Control>
//             </Field.Root>
//           </div>

//           {/* BARIS KHUSUS (span 2 kolom): Cargo Type + Jumlah Muatan */}
//           <div className="lg:col-span-2">
//             <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr),160px]">
//               {/* Cargo Type */}
//               <div ref={refIf("jenisMuatan")}>
//                 <LookupAutocomplete
//                   label={t("orders.jenis_cargo")}
//                   placeholder={
//                     cargoDisabled
//                       ? t("orders.select_order_type_first") ??
//                         "Pilih Jenis Order dulu"
//                       : t("orders.search_cargo_type")
//                   }
//                   value={jenisMuatan}
//                   onChange={setJenisMuatan}
//                   error={errors.jenisMuatan}
//                   endpoint={cargoEndpoint}
//                   cacheNamespace={`cargo-types:${orderTypeId || "none"}`}
//                   prefetchQuery=""
//                   disabled={cargoDisabled}
//                 />
//               </div>

//               {/* Jumlah Muatan (wajib 2 desimal) */}
//               <div>
//                 <Field.Root
//                   value={jumlahMuatanText}
//                   onChange={onChangeJumlah}
//                   error={errors.jumlahMuatan}
//                   touched={Boolean(errors.jumlahMuatan)}
//                   className="flex-auto"
//                 >
//                   <Field.Label>Jumlah Muatan</Field.Label>
//                   <Field.Control>
//                     <Field.Input
//                       className="w-full"
//                       inputMode="decimal"
//                       placeholder="0,00"
//                       pattern="^\d*(?:[.,]\d{0,2})?$"
//                       onBlur={onBlurJumlah}
//                     />
//                     <Field.Suffix>Kg</Field.Suffix>
//                     <Field.Error />
//                   </Field.Control>
//                 </Field.Root>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Deskripsi */}
//         <div className="grid grid-cols-1 gap-4">
//           <div ref={refIf("muatanDeskripsi")}>
//             <Field.Root
//               type="text"
//               value={muatanDeskripsi}
//               onChange={setMuatanDeskripsi}
//               // error={errors.muatanDeskripsi}
//               touched={Boolean(errors.muatanDeskripsi)}
//               rows={4}
//             >
//               <Field.Label>{t("orders.muatan_deskripsi")}</Field.Label>
//               <Field.Control>
//                 <Field.Textarea className="w-full" />
//                 <Field.Error />
//               </Field.Control>
//             </Field.Root>
//           </div>
//         </div>
//       </CardBody>
//     </Card>
//   );
// }
