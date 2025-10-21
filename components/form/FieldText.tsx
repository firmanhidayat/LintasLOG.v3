"use client";
import React from "react";
import clsx from "clsx";
import { fieldClasses, FieldStyleOptions } from "@/utils/field-classes";

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
function useFieldClasses(
  disabled: boolean,
  readOnly: boolean,
  isInvalid: boolean
) {
  // const ctx = useFieldCtx();
  // // const base =
  // //   "rounded-md border-1 outline-none border-gray-600 focus:ring-1 focus:ring-primary focus:bg-primary/5 transition font-sans";
  // // const inv = ctx.isInvalid
  // //   ? "border-red-500 border-1 border-dotted focus:ring-red-500"
  // //   : "";
  // // const state = ctx.disabled
  // //   ? "bg-gray-100 text-gray-500 cursor-not-allowed !border-gray-300 !text-gray-800"
  // //   : ctx.readOnly
  // //   ? "bg-gray-50 text-gray-700"
  // //   : "bg-white text-gray-900";
  // // const size = sizeClasses[ctx.size];
  // // const cutLeft = ctx.hasPrefix ? "rounded-l-none border-l-0" : "";
  // // const cutRight = ctx.hasSuffix ? "rounded-r-none border-r-0" : "";
  // // const peerCls = ctx.layout === "floating" ? "peer" : "";
  // // return clsx(base, size, inv, state, cutLeft, cutRight, peerCls);
  const opts: FieldStyleOptions = {
    disabled: disabled,
    readOnly: readOnly,
    isInvalid: isInvalid,
    hasPrefix: false,
    hasSuffix: false,
    size: undefined,
    layout: undefined,
  };
  return fieldClasses(opts);
}
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

  const classes = useFieldClasses(disabled, disabled, isInvalid);
  // const baseClasses =
  //   "rounded-md border text-sm px-3 py-2 outline-none border-gray-300 focus-within:ring-2 focus-within:ring-primary/40";
  // const invalidClasses = isInvalid ? "border-red-400 focus:ring-red-200" : "";
  // const disabledClasses = disabled
  //   ? "bg-gray-100 text-gray-500 cursor-not-allowed"
  //   : "";

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
            // baseClasses,
            // invalidClasses,
            // disabledClasses,
            classes,
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
            // baseClasses,
            // invalidClasses,
            // disabledClasses,
            classes,
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
