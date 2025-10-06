"use client";
import React from "react";
import clsx from "clsx";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholderOption?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  ariaLabel?: string;
  selectRef?: React.RefObject<HTMLSelectElement>;
};

export const FieldSelect = React.memo(function FieldSelect({
  label,
  value,
  onChange,
  options,
  placeholderOption,
  name,
  required,
  disabled = false,
  error,
  touched,
  onBlur,
  ariaLabel,
  selectRef,
}: Props) {
  const isInvalid = Boolean(touched && error);
  return (
    <div className="grid gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-600">{label}</label>
      )}
      <select
        ref={selectRef}
        name={name}
        className={clsx(
          "mt-1 block w-full rounded-md border bg-white px-3 py-1 border-gray-300  text-sm outline-none ring-0 transition focus:border-slate-400",
          disabled && "bg-slate-100 text-slate-500 cursor-not-allowed",
          isInvalid && "border-red-400 focus:ring-red-200"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        required={required}
        disabled={disabled}
      >
        {placeholderOption !== undefined && (
          <option value="" disabled>
            {placeholderOption}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {isInvalid && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
