"use client";
import React from "react";
import clsx from "clsx";

type Props = {
  label?: string;
  labelClassName?: string;
  value: string;
  valueClassName?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  name?: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "date"
    | "number"
    | "password"
    | "datetime-local"
    | "time";
  autoComplete?: string;
  required?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /** NEW: gunakan ketika multiline=true */
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  ariaLabel?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;

  /** NEW: render <textarea> */
  multiline?: boolean;
  /** NEW: banyak baris untuk textarea (default 3) */
  rows?: number;
  /** OPTIONAL: batasi panjang textarea/input */
  maxLength?: number;
};

export const FieldText = React.memo(function FieldText({
  label,
  labelClassName,
  value,
  valueClassName,
  onChange,
  placeholder,
  name,
  type = "text",
  autoComplete,
  required,
  inputRef,
  textareaRef,
  error,
  touched,
  onBlur,
  onFocus,
  ariaLabel,
  disabled = false,
  min,
  max,
  step,
  inputMode,
  pattern,
  multiline = false,
  rows = 3,
  maxLength,
}: Props) {
  const isInvalid = Boolean(touched && error);

  const baseClasses =
    "rounded-md border text-sm px-3 py-2 outline-none border-gray-300 focus-within:ring-2 focus-within:ring-primary/40";
  const invalidClasses = isInvalid ? "border-red-400 focus:ring-red-200" : "";
  const disabledClasses = disabled
    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
    : "";

  return (
    <div className="grid gap-1">
      {label && (
        <label
          className={clsx("text-sm font-medium text-gray-600", labelClassName)}
        >
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          ref={textareaRef}
          name={name}
          className={clsx(
            baseClasses,
            invalidClasses,
            disabledClasses,
            valueClassName
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={isInvalid}
          aria-multiline="true"
          required={required}
          disabled={disabled}
          readOnly={disabled || undefined}
          aria-readonly={disabled || undefined}
          rows={rows}
          maxLength={maxLength}
        />
      ) : (
        <input
          ref={inputRef}
          name={name}
          type={type}
          className={clsx(
            baseClasses,
            invalidClasses,
            disabledClasses,
            valueClassName
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-label={ariaLabel}
          aria-invalid={isInvalid}
          required={required}
          disabled={disabled}
          readOnly={disabled || undefined}
          aria-readonly={disabled || undefined}
          min={min}
          max={max}
          step={step}
          inputMode={inputMode}
          pattern={pattern}
          maxLength={maxLength}
        />
      )}
      {isInvalid && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
