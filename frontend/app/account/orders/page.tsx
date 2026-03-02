"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { BackLink } from "@/components/back-link";
import { fetchMyOrders, loginClient } from "@/lib/api";
import { Order } from "@/lib/types";

const ACCESS_TOKEN_KEY = "client_access_token";
const REFRESH_TOKEN_KEY = "client_refresh_token";
const CLIENT_EMAIL_KEY = "client_email";

function fcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function loadOrders(accessToken: string) {
    try {
      setLoadingOrders(true);
      setError("");
      const payload = await fetchMyOrders(accessToken);
      setOrders(payload);
    } catch {
      setError("Impossible de charger les commandes client.");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    const savedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY) || "";
    const savedEmail = window.localStorage.getItem(CLIENT_EMAIL_KEY) || "";
    setToken(savedToken);
    setEmail(savedEmail);
    if (savedToken) {
      loadOrders(savedToken);
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoggingIn(true);
      setError("");
      const tokens = await loginClient(email, password);
      window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
      window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
      window.localStorage.setItem(CLIENT_EMAIL_KEY, email);
      setToken(tokens.access);
      setPassword("");
      await loadOrders(tokens.access);
    } catch {
      setError("Connexion client invalide. Verifie email et mot de passe.");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(CLIENT_EMAIL_KEY);
    setToken("");
    setOrders([]);
    setError("");
    setPassword("");
  }

  return (
    <section className="space-y-4">
      <BackLink fallbackHref="/" label="Retour boutique" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl">Mes commandes</h1>
        {token && (
          <button type="button" onClick={handleLogout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            Deconnexion client
          </button>
        )}
      </div>

      {!token && (
        <form onSubmit={handleLogin} className="grid max-w-xl gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">
            Connecte-toi avec ton compte client pour afficher l'historique et le suivi de tes commandes.
          </p>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email client"
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
          <button
            type="submit"
            disabled={loggingIn}
            className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {loggingIn ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      )}

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {token && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {loadingOrders && <p className="text-sm text-slate-600">Chargement des commandes...</p>}
          {!loadingOrders && orders.length === 0 && (
            <p className="text-sm text-slate-600">Aucune commande associee a ce compte client.</p>
          )}
          {!loadingOrders &&
            orders.map((order) => (
              <article key={order.id} className="space-y-1 border-b border-slate-100 py-3 last:border-b-0">
                <p className="text-sm font-semibold text-slate-900">
                  {order.order_number} - {order.status}
                </p>
                <p className="text-xs text-slate-600">
                  Total: {fcfa(order.total_amount)} - Paiement: {order.payment_method}
                </p>
                <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString("fr-FR")}</p>
                <Link href={`/account/orders/${order.id}`} className="inline-flex rounded-md border border-slate-300 px-2.5 py-1 text-xs">
                  Voir details
                </Link>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}
