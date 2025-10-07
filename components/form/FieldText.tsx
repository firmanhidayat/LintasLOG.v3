"use client";
import React from "react";
import clsx from "clsx";

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  name?: string;
  type?: "text" | "email" | "tel" | "date" | "number" | "password";
  autoComplete?: string;
  required?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  onFocus?: () => void; // <-- NEW
  ariaLabel?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
};

export const FieldText = React.memo(function FieldText({
  label,
  value,
  onChange,
  placeholder,
  name,
  type = "text",
  autoComplete,
  required,
  inputRef,
  error,
  touched,
  onBlur,
  onFocus, // <-- NEW
  ariaLabel,
  disabled = false,
  min,
  max,
  step,
  inputMode,
  pattern,
}: Props) {
  const isInvalid = Boolean(touched && error);
  return (
    <div className="grid gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-600">{label}</label>
      )}
      <input
        ref={inputRef}
        name={name}
        type={type}
        className={clsx(
          "rounded-md border text-sm px-3 py-1 outline-none border-gray-300 focus-within:ring-2 focus-within:ring-primary/40 ",
          isInvalid && "border-red-400 focus:ring-red-200"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus} // <-- NEW
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
      />
      {isInvalid && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

// "use client";
// import React from "react";
// import clsx from "clsx";

// type Props = {
//   label?: string;
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   name?: string;
//   type?: "text" | "email" | "tel" | "date";
//   autoComplete?: string;
//   required?: boolean;
//   inputRef?: React.Ref<HTMLInputElement>;
//   error?: string;
//   touched?: boolean;
//   onBlur?: () => void;
//   ariaLabel?: string;
//   disabled?: boolean;
// };

// export const FieldText = React.memo(function FieldText({
//   label,
//   value,
//   onChange,
//   placeholder,
//   name,
//   type = "text",
//   autoComplete,
//   required,
//   inputRef,
//   error,
//   touched,
//   onBlur,
//   ariaLabel,
//   disabled = false,
// }: Props) {
//   const isInvalid = Boolean(touched && error);
//   return (
//     <div className="grid gap-1">
//       {label && (
//         <label className="text-sm font-medium text-gray-600">{label}</label>
//       )}
//       <input
//         ref={inputRef}
//         name={name}
//         type={type}
//         className={clsx(
//           "rounded-md border text-sm px-3 py-1 outline-none border-gray-300 focus-within:ring-2 focus-within:ring-primary/40 ",
//           isInvalid && "border-red-400 focus:ring-red-200"
//         )}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         onBlur={onBlur}
//         placeholder={placeholder}
//         autoComplete={autoComplete}
//         aria-label={ariaLabel}
//         aria-invalid={isInvalid}
//         required={required}
//         disabled={disabled}
//         readOnly={disabled || undefined}
//         aria-readonly={disabled || undefined}
//       />
//       {isInvalid && <p className="text-xs text-red-600">{error}</p>}
//     </div>
//   );
// });
