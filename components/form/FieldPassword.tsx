"use client";

import React from "react";

type StrengthLabels = {
  veryWeak?: string;
  weak?: string;
  fair?: string;
  strong?: string;
  veryStrong?: string;
};

type Props = {
  label?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string; // default: "new-password"
  a11yShow?: string; // default: "Show password"
  a11yHide?: string; // default: "Hide password"
  onBlur?: () => void;
  onFocus?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  error?: string;
  touched?: boolean;

  /** === Strength meter options === */
  strengthMeter?: boolean; // default: true
  strengthLabels?: StrengthLabels; // override text labels if needed
};

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z"
      />
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
    </svg>
  );
}
function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.584 10.59A3 3 0 0012 15c1.657 0 3-1.343 3-3 0-.418-.084-.816-.236-1.177M9.88 4.245A10.93 10.93 0 0112 4.5C18 4.5 21.75 12 21.75 12c-.428.771-1.004 1.653-1.715 2.52m-2.473 2.26C15.604 17.64 13.95 18.75 12 18.75c-6 0-9.75-6.75-9.75-6.75a18.796 18.796 0 013.29-3.84"
      />
    </svg>
  );
}

/** Hitung skor kekuatan: 0..4 */
function scorePassword(pw: string): {
  score: 0 | 1 | 2 | 3 | 4;
  checks: number;
} {
  if (!pw) return { score: 0, checks: 0 };
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const long8 = pw.length >= 8;
  const long12 = pw.length >= 12;

  // Baseline dari jumlah variasi karakter + panjang
  let checks = 0;
  checks += hasLower ? 1 : 0;
  checks += hasUpper ? 1 : 0;
  checks += hasDigit ? 1 : 0;
  checks += hasSymbol ? 1 : 0;
  checks += long8 ? 1 : 0;

  // Pemetaan kasar ke 0..4
  // 0: kosong
  // 1: <2 checks
  // 2: 2-3 checks
  // 3: 4 checks
  // 4: 5 checks atau panjang >= 12
  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (pw.length === 0) score = 0;
  else if (checks <= 1) score = 1;
  else if (checks <= 3) score = 2;
  else if (checks === 4) score = 3;
  else score = 4;
  if (long12 && score < 4) score = 4;

  return { score, checks };
}

function strengthColor(score: 0 | 1 | 2 | 3 | 4) {
  // warna bar aktif per segmen
  switch (score) {
    case 0:
      return "bg-gray-200";
    case 1:
      return "bg-red-500";
    case 2:
      return "bg-yellow-500";
    case 3:
      return "bg-lime-500";
    case 4:
      return "bg-green-600";
  }
}
function strengthText(
  score: 0 | 1 | 2 | 3 | 4,
  labels?: StrengthLabels
): string {
  const tVeryWeak = labels?.veryWeak ?? "Very weak";
  const tWeak = labels?.weak ?? "Weak";
  const tFair = labels?.fair ?? "Fair";
  const tStrong = labels?.strong ?? "Strong";
  // const tVeryStrong = labels?.veryStrong ?? "Very strong";
  switch (score) {
    case 0:
      return "";
    case 1:
      return tVeryWeak;
    case 2:
      return tWeak;
    case 3:
      return tFair;
    case 4:
      return tStrong; // note: we'll map 5-equivalent to Very strong below
  }
}

export function FieldPassword({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  autoComplete = "new-password",
  a11yShow = "Show password",
  a11yHide = "Hide password",
  onBlur,
  onFocus,
  inputRef,
  error,
  touched,
  strengthMeter = true,
  strengthLabels,
}: Props) {
  const [show, setShow] = React.useState(false);
  const hasError = !!error && touched !== false;

  const { score } = React.useMemo(() => scorePassword(value), [value]);

  const barsActive = (() => {
    // tampilkan 4 bar: jumlah aktif = score (kecuali score=0 -> 0 bar)
    // kita aktifkan 1..4 sesuai score
    return Math.max(0, Math.min(4, score));
  })();

  const text = React.useMemo(() => {
    if (!value) return "";
    // Jika kombinasi lengkap & panjang >= 12 kita sebut "Very strong"
    const s = scorePassword(value);
    const allVar = s.checks >= 5;
    if (value.length >= 12 && allVar) {
      return strengthLabels?.veryStrong ?? "Very strong";
    }
    return strengthText(s.score, strengthLabels) || "";
  }, [value, strengthLabels]);

  const strengthId = React.useId();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div
        className="mt-1 flex"
        aria-describedby={strengthMeter ? strengthId : undefined}
      >
        {/* input kiri (menyatu) */}
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={[
            "text-sm",
            "w-full border px-3 py-1",
            "rounded-l-md border-gray-300",
            "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
            "disabled:opacity-50 disabled:bg-gray-100",
            hasError
              ? "border-red-400 focus:border-red-500 focus:ring-red-500"
              : "",
          ].join(" ")}
        />

        {/* tombol kanan (menyatu) */}
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className={[
            "inline-flex items-center justify-center",
            "rounded-r-md border border-l-0 border-gray-300",
            "px-3 hover:bg-gray-50",
            "disabled:opacity-50",
          ].join(" ")}
          aria-label={show ? a11yHide : a11yShow}
          title={show ? a11yHide : a11yShow}
          disabled={disabled}
        >
          {show ? (
            <EyeOffIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* strength meter */}
      {strengthMeter && (
        <div id={strengthId} className="mt-1">
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={[
                  "h-1.5 rounded",
                  i < barsActive ? strengthColor(score) : "bg-gray-200",
                ].join(" ")}
              />
            ))}
          </div>
          {value && <div className="mt-1 text-xs text-gray-500">{text}</div>}
        </div>
      )}

      {hasError && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default FieldPassword;
