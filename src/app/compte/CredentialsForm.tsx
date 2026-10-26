"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Message = { kind: "ok" | "error"; text: string } | null;

function MessageLine({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p role={message.kind === "error" ? "alert" : "status"} className={`notice ${message.kind === "error" ? "notice-bad" : "notice-good"}`}>
      {message.text}
    </p>
  );
}

export function CredentialsForm({ email }: { email: string }) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState(email);
  const [emailMessage, setEmailMessage] = useState<Message>(null);
  const [emailPending, setEmailPending] = useState(false);

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  return (
    <>
      <form
        className="card space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const target = newEmail.trim();
          if (!target || target === email) return setEmailMessage({ kind: "error", text: "Entrez une nouvelle adresse." });
          setEmailPending(true);
          setEmailMessage(null);
          const { error } = await createBrowserSupabase().auth.updateUser(
            { email: target },
            { emailRedirectTo: `${window.location.origin}/auth/confirm` },
          );
          setEmailPending(false);
          if (error) {
            return setEmailMessage({
              kind: "error",
              text: /already/i.test(error.message) ? "Cette adresse est déjà utilisée." : "Changement impossible, réessayez.",
            });
          }
          setEmailMessage({
            kind: "ok",
            text: `Un lien de confirmation a été envoyé à ${target} (et à l'ancienne adresse). Le changement prend effet après confirmation.`,
          });
          router.refresh();
        }}
      >
        <h2 className="font-semibold">Adresse email</h2>
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="input"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <MessageLine message={emailMessage} />
        <button type="submit" className="btn btn-ghost" disabled={emailPending}>
          {emailPending ? "Envoi…" : "Changer d'email"}
        </button>
      </form>

      <form
        className="card space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password.length < 8) return setPasswordMessage({ kind: "error", text: "8 caractères minimum." });
          if (password !== confirm) {
            return setPasswordMessage({ kind: "error", text: "Les deux mots de passe ne sont pas identiques." });
          }
          setPasswordPending(true);
          setPasswordMessage(null);
          const supabase = createBrowserSupabase();
          // Re-checks the current password so an unattended session cannot change it.
          const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: current });
          if (checkError) {
            setPasswordPending(false);
            return setPasswordMessage({ kind: "error", text: "Mot de passe actuel incorrect." });
          }
          const { error } = await supabase.auth.updateUser({ password });
          setPasswordPending(false);
          if (error) {
            return setPasswordMessage({
              kind: "error",
              text: /different/i.test(error.message)
                ? "Le nouveau mot de passe doit être différent de l'ancien."
                : "Changement impossible, réessayez.",
            });
          }
          setCurrent("");
          setPassword("");
          setConfirm("");
          setPasswordMessage({ kind: "ok", text: "Mot de passe modifié." });
        }}
      >
        <h2 className="font-semibold">Mot de passe</h2>
        <PasswordInput label="Mot de passe actuel" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        <PasswordInput label="Nouveau mot de passe" hint="8 caractères minimum." value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        <PasswordInput label="Confirmer" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        <MessageLine message={passwordMessage} />
        <button type="submit" className="btn btn-ghost" disabled={passwordPending}>
          {passwordPending ? "Enregistrement…" : "Changer le mot de passe"}
        </button>
      </form>
    </>
  );
}
