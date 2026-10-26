"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { refreshViewer } from "@/components/useViewer";

/** Target of the sign-up confirmation email: opens the session from the link, then goes to the modules. */
export default function ConfirmPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    (async () => {
      // getSession waits for the client to exchange a ?code= link (PKCE) on its own.
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
        refreshViewer();
        router.replace("/modules");
        router.refresh();
      } else {
        setFailed(true);
      }
    })();
  }, [router]);

  if (!failed) return <p className="card mx-auto max-w-md text-muted">Activation du compte…</p>;
  return (
    <div className="card mx-auto max-w-md space-y-5 sm:p-8">
      <p>Ce lien a expiré ou a déjà été utilisé. Si votre compte est déjà activé, connectez-vous.</p>
      <Link href="/connexion" className="btn btn-primary">
        Se connecter
      </Link>
    </div>
  );
}
