"use client";
import React, { createContext, useContext, useId, useMemo } from "react";
import clsx from "clsx";
import { fieldClasses, FieldStyleOptions } from "@/utils/field-classes";
import { FieldLayout, FieldSize, LabelPosition } from "@/types/inputs";

type FieldAdornmentComponent = React.ComponentType<unknown> & {
  _isFieldPrefix?: boolean;
  _isFieldSuffix?: boolean;
};

function isMarkedChild(
  child: React.ReactNode,
  mark: "_isFieldPrefix" | "_isFieldSuffix"
): boolean {
  if (!React.isValidElement(child)) return false;
  const t = child.type as unknown as FieldAdornmentComponent;
  return Boolean(t && t[mark]);
}

type CommonProps = {
  /** state */
  value: string;
  onChange: (v: string) => void;
  touched?: boolean;
  error?: string;
  description?: string;

  /** identity */
  name?: string;
  id?: string;

  /** behavior */
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;

  inputRef?: React.Ref<HTMLInputElement>;
  /** NEW: gunakan ketika multiline=true */
  textareaRef?: React.Ref<HTMLTextAreaElement>;

  /** type & extra */
  type?:
    | "text"
    | "email"
    | "tel"
    | "date"
    | "number"
    | "password"
    | "datetime-local"
    | "time";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  min?: number | string;
  max?: number | string;
  step?: number;
  maxLength?: number;

  /** textarea */
  multiline?: boolean;
  rows?: number;

  /** a11y */
  ariaLabel?: string;

  /** events */
  onBlur?: () => void;
  onFocus?: () => void;
};

type LayoutProps = {
  /** visual */
  size?: FieldSize;
  layout?: FieldLayout;
  /** alias untuk layout/label visibility */
  labelPosition?: LabelPosition;
  /** inline specifics */
  labelAlign?: "left" | "right";
  labelNoWrap?: boolean;
  labelWidthClassName?: string;
};

type FieldRootProps = CommonProps &
  LayoutProps & {
    /** container class */
    className?: string;
    /** jika ingin set placeholder default di Input/Textarea */
    placeholder?: string;
    /** children compound */
    children: React.ReactNode;
  };

/** ===== Context ===== */
type CoreState = {
  // ids
  inputId: string;
  descId: string;
  errId: string;

  inputRef?: React.Ref<HTMLInputElement>;
  textareaRef?: React.Ref<HTMLTextAreaElement>;

  // common state
  value: string;
  onChange: (v: string) => void;
  touched?: boolean;
  error?: string;
  description?: string;
  isInvalid: boolean;

  // identity/behavior
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;

  // input config
  type: NonNullable<CommonProps["type"]>;
  inputMode?: CommonProps["inputMode"];
  pattern?: string;
  min?: number | string;
  max?: number | string;
  step?: number;
  maxLength?: number;
  placeholder?: string;

  // textarea config
  multiline?: boolean;
  rows?: number;

  // a11y
  ariaLabel?: string;
  onBlur?: () => void;
  onFocus?: () => void;

  // visual/layout
  size: FieldSize;
  layout: FieldLayout;
  labelAlign: "left" | "right";
  labelNoWrap?: boolean;
  labelSR?: boolean; // sr-only
  labelWidthClassName: string;

  // control meta (dari Field.Control)
  hasPrefix?: boolean;
  hasSuffix?: boolean;
};

const FieldContext = createContext<CoreState | null>(null);
const useFieldCtx = () => {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error("Field.* must be used inside <Field.Root>");
  return ctx;
};

/** ===== Helpers ===== */
const sizeClasses: Record<FieldSize, string> = {
  sm: "text-sm px-2 py-1",
  md: "text-base px-3 py-2",
  lg: "text-base px-4 py-3",
};

const addonSizeClasses: Record<FieldSize, string> = {
  sm: "text-sm px-2",
  md: "text-base px-3",
  lg: "text-base px-4",
};

