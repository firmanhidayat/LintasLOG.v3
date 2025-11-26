import { AbstractFormController } from "@/core/AbstractFormController";
import { StatusStep } from "@/types/status-delivery";

const VENDOR_BILL_URL = process.env.NEXT_PUBLIC_TMS_INV_BILL_URL!!;
export type BillsAttachmentItem = {
  id: number;
  name?: string;
  mimetype?: string;
  url?: string;
  full_url?: string;
  content_url?: string;
};
export type BillsDocumentAttachment = {
  id: number;
  name?: string;
  attachments?: BillsAttachmentItem[];
};

export type BillsAttachmentFile = {
  id: number;
  name?: string;
  mimetype?: string;
  url?: string;
  full_url?: string;
  content_url?: string;
};
export type BillsAttachmentGroup = {
  id: number;
  name?: string;
  attachments?: BillsAttachmentFile[];
};
export type BillsValues = {
  ref: string;
  document_attachment_id?: number | null;
};
export type BillsErrors = Partial<Record<keyof BillsValues, string>>;
export type BillsPayload = {
  ref: string;
  document_attachment_id?: number | null;
};
export type BillsApiResponse = {
  name: string;
  move_type: string;
  invoice_date: string;
  invoice_date_due: string;
  ref: string;
  invoice_origin: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  state: string;
  payment_state: string;
  document_attachment_id: number;
  states: StatusStep[] | null;
  payment_states: StatusStep[] | null;
  document_attachment: BillsAttachmentGroup | null;
};

export class VendorBillFormController extends AbstractFormController<
  BillsValues,
  BillsErrors,
  BillsPayload,
  BillsApiResponse
> {
  private formMode: "edit";
  constructor(mode: "edit", initial: Partial<BillsValues> = {}) {
    super(VendorBillFormController.mergeInitial(initial));
    this.formMode = mode;
  }
  private static defaultValues(): BillsValues {
    return {
      ref: "",
      document_attachment_id: 0,
    };
  }

  private static mergeInitial(partial: Partial<BillsValues>): BillsValues {
    return { ...VendorBillFormController.defaultValues(), ...partial };
  }

  protected requiredKeys(): (keyof BillsValues)[] {
    const keys: (keyof BillsValues)[] = ["ref"];
        if (this.formMode === "edit") {
          keys.push("document_attachment_id");
        }
        return keys;
  }
  protected validateCustom(
    values: BillsValues
  ): BillsErrors {
     const e: BillsErrors = {};
        if (!values.ref) {
          e.ref = "Required";
        }
        if (this.formMode === "edit" && !values.document_attachment_id) {
          e.document_attachment_id = "Required";
        }
    
        return e;
  }
  protected toPayload(values: BillsValues): BillsPayload {
    const payload: BillsPayload = {
          ref: values.ref,
          document_attachment_id: values.document_attachment_id,
        };
        if (values.document_attachment_id) {
          payload.document_attachment_id = values.document_attachment_id;
        }
        return payload;
  }
  protected endpoint(mode: "edit", id?: string | number): string {
    console.log(mode);
    console.log(id);
    if (mode === "edit" && id != null) {
      return `${VENDOR_BILL_URL}/${id}`;
    }
    return `${VENDOR_BILL_URL}`;
  }
}
