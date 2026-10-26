import type { Metadata } from "next";
import { AlreadySignedIn } from "@/components/AlreadySignedIn";
import { getUser } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Se connecter",
  description: "Connectez-vous pour retrouver vos modules et votre progression sur les QCM.",
  robots: { index: false, follow: true },
};

export default async function SignInPage() {
  const user = await getUser();
  return user ? <AlreadySignedIn email={user.email ?? ""} next="/connexion" /> : <SignInForm />;
}
