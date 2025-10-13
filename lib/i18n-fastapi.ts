import type { Lang } from "./i18n";
import { t } from "./i18n";

type FastapiErrorItem = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

export function mapFastapi422(
  detail: FastapiErrorItem[],
  _lang: Lang
): {
  fieldErrors: Partial<Record<"email" | "password", string>>;
  generic: string[];
} {
  const fieldErrors: Partial<Record<"email" | "password", string>> = {};
  const generic: string[] = [];
  void _lang;

  for (const item of detail) {
    const lastStr = [...(item.loc ?? [])]
      .reverse()
      .find((x) => typeof x === "string");

    const isMissing = item.type?.includes("missing");
    const isMinLen = item.type?.includes("min_length");
    const isEmail = item.type?.includes("email");

    let message: string | null = null;

    if (isMissing && typeof lastStr === "string") {
      const fieldName =
        lastStr === "password" ? t("fields.password") : t("fields.email");
      message = t("errors.required", { field: fieldName });
    } else if (isMinLen && typeof lastStr === "string") {
      const min = /min_length,(\d+)/.exec(item.type || "")?.[1] ?? "4";
      const fieldName =
        lastStr === "password" ? t("fields.password") : t("fields.email");
      message = t("errors.minLength", { field: fieldName, min });
    } else if (isEmail) {
      message = t("errors.email");
    } else if (item.msg) {
      // fallback: gunakan msg dari server, atau map beberapa kode populer
      const lower = item.msg.toLowerCase();
      if (lower.includes("credential")) message = t("errors.credentials");
      else message = item.msg;
    }

    if (lastStr === "email" || lastStr === "password") {
      const prev = fieldErrors[lastStr];
      fieldErrors[lastStr] = prev
        ? `${prev}; ${message}`
        : message ?? undefined;
    } else if (message) {
      generic.push(message);
    }
  }

  return { fieldErrors, generic };
}

export function mapCommonErrors(
  kind: "network" | "format" | "http",
  arg?: number | undefined
): string {
  if (kind === "network") return t("alerts.networkError");
  if (kind === "format") return t("alerts.formatInvalid");
  if (kind === "http")
    return t("alerts.loginFailed", { status: String(arg ?? "") });
  return t("alerts.genericError");
}
