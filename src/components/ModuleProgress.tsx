"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { importLegacyProgress, resetModuleProgress } from "@/app/actions";
import { clearLegacyProgress, loadLegacyProgress } from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";

export function ModuleProgress({
  moduleId,
  slug,
  total,
  correct,
  wrong,
}: {
  moduleId: string;
  slug: string;
  total: number;
  correct: number;
  wrong: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Progress saved in this browser by older versions: copy it to the account once, then forget it.
  useEffect(() => {
    const legacy = loadLegacyProgress(moduleId);
    const entries = Object.entries(legacy).map(([questionId, p]) => ({ questionId, correct: p.correct, at: p.at }));
    if (entries.length === 0) return;
    importLegacyProgress(moduleId, entries)
      .then((res) => {
        if (res.error) return;
        clearLegacyProgress(moduleId);
        router.refresh();
      })
      .catch(() => {});
  }, [moduleId, router]);

  const [confirming, setConfirming] = useState(false);
  // The buttons swap in place, so focus is moved by hand to keep keyboard users in the same spot.
  const confirmButton = useRef<HTMLButtonElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
    else if (wasConfirming.current) resetButton.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  const answered = correct + wrong;
  if (answered === 0) return null;

  const reset = () =>
    startTransition(async () => {
      const res = await resetModuleProgress(moduleId);
      setConfirming(false);
      if (res.error) setError(res.error);
      else router.refresh();
    });

  return (
    <section className="card space-y-4" aria-labelledby="progress-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="progress-title" className="heading">
          Votre progression
        </h2>
        <p className="text-sm text-muted">
          {answered}/{total} questions faites
        </p>
      </div>
      <ProgressBar
        value={answered}
        max={total}
        label="Questions faites"
        segments={[
          { value: correct, className: "bg-good" },
          { value: wrong, className: "bg-bad" },
        ]}
      />
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-good" />
          {correct} réussie{correct > 1 ? "s" : ""}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-bad" />
          {wrong} à revoir
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-track" />
          {total - answered} jamais vue{total - answered > 1 ? "s" : ""}
        </li>
      </ul>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {wrong > 0 && (
          <Link href={`/modules/${slug}/quiz?only=wrong`} className="btn btn-primary">
            Revoir mes {wrong} erreur{wrong > 1 ? "s" : ""}
          </Link>
        )}
        {/* Two steps instead of a browser dialog: resetting cannot be undone. */}
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmer la réinitialisation">
            <button ref={confirmButton} type="button" className="btn btn-ghost text-bad" disabled={pending} onClick={reset}>
              {pending ? "Réinitialisation…" : "Oui, tout effacer"}
            </button>
            <button type="button" className="btn btn-quiet" disabled={pending} onClick={() => setConfirming(false)}>
              Annuler
            </button>
          </span>
        ) : (
          <button ref={resetButton} type="button" className="btn btn-quiet" onClick={() => setConfirming(true)}>
            Réinitialiser
          </button>
        )}
      </div>
    </section>
  );
}
