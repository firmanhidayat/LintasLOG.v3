// core/forms/AbstractFormController.ts
export type ErrorMap<T> = Partial<Record<keyof T, string>>;

export type FormSnapshot<TValues, TErrors extends ErrorMap<TValues>> = {
  values: TValues;
  errors: TErrors;
  touched: Partial<Record<keyof TValues, boolean>>;
  canSubmit: boolean;
};

// ==== Utilities: lint-safe ====
function keyIn<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}
function hasAnyError<T extends object>(
  errs: Partial<Record<keyof T, string>>
): boolean {
  for (const k of Object.keys(errs) as Array<keyof T>) {
    if (errs[k]) return true;
  }
  return false;
}
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
type ApiDetail = { loc?: Array<string | number>; msg?: string; type?: string };
function isApiDetail(x: unknown): x is ApiDetail {
  return (
    isObj(x) && ("loc" in x ? Array.isArray((x as { loc: unknown }).loc) : true)
  );
}
type ParsedApiError = { details?: ApiDetail[]; message?: string };

/** Parse error JSON dari plain text tanpa `any` dan dengan guard `unknown` */
function parseApiErrorFromText(text: string): ParsedApiError {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  if (!isObj(raw)) return {};
  const r = raw as Record<string, unknown>;

  const details: ApiDetail[] | undefined = Array.isArray(r.detail)
    ? (r.detail as unknown[]).filter(isApiDetail)
    : undefined;

  let message: string | undefined;
  if (typeof r.message === "string") message = r.message;
  else if (typeof r.detail === "string") message = r.detail;
  else message = undefined;

  return { details, message };
}

// JSON value guards (untuk typed return yang aman)
type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | { [k: string]: JsonValue }
  | JsonValue[];
function isJsonValue(x: unknown): x is JsonValue {
  if (x === null) return true;
  const t = typeof x;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (t === "object") {
    if (Array.isArray(x)) return x.every(isJsonValue);
    const obj = x as Record<string, unknown>;
    for (const k in obj) {
      if (!isJsonValue(obj[k])) return false;
    }
    return true;
  }
  return false;
}

export abstract class AbstractFormController<
  TValues extends Record<string, unknown>,
  TErrors extends ErrorMap<TValues>,
  TPayload,
  TResult = JsonValue | null
> {
  protected values: TValues;
  protected errors: TErrors;
  protected touched: Partial<Record<keyof TValues, boolean>> = {};
  private listeners = new Set<() => void>();

  constructor(initial: TValues) {
    this.values = { ...initial };
    this.errors = {} as TErrors;
  }

  // ==== Harus diimplementasikan subclass ====
  protected abstract requiredKeys(): (keyof TValues)[];
  protected abstract validateCustom(values: TValues): TErrors;
  protected abstract toPayload(values: TValues): TPayload;
  protected abstract endpoint(
    mode: "create" | "edit",
    id?: string | number
  ): string;

  protected requestInit(
    payload: TPayload,
    mode: "create" | "edit"
  ): RequestInit {
    return {
      method: mode === "edit" ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    };
  }

  // ==== State helpers ====
  get<K extends keyof TValues>(k: K): TValues[K] {
    return this.values[k];
  }
  set<K extends keyof TValues>(k: K, v: TValues[K]) {
    this.values = { ...this.values, [k]: v };
    this.emit();
  }
  setMany(patch: Partial<TValues>) {
    this.values = { ...this.values, ...patch };
    this.emit();
  }
  touch<K extends keyof TValues>(k: K) {
    this.touched = { ...this.touched, [k]: true };
    this.emit();
  }
  setError<K extends keyof TValues>(k: K, msg?: string) {
    const base: ErrorMap<TValues> = { ...(this.errors as ErrorMap<TValues>) };
    if (msg === undefined) delete base[k];
    else base[k] = msg;
    this.errors = base as TErrors;
    this.emit();
  }
  clearErrors() {
    this.errors = {} as TErrors;
    this.emit();
  }

  // ==== Validasi ====
  validate(): TErrors {
    const reqErrs: ErrorMap<TValues> = {};
    for (const k of this.requiredKeys()) {
      const v = this.values[k];
      const empty =
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim() === "");
      if (empty) reqErrs[k] = reqErrs[k] ?? "Required";
    }
    const custom = this.validateCustom(this.values) || ({} as TErrors);
    const merged = { ...reqErrs, ...custom } as TErrors;
    this.errors = merged;
    this.emit();
    return merged;
  }

  get canSubmit(): boolean {
    const custom = this.validateCustom(this.values) || ({} as TErrors);
    const hasMissing = this.requiredKeys().some((k) => {
      const v = this.values[k];
      return (
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim() === "")
      );
    });
    return !hasMissing && !hasAnyError<TValues>(custom as ErrorMap<TValues>);
  }

  // ==== Submit ====
  async submit(
    mode: "create" | "edit",
    id?: string | number
  ): Promise<TResult> {
    const merged = this.validate();
    if (hasAnyError<TValues>(merged as ErrorMap<TValues>))
      throw new Error("VALIDATION_ERROR");

    const payload = this.toPayload(this.values);
    const res = await fetch(
      this.endpoint(mode, id),
      this.requestInit(payload, mode)
    );
    if (!res.ok) {
      let msg = `Request failed: ${res.status}`;
      try {
        const parsed = parseApiErrorFromText(await res.text());
        if (parsed.details && parsed.details.length > 0) {
          for (const d of parsed.details) {
            const last =
              d.loc && d.loc.length ? d.loc[d.loc.length - 1] : undefined;
            if (
              (typeof last === "string" || typeof last === "number") &&
              keyIn(this.values, last)
            ) {
              this.setError(last, d.msg || "Invalid");
            }
          }
          msg = parsed.details[0]?.msg || msg;
        } else if (parsed.message) {
          msg = parsed.message;
        }
      } catch {
        // ignore parse error
      }
      throw new Error(msg);
    }

    const text = await res.text();
    if (!text) return null as TResult;
    try {
      const parsed = JSON.parse(text);
      if (isJsonValue(parsed)) {
        return parsed as TResult;
      }
      return null as TResult;
    } catch {
      return null as TResult;
    }
  }

  // ==== Subscription ====
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  protected emit() {
    for (const fn of this.listeners) fn();
  }
  snapshot(): FormSnapshot<TValues, TErrors> {
    return {
      values: this.values,
      errors: this.errors,
      touched: this.touched,
      canSubmit: this.canSubmit,
    };
  }
}
