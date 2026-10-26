"use server";

import { revalidatePath } from "next/cache";
import { getUser, isAdmin } from "@/lib/auth";
import { isAnswerCorrect } from "@/lib/scoring";
import { parseSemester } from "@/lib/semesters";
import { createSessionClient } from "@/lib/supabase/server";

/** Header and home CTA: who is browsing. Called from the browser so those pages can stay static. */
export async function getViewer(): Promise<{ signedIn: boolean; admin: boolean }> {
  const user = await getUser();
  if (!user) return { signedIn: false, admin: false };
  // A failed admin lookup must not make the header look signed out.
  const admin = await isAdmin(user.id).catch(() => false);
  return { signedIn: true, admin };
}

/** "Signaler une erreur" button. RLS only allows logged-in users to report approved questions. */
export async function reportQuestion(questionId: string, message: string): Promise<{ error?: string }> {
  const text = message.trim().slice(0, 2000);
  if (!text) return { error: "Décrivez l'erreur." };
  const session = await createSessionClient();
  const { error } = await session.from("question_reports").insert({ question_id: questionId, message: text });
  return error ? { error: "Envoi impossible, réessayez plus tard." } : {};
}

export async function updateProfile(input: { fullName: string; semester: string }): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };
  const semester = parseSemester(input.semester);
  if (!semester) return { error: "Choisissez votre semestre." };

  const session = await createSessionClient();
  const { data, error } = await session
    .from("profiles")
    .update({ full_name: input.fullName.trim() || null, semester, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id");
  // An update that matches no row returns no error, so check that the profile was really saved.
  if (error || !data?.length) return { error: "Enregistrement impossible, réessayez." };
  revalidatePath("/", "layout");
  return {};
}

/**
 * Saves a student's answer for the admin statistics. Correctness is recomputed here from the
 * database, so a student cannot send a fake result.
 */
export async function recordAttempt(input: {
  questionId: string;
  selected: string[];
  mode: "practice" | "exam";
}): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };

  const session = await createSessionClient();
  const { data: question, error } = await session
    .from("questions")
    .select("module_id, choices(id, is_correct)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (error || !question) return { error: "Question introuvable." };

  const choices = question.choices as { id: string; is_correct: boolean }[];
  const valid = new Set(choices.map((c) => c.id));
  const selected = input.selected.filter((id) => valid.has(id));
  const { error: insertError } = await session.from("attempts").insert({
    user_id: user.id,
    question_id: input.questionId,
    module_id: question.module_id,
    selected,
    correct: isAnswerCorrect(choices, new Set(selected)),
    mode: input.mode === "exam" ? "exam" : "practice",
  });
  return insertError ? { error: "Enregistrement impossible." } : {};
}

/** "Réinitialiser": earlier answers stop counting as progress but stay in the statistics. */
export async function resetModuleProgress(moduleId: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };
  const session = await createSessionClient();
  const { error } = await session
    .from("progress_resets")
    .upsert({ user_id: user.id, module_id: moduleId, reset_at: new Date().toISOString() });
  if (error) return { error: "Réinitialisation impossible, réessayez." };
  revalidatePath("/modules", "layout");
  return {};
}

/** One-time copy of the progress older versions kept only in this browser. */
export async function importLegacyProgress(
  moduleId: string,
  entries: { questionId: string; correct: boolean; at: string }[],
): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };
  if (entries.length === 0) return {};

  const session = await createSessionClient();
  // Only questions of this module that are still published; RLS would reject the others.
  const { data: questions, error } = await session.from("questions").select("id").eq("module_id", moduleId);
  if (error) return { error: "Import impossible." };
  const valid = new Set((questions ?? []).map((q) => q.id));
  const rows = entries
    .filter((e) => valid.has(e.questionId) && !Number.isNaN(Date.parse(e.at)))
    .map((e) => ({
      user_id: user.id,
      module_id: moduleId,
      question_id: e.questionId,
      correct: Boolean(e.correct),
      // A browser clock in the future must not hide newer answers.
      answered_at: new Date(Math.min(Date.parse(e.at), Date.now())).toISOString(),
    }));
  if (rows.length === 0) return {};

  const { error: insertError } = await session
    .from("imported_progress")
    .upsert(rows, { onConflict: "user_id,question_id", ignoreDuplicates: true });
  if (insertError) return { error: "Import impossible." };
  revalidatePath("/modules", "layout");
  return {};
}
