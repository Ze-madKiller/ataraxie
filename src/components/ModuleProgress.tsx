"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadProgress, resetProgress, type Progress } from "@/lib/progress";

export function ModuleProgress({ moduleId, slug, questionIds }: { moduleId: string; slug: string; questionIds: string[] }) {
  // Read after mount: localStorage does not exist during server rendering.
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => setProgress(loadProgress(moduleId)), [moduleId]);

  if (!progress) return null;
  const answered = questionIds.filter((id) => progress[id]);
  if (answered.length === 0) return null;
  const correct = answered.filter((id) => progress[id].correct).length;
  const wrong = answered.length - correct;

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="text-sm">
        <p className="font-semibold">Votre progression</p>
        <p className="text-muted">
          {answered.length}/{questionIds.length} questions faites · {correct} réussies · {wrong} à revoir
        </p>
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
          onClick={() => {
            resetProgress(moduleId);
            setProgress({});
          }}
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
