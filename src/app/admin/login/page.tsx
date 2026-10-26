"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="card mx-auto max-w-sm space-y-5 sm:p-8"
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
      <h1 className="title">Administration</h1>
      <label className="field">
        <span className="field-label">Email</span>
        <input className="input" type="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <PasswordInput label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && (
        <p role="alert" className="notice notice-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
