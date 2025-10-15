export type SectionKey =
  | "dashboard"
  | "orders"
  | "claims"
  | "finance"
  | "downpayment"
  | "vendorbill";

export type OpenMap = Record<SectionKey, boolean>;
