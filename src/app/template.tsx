"use client";

import { usePathname } from "next/navigation";

/**
 * Page entry transition. Keyed on the path: Next only re-mounts a template when the top-level
 * segment changes, so /modules/a → /modules/b would otherwise not animate. Search params are not
 * part of the key, so the quiz never re-mounts while it is being answered.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div key={usePathname()} className="animate-page">
      {children}
    </div>
  );
}
