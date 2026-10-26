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
      <h1 className="text-2xl font-semibold tracking-tight">Mon compte</h1>

      <AccountForm fullName={profile?.full_name ?? ""} semester={profile?.semester ?? null} />

      <CredentialsForm email={user.email ?? ""} />

      <section className="card space-y-3 p-5 text-sm">
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
