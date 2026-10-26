import { getUser } from "@/lib/auth";
import { buildProgress, type Progress } from "@/lib/progress";
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
