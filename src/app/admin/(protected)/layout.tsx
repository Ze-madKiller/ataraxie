import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3 text-sm">
        <span className="font-semibold">Admin</span>
        <Link href="/admin" className="text-muted hover:text-foreground">
          Modules
        </Link>
        <Link href="/admin/review" className="text-muted hover:text-foreground">
          Vérification
        </Link>
        <Link href="/admin/reports" className="text-muted hover:text-foreground">
          Signalements
        </Link>
        <span className="ml-auto text-muted">{user.email}</span>
        <form action={signOut}>
          <button type="submit" className="text-muted underline hover:text-foreground">
            Déconnexion
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
