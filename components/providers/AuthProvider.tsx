"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { isLoggedIn, clearAuth } from "@/lib/auth";
import type { TmsProfile } from "@/types/tms-profile";
export type Role = "shipper" | "transporter" | "transporter_driver";
type LoadStatus = "idle" | "loading" | "success" | "error";
type AuthContextType = {
  loggedIn: boolean;
  login: (data: {
    login: string;
    mail_verified: boolean;
    remember?: boolean;
    tms_user_type: Role;
  }) => void;
  logout: () => Promise<void>;
  profile?: TmsProfile | null;
  profileStatus?: LoadStatus;
  refreshProfile?: () => Promise<void>;
  currentUserType: Role | "";
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_URL = process.env.NEXT_PUBLIC_TMS_USER_PROFILE_URL!;

function readUsrTypeStorage(): Role | "" {
  if (typeof window === "undefined") return "";
  const v =
    localStorage.getItem("llog.usrtype") ??
    sessionStorage.getItem("llog.usrtype") ??
    "";
  return v.trim() as Role | "";
}

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
      console.log("[Auth] Profile data:", data);
      if (!mountedRef.current) return;
      setProfile(data);
      setProfileStatus("success");
    } catch {
      if (!mountedRef.current) return;
      setProfile(null);
      setProfileStatus("error");
    } finally {
      inFlightRef.current = false;
      ac.abort();
    }
  };

  const currentUserType: Role | "" =
    (profile?.tms_user_type?.trim() as Role) ?? readUsrTypeStorage();

  const login = (data: {
    login: string;
    mail_verified: boolean;
    remember?: boolean;
    tms_user_type: Role;
  }) => {
    localStorage.removeItem("llog.login");
    localStorage.removeItem("llog.mail_verified");
    sessionStorage.removeItem("llog.login");
    sessionStorage.removeItem("llog.mail_verified");
    localStorage.removeItem("llog.usrtype");
    sessionStorage.removeItem("llog.usrtype");
    localStorage.removeItem("llog.remember");
    sessionStorage.removeItem("llog.remember");
    console.log("{DATA: ", data, "}");
    const store = data.remember ? localStorage : sessionStorage;
    const bs = data.remember ? 1 : 0;
    store.setItem("llog.login", data.login);
    store.setItem("llog.mail_verified", String(data.mail_verified));
    store.setItem("llog.usrtype", data.tms_user_type);
    store.setItem("llog.remember", String(bs));
    console.log("{STORE: ", store, "}");
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
        currentUserType,
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
