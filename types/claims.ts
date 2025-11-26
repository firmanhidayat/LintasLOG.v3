export interface ClaimItem {
  id: number;
  name: string;
  amount: number;
  description: string;
  date: string;
  state: string;
  purchase_order_id: number;
  partner_id: number;
  transport_order_id: number;
  customer_partner_id: number;
  document_attachment_id: number;
  purchase_order: {
    id: number;
    name: string;
  };
  partner: {
    id: number;
    name: string;
  };
  transport_order: {
    id: number;
    name: string;
  };
  customer_partner: {
    id: number;
    name: string;
  };
  states: Array<{
    key: string;
    label: string;
    is_current: boolean;
  }>;
  document_attachment: {
    id: number;
    name: string;
    doc_type: string;
    attachments: Array<{
      id: number;
      name: string;
      mimetype: string;
      res_model: string;
      res_id: number;
      access_token: string;
      url: string;
    }>;
  };
}

export interface ClaimsResponse {
  count: number;
  items: ClaimItem[];
  total: number;
}

export interface Attachment {
  id: number;
  name: string;
  mimetype: string;
  res_model: string;
  res_id: number;
  access_token: string;
  url: string;
}

export interface DocumentAttachment {
  id: number;
  name: string;
  doc_type: string;
  attachments: Attachment[];
}

export interface ClaimItem {
  id: number;
  name: string;
  amount: number;
  description: string;
  date: string;
  state: string;
  purchase_order_id: number;
  partner_id: number;
  transport_order_id: number;
  customer_partner_id: number;
  document_attachment_id: number;
  purchase_order: {
    id: number;
    name: string;
  };
  partner: {
    id: number;
    name: string;
  };
  transport_order: {
    id: number;
    name: string;
  };
  customer_partner: {
    id: number;
    name: string;
  };
  states: Array<{
    key: string;
    label: string;
    is_current: boolean;
  }>;
  document_attachment: DocumentAttachment;
}