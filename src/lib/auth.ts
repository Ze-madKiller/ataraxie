import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createServiceClient, createSessionClient } from "@/lib/supabase/server";

export async function getAdminUser(): Promise<User | null> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  const { data, error } = await createServiceClient()
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Admin lookup failed: ${error.message}`);
  return data ? user : null;
}

/** For pages and server actions: redirects to the login page when the visitor is not an admin. */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
