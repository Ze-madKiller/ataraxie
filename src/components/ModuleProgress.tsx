"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { importLegacyProgress, resetModuleProgress } from "@/app/actions";
import { clearLegacyProgress, loadLegacyProgress } from "@/lib/progress";

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

  const answered = correct + wrong;
  if (answered === 0) return null;

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="text-sm">
        <p className="font-semibold">Votre progression</p>
        <p className="text-muted">
          {answered}/{total} questions faites · {correct} réussies · {wrong} à revoir
        </p>
        {error && <p className="text-bad">{error}</p>}
      </div>
      <div className="flex gap-2">
        {wrong > 0 && (
          <Link href={`/modules/${slug}/quiz?only=wrong`} className="btn btn-primary">
            Revoir mes erreurs
          </Link>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await resetModuleProgress(moduleId);
              if (res.error) setError(res.error);
              else router.refresh();
            })
          }
        >
          {pending ? "Réinitialisation…" : "Réinitialiser"}
        </button>
      </div>
    </div>
  );
}
