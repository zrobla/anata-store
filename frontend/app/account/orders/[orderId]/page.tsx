"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BackLink } from "@/components/back-link";
import { fetchMyOrderDetail } from "@/lib/api";
import { formatFcfa } from "@/lib/currency";
import { Order } from "@/lib/types";

const ACCESS_TOKEN_KEY = "client_access_token";

function fcfa(value: number) {
  return formatFcfa(value);
}

export default function AccountOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      const token = window.localStorage.getItem(ACCESS_TOKEN_KEY) || "";
      if (!token) {
        setError("Connexion client requise pour afficher cette commande.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const payload = await fetchMyOrderDetail(token, orderId);
        setOrder(payload);
      } catch {
        setError("Commande introuvable ou acces non autorise.");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  return (
    <section className="space-y-4">
      <BackLink fallbackHref="/account/orders" label="Retour commandes" />
      <h1 className="font-display text-3xl">Tracking commande</h1>

      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Chargement...</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {!loading && order && (
        <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {order.order_number} - {order.status}
            </p>
            <p className="text-xs text-slate-600">Paiement: {order.payment_method}</p>
            <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString("fr-FR")}</p>
          </div>

          <div className="space-y-1 text-sm text-slate-700">
            <p>Sous-total: {fcfa(order.subtotal_amount)}</p>
            <p>Livraison: {fcfa(order.delivery_fee_amount)}</p>
            <p className="font-semibold">Total: {fcfa(order.total_amount)}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Articles</p>
            {order.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-3 text-xs text-slate-700">
                <p className="font-semibold">{item.product_snapshot_json?.name || item.product_snapshot_json?.sku || "Article"}</p>
                <p>Qte: {item.qty}</p>
                <p>Montant: {fcfa(item.line_total_amount)}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      {!loading && !order && !error && (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Aucune donnee de commande.</p>
      )}

      {error && (
        <Link href="/account/orders" className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Aller a Mes commandes
        </Link>
      )}
    </section>
  );
}
