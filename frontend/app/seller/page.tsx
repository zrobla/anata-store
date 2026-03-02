"use client";

import { useEffect, useMemo, useState } from "react";

import { useSellerAuth } from "@/components/seller-auth-provider";
import { formatFcfa } from "@/lib/currency";
import { fetchSellerInventoryItems, fetchSellerOrders, fetchSellerProducts } from "@/lib/seller-api";
import { SellerInventoryItem, SellerOrder, SellerProduct } from "@/lib/types";

function fcfa(value: number) {
  return formatFcfa(value);
}

export default function SellerDashboardPage() {
  const { token } = useSellerAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [inventoryItems, setInventoryItems] = useState<SellerInventoryItem[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const [productsPayload, inventoryPayload, ordersPayload] = await Promise.all([
          fetchSellerProducts(token),
          fetchSellerInventoryItems(token),
          fetchSellerOrders(token)
        ]);
        setProducts(productsPayload);
        setInventoryItems(inventoryPayload);
        setOrders(ordersPayload);
      } catch {
        setError("Impossible de charger le dashboard seller.");
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      loadData();
    }
  }, [token]);

  const metrics = useMemo(() => {
    const ordersCount = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const lowStockCount = inventoryItems.filter(
      (item) => item.low_stock_threshold !== null && item.qty_on_hand <= item.low_stock_threshold
    ).length;
    const activeProducts = products.filter((product) => product.is_active).length;
    return { ordersCount, totalRevenue, lowStockCount, activeProducts };
  }, [inventoryItems, orders, products]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Dashboard Seller</h1>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Chargement...</p>}

      {!loading && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Produits actifs</p>
              <p className="font-display text-2xl">{metrics.activeProducts}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Commandes</p>
              <p className="font-display text-2xl">{metrics.ordersCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">CA brut</p>
              <p className="font-display text-2xl">{fcfa(metrics.totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Alertes stock</p>
              <p className="font-display text-2xl">{metrics.lowStockCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Commandes recentes</p>
            {orders.slice(0, 6).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-b-0">
                <p className="text-xs text-slate-700">
                  {order.order_number} - {order.status}
                </p>
                <p className="text-xs font-semibold text-slate-900">{fcfa(order.total_amount)}</p>
              </div>
            ))}
            {orders.length === 0 && <p className="text-sm text-slate-600">Aucune commande pour le moment.</p>}
          </div>
        </>
      )}
    </div>
  );
}
