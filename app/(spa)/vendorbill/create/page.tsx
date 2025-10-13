"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { t, getLang } from "@/lib/i18n";
import { useRouter } from "next/navigation";

import { Form, FormActions } from "@/components/form/Form";
import {
  FieldAutocomplete,
  type AutoItem,
} from "@/components/form/FieldAutoComplete";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import MultiFileUpload from "@/components/form/MultiFileUpload";
import Datepicker, { type DateValueType } from "react-tailwindcss-datepicker";
import DateTimePickerTW from "@/components/form/DateTimePickerTW";

/** ===== ENV (sesuaikan) ===== */
const ORDERS_SEARCH_URL =
  process.env.NEXT_PUBLIC_TMS_ORDERS_SEARCH_URL ?? "/api-tms/orders/search";
const ORDER_DETAIL_URL =
  process.env.NEXT_PUBLIC_TMS_ORDERS_DETAIL_URL ?? "/api-tms/orders";
const INVOICE_SUBMIT_URL =
  process.env.NEXT_PUBLIC_TMS_INVOICES_SUBMIT_URL ?? "/api-tms/invoices/submit";

/** ===== Types ===== */
type OrderDetail = {
  id: number;
  jo_no: string;
  customer_name?: string;
  armada_name?: string;
  origin_city_name?: string;
  dest_city_name?: string;
  load_date?: string;
  unload_date?: string;
  load_location?: string;
  unload_location?: string;
  cargo_name?: string;
  cargo_desc?: string;
  shipping_cost?: number;
  additional_cost?: number;
  tax_amount?: number;
  claim_amount?: number;
  down_payment?: number;
  total_amount?: number;
};

