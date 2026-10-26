"use client";

import { useEffect, useState } from "react";
import { getViewer } from "@/app/actions";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export type Viewer = { signedIn: boolean; admin: boolean };

// One shared store for every component that asks (header, home CTA): one request per page load,
// one auth subscription, and a refetch only when the signed-in user actually changes.
let current: Viewer | null = null;
let pending: Promise<void> | null = null;
let userId: string | null | undefined;
let subscribed = false;
const listeners = new Set<(v: Viewer) => void>();

function refresh(): Promise<void> {
  pending = getViewer()
    .catch(() => ({ signedIn: false, admin: false }))
    .then((v) => {
      current = v;
      listeners.forEach((l) => l(v));
    });
  return pending;
}

function subscribe() {
  if (subscribed) return;
  subscribed = true;
  const supabase = createBrowserSupabase();
  supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    // INITIAL_SESSION sets the baseline; later events (tab refocus, token refresh) only matter on a user change.
    if (userId !== undefined && id !== userId) refresh();
    userId = id;
  });
  // Sign-in or sign-out in another tab changes the cookies without an event here.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null;
      if (userId !== undefined && id !== userId) {
        userId = id;
        refresh();
      }
    });
  });
}

/** null while loading. */
export function useViewer(): Viewer | null {
  const [viewer, setViewer] = useState<Viewer | null>(current);

  useEffect(() => {
    listeners.add(setViewer);
    subscribe();
    if (current) setViewer(current);
    else if (!pending) refresh();
    return () => {
      listeners.delete(setViewer);
    };
  }, []);

  return viewer;
}
