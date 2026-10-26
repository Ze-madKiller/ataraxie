import Link from "next/link";
import { getUser, isAdmin } from "@/lib/auth";
import { AdminToggle } from "./AdminToggle";
import { SignOutButton } from "./SignOutButton";

export async function SiteHeader() {
  const user = await getUser();
  const admin = user ? await isAdmin(user.id) : false;
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-accent">
          E-ATARAXIE
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              {admin && <AdminToggle />}
              <Link href="/modules" className="px-2 py-1 text-muted hover:text-foreground">
                Mes modules
              </Link>
              <Link href="/compte" className="btn btn-ghost">
                Mon compte
              </Link>
              <SignOutButton className="px-2 py-1 text-muted hover:text-foreground" />
            </>
          ) : (
            <>
              <Link href="/connexion" className="px-2 py-1 text-muted hover:text-foreground">
                Se connecter
              </Link>
              <Link href="/inscription" className="btn btn-primary">
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
