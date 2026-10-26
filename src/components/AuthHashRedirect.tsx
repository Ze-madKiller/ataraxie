"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const AUTH_PAGES = ["/admin/password", "/auth/confirm"];

/**
 * Supabase email links fall back to the Site URL when their redirect is not allow-listed.
 * Invite and reset links (#...&type=recovery|invite) go to the password page; sign-up links
 * (#access_token=... or ?code=...) go to the confirmation page.
 */
export function AuthHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (AUTH_PAGES.includes(pathname)) return;
    const { hash, search } = window.location;
    if (hash.includes("access_token=")) {
      const type = new URLSearchParams(hash.slice(1)).get("type");
      router.replace(`${type === "recovery" || type === "invite" ? "/admin/password" : "/auth/confirm"}${hash}`);
    } else if (pathname === "/" && new URLSearchParams(search).has("code")) {
      router.replace(`/auth/confirm${search}`);
    }
  }, [pathname, router]);

  return null;
}
