"use server";

import { createPublicClient } from "@/lib/supabase/server";

/** Public "Signaler une erreur" button. RLS only allows reports on approved questions. */
export async function reportQuestion(questionId: string, message: string): Promise<{ error?: string }> {
  const text = message.trim().slice(0, 2000);
  if (!text) return { error: "Décrivez l'erreur." };
  const { error } = await createPublicClient().from("question_reports").insert({ question_id: questionId, message: text });
  return error ? { error: "Envoi impossible, réessayez plus tard." } : {};
}
