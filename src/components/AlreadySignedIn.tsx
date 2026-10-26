import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

/** Shown on /inscription and /connexion when a session is already open, so the forms never act on top of it. */
export function AlreadySignedIn({ email, next }: { email: string; next: "/inscription" | "/connexion" }) {
  return (
    <div className="card mx-auto max-w-md space-y-5 sm:p-8">
      <p>
        Vous êtes connecté en tant que <strong>{email}</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/modules" className="btn btn-primary">
          Continuer
        </Link>
        <SignOutButton
          redirectTo={next}
          label={next === "/inscription" ? "Se déconnecter pour créer un compte" : "Se déconnecter pour changer de compte"}
        />
      </div>
    </div>
  );
}
