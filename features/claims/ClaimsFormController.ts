import { AbstractFormController } from "@/core/AbstractFormController";
import type { RecordItem } from "@/types/recorditem";
import { StatusStep } from "@/types/status-delivery";
// import { useEphemeralLocalStorage } from "@/hooks/useEphemeralLocalStorage";

const CLAIMS_URL_BY_PO = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL!!;
const CLAIMS_URL = process.env.NEXT_PUBLIC_TMS_CLAIMS_URL!!;
export type ClaimAttachmentItem = {
  id: number;
  name?: string;
  mimetype?: string;
  url?: string;
  full_url?: string;
  content_url?: string;
};
export type ClaimDocumentAttachment = {
  id: number;
  name?: string;
  attachments?: ClaimAttachmentItem[];
};

export type ClaimAttachmentFile = {
  id: number;
  name?: string;
  mimetype?: string;
  url?: string;
  full_url?: string;
  content_url?: string;
};
export type ClaimAttachmentGroup = {
  id: number;
  name?: string;
  attachments?: ClaimAttachmentFile[];
};
export type ClaimValues = {
  amount: number;
  description: string;
  document_attachment_id?: number | null;
};
export type ClaimErrors = Partial<Record<keyof ClaimValues, string>>;
export type ClaimPayload = {
  amount: number;
  description: string;
  document_attachment_id?: number | null;
};
export type ClaimApiResponse = {
  amount: number;
  description: string;
  document_attachment_id?: number | null;
  id?: number | string;
  name: string;
  date: string;
  purchase_order_id: number | string;
  partner_id: number | string;
  transport_order_id: number | string;
  customer_partner_id: number | string;
  state: string;
  purchase_order: RecordItem;
  partner: RecordItem;
  transport_order: RecordItem;
  customer_partner: RecordItem;
  states: StatusStep[] | null;
  document_attachment?: ClaimAttachmentGroup | null;
};

export class ClaimsFormController extends AbstractFormController<
  ClaimValues,
  ClaimErrors,
  ClaimPayload,
  ClaimApiResponse
> {
  private formMode: "create" | "edit";
  constructor(mode: "create" | "edit", initial: Partial<ClaimValues> = {}) {
    super(ClaimsFormController.mergeInitial(initial));
    this.formMode = mode;
  }
  private static defaultValues(): ClaimValues {
    return {
      amount: 0,
      description: "",
      document_attachment_id: 0,
    };
  }
  private static mergeInitial(partial: Partial<ClaimValues>): ClaimValues {
    return { ...ClaimsFormController.defaultValues(), ...partial };
  }
  protected requiredKeys(): (keyof ClaimValues)[] {
    const keys: (keyof ClaimValues)[] = ["amount", "description"];
    if (this.formMode === "create") {
      keys.push("document_attachment_id");
    }
    return keys;
  }
  protected validateCustom(values: ClaimValues): ClaimErrors {
    const e: ClaimErrors = {};
    if (!values.amount) {
      e.amount = "Required";
    }
    if (!values.description) {
      e.description = "Required";
    }
    if (this.formMode === "create" && !values.document_attachment_id) {
      e.document_attachment_id = "Required";
    }

    return e;
  }
  protected toPayload(values: ClaimValues): ClaimPayload {
    const payload: ClaimPayload = {
      amount: values.amount,
      description: values.description,
      document_attachment_id: values.document_attachment_id,
    };
    if (values.document_attachment_id) {
      payload.document_attachment_id = values.document_attachment_id;
    }
    return payload;
  }
  protected endpoint(mode: "create" | "edit", id?: string | number): string {
    const orderid = localStorage.getItem("order-id");

    console.log(mode);
    console.log(id);
    console.log(orderid);

    if (mode === "edit" && id != null) {
      return `${CLAIMS_URL}/${id}`;
    }
    return `${CLAIMS_URL_BY_PO}/${orderid}/claims`;
  }
}
