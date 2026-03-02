"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchMyOrderDetail } from "@/lib/api";
import { formatFcfa } from "@/lib/currency";
import { Order } from "@/lib/types";

const ACCESS_TOKEN_KEY = "client_access_token";

function fcfa(value: number) {
  return formatFcfa(value);
}

export default function OrderSuccessPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadOrder() {
      const token = window.localStorage.getItem(ACCESS_TOKEN_KEY) || "";
      if (!token) {
        setMessage("Commande enregistree. Connecte-toi a ton compte pour voir le suivi detaille.");
        setLoading(false);
        return;
      }
      try {
        const payload = await fetchMyOrderDetail(token, orderId);
        setOrder(payload);
      } catch {
        setMessage("Commande creee. Le detail sera visible depuis Mes commandes apres connexion.");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <h1 className="font-display text-3xl text-emerald-900">Commande confirmee</h1>
      <p className="mt-2 text-sm text-emerald-900">
        Votre commande a ete enregistree. ID technique: <strong>{orderId}</strong>
      </p>

      {loading && <p className="mt-3 text-sm text-emerald-900">Recuperation des details...</p>}

      {!loading && order && (
        <div className="mt-3 rounded-xl border border-emerald-300 bg-white/70 p-3 text-sm text-emerald-900">
          <p>
            Numero commande: <strong>{order.order_number}</strong>
          </p>
          <p>
            Statut: <strong>{order.status}</strong>
          </p>
          <p>
            Total: <strong>{fcfa(order.total_amount)}</strong>
          </p>
        </div>
      )}

      {!loading && message && <p className="mt-3 text-sm text-emerald-900">{message}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/account/orders" className="rounded-xl bg-ink px-4 py-2 text-sm text-white">
          Suivre mes commandes
        </Link>
        <Link href="/cart" className="rounded-xl border border-emerald-300 px-4 py-2 text-sm">
          Retour panier
        </Link>
        <Link href="/" className="rounded-xl border border-emerald-300 px-4 py-2 text-sm">
          Retour boutique
        </Link>
      </div>
    </section>
  );
}
