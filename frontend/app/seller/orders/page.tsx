"use client";

import { useEffect, useState } from "react";

import { useSellerAuth } from "@/components/seller-auth-provider";
import { fetchSellerOrders, updateSellerOrderStatus } from "@/lib/seller-api";
import { SellerOrder, SellerOrderStatus } from "@/lib/types";

const STATUSES: SellerOrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PACKING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED"
];

function fcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

export default function SellerOrdersPage() {
  const { token } = useSellerAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [busyOrderId, setBusyOrderId] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const payload = await fetchSellerOrders(token);
      setOrders(payload);
    } catch {
      setError("Impossible de charger les commandes seller.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadOrders();
    }
  }, [token]);

  async function onStatusChange(orderId: string, status: SellerOrderStatus) {
    try {
      setBusyOrderId(orderId);
      setError("");
      await updateSellerOrderStatus(token, orderId, status);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    } catch {
      setError("Mise a jour du statut impossible.");
    } finally {
      setBusyOrderId("");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Commandes</h1>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Chargement...</p>}

      {!loading && (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{order.order_number}</p>
                <p className="text-sm font-semibold text-fuel">{fcfa(order.total_amount)}</p>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {order.address_json?.full_name || "Client"} - {order.address_json?.phone || "N/A"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={order.status}
                  onChange={(event) => onStatusChange(order.id, event.target.value as SellerOrderStatus)}
                  disabled={busyOrderId === order.id}
                  className="rounded-lg border px-2 py-1 text-xs"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString("fr-FR")}</p>
              </div>
            </article>
          ))}
          {orders.length === 0 && (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Aucune commande seller disponible.</p>
          )}
        </div>
      )}
    </div>
  );
}
