import { AlreadySignedIn } from "@/components/AlreadySignedIn";
import { getUser } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
  const user = await getUser();
  return user ? <AlreadySignedIn email={user.email ?? ""} next="/connexion" /> : <SignInForm />;
}
