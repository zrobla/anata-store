"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { sellerLogin } from "@/lib/seller-api";

const SELLER_ACCESS_TOKEN_KEY = "seller_access_token";
const SELLER_REFRESH_TOKEN_KEY = "seller_refresh_token";
const SELLER_EMAIL_KEY = "seller_email";

type SellerAuthContextValue = {
  ready: boolean;
  token: string;
  email: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const SellerAuthContext = createContext<SellerAuthContextValue | null>(null);

export function SellerAuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const storedToken = window.localStorage.getItem(SELLER_ACCESS_TOKEN_KEY) || "";
    const storedEmail = window.localStorage.getItem(SELLER_EMAIL_KEY) || "";
    setToken(storedToken);
    setEmail(storedEmail);
    setReady(true);
  }, []);

  async function login(nextEmail: string, password: string) {
    const tokens = await sellerLogin(nextEmail, password);
    window.localStorage.setItem(SELLER_ACCESS_TOKEN_KEY, tokens.access);
    window.localStorage.setItem(SELLER_REFRESH_TOKEN_KEY, tokens.refresh);
    window.localStorage.setItem(SELLER_EMAIL_KEY, nextEmail);
    setToken(tokens.access);
    setEmail(nextEmail);
  }

  function logout() {
    window.localStorage.removeItem(SELLER_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(SELLER_REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(SELLER_EMAIL_KEY);
    setToken("");
    setEmail("");
  }

  const value = useMemo(
    () => ({
      ready,
      token,
      email,
      login,
      logout
    }),
    [email, ready, token]
  );

  return <SellerAuthContext.Provider value={value}>{children}</SellerAuthContext.Provider>;
}

export function useSellerAuth() {
  const context = useContext(SellerAuthContext);
  if (!context) {
    throw new Error("useSellerAuth must be used inside SellerAuthProvider");
  }
  return context;
}
