"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Admins only: switches between the admin interface and the student view. */
export function AdminToggle() {
  const inAdmin = usePathname().startsWith("/admin");
  return (
    <div className="flex rounded-md border border-line p-0.5 text-xs">
      <Link
        href="/modules"
        className={`rounded px-2 py-1 ${inAdmin ? "text-muted hover:text-foreground" : "bg-accent text-on-accent"}`}
      >
        Étudiant
      </Link>
      <Link
        href="/admin"
        className={`rounded px-2 py-1 ${inAdmin ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
      >
        Admin
      </Link>
    </div>
  );
}
