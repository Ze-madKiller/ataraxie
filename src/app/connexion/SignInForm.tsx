"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { safeNext } from "@/lib/semesters";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetPassword = async () => {
    setError(null);
    if (!email) return setError("Entrez d'abord votre email ci-dessus.");
    const { error } = await createBrowserSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/password`,
    });
    if (error) setError("Envoi impossible. Réessayez dans quelques minutes.");
    else setInfo(`Un lien pour choisir un nouveau mot de passe a été envoyé à ${email}.`);
  };

  return (
    <form
      className="card mx-auto max-w-md space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
          setError(
            /not confirmed/i.test(error.message)
              ? "Confirmez d'abord votre email avec le lien reçu."
              : "Email ou mot de passe incorrect.",
          );
          return;
        }
        // Read here rather than with useSearchParams so the page needs no Suspense boundary.
        router.push(safeNext(new URLSearchParams(window.location.search).get("next")));
        router.refresh();
      }}
    >
      <h1 className="text-xl font-semibold">Se connecter</h1>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Email</span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Mot de passe</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p className="text-sm text-bad">{error}</p>}
      {info && <p className="text-sm text-good">{info}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Connexion…" : "Se connecter"}
      </button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" onClick={resetPassword} className="text-muted underline hover:text-foreground">
          Mot de passe oublié ?
        </button>
        <Link href="/inscription" className="text-accent underline">
          Créer un compte
        </Link>
      </div>
    </form>
  );
}
