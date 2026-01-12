import { RecordItem } from "./recorditem";
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
  street?: string;
  street2?: string;
  zip?: string;
  district_id?: number;
  no_ktp?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  vat: string;
  tz: string;
  shipper_transporter_document_attachment_id: number;
  shipper_transporter_document_attachment: ProfileDocumentAttachmentGroup;
  tms_user_type: string;
  transporter_verified: boolean;
  avatar_url?: string;
  transporter_document_upload_instruction?: string;
  has_deliver_telco_medicaldevice_dangergoods: boolean;
  delivered_telco_medicaldevice_dangergoods:string;
  district: RecordItem | null;
  image_128?: string;
  image_1920?: string;
  transporter_coverage_area_ids?: number[]; // Array of location/states IDs
  desired_delivery_category_ids?: number[]; // Array of users/categories parent_type === desired_delivery IDs
  desired_industry_category_ids?: number[]; // Array of users/categories parent_type === desired_delivery_industry IDs
  certification_category_ids?: number[]; // Array of users/categories parent_type === certification IDs
  transporter_coverage_area?: RecordItem[];
  desired_delivery_category?: RecordItem[];
  desired_industry_category?: RecordItem[];
  certification_category?: RecordItem[];
};
export type TmsProfile = Readonly<TmsProfileCore & Record<string, unknown>>;
export type TmsUserType = "shipper" | "transporter";