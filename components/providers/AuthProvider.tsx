"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isLoggedIn, clearAuth } from "@/lib/auth";

type TmsProfile = Record<string, unknown>;

type LoadStatus = "idle" | "loading" | "success" | "error";

type AuthContextType = {
  loggedIn: boolean;
  login: (data: {
    login: string;
    mail_verified: boolean;
    remember?: boolean;
  }) => void;
  logout: () => void;

  profile?: TmsProfile | null;
  profileStatus?: LoadStatus;
  refreshProfile?: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_URL = process.env.NEXT_PUBLIC_TMS_PROFILE_URL ?? "";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);

  const [profile, setProfile] = useState<TmsProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<LoadStatus>("idle");

  const refreshProfile = async () => {
    if (!isLoggedIn()) {
      setProfile(null);
      setProfileStatus("idle");
      return;
    }

    try {
      setProfileStatus("loading");
      const res = await fetch(PROFILE_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          // ⛔ Tidak bisa set "Cookie" header manual dari browser.
        },
        credentials: "include",
      });

      if (!res.ok) {
        setProfile(null);
        setProfileStatus("error");
        return;
      }

      const data = (await res.json()) as TmsProfile;
      setProfile(data);
      setProfileStatus("success");
      console.log(data);
    } catch {
      setProfile(null);
      setProfileStatus("error");
    }
  };

  useEffect(() => {
    const ok = isLoggedIn();
    setLoggedIn(ok);
    if (ok) {
      void refreshProfile();
    }
  }, []);

  const login = (data: {
    login: string;
    mail_verified: boolean;
    remember?: boolean;
  }) => {
    const store = data.remember ? localStorage : sessionStorage;
    store.setItem("llog.login", data.login);
    store.setItem("llog.mail_verified", String(data.mail_verified));

    setLoggedIn(true);

    void refreshProfile();
  };

  const logout = async () => {
    await clearAuth();
    setLoggedIn(false);

    setProfile(null);
    setProfileStatus("idle");
  };

  return (
    <AuthContext.Provider
      value={{
        loggedIn,
        login,
        logout,
        profile,
        profileStatus,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
