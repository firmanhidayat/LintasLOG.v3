"use client";
import React, { useId } from "react";
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
  touched?: boolean; // optional
  onBlur?: () => void;
  ariaLabel?: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>; // biar support callback ref juga
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
  const id = useId();
  const errorId = `${id}-err`;
  const showError = !!error && (touched ?? true); // <- kunci: default ke true

  return (
    <div className="grid gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-600">
          {label}
        </label>
      )}

      <textarea
        id={id}
        ref={textareaRef}
        name={name}
        rows={rows}
        className={clsx(
          "rounded-md border text-sm px-3 py-2 outline-none border-gray-300 focus:ring-2 focus:ring-primary/40",
          showError && "border-red-500 focus:ring-red-200",
          disabled && "bg-slate-100 text-slate-500 cursor-not-allowed"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={showError}
        aria-describedby={showError ? errorId : undefined}
        required={required}
        disabled={disabled}
        readOnly={disabled || undefined}
      />

      {showError && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
