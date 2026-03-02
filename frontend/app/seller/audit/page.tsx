"use client";

import { useEffect, useState } from "react";

import { useSellerAuth } from "@/components/seller-auth-provider";
import { fetchSellerAuditLogs } from "@/lib/seller-api";
import { SellerAuditLog } from "@/lib/types";

export default function SellerAuditPage() {
  const { token } = useSellerAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<SellerAuditLog[]>([]);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        setError("");
        const payload = await fetchSellerAuditLogs(token);
        setLogs(payload.slice(0, 100));
      } catch {
        setError("Impossible de charger les logs d'audit.");
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      loadLogs();
    }
  }, [token]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Audit</h1>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Chargement...</p>}

      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-[150px_140px_120px_1fr] gap-2 border-b border-slate-200 pb-2 text-xs font-semibold uppercase text-slate-500">
            <p>Date</p>
            <p>Action</p>
            <p>Ressource</p>
            <p>Reference</p>
          </div>
          {logs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-[150px_140px_120px_1fr] gap-2 border-b border-slate-100 py-2 text-xs text-slate-700 last:border-b-0"
            >
              <p>{new Date(log.created_at).toLocaleString("fr-FR")}</p>
              <p className="truncate">{log.action}</p>
              <p className="truncate">{log.resource}</p>
              <p className="truncate">{log.resource_id}</p>
            </div>
          ))}
          {logs.length === 0 && <p className="py-3 text-sm text-slate-600">Aucun log d'audit.</p>}
        </div>
      )}
    </div>
  );
}
