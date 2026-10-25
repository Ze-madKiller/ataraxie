"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { retryJob } from "@/app/admin/actions";
import type { ImportJob } from "@/lib/types";

export interface JobRow {
  id: string;
  status: ImportJob["status"];
  doneChunks: number;
  totalChunks: number;
  questionsCreated: number;
  error: string | null;
  examTitle: string;
}

const MAX_CONSECUTIVE_FAILURES = 3;

export function ImportPanel({ jobs: initialJobs }: { jobs: JobRow[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [running, setRunning] = useState(false);
  const jobsRef = useRef(new Map<string, number>());

  // Pick up new uploads, but never overwrite live progress.
  useEffect(() => {
    if (!running) setJobs(initialJobs);
  }, [initialJobs, running]);

  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const patch = (id: string, p: Partial<JobRow>) => setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...p } : j)));

  async function runJob(id: string) {
    let failures = 0;
    for (;;) {
      const res = await fetch(`/api/admin/jobs/${id}/step`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { job?: ImportJob; error?: string };
      if (!res.ok || !body.job) {
        // Network blips and platform timeouts: retry the same step a few times before giving up.
        failures++;
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          patch(id, { status: "error", error: body.error ?? `HTTP ${res.status}` });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        continue;
      }
      failures = 0;
      const job = body.job;
      // Same chunk count back means another request still holds the chunk: wait before asking again.
      const stalled = job.status === "running" && job.done_chunks === jobsRef.current.get(id);
      jobsRef.current.set(id, job.done_chunks);
      if (stalled) await new Promise((resolve) => setTimeout(resolve, 10_000));
      patch(id, {
        status: job.status,
        doneChunks: job.done_chunks,
        totalChunks: job.chunks.length,
        questionsCreated: job.questions_created,
        error: job.error,
      });
      if (job.status === "done" || job.status === "error") return;
    }
  }

  async function runAll(ids: string[]) {
    setRunning(true);
    try {
      for (const id of ids) await runJob(id);
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  const todo = jobs.filter((j) => j.status === "pending" || j.status === "running");

  if (jobs.length === 0) return null;

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Import par l&apos;IA</h2>
        <button
          type="button"
          className="btn btn-primary"
          disabled={running || todo.length === 0}
          onClick={() => runAll(todo.map((j) => j.id))}
        >
          {running ? "Import en cours…" : `Lancer l'import (${todo.length})`}
        </button>
      </div>
      {running && (
        <p className="text-sm text-warn">Gardez cette page ouverte pendant l&apos;import. Chaque partie prend 1 à 3 minutes.</p>
      )}
      <ul className="space-y-3 text-sm">
        {jobs.map((j) => {
          const pct = j.totalChunks ? Math.round((j.doneChunks / j.totalChunks) * 100) : 0;
          return (
            <li key={j.id} className="space-y-1">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{j.examTitle}</span>
                <span className="text-muted">
                  {j.status === "pending" && "En attente"}
                  {j.status === "running" && `${j.doneChunks}/${j.totalChunks} parties · ${j.questionsCreated} questions`}
                  {j.status === "done" && <span className="text-good">Terminé · {j.questionsCreated} questions</span>}
                  {j.status === "error" && <span className="text-bad">Erreur</span>}
                </span>
              </div>
              {(j.status === "running" || j.status === "done") && (
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-accent transition-all" style={{ width: `${j.status === "done" ? 100 : pct}%` }} />
                </div>
              )}
              {j.status === "error" && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-bad">{j.error}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={running}
                    onClick={async () => {
                      const res = await retryJob(j.id);
                      if (res.error) {
                        patch(j.id, { error: res.error });
                        return;
                      }
                      patch(j.id, { status: j.totalChunks ? "running" : "pending", error: null });
                      await runAll([j.id]);
                    }}
                  >
                    Reprendre
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
