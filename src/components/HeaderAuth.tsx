"use client";

import Link from "next/link";
import { AdminToggle } from "./AdminToggle";
import { SignOutButton } from "./SignOutButton";
import { useViewer } from "./useViewer";

/** Auth-dependent part of the header. Client-side so the layout never reads cookies and public pages stay static. */
export function HeaderAuth() {
  const viewer = useViewer();
  // Same footprint as the logged-out links, so nothing shifts when the state arrives.
  if (!viewer) return <span className="inline-block h-9 w-48" aria-hidden />;
  if (!viewer.signedIn) {
    return (
      <>
        <Link href="/connexion" className="px-2 py-1 text-muted hover:text-foreground">
          Se connecter
        </Link>
        <Link href="/inscription" className="btn btn-primary">
          Créer un compte
        </Link>
      </>
    );
  }
  return (
    <>
      {viewer.admin && <AdminToggle />}
      <Link href="/modules" className="px-2 py-1 text-muted hover:text-foreground">
        Mes modules
      </Link>
      <Link href="/compte" className="btn btn-ghost">
        Mon compte
      </Link>
      <SignOutButton className="px-2 py-1 text-muted hover:text-foreground" />
    </>
  );
}
