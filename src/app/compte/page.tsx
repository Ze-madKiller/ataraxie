import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { getAdminUser, getProfile, requireUser } from "@/lib/auth";
import { AccountForm } from "./AccountForm";
import { CredentialsForm } from "./CredentialsForm";

export default async function AccountPage() {
  const user = await requireUser("/compte");
  const [profile, admin] = await Promise.all([getProfile(user.id), getAdminUser()]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="title">Mon compte</h1>

      <AccountForm fullName={profile?.full_name ?? ""} semester={profile?.semester ?? null} />

      <CredentialsForm email={user.email ?? ""} />

      <section className="card space-y-3">
        {admin && (
          <Link href="/admin" className="block text-accent underline">
            Administration
          </Link>
        )}
        <SignOutButton />
      </section>
    </div>
  );
}
