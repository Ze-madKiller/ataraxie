"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SEMESTERS, safeNext, semesterLabel } from "@/lib/semesters";
import { createBrowserSupabase } from "@/lib/supabase/browser";

function frenchAuthError(message: string): string {
  if (/already registered|already exists/i.test(message)) return "Un compte existe déjà avec cet email.";
  if (/password/i.test(message)) return "Mot de passe trop faible (8 caractères minimum).";
  if (/rate limit/i.test(message)) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (/email/i.test(message)) return "Adresse email invalide.";
  return message;
}

export function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [semester, setSemester] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="card mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-xl font-semibold">Vérifiez votre boîte mail</h1>
        <p className="text-sm text-muted">
          Un lien de confirmation a été envoyé à <strong className="text-foreground">{sentTo}</strong>. Cliquez dessus
          pour activer votre compte. Pensez à regarder dans les spams.
        </p>
      </div>
    );
  }

  return (
    <form
      className="card mx-auto max-w-md space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!semester) return setError("Choisissez votre semestre.");
        if (password.length < 8) return setError("Mot de passe trop faible (8 caractères minimum).");
        setLoading(true);
        setError(null);
        const { data, error } = await createBrowserSupabase().auth.signUp({
          email,
          password,
          options: {
            // Read by the database trigger that creates the profile.
            data: { full_name: fullName.trim(), semester },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        setLoading(false);
        if (error) return setError(frenchAuthError(error.message));
        if (data.session) {
          // Back to the public module page the visitor came from, if any.
          router.push(safeNext(new URLSearchParams(window.location.search).get("next")));
          router.refresh();
        } else if (data.user?.identities?.length === 0) {
          // With email confirmation on, Supabase hides existing accounts behind a fake success.
          setError("Un compte existe déjà avec cet email.");
        } else {
          setSentTo(email);
        }
      }}
    >
      <div>
        <h1 className="text-xl font-semibold">Créer un compte</h1>
        <p className="text-sm text-muted">Gratuit. Vous pourrez changer de semestre plus tard.</p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Nom complet</span>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Email</span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Mot de passe (8 caractères minimum)</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Votre semestre</span>
        <select className="input" value={semester} onChange={(e) => setSemester(e.target.value)} required>
          <option value="" disabled>
            Choisir…
          </option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {semesterLabel(s)}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Création…" : "Créer mon compte"}
      </button>
      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="text-accent underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
