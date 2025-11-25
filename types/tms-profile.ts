import { Role } from "@/components/providers/AuthProvider";
export type ProfileDocType = "shipper_transporter_document";
export type ProfileDocumentAttachmentGroup = {
  id: number;
  name: string;
  doc_type: ProfileDocType;
  attachments?: DocumentAttachment[];
};
type DocumentAttachment = {
  id: number;
  name: string;
  mimetype: string;
  res_model: string;
  res_id: number;
  access_token: string;
  url: string;
};
export type TmsProfileCore = {
  id?: string;
  // login?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  vat: string;
  tz: string;
  shipper_transporter_document_attachment_id: number;
  shipper_transporter_document_attachment: ProfileDocumentAttachmentGroup;
  tms_user_type: string;
  avatar_url?: string;
  // image?: string;
  // photo?: string;
  // roles?: readonly string[];
  // groups?: readonly string[];
  // user_groups?: readonly string[];
};
export type TmsProfile = Readonly<TmsProfileCore & Record<string, unknown>>;
export type TmsUserType = "shipper" | "transporter";