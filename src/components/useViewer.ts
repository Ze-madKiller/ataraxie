"use client";

import { useEffect, useState } from "react";
import { getViewer } from "@/app/actions";

export type Viewer = { signedIn: boolean; admin: boolean };

// One shared store for every component that asks (header, home CTA): one request per page load.
// Deliberately no Supabase import: it would put the whole Supabase client in every page's first load.
let current: Viewer | null = null;
let pending: Promise<void> | null = null;
let lastUser: string | null | undefined;
let lastLoad = 0;
let seq = 0;
let subscribed = false;
const listeners = new Set<(v: Viewer) => void>();

const STALE_MS = 10 * 60 * 1000;

/**
 * Id of the signed-in user read from the @supabase/ssr auth cookie (readable from the page), or
 * null when signed out. Detects sign-in, sign-out and account switches made in another tab.
 */
function cookieUser(): string | null {
  const chunks = document.cookie
    .split(/;\s*/)
    .map((c) => c.match(/^sb-[^=]+-auth-token(?:\.(\d+))?=(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .sort((a, b) => Number(a[1] ?? 0) - Number(b[1] ?? 0));
  if (chunks.length === 0) return null;
  const raw = decodeURIComponent(chunks.map((m) => m[2]).join(""));
  try {
    const json = raw.startsWith("base64-") ? atob(raw.slice(7).replace(/-/g, "+").replace(/_/g, "/")) : raw;
    return (JSON.parse(json) as { user?: { id?: string } }).user?.id ?? "unknown";
  } catch {
    return "unknown"; // unreadable format: still counts as signed in
  }
}

function load(): Promise<void> {
  const mine = ++seq;
  lastUser = cookieUser();
  lastLoad = Date.now();
  pending = getViewer()
    .catch(() => ({ signedIn: false, admin: false }))
    .then((v) => {
      if (mine !== seq) return; // a newer request was started: ignore this older answer
      current = v;
      listeners.forEach((l) => l(v));
    });
  return pending;
}

/** Call after signing in or out in this tab so the header and CTA update without a reload. */
export function refreshViewer(): Promise<void> {
  return load();
}

function subscribe() {
  if (subscribed) return;
  subscribed = true;
  // Another tab may have signed in, out, or into another account; a long-idle session may have expired.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (cookieUser() !== lastUser || Date.now() - lastLoad > STALE_MS) void load();
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
