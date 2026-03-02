"use client";

import { FormEvent, useEffect, useState } from "react";

import { SellerNav } from "@/components/seller-nav";
import { useSellerAuth } from "@/components/seller-auth-provider";

export function SellerStudioShell({ children }: { children: React.ReactNode }) {
  const { ready, token, email, login, logout } = useSellerAuth();
  const [loginEmail, setLoginEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (email) {
      setLoginEmail(email);
    }
  }, [email]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      await login(loginEmail, password);
      setPassword("");
    } catch {
      setError("Connexion seller invalide ou droits insuffisants.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <p className="rounded-xl bg-white p-4 text-sm text-slate-700">Chargement Seller Studio...</p>;
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="font-display text-3xl">Seller Studio</h1>
        <p className="text-sm text-slate-700">Connexion seller requise (RBAC backend actif).</p>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <input
            required
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="Email seller"
            className="rounded-lg border px-3 py-2"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            className="rounded-lg border px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter au Studio"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-[260px_1fr]">
      <SellerNav email={email} onLogout={logout} />
      <section>{children}</section>
    </div>
  );
}
