"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Supabase invite and password-reset emails land on the Site URL with the session in the hash
 * (#access_token=...&type=recovery). Forward them to the page that sets the password.
 */
export function AuthHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (pathname !== "/admin/password" && hash.includes("access_token=")) {
      router.replace(`/admin/password${hash}`);
    }
  }, [pathname, router]);

  return null;
}
