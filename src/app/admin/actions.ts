"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { createServiceClient, createSessionClient } from "@/lib/supabase/server";
import type { DocumentKind, QuestionStatus } from "@/lib/types";

type Result = { error?: string };

export async function signOut() {
  const session = await createSessionClient();
  await session.auth.signOut();
  redirect("/admin/login");
}

export async function createModule(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return;
  const db = createServiceClient();
  const { count } = await db.from("modules").select("id", { count: "exact", head: true });
  const { error } = await db
    .from("modules")
    .insert({ name, description, slug: slugify(name) || crypto.randomUUID(), position: count ?? 0 });
  if (error) throw new Error(error.code === "23505" ? `A module named "${name}" already exists.` : error.message);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createUploadUrl(moduleId: string, filename: string): Promise<{ path: string; token: string }> {
  await requireAdmin();
  const safeName = slugify(filename.replace(/\.pdf$/i, "")) || "document";
  const path = `${moduleId}/${crypto.randomUUID()}-${safeName}.pdf`;
  const { data, error } = await createServiceClient().storage.from("documents").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Could not create upload URL");
  return { path: data.path, token: data.token };
}

export async function registerDocument(input: {
  moduleId: string;
  kind: DocumentKind;
  title: string;
  path: string;
  examYear: number | null;
  examSession: string | null;
}): Promise<Result> {
  await requireAdmin();
  if (!input.path.startsWith(`${input.moduleId}/`)) return { error: "Invalid storage path" };
  const db = createServiceClient();
  const { data: doc, error } = await db
    .from("documents")
    .insert({
      module_id: input.moduleId,
      kind: input.kind,
      title: input.title.trim() || "Sans titre",
      storage_path: input.path,
      exam_year: input.examYear,
      exam_session: input.examSession,
    })
    .select("id")
    .single();
  if (error || !doc) return { error: error?.message ?? "Insert failed" };

  if (input.kind === "exam") {
    const { error: jobError } = await db
      .from("import_jobs")
      .insert({ module_id: input.moduleId, exam_document_id: doc.id });
    if (jobError) return { error: jobError.message };
  }
  revalidatePath(`/admin/modules/${input.moduleId}`);
  return {};
}

export async function deleteDocument(documentId: string): Promise<Result> {
  await requireAdmin();
  const db = createServiceClient();
  const { data: doc, error } = await db.from("documents").select("module_id, storage_path").eq("id", documentId).single();
  if (error || !doc) return { error: error?.message ?? "Document not found" };
  await db.storage.from("documents").remove([doc.storage_path]);
  // Questions keep their content; their exam/lesson links are set to null by the foreign keys.
  const { error: deleteError } = await db.from("documents").delete().eq("id", documentId);
  if (deleteError) return { error: deleteError.message };
  revalidatePath(`/admin/modules/${doc.module_id}`);
  return {};
}

export async function retryJob(jobId: string): Promise<Result> {
  await requireAdmin();
  const db = createServiceClient();
  const { data: job, error } = await db.from("import_jobs").select("chunks").eq("id", jobId).single();
  if (error || !job) return { error: error?.message ?? "Job not found" };
  const planned = Array.isArray(job.chunks) && job.chunks.length > 0;
  const { error: updateError } = await db
    .from("import_jobs")
    .update({ status: planned ? "running" : "pending", error: null, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  return updateError ? { error: updateError.message } : {};
}

export interface QuestionEdit {
  id: string;
  statement: string;
  explanation: string;
  lesson_excerpt: string;
  lesson_title: string;
  lesson_page: number | null;
  choices: { label: string; text: string; is_correct: boolean }[];
  status: QuestionStatus;
}

export async function saveQuestion(edit: QuestionEdit): Promise<Result> {
  await requireAdmin();
  if (!edit.statement.trim()) return { error: "The statement is empty." };
  if (edit.choices.length < 2) return { error: "A QCM needs at least two choices." };
  if (edit.status === "approved" && !edit.choices.some((c) => c.is_correct)) {
    return { error: "Mark at least one correct choice before approving." };
  }

  const db = createServiceClient();
  const { error } = await db
    .from("questions")
    .update({
      statement: edit.statement.trim(),
      explanation: edit.explanation.trim() || null,
      lesson_excerpt: edit.lesson_excerpt.trim() || null,
      lesson_title: edit.lesson_title.trim() || null,
      lesson_page: edit.lesson_page,
      status: edit.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", edit.id);
  if (error) return { error: error.message };

  const { error: deleteError } = await db.from("choices").delete().eq("question_id", edit.id);
  if (deleteError) return { error: deleteError.message };
  const { error: insertError } = await db.from("choices").insert(
    edit.choices.map((c, i) => ({
      question_id: edit.id,
      label: c.label.trim() || String.fromCharCode(65 + i),
      text: c.text.trim(),
      is_correct: c.is_correct,
      position: i,
    })),
  );
  if (insertError) return { error: insertError.message };

  revalidatePath("/admin/review");
  revalidatePath("/", "layout");
  return {};
}

export interface NewQuestion {
  moduleId: string;
  examYear: number | null;
  examSession: string | null;
  number: number | null;
  statement: string;
  explanation: string;
  lesson_excerpt: string;
  lesson_title: string;
  lesson_page: number | null;
  choices: { label: string; text: string; is_correct: boolean }[];
  status: "draft" | "approved";
}

/** Manual entry, without the AI import. */
export async function createQuestion(input: NewQuestion): Promise<Result> {
  await requireAdmin();
  const choices = input.choices.filter((c) => c.text.trim());
  if (!input.statement.trim()) return { error: "L'énoncé est vide." };
  if (choices.length < 2) return { error: "Il faut au moins deux propositions." };
  if (input.status === "approved" && !choices.some((c) => c.is_correct)) {
    return { error: "Cochez au moins une bonne réponse avant de publier." };
  }

  const db = createServiceClient();
  const id = crypto.randomUUID();
  const { error } = await db.from("questions").insert({
    id,
    module_id: input.moduleId,
    exam_year: input.examYear,
    exam_session: input.examSession,
    number: input.number,
    statement: input.statement.trim(),
    explanation: input.explanation.trim() || null,
    lesson_excerpt: input.lesson_excerpt.trim() || null,
    lesson_title: input.lesson_title.trim() || null,
    lesson_page: input.lesson_page,
    answer_source: "manual",
    status: input.status,
  });
  if (error) return { error: error.message };

  const { error: choiceError } = await db.from("choices").insert(
    choices.map((c, i) => ({
      question_id: id,
      label: c.label.trim() || String.fromCharCode(65 + i),
      text: c.text.trim(),
      is_correct: c.is_correct,
      position: i,
    })),
  );
  if (choiceError) {
    await db.from("questions").delete().eq("id", id);
    return { error: choiceError.message };
  }

  revalidatePath(`/admin/modules/${input.moduleId}`);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return {};
}

export async function setQuestionStatus(id: string, status: QuestionStatus): Promise<Result> {
  await requireAdmin();
  const db = createServiceClient();
  if (status === "approved") {
    const { count } = await db
      .from("choices")
      .select("id", { count: "exact", head: true })
      .eq("question_id", id)
      .eq("is_correct", true);
    if (!count) return { error: "Mark at least one correct choice before approving." };
  }
  const { error } = await db
    .from("questions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/review");
  revalidatePath("/", "layout");
  return {};
}

export async function resolveReport(id: string): Promise<void> {
  await requireAdmin();
  await createServiceClient().from("question_reports").update({ resolved: true }).eq("id", id);
  revalidatePath("/admin/reports");
}
