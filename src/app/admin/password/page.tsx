"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/** Target of Supabase invite / password-reset links: opens the session from the link, then sets a password. */
export default function SetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "no-session">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    (async () => {
      // getSession waits for the client to exchange a ?code= reset link (PKCE) on its own.
      await supabase.auth.getSession();
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        // Remove the tokens from the address bar and history.
        window.history.replaceState(null, "", window.location.pathname);
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? "");
        setState("ready");
      } else {
        setState("no-session");
      }
    })();
  }, []);

  if (state === "loading") return <p className="card mx-auto max-w-sm text-muted">Chargement…</p>;
  if (state === "no-session") {
    return (
      <div className="card mx-auto max-w-sm space-y-5 sm:p-8">
        <p>Ce lien a expiré ou a déjà été utilisé.</p>
        <Link href="/connexion" className="btn btn-primary">
          Aller à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form
      className="card mx-auto max-w-sm space-y-5 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 8) return setError("8 caractères minimum.");
        if (password !== confirm) return setError("Les deux mots de passe ne sont pas identiques.");
        setSaving(true);
        setError(null);
        const { error } = await createBrowserSupabase().auth.updateUser({ password });
        setSaving(false);
        if (error) return setError(error.message);
        router.push("/modules");
        router.refresh();
      }}
    >
      <h1 className="title">Choisir un mot de passe</h1>
      <p className="text-sm text-muted">{email}</p>
      <PasswordInput label="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <PasswordInput label="Confirmer" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      {error && (
        <p role="alert" className="notice notice-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer et continuer"}
      </button>
    </form>
  );
}
