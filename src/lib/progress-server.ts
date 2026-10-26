import { getUser } from "@/lib/auth";
import { buildProgress, type Progress, type ProgressEntry } from "@/lib/progress";
import { createSessionClient } from "@/lib/supabase/server";

/** The logged-in student's progress on a module, from the database, so it is the same on every device. */
export async function loadModuleProgress(moduleId: string): Promise<Progress> {
  const user = await getUser();
  if (!user) return {};
  const db = await createSessionClient();

  const [attemptsRes, importedRes, resetRes] = await Promise.all([
    db.from("attempts").select("question_id, correct, created_at").eq("user_id", user.id).eq("module_id", moduleId),
    db.from("imported_progress").select("question_id, correct, answered_at").eq("user_id", user.id).eq("module_id", moduleId),
    db.from("progress_resets").select("reset_at").eq("user_id", user.id).eq("module_id", moduleId).maybeSingle(),
  ]);
  for (const res of [attemptsRes, importedRes, resetRes]) {
    if (res.error) throw new Error(`Progress lookup failed: ${res.error.message}`);
  }

  return buildProgress(
    [
      ...(attemptsRes.data ?? []).map((a) => ({ questionId: a.question_id, correct: a.correct, at: a.created_at })),
      ...(importedRes.data ?? []).map((a) => ({ questionId: a.question_id, correct: a.correct, at: a.answered_at })),
    ],
    resetRes.data?.reset_at ?? null,
  );
}

const PAGE = 1000; // PostgREST returns at most 1000 rows per request.

async function fetchAllPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Progress lookup failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Number of questions answered since the last reset, per module id. Used on the module list. */
export async function loadProgressSummary(): Promise<Record<string, number>> {
  const user = await getUser();
  if (!user) return {};
  const db = await createSessionClient();

  const [attempts, imported, resetRes] = await Promise.all([
    fetchAllPages((from, to) =>
      db.from("attempts").select("module_id, question_id, correct, created_at").eq("user_id", user.id).order("created_at").range(from, to),
    ),
    fetchAllPages((from, to) =>
      db.from("imported_progress").select("module_id, question_id, correct, answered_at").eq("user_id", user.id).order("answered_at").range(from, to),
    ),
    db.from("progress_resets").select("module_id, reset_at").eq("user_id", user.id),
  ]);
  if (resetRes.error) throw new Error(`Progress lookup failed: ${resetRes.error.message}`);

  const byModule = new Map<string, ProgressEntry[]>();
  const add = (moduleId: string, entry: ProgressEntry) => byModule.set(moduleId, [...(byModule.get(moduleId) ?? []), entry]);
  for (const a of attempts) add(a.module_id, { questionId: a.question_id, correct: a.correct, at: a.created_at });
  for (const a of imported) add(a.module_id, { questionId: a.question_id, correct: a.correct, at: a.answered_at });
  const resets = new Map((resetRes.data ?? []).map((r) => [r.module_id, r.reset_at as string]));

  const summary: Record<string, number> = {};
  for (const [moduleId, entries] of byModule) {
    summary[moduleId] = Object.keys(buildProgress(entries, resets.get(moduleId) ?? null)).length;
  }
  return summary;
}
