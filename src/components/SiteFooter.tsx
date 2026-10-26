import Link from "next/link";
import { FACULTY } from "@/lib/site";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 text-sm sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-muted">
            Les QCM d&apos;examen de la {FACULTY}, corrigés par le cours. Projet étudiant indépendant.
          </p>
        </div>
        <nav aria-label="Réviser" className="space-y-2">
          <h2 className="font-semibold">Réviser</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/modules" className="link-quiet inline-flex min-h-8 items-center">
                Tous les modules
              </Link>
            </li>
            <li>
              <Link href="/inscription" className="link-quiet inline-flex min-h-8 items-center">
                Créer un compte gratuit
              </Link>
            </li>
            <li>
              <Link href="/connexion" className="link-quiet inline-flex min-h-8 items-center">
                Se connecter
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Informations" className="space-y-2">
          <h2 className="font-semibold">Informations</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/mentions-legales" className="link-quiet inline-flex min-h-8 items-center">
                Mentions légales
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
