// components/form/PhoneField.tsx
"use client";

import React from "react";
import { FieldText } from "@/components/form/FieldText";
import { t } from "@/lib/i18n";

type PhoneKind = "mobile" | "landline";

export function sanitizePhoneInput(raw: string): string {
  // hanya angka, +, -
  let s = raw.replace(/[^\d+\-]/g, "");
  // hanya satu '+' dan harus di awal (hapus '+' lain)
  if (s.indexOf("+") > 0) s = s.replace(/\+/g, "");
  s = s.replace(/(?!^)\+/g, "");
  return s;
}

export function normalizeToLocal08(digitsOnly: string): string {
  // konversi 62xxxxxxxxxx -> 08xxxxxxxxx untuk validasi lokal
  if (digitsOnly.startsWith("62")) return "0" + digitsOnly.slice(2);
  return digitsOnly;
}

export function isValidMobileID(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const local = normalizeToLocal08(digits);
  // 08xxxxxxxx (10–13 digit total) — fleksibel utk variasi operator
  return /^08\d{8,11}$/.test(local);
}

export function isValidLandlineID(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const local = normalizeToLocal08(digits);
  // 0[2-7]... (bukan 08), panjang 9–12 digit umum utk PSTN kantor/rumah
  return /^0[2-7]\d{7,10}$/.test(local);
}

function buildError(
  value: string,
  kind: PhoneKind,
  required?: boolean
): string | null {
  if (!value) return required ? t("form.required") ?? "Wajib diisi" : null;

  // Karakter di luar 0-9, +, - tidak diizinkan
  if (!/^[0-9+\-]*$/.test(value)) {
    return "Hanya angka, +, dan - yang diperbolehkan.";
  }
  // '+' hanya boleh 1x dan harus di awal
  if (/\+/.test(value) && value.indexOf("+") !== 0) {
    return "Tanda + hanya boleh di awal nomor.";
  }

  if (kind === "mobile") {
    if (!isValidMobileID(value)) {
      return t("phone.invalid_format") + " " + t("phone.example"); //"Nomor seluler tidak valid. Gunakan format 08… atau +628… (10–13 digit).";
    }
  } else {
    if (!isValidLandlineID(value)) {
      return "Nomor telepon kantor/rumah tidak valid. Mulai dengan 02–07 atau +622–+627.";
    }
  }

  return null;
}

export default function PhoneField({
  label,
  value,
  onChange,
  kind,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind: PhoneKind; // "mobile" | "landline"
  required?: boolean;
  placeholder?: string;
}) {
  const [touched, setTouched] = React.useState(false);
  const err = buildError(value, kind, required);

  return (
    <div className="space-y-1">
      <FieldText
        label={label}
        value={value}
        onChange={(v) => {
          const cleaned = sanitizePhoneInput(v);
          onChange(cleaned);
        }}
        onBlur={() => setTouched(true)}
        inputMode="tel"
        // Browser pattern hanya utk gate karakter (bukan validasi jenis)
        pattern="^[0-9+\-]*$"
        // title prop removed because FieldText does not accept it
        placeholder={placeholder}
        required={required}
        aria-invalid={touched && !!err}
      />
      {touched && err && (
        <p className="mt-1 font-extralight text-xs text-red-600">{err}</p>
      )}
    </div>
  );
}
