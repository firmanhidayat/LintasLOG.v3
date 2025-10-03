export type TmsProfileCore = {
  id?: string;

  login?: string;
  name?: string;
  full_name?: string;
  username?: string;

  email?: string;
  user_email?: string;
  mail?: string;
  mail_verified?: boolean;

  phone?: string;
  mobile?: string;
  tel?: string;

  avatar_url?: string;
  image?: string;
  photo?: string;

  roles?: readonly string[];
  groups?: readonly string[];
  user_groups?: readonly string[];
};

export type TmsProfile = Readonly<TmsProfileCore & Record<string, unknown>>;
