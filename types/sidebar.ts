export type SectionKey =
  | "dashboard"
  | "orders"
  | "claims"
  | "finance"
  | "downpayment"
  | "vendorbill"
  | "fleetndriver";

export type OpenMap = Record<SectionKey, boolean>;