/** ===== Root ===== */
function Root({
  // common
  value,
  onChange,
  inputRef,
  textareaRef,
  touched,
  error,
  description,
  name,
  id,
  disabled = false,
  readOnly = false,
  required = false,
  autoComplete,
  autoFocus,
  type = "text",
  inputMode,
  pattern,
  min,
  max,
  step,
  maxLength,
  multiline = false,
  rows = 3,
  ariaLabel,
  onBlur,
  onFocus,
  placeholder,

  // layout
  size = "md",
  layout = "stack",
  labelPosition,
  labelAlign = "left",
  labelNoWrap,
  labelWidthClassName = "w-36",

  // container
  className,
  children,
}: FieldRootProps) {
  const uid = useId();
  const inputId = id ?? `${name ?? "fi"}-${uid}`;
  const descId = `${inputId}-desc`;
  const errId = `${inputId}-err`;

  // alias mapping
  const effLayout: FieldLayout =
    labelPosition === "left"
      ? "inline"
      : labelPosition === "sr-only" || labelPosition === "top"
      ? "stack"
      : layout;

  const labelSR = labelPosition === "sr-only";

  const isInvalid = Boolean(touched && error);

  const valueCtx = useMemo<CoreState>(
    () => ({
      inputId,
      descId,
      errId,

      inputRef,
      textareaRef,

      value,
      onChange,
      touched,
      error,
      description,
      isInvalid,

      name,
      disabled,
      readOnly,
      required,
      autoComplete,
      autoFocus,

      type,
      inputMode,
      pattern,
      min,
      max,
      step,
      maxLength,
      placeholder,

      multiline,
      rows,

      ariaLabel,
      onBlur,
      onFocus,

      size,
      layout: effLayout,
      labelAlign,
      labelNoWrap,
      labelSR,
      labelWidthClassName,
    }),
    [
      inputId,
      descId,
      errId,
      value,
      onChange,
      touched,
      error,
      description,
      isInvalid,
      name,
      disabled,
      readOnly,
      required,
      autoComplete,
      autoFocus,
      type,
      inputMode,
      pattern,
      min,
      max,
      step,
      maxLength,
      placeholder,
      multiline,
      rows,
      ariaLabel,
      onBlur,
      onFocus,
      size,
      effLayout,
      labelAlign,
      labelNoWrap,
      labelSR,
      labelWidthClassName,
    ]
  );

  const wrapperClass = clsx(
    "grid gap-y-1",
    effLayout === "inline" &&
      "grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3",
    className
  );

  return (
    <FieldContext.Provider value={valueCtx}>
      <div className={wrapperClass}>{children}</div>
    </FieldContext.Provider>
  );
}

