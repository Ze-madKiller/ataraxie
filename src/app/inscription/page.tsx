import { AlreadySignedIn } from "@/components/AlreadySignedIn";
import { getUser } from "@/lib/auth";
import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage() {
  const user = await getUser();
  return user ? <AlreadySignedIn email={user.email ?? ""} next="/inscription" /> : <SignUpForm />;
}
