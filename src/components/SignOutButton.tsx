"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Signs out in the browser, not in a server action: the browser Supabase client keeps the session
 * in memory and would write the cookies back after a server-side sign-out.
 */
export function SignOutButton({
  label = "Se déconnecter",
  redirectTo = "/",
  className = "btn btn-ghost",
}: {
  label?: string;
  redirectTo?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await createBrowserSupabase().auth.signOut({ scope: "local" });
        if (error) {
          // Session already invalid on the server: drop the auth cookies ourselves.
          document.cookie.split(";").forEach((c) => {
            const name = c.split("=")[0].trim();
            if (name.startsWith("sb-")) document.cookie = `${name}=; Max-Age=0; path=/`;
          });
        }
        // Full reload so every server component renders logged out.
        window.location.assign(redirectTo);
      }}
    >
      {pending ? "Déconnexion…" : label}
    </button>
  );
}
