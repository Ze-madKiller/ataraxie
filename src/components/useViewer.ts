"use client";

import { useEffect, useState } from "react";
import { getViewer } from "@/app/actions";

export type Viewer = { signedIn: boolean; admin: boolean };

// One shared store for every component that asks (header, home CTA): one request per page load.
// Deliberately no Supabase import: it would put the whole Supabase client in every page's first load.
let current: Viewer | null = null;
let pending: Promise<void> | null = null;
let lastCookie: boolean | undefined;
let subscribed = false;
const listeners = new Set<(v: Viewer) => void>();

/** True when a Supabase auth cookie is present. @supabase/ssr cookies are readable from the page. */
function hasAuthCookie(): boolean {
  return /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie);
}

function load(): Promise<void> {
  lastCookie = hasAuthCookie();
  pending = getViewer()
    .catch(() => ({ signedIn: false, admin: false }))
    .then((v) => {
      current = v;
      listeners.forEach((l) => l(v));
    });
  return pending;
}

/** Call after signing in or out in this tab so the header and CTA update without a reload. */
export function refreshViewer(): void {
  void load();
}

function subscribe() {
  if (subscribed) return;
  subscribed = true;
  // Sign-in or sign-out in another tab changes the cookies: check when the tab becomes visible again.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && hasAuthCookie() !== lastCookie) void load();
  });
}

/** null while loading. */
export function useViewer(): Viewer | null {
  const [viewer, setViewer] = useState<Viewer | null>(current);

  useEffect(() => {
    listeners.add(setViewer);
    subscribe();
    if (current) setViewer(current);
    else if (!pending) void load();
    return () => {
      listeners.delete(setViewer);
    };
  }, []);

  return viewer;
}
