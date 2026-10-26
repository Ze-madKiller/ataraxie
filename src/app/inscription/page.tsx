import type { Metadata } from "next";
import { AlreadySignedIn } from "@/components/AlreadySignedIn";
import { getUser } from "@/lib/auth";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Créer un compte gratuit",
  description:
    "Créez votre compte gratuit pour réviser les QCM d'examen de la Faculté de Médecine de Fès et suivre votre progression.",
  alternates: { canonical: "/inscription" },
};

export default async function SignUpPage() {
  const user = await getUser();
  return user ? <AlreadySignedIn email={user.email ?? ""} next="/inscription" /> : <SignUpForm />;
}
