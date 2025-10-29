import { Role } from "@/components/providers/AuthProvider";

export type TmsProfileCore = {
  id?: string;

  login?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;

  avatar_url?: string;
  image?: string;
  photo?: string;

  tz: string;
  vat: string;

  roles?: readonly string[];
  groups?: readonly string[];
  user_groups?: readonly string[];
  tms_user_type: Role;
};

export type TmsProfile = Readonly<TmsProfileCore & Record<string, unknown>>;
