"use client";

import { FormEvent, useEffect, useState } from "react";

import { Bouton, Champ, ChampTexte, Message } from "@/components/boutique/kit";
import { SellerNav } from "@/components/seller-nav";
import { useSellerAuth } from "@/components/seller-auth-provider";

export function SellerStudioShell({ children }: { children: React.ReactNode }) {
  const { ready, token, email, login, logout } = useSellerAuth();
  const [loginIdentifiant, setLoginIdentifiant] = useState(email);
  const [password, setPassword] = useState("");
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (email) {
      setLoginIdentifiant(email);
    }
  }, [email]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      await login(loginIdentifiant.trim(), password);
      setPassword("");
    } catch {
      setError("Identifiant ou mot de passe incorrect. Vérifiez votre saisie et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <p className="rounded-2xl bg-white p-5 text-[1.05rem] text-slate-700">Ouverture de votre espace...</p>;
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-lg rounded-3xl border-2 border-slate-200 bg-white p-6 md:p-8">
        <h1 className="font-display text-3xl text-ink">Ma boutique</h1>
        <p className="mt-2 text-[1.1rem] leading-relaxed text-slate-600">
          Connectez-vous pour gérer vos articles et vos commandes.
        </p>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          {/* type="text" et non "email": les identifiants ne sont pas tous des adresses
              (ex. "bah"), et le navigateur bloquait la saisie avant meme l'envoi.
              autoCapitalize/spellCheck off: les claviers mobiles capitalisent la 1re lettre. */}
          <Champ label="Votre identifiant" requis>
            <ChampTexte
              required
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={loginIdentifiant}
              onChange={(event) => setLoginIdentifiant(event.target.value)}
              placeholder="Ex. bah"
            />
          </Champ>

          <Champ label="Votre mot de passe" requis>
            <ChampTexte
              required
              type={afficherMotDePasse ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe"
            />
          </Champ>

          {/* Voir ce qu'on tape evite l'essentiel des echecs de connexion au telephone. */}
          <label className="flex min-h-[44px] items-center gap-3 text-[1.05rem] font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={afficherMotDePasse}
              onChange={(event) => setAfficherMotDePasse(event.target.checked)}
              className="h-6 w-6 rounded border-2 border-slate-300"
            />
            Afficher le mot de passe
          </label>

          {error && <Message type="erreur">{error}</Message>}

          <Bouton type="submit" disabled={loading} pleineLargeur>
            {loading ? "Connexion en cours..." : "Me connecter"}
          </Bouton>
        </form>

        <p className="mt-6 text-[1rem] leading-relaxed text-slate-600">
          Mot de passe oublié ? Contactez votre prestataire technique, il le réinitialisera pour vous.
        </p>
      </section>
    );
  }

  return (
    <div className="flex gap-6 pb-24 md:pb-0">
      <SellerNav email={email} onLogout={logout} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
