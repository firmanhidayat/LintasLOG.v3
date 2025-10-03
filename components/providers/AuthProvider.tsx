"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { isLoggedIn, clearAuth } from "@/lib/auth";
import type { TmsProfile } from "@/types/tms-profile";

// type TmsProfile = {
//   email?: string;
//   name?: string;
//   roles?: string[];
//   [k: string]: unknown;
// };

type LoadStatus = "idle" | "loading" | "success" | "error";

type AuthContextType = {
  loggedIn: boolean;
  login: (data: {
    login: string;
    mail_verified: boolean;
    remember?: boolean;
  }) => void;
  logout: () => Promise<void>;
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

  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const ok = isLoggedIn();
    setLoggedIn(ok);
    if (ok) void refreshProfile();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshProfile = async () => {
    if (!isLoggedIn()) {
      setProfile(null);
      setProfileStatus("idle");
      return;
    }
    if (!PROFILE_URL) {
      console.warn("[Auth] PROFILE_URL kosong");
      setProfileStatus("error");
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const ac = new AbortController();
    try {
      setProfileStatus("loading");
      const res = await fetch(PROFILE_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
        signal: ac.signal,
      });

      if (res.status === 401 || res.status === 403) {
        await clearAuth();
        if (!mountedRef.current) return;
        setLoggedIn(false);
        setProfile(null);
        setProfileStatus("idle");
        return;
      }

      if (!res.ok) {
        if (!mountedRef.current) return;
        setProfile(null);
        setProfileStatus("error");
        return;
      }

      const data = (await res.json()) as TmsProfile;

      if (!mountedRef.current) return;
      setProfile(data);
      setProfileStatus("success");
    } catch (err) {
      if (!mountedRef.current) return;
      setProfile(null);
      setProfileStatus("error");
    } finally {
      inFlightRef.current = false;
      ac.abort();
    }
  };

  const login = (data: {
    login: string;
    mail_verified: boolean;
    remember?: boolean;
  }) => {
    localStorage.removeItem("llog.login");
    localStorage.removeItem("llog.mail_verified");
    sessionStorage.removeItem("llog.login");
    sessionStorage.removeItem("llog.mail_verified");

    const store = data.remember ? localStorage : sessionStorage;
    store.setItem("llog.login", data.login);
    store.setItem("llog.mail_verified", String(data.mail_verified));

    setLoggedIn(true);
    void refreshProfile();
  };

  const logout = async () => {
    await clearAuth();
    if (!mountedRef.current) return;
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
