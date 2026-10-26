import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createServiceClient, createSessionClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Wrapped in React cache(): the header, layout and page each ask for the user, but one page render
// now makes a single call to Supabase for each instead of one per component.
export const getAdminUser = cache(async (): Promise<User | null> => {
  const user = await getUser();
  if (!user) return null;
  return (await isAdmin(user.id)) ? user : null;
});

export const isAdmin = cache(async (userId: string): Promise<boolean> => {
  const { data, error } = await createServiceClient()
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Admin lookup failed: ${error.message}`);
  return Boolean(data);
});

export const getUser = cache(async (): Promise<User | null> => {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
});

/** For student pages: redirects to /connexion (then back to `next`) when nobody is logged in. */
export async function requireUser(next: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const session = await createSessionClient();
  const { data, error } = await session.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Profile lookup failed: ${error.message}`);
  return data as Profile | null;
}

/** For pages and server actions: redirects to the login page when the visitor is not an admin. */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
