"use client";

import Link from "next/link";
import { useViewer } from "./useViewer";

/** Home page call to action. Static HTML shows the sign-up CTA; signed-in visitors get "my modules" once known. */
export function HomeCta({ secondary = false }: { secondary?: boolean }) {
  const viewer = useViewer();
  const signedIn = viewer?.signedIn ?? false;
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={signedIn ? "/modules" : "/inscription"} className="btn btn-primary px-5 py-3 text-base">
        {signedIn ? "Accéder à mes modules" : "Créer mon compte gratuit"}
      </Link>
      {secondary && !signedIn && (
        <Link href="/connexion" className="btn btn-ghost px-5 py-3 text-base">
          J&apos;ai déjà un compte
        </Link>
      )}
    </div>
  );
}
