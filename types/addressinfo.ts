export type AddressInfo = {
  name: string;
  street1?: string;
  street2?: string;
  districtLine?: string;
  extraLine?: string;
  province?: string;
  postcode?: string | number;
  country?: string;
  mobile?: string;
  email?: string;
  lat?: string | number;
  lng?: string | number;
  mapDescription?: string;
  // Optional fields for pair layout (pickup/drop-off)
  picName?: string;
  picPhone?: string;
  timeLabel?: string; // ETD/ETA label
  timeValue?: string; // e.g., 2025-10-02T09:10
};

export type AddressPayload = {
  name: string;
  street: string;
  street2?: string;
  district_id: number | string;
  zip?: string;
  email?: string;
  mobile?: string;
  latitude?: number;
  longitude?: number;
  /** formatted address dari Google (opsional, non-breaking) */
  map_description?: string;
};
