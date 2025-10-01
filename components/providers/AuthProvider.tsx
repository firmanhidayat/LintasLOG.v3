"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isLoggedIn, clearAuth } from "@/lib/auth";

type AuthContextType = {
  loggedIn: boolean;
  login: (data: {
    login: string;
    mail_verified: boolean;
    remember?: boolean;
  }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
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
  };

  const logout = async () => {
    await clearAuth();
    setLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
