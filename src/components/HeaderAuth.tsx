"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AdminToggle } from "./AdminToggle";
import { SignOutButton } from "./SignOutButton";
import { useViewer } from "./useViewer";

/** Auth-dependent part of the header. Client-side so the layout never reads cookies and public pages stay static. */
export function HeaderAuth() {
  const viewer = useViewer();
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);

  // Close the mobile menu after navigating.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);

  // Same footprint as the logged-out links, so nothing shifts when the state arrives.
  if (!viewer) return <span className="inline-block h-11 w-44" aria-hidden />;

  if (!viewer.signedIn) {
    return (
      <>
        <Link href="/modules" aria-current={current("/modules")} className="btn btn-quiet hidden sm:inline-flex">
          Modules
        </Link>
        <Link href="/connexion" aria-current={current("/connexion")} className="btn btn-quiet px-3">
          Connexion
        </Link>
        <Link href="/inscription" className="btn btn-primary px-3 sm:px-4.5">
          <span className="sm:hidden">S&apos;inscrire</span>
          <span className="hidden sm:inline">Créer un compte</span>
        </Link>
      </>
    );
  }

  return (
    <>
      {viewer.admin && (
        <span className="hidden sm:block">
          <AdminToggle />
        </span>
      )}
      <Link href="/modules" aria-current={current("/modules")} className="btn btn-quiet px-3 aria-[current=page]:text-foreground">
        Mes modules
      </Link>
      {/* Desktop: inline links. Mobile: one menu, so the bar never overflows at 360px. */}
      <Link href="/compte" aria-current={current("/compte")} className="btn btn-ghost hidden sm:inline-flex">
        Mon compte
      </Link>
      <SignOutButton className="btn btn-quiet hidden sm:inline-flex" />
      <details ref={menu} className="relative sm:hidden">
        <summary className="btn btn-ghost list-none px-3 [&::-webkit-details-marker]:hidden" aria-label="Menu du compte">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </summary>
        <div className="card animate-drop absolute right-0 mt-2 flex w-56 flex-col gap-1 p-2">
          {viewer.admin && (
            <Link href="/admin" className="btn btn-quiet justify-start">
              Administration
            </Link>
          )}
          <Link href="/compte" className="btn btn-quiet justify-start">
            Mon compte
          </Link>
          <SignOutButton className="btn btn-quiet justify-start" />
        </div>
      </details>
    </>
  );
}
