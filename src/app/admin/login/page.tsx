"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="card mx-auto max-w-sm space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
          setError("Email ou mot de passe incorrect.");
          return;
        }
        router.push("/admin");
        router.refresh();
      }}
    >
      <h1 className="text-xl font-semibold">Administration</h1>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Email</span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Mot de passe</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
