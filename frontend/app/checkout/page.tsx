"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { fetchDeliveryZones } from "@/lib/api";
import { formatFcfa } from "@/lib/currency";
import { DeliveryZone } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

function parseCheckoutError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Echec de checkout COD.";
  }
  const data = payload as Record<string, unknown>;
  if (typeof data.message === "string" && data.message) {
    return data.message;
  }
  if (typeof data.detail === "string" && data.detail) {
    return data.detail;
  }
  if (data.code === "STOCK_CONFLICT") {
    return "Stock insuffisant pour finaliser la commande. Ajuste le panier puis reessaie.";
  }
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = data[firstKey];
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === "string") {
      return value;
    }
  }
  return "Echec de checkout COD.";
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [error, setError] = useState("");
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");

  useEffect(() => {
    async function loadZones() {
      try {
        setLoadingZones(true);
        const payload = await fetchDeliveryZones();
        setZones(payload);
        if (payload.length > 0) {
          setSelectedZoneId(payload[0].id);
        }
      } catch {
        setError("Impossible de charger les zones de livraison.");
      } finally {
        setLoadingZones(false);
      }
    }
    loadZones();
  }, []);

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId), [selectedZoneId, zones]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const data = new FormData(event.currentTarget);
    const session = localStorage.getItem("cart_session") || "";
    const clientToken = localStorage.getItem("client_access_token") || "";

    const payload = {
      address: {
        full_name: data.get("full_name"),
        phone: data.get("phone"),
        whatsapp: data.get("whatsapp"),
        city: data.get("city"),
        commune: data.get("commune"),
        quartier: data.get("quartier"),
        landmark: data.get("landmark")
      },
      delivery_zone_id: selectedZoneId
    };

    const response = await fetch(`${API_BASE}/checkout/cod`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { "X-Cart-Session": session } : {}),
        ...(clientToken ? { Authorization: `Bearer ${clientToken}` } : {})
      },
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      setError(parseCheckoutError(body));
      return;
    }

    const body = (await response.json()) as { order_id: string };
    router.push(`/order/success/${body.order_id}`);
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <BackLink fallbackHref="/cart" label="Retour panier" />
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="font-display text-3xl">Checkout COD</h1>
        <p className="mt-2 text-sm text-slate-600">Paiement a la livraison uniquement.</p>
        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <input required name="full_name" placeholder="Nom complet" className="rounded-lg border px-3 py-2" />
          <input required name="phone" placeholder="Telephone" className="rounded-lg border px-3 py-2" />
          <input name="whatsapp" placeholder="WhatsApp" className="rounded-lg border px-3 py-2" />
          <input required name="city" placeholder="Ville" className="rounded-lg border px-3 py-2" />
          <input required name="commune" placeholder="Commune" className="rounded-lg border px-3 py-2" />
          <input required name="quartier" placeholder="Quartier" className="rounded-lg border px-3 py-2" />
          <input name="landmark" placeholder="Repere" className="rounded-lg border px-3 py-2" />
          <label className="grid gap-1 text-sm text-slate-700">
            Zone de livraison
            <select
              required
              value={selectedZoneId}
              onChange={(event) => setSelectedZoneId(event.target.value)}
              className="rounded-lg border px-3 py-2"
              disabled={loadingZones}
            >
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} - frais {formatFcfa(zone.fee_amount)} -{" "}
                  {zone.eta_days_min}-{zone.eta_days_max} jours
                </option>
              ))}
            </select>
          </label>
          {selectedZone && (
            <p className="text-xs text-slate-600">
              Frais livraison estimes: {formatFcfa(selectedZone.fee_amount)}.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || loadingZones || !selectedZoneId}
            className="rounded-lg bg-fuel px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Validation..." : "Confirmer la commande"}
          </button>
        </form>
      </div>
    </section>
  );
}
