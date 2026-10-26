"use client";

import { useState } from "react";

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
        let error: unknown = null;
        try {
          // Loaded on click: keeps the Supabase client out of the header's first-load bundle.
          const { createBrowserSupabase } = await import("@/lib/supabase/browser");
          ({ error } = await createBrowserSupabase().auth.signOut({ scope: "local" }));
        } catch (e) {
          error = e; // offline or stale deploy: fall back to clearing the cookies below
        }
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
