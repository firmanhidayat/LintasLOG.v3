"use client";
import React from "react";
import clsx from "clsx";

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  name?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  ariaLabel?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
};

export const FieldTextarea = React.memo(function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  name,
  rows = 4,
  required,
  disabled = false,
  error,
  touched,
  onBlur,
  ariaLabel,
  textareaRef,
}: Props) {
  const isInvalid = Boolean(touched && error);
  return (
    <div className="grid gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-600">{label}</label>
      )}
      <textarea
        ref={textareaRef}
        name={name}
        rows={rows}
        className={clsx(
          "rounded-md border text-sm px-3 py-2 outline-none  border-gray-300 focus-within:ring-2 focus-within:ring-primary/40 ",
          disabled && "bg-slate-100 text-slate-500 cursor-not-allowed",
          isInvalid && "border-red-400 focus:ring-red-200"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        required={required}
        disabled={disabled}
        readOnly={disabled || undefined}
      />
      {isInvalid && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