/** ===== Utils ===== */
function toCurrency(n?: number) {
  if (typeof n !== "number") return "-";
  return new Intl.NumberFormat(getLang() === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  })
    .format(n)
    .replace(/\s/g, " ");
}
function fmtDate(d?: string) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/** ===== Component ===== */
export default function InvoiceSubmitForm() {
  const router = useRouter();

  // --- FieldAutocomplete (No. JO) state (sesuai komponenmu)
  const [joText, setJoText] = useState(""); // value string pada input
  const [joOptions, setJoOptions] = useState<AutoItem[]>([]);
  const [joOpen, setJoOpen] = useState(false);
  const [joSelected, setJoSelected] = useState<AutoItem | null>(null);
  const [joLoading, setJoLoading] = useState(false);
  const joInputRef = useRef<HTMLInputElement | null>(null);

  // --- Date
  const [invoiceDate, setInvoiceDate] = useState<DateValueType>({
    startDate: null,
    endDate: null,
  });

  // --- Files (MultiFileUpload)
  const [files, setFiles] = useState<File[]>([]);

  // --- Detail order
  const [order, setOrder] = useState<OrderDetail | null>(null);

  // --- Errors
  const [errors, setErrors] = useState<{
    jo?: string;
    date?: string;
    file?: string;
    submit?: string;
  }>({});

  const [submitting, setSubmitting] = useState(false);

  /** Cari JO (debounced by setTimeout kecil) sesuai format AutoItem {id,name} */
  useEffect(() => {
    if (!joOpen || joText.trim().length < 2) return;
    const h = setTimeout(async () => {
      try {
        setJoLoading(true);
        const res = await fetch(
          `${ORDERS_SEARCH_URL}?q=${encodeURIComponent(joText.trim())}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("search failed");
        const rows: Array<{ id: number; jo_no: string; customer?: string }> =
          await res.json();
        const opt: AutoItem[] = rows.map((r) => ({
          id: r.id,
          name: `${r.jo_no}${r.customer ? " — " + r.customer : ""}`,
        }));
        setJoOptions(opt);
      } catch (e) {
        setJoOptions([]);
      } finally {
        setJoLoading(false);
      }
    }, 250);
    return () => clearTimeout(h);
  }, [joText, joOpen]);

  /** Ambil detail order ketika selected berubah */
  useEffect(() => {
    const id = joSelected?.id;
    if (!id) {
      setOrder(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${ORDER_DETAIL_URL}/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("detail failed");
        const data: OrderDetail = await res.json();
        setOrder(data);
      } catch (e) {
        setOrder(null);
      }
    })();
  }, [joSelected]);

  const [invoiceIso, setInvoiceIso] = useState<string>("");

  /** Validasi */
  const validate = () => {
    const next: typeof errors = {};
    if (!joSelected?.id) next.jo = "Wajib pilih No. JO";
    const dateOnly = invoiceIso ? invoiceIso.split("T")[0] : "";
    if (!dateOnly) next.date = "Tanggal wajib diisi";
    if (files.length < 1) next.file = "Wajib unggah 1 file (PDF)";
    if (files.length > 1) next.file = "Maksimal 1 file saja";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // derive YYYY-MM-DD dari invoiceIso
    const dateStr = invoiceIso.split("T")[0]; // aman karena sudah divalidasi

    const fd = new FormData();
    fd.append("order_id", String(joSelected!.id));
    fd.append("invoice_date", dateStr);
    fd.append("file", files[0]);

    try {
      setSubmitting(true);
      setErrors((p) => ({ ...p, submit: undefined }));
      const res = await fetch(INVOICE_SUBMIT_URL, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok)
        throw new Error((await res.text()) || "Gagal submit invoice");
      router.refresh();
    } catch (err: unknown) {
      // ⬅️ ganti: any → unknown
      const msg = err instanceof Error ? err.message : String(err);
      setErrors((p) => ({
        ...p,
        submit: msg || "Terjadi kesalahan saat submit.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setJoText("");
    setJoOptions([]);
    setJoOpen(false);
    setJoSelected(null);
    setInvoiceIso(""); // reset
    setFiles([]);
    setErrors({});
    setOrder(null);
  };

  /** onPick dari FieldAutocomplete (selaraskan dgn komponenmu) */
  const onPickJo = (item: AutoItem) => {
    setJoSelected(item);
    setJoText(item.name);
    setJoOpen(false);
    setErrors((p) => ({ ...p, jo: undefined }));
  };

  /** onBlurValidate untuk FieldAutocomplete  */
  const onBlurValidateJo = () => {
    if (!joSelected?.id) {
      setErrors((p) => ({ ...p, jo: "Wajib pilih No. JO dari daftar" }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Top actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={submitting}
          aria-busy={submitting}
        >
          {t("common.save") || "Save"}
        </Button>
        <Button variant="ghost" onClick={handleDiscard}>
          {t("common.discard") || "Discard"}
        </Button>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        {/* LEFT: form kecil */}
        <Card>
          <CardHeader>{t("invoices.submit") || "Submit Invoice"}</CardHeader>
          <CardBody>
            <Form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {/* ==== FIELD AUTOCOMPLETE (ALIGN EXACT) ==== */}
              <div className="grid gap-1">
                <label className="text-sm font-medium text-gray-600">
                  No. JO
                </label>
                <FieldAutocomplete
                  value={joText}
                  onChange={setJoText}
                  placeholder="Ketik minimal 2 huruf/angka…"
                  ariaLabel="Cari dan pilih No. JO"
                  options={joOptions}
                  loading={joLoading}
                  open={joOpen}
                  setOpen={setJoOpen}
                  selected={joSelected ?? undefined}
                  onPick={onPickJo}
                  error={errors.jo}
                  touched={Boolean(errors.jo)}
                  onBlurValidate={onBlurValidateJo}
                  inputRef={joInputRef}
                  required
                />
              </div>

              {/* Datepicker: tanpa time */}
              <div className="grid gap-1">
                <DateTimePickerTW
                  label="Tanggal Submit Invoice"
                  value={invoiceIso} // "" atau "YYYY-MM-DDTHH:mm"
                  onChange={(v) => {
                    setInvoiceIso(v);
                    if (v) setErrors((p) => ({ ...p, date: undefined }));
                  }}
                  displayFormat="DD MMMM YYYY"
                  required
                  showTime={false} // ⬅️ hide time input
                  error={errors.date}
                  touched={Boolean(errors.date)}
                />
                {errors.date && (
                  <p className="text-xs text-red-600">{errors.date}</p>
                )}
              </div>

              {/* Upload Invoice (align exact dengan MultiFileUpload-mu) */}
              <MultiFileUpload
                label="Upload Invoice"
                value={files}
                onChange={setFiles}
                accept=".pdf,application/pdf"
                maxFiles={1}
                hint="Hanya 1 file (PDF), maks 10 MB"
                onReject={(msgs) =>
                  msgs.length &&
                  setErrors((p) => ({ ...p, file: msgs.join(" | ") }))
                }
              />
              {errors.file && (
                <p className="mt-1 text-xs text-red-600">{errors.file}</p>
              )}

              <p className="text-xs text-gray-500">
                <span className="font-medium">Note:</span> jam submit invoice
                09:00 s.d. 16:00 WIB pada hari kerja.
              </p>

              <FormActions>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {t("common.save") || "Save"}
                </Button>
                <Button type="button" variant="ghost" onClick={handleDiscard}>
                  {t("common.discard") || "Discard"}
                </Button>
              </FormActions>

              {errors.submit && (
                <p className="text-sm text-red-600">{errors.submit}</p>
              )}
            </Form>
          </CardBody>
        </Card>

        {/* RIGHT: detail order */}
        <div className="space-y-4">
          <Card>
            <CardHeader>Informasi Order</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailRow label="No. JO" value={order?.jo_no ?? "-"} />
                <DetailRow
                  label="Lokasi Muat (Kota)"
                  value={order?.origin_city_name ?? "-"}
                />
                <DetailRow
                  label="Customer"
                  value={order?.customer_name ?? "-"}
                  required
                />
                <DetailRow
                  label="Lokasi Bongkar (Kota)"
                  value={order?.dest_city_name ?? "-"}
                  required
                />
                <DetailRow
                  label="Armada"
                  value={order?.armada_name ?? "-"}
                  required
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Informasi Lokasi Muat dan Bongkar</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailRow
                  label="Tanggal Muat"
                  value={fmtDate(order?.load_date)}
                  required
                />
                <DetailRow
                  label="Tanggal Bongkar"
                  value={fmtDate(order?.unload_date)}
                  required
                />
                <DetailRow
                  label="Lokasi Muat"
                  value={order?.load_location ?? "-"}
                />
                <DetailRow
                  label="Lokasi Bongkar"
                  value={order?.unload_location ?? "-"}
                />
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>Informasi Muatan</CardHeader>
              <CardBody>
                <div className="grid gap-4">
                  <DetailRow
                    label="Nama Muatan"
                    value={order?.cargo_name ?? "-"}
                    required
                  />
                  <DetailRow
                    label="Deskripsi Muatan"
                    value={order?.cargo_desc ?? "-"}
                    required
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Detail Amount</CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-2">
                  <MoneyRow label="Biaya Kirim" value={order?.shipping_cost} />
                  <MoneyRow
                    label="Biaya Layanan Tambahan"
                    value={order?.additional_cost}
                  />
                  <MoneyRow label="Tax" value={order?.tax_amount} />
                  <MoneyRow label="Claims" value={order?.claim_amount} />
                  <MoneyRow
                    label="Down Payment"
                    value={-1 * (order?.down_payment ?? 0)}
                  />
                </dl>
                <hr className="my-3" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total&nbsp;Harga</span>
                  <span className="text-lg font-bold">
                    {toCurrency(order?.total_amount)}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ===== Sub components ===== */
function DetailRow({
  label,
  value,
  required,
}: {
  label: string;
  value: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-3 text-sm">
      <div className="text-gray-600">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
function MoneyRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-medium">{toCurrency(value)}</dd>
    </div>
  );
}