/** ===== Label ===== */
type LabelProps = React.ComponentPropsWithoutRef<"label"> & {
  children?: React.ReactNode;
};
function Label({ className, children, ...rest }: LabelProps) {
  const ctx = useFieldCtx();
  const isInline = ctx.layout === "inline";
  const isFloating = ctx.layout === "floating";

  // floating label diposisikan absolutely oleh Field.Control (di dalam control area)
  if (isFloating) {
    return (
      <label
        htmlFor={ctx.inputId}
        className={clsx(
          "pointer-events-none absolute",
          ctx.hasPrefix ? "left-12" : "left-3",
          "top-2 z-10 origin-[0] transform transition-all text-gray-500",
          // default scale/posisi
          "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100",
          // saat fokus/ada value
          "peer-focus:-translate-y-3 peer-focus:scale-90",
          // "peer-not-placeholder-shown:-translate-y-3 peer-not-placeholder-shown:scale-90",
          "peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-90",
          className
        )}
        {...rest}
      >
        {children}
        {ctx.required ? <span className="text-red-500"> *</span> : null}
      </label>
    );
  }

  return (
    <label
      htmlFor={ctx.inputId}
      className={clsx(
        "text-gray-600 font-semibold text-sm md:text-sm lg:text-sm",
        ctx.labelNoWrap ? "whitespace-nowrap" : "",
        ctx.labelSR ? "sr-only" : "",
        ctx.labelAlign === "right" ? "text-right" : "",
        isInline ? ctx.labelWidthClassName : "mt-2",
        className
      )}
      {...rest}
    >
      {children}
      {ctx.required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

/** ===== Description ===== */
type DescProps = React.ComponentPropsWithoutRef<"p">;
function Description({ className, ...rest }: DescProps) {
  const ctx = useFieldCtx();
  if (!ctx.description || ctx.isInvalid) return null;
  return (
    <p
      id={ctx.descId}
      className={clsx("mt-1 text-xs text-gray-500", className)}
      {...rest}
    >
      {ctx.description}
    </p>
  );
}

/** ===== Error ===== */
type ErrorProps = React.ComponentPropsWithoutRef<"p">;
function ErrorText({ className, ...rest }: ErrorProps) {
  const ctx = useFieldCtx();
  if (!ctx.isInvalid) return null;
  return (
    <p
      id={ctx.errId}
      role="alert"
      aria-live="polite"
      className={clsx("mt-1 text-xs text-red-600 italic", className)}
      {...rest}
    >
      {ctx.error}
    </p>
  );
}

/** ===== Control (container yang menyatukan prefix/input/suffix) ===== */
type ControlProps = React.ComponentPropsWithoutRef<"div"> & {
  /** override: jadikan block min-w-0 untuk inline */
  fluid?: boolean;
};
function Control({ className, fluid = true, children, ...rest }: ControlProps) {
  const ctx = useFieldCtx();
  const childArr = React.Children.toArray(children);
  const hasPrefix = childArr.some((c) => isMarkedChild(c, "_isFieldPrefix"));
  const hasSuffix = childArr.some((c) => isMarkedChild(c, "_isFieldSuffix"));

  // injeksikan meta ke context untuk Input/Textarea
  //const patchedCtx = { ...ctx, hasPrefix, hasSuffix };
  const patchedCtx = React.useMemo(
    () => ({ ...ctx, hasPrefix, hasSuffix }),
    [ctx, hasPrefix, hasSuffix]
  );

  const base = (
    <FieldContext.Provider value={patchedCtx}>
      <div
        className={clsx(
          (hasPrefix || hasSuffix) && "flex items-stretch",
          ctx.layout === "floating" && "relative",
          fluid && ctx.layout === "inline" && "min-w-0",
          className
        )}
        {...rest}
      >
        {children}
      </div>
    </FieldContext.Provider>
  );

  return base;
}

/** ===== Prefix & Suffix (adornment) ===== */
type AdornProps = React.ComponentPropsWithoutRef<"span">;
function Prefix({ className, ...rest }: AdornProps) {
  const ctx = useFieldCtx();
  const cls = clsx(
    "inline-flex items-center border border-gray-300 rounded-l-md border-r-0",
    ctx.isInvalid && "border-red-400",
    ctx.disabled ? "bg-gray-100 text-gray-500" : "bg-gray-50 text-gray-700",
    addonSizeClasses[ctx.size],
    className
  );
  return <span className={cls} {...rest} />;
}
// (Prefix as any)._isFieldPrefix = true;
(Prefix as unknown as FieldAdornmentComponent)._isFieldPrefix = true;

function Suffix({ className, ...rest }: AdornProps) {
  const ctx = useFieldCtx();
  const cls = clsx(
    "inline-flex items-center border border-gray-600 rounded-r-md border-l-0",
    // "inline-flex items-center border border-gray-300 rounded-r-md border-l-0",
    ctx.isInvalid && "border-red-400",
    ctx.disabled ? "bg-gray-100 text-gray-500" : "bg-gray-50 text-gray-700",
    addonSizeClasses[ctx.size],
    className
  );
  return <span className={cls} {...rest} />;
}
// (Suffix as any)._isFieldSuffix = true;
(Suffix as unknown as FieldAdornmentComponent)._isFieldSuffix = true;

/** ===== Base Input classes (dipakai Input/Textarea) ===== */
function useFieldClasses() {
  const ctx = useFieldCtx();
  const opts: FieldStyleOptions = {
    disabled: ctx.disabled,
    readOnly: ctx.readOnly,
    isInvalid: ctx.isInvalid,
    hasPrefix: ctx.hasPrefix,
    hasSuffix: ctx.hasSuffix,
    size: ctx.size,
    layout: ctx.layout,
  };
  // return fieldClasses(opts);
  return clsx(fieldClasses(opts), ctx.layout === "floating" && "peer");
}

/** ===== Input ===== */
type InputProps = React.ComponentPropsWithoutRef<"input">;
function Input({ className, placeholder, ...rest }: InputProps) {
  const ctx = useFieldCtx();
  const classes = useFieldClasses();

  return (
    <input
      ref={ctx.inputRef}
      id={ctx.inputId}
      name={ctx.name}
      type={ctx.type}
      value={ctx.value}
      onChange={(e) => ctx.onChange((e.target as HTMLInputElement).value)}
      onBlur={ctx.onBlur}
      onFocus={ctx.onFocus}
      autoComplete={ctx.autoComplete}
      autoFocus={ctx.autoFocus}
      required={ctx.required}
      disabled={ctx.disabled}
      readOnly={ctx.readOnly}
      inputMode={ctx.inputMode}
      pattern={ctx.pattern}
      min={ctx.min}
      max={ctx.max}
      step={ctx.step}
      maxLength={ctx.maxLength}
      aria-label={ctx.ariaLabel || ctx.name}
      aria-invalid={ctx.isInvalid || undefined}
      aria-required={ctx.required || undefined}
      aria-describedby={
        [
          ctx.description && !ctx.isInvalid ? ctx.descId : null,
          ctx.isInvalid ? ctx.errId : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined
      }
      aria-readonly={ctx.readOnly || undefined}
      aria-disabled={ctx.disabled || undefined}
      placeholder={
        ctx.layout === "floating" ? " " : placeholder ?? ctx.placeholder
      }
      className={clsx(classes, className)}
      {...rest}
    />
  );
}

/** ===== Textarea ===== */
type TextareaProps = React.ComponentPropsWithoutRef<"textarea">;
function Textarea({ className, placeholder, ...rest }: TextareaProps) {
  const ctx = useFieldCtx();
  const classes = useFieldClasses();

  return (
    <textarea
      ref={ctx.textareaRef}
      id={ctx.inputId}
      name={ctx.name}
      value={ctx.value}
      onChange={(e) => ctx.onChange((e.target as HTMLTextAreaElement).value)}
      onBlur={ctx.onBlur}
      onFocus={ctx.onFocus}
      required={ctx.required}
      disabled={ctx.disabled}
      readOnly={ctx.readOnly}
      rows={ctx.rows ?? 3}
      maxLength={ctx.maxLength}
      aria-label={ctx.ariaLabel || ctx.name}
      aria-invalid={ctx.isInvalid || undefined}
      aria-required={ctx.required || undefined}
      aria-describedby={
        [
          ctx.description && !ctx.isInvalid ? ctx.descId : null,
          ctx.isInvalid ? ctx.errId : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined
      }
      aria-readonly={ctx.readOnly || undefined}
      aria-disabled={ctx.disabled || undefined}
      placeholder={
        ctx.layout === "floating" ? " " : placeholder ?? ctx.placeholder
      }
      className={clsx(classes, className)}
      {...rest}
    />
  );
}

/** ===== Switch / CheckBox ===== */
export function FieldSwitch({
  checked,
  onCheckedChange,
  ...rest
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
} & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      {...rest}
      className="inline-flex h-6 w-11 items-center rounded-full border px-0.5"
    >
      <span
        className={`h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/** ===== Namespace export ===== */
export const Field = {
  Root,
  Label,
  Control,
  Input,
  Textarea,
  Switch: FieldSwitch,
  Prefix,
  Suffix,
  Description,
  Error: ErrorText,
};

// /** ====== Usage Examples ======
// --------------------------------

// 1) Stack (default), helper & error:
// --------------------------------
// <Field.Root
//   name="email"
//   value={email}
//   onChange={setEmail}
//   type="email"
//   description="Kami tidak akan membagikan email Anda."
//   error={errors.email}
//   touched={touched.email}
// >
//   <Field.Label>Email</Field.Label>
//   <div>
//     <Field.Control>
//       <Field.Input placeholder="nama@domain.com" />
//     </Field.Control>
//     <Field.Description />
//     <Field.Error />
//   </div>
// </Field.Root>

// --------------------------------
// 2) Inline label kiri, no-wrap & right-align:
// --------------------------------
// <Field.Root
//   name="phone"
//   value={phone}
//   onChange={setPhone}
//   labelPosition="left"
//   labelAlign="right"
//   labelNoWrap
//   labelWidthClassName="w-40 md:w-48"
// >
//   <Field.Label>Phone</Field.Label>
//   <div>
//     <Field.Control>
//       <Field.Input type="tel" />
//     </Field.Control>
//   </div>
// </Field.Root>

// --------------------------------
// 3) Floating label + prefix/suffix:
// --------------------------------
// <Field.Root
//   name="amount"
//   value={amount}
//   onChange={setAmount}
//   layout="floating"
//   size="md"
//   type="number"
// >
//   <div className="col-span-2"> {/* label di-floating dalam Control */}
//     <Field.Control>
//       <Field.Label>Amount</Field.Label>
//       <Field.Prefix>Rp</Field.Prefix>
//       <Field.Input />
//       <Field.Suffix>.00</Field.Suffix>
//     </Field.Control>
//     <Field.Description />
//     <Field.Error />
//   </div>
// </Field.Root>

// --------------------------------
// 4) Textarea stack:
// --------------------------------
// <Field.Root
//   name="notes"
//   value={notes}
//   onChange={setNotes}
//   multiline
//   rows={4}
//   description="Maksimal 250 karakter."
//   maxLength={250}
// >
//   <Field.Label>Notes</Field.Label>
//   <div>
//     <Field.Control>
//       <Field.Textarea />
//     </Field.Control>
//     <Field.Description />
//   </div>
// </Field.Root>

// --------------------------------
// 5) Label sr-only (a11y tapi hemat ruang):
// --------------------------------
// <Field.Root
//   name="search"
//   value={q}
//   onChange={setQ}
//   labelPosition="sr-only"
// >
//   <Field.Label>Search</Field.Label>
//   <div>
//     <Field.Control>
//       <Field.Prefix>
//         <span className="material-symbols-outlined">search</span>
//       </Field.Prefix>
//       <Field.Input placeholder="Cari…" />
//     </Field.Control>
//   </div>
// </Field.Root>

// */
