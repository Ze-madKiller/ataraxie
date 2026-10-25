import type { SupabaseClient } from "@supabase/supabase-js";
import { extractQuestions, uploadPdfToAnthropic, type ExtractedQuestion, type SourceDoc } from "@/lib/ai/extract";
import { countPages, extractPages, planChunks } from "@/lib/pdf";
import { createServiceClient } from "@/lib/supabase/server";
import type { DocumentRow, ImportJob, Module } from "@/lib/types";

// Claude reads up to 600 PDF pages per request; keep room for the exam extract and answer key.
const MAX_LESSON_PAGES = 550;
// Longer than the step route's maxDuration (300 s), so a lease only expires once its request is dead.
const LEASE_MS = 6 * 60 * 1000;

export async function downloadDocument(db: SupabaseClient, doc: DocumentRow): Promise<Uint8Array> {
  const { data, error } = await db.storage.from("documents").download(doc.storage_path);
  if (error || !data) throw new Error(`Could not download "${doc.title}": ${error?.message ?? "empty file"}`);
  return new Uint8Array(await data.arrayBuffer());
}

/** Uploads lesson and answer-key PDFs to the Anthropic Files API once, so every chunk can reference them by id. */
async function ensureAnthropicFiles(db: SupabaseClient, moduleId: string): Promise<void> {
  const { data: docs, error } = await db
    .from("documents")
    .select("*")
    .eq("module_id", moduleId)
    .in("kind", ["cours", "corrige"])
    .is("anthropic_file_id", null);
  if (error) throw new Error(error.message);

  for (const doc of (docs ?? []) as DocumentRow[]) {
    const bytes = await downloadDocument(db, doc);
    const pageCount = await countPages(bytes);
    const fileId = await uploadPdfToAnthropic(bytes, `${doc.title}.pdf`);
    const { error: updateError } = await db
      .from("documents")
      .update({ anthropic_file_id: fileId, page_count: pageCount })
      .eq("id", doc.id);
    if (updateError) throw new Error(updateError.message);
  }
}

export interface ModuleSources {
  module: Module;
  lessonDocs: DocumentRow[];
  lessons: SourceDoc[];
  corriges: SourceDoc[];
}

/** Lessons in a stable order (so the prompt cache hits) and the answer keys matching the exam's year/session. */
export async function loadSources(db: SupabaseClient, exam: DocumentRow): Promise<ModuleSources> {
  const [{ data: module, error: moduleError }, { data: docs, error: docsError }] = await Promise.all([
    db.from("modules").select("*").eq("id", exam.module_id).single(),
    db
      .from("documents")
      .select("*")
      .eq("module_id", exam.module_id)
      .in("kind", ["cours", "corrige"])
      .order("created_at")
      .order("id"),
  ]);
  if (moduleError || !module) throw new Error(moduleError?.message ?? "Module not found");
  if (docsError) throw new Error(docsError.message);

  const all = (docs ?? []) as DocumentRow[];
  const lessonDocs = all.filter((d) => d.kind === "cours" && d.anthropic_file_id);
  const corrigeDocs = all.filter(
    (d) =>
      d.kind === "corrige" &&
      d.anthropic_file_id &&
      exam.exam_year !== null &&
      d.exam_year === exam.exam_year &&
      (d.exam_session === null || exam.exam_session === null || d.exam_session === exam.exam_session),
  );
  const toSource = (d: DocumentRow): SourceDoc => ({ fileId: d.anthropic_file_id!, title: d.title });
  return {
    module: module as Module,
    lessonDocs,
    lessons: lessonDocs.map(toSource),
    corriges: corrigeDocs.map(toSource),
  };
}

/** Maps Claude's output to question + choice rows. Ids are generated here so both tables can be bulk-inserted. */
export function toRows(
  extracted: ExtractedQuestion,
  ctx: { exam: DocumentRow; lessonDocs: DocumentRow[]; jobId: string | null; questionId?: string },
) {
  const lesson = extracted.lesson_index !== null ? ctx.lessonDocs[extracted.lesson_index] : undefined;
  const questionId = ctx.questionId ?? crypto.randomUUID();
  const question = {
    id: questionId,
    module_id: ctx.exam.module_id,
    import_job_id: ctx.jobId,
    exam_document_id: ctx.exam.id,
    exam_year: ctx.exam.exam_year,
    exam_session: ctx.exam.exam_session,
    number: extracted.number,
    statement: extracted.statement,
    explanation: extracted.explanation || null,
    lesson_excerpt: extracted.lesson_excerpt || null,
    lesson_document_id: lesson?.id ?? null,
    lesson_title: lesson?.title ?? null,
    lesson_page: lesson ? extracted.lesson_page : null,
    source_page: extracted.exam_page,
    answer_source: extracted.answer_source,
    ai_confidence: extracted.confidence,
    ai_notes: extracted.notes || null,
    status: "draft" as const,
  };
  const choices = extracted.choices.map((c, i) => ({
    question_id: questionId,
    label: c.label,
    text: c.text,
    is_correct: c.is_correct,
    position: i,
  }));
  return { question, choices };
}

async function failJob(db: SupabaseClient, jobId: string, message: string) {
  await db
    .from("import_jobs")
    .update({ status: "error", error: message, locked_until: null, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

/**
 * Advances an import job by one unit of work and returns its new state.
 * pending -> prepare (upload lessons, plan chunks); running -> process the next chunk.
 * The admin page calls this repeatedly until the job is done.
 */
export async function runImportStep(jobId: string): Promise<ImportJob> {
  const db = createServiceClient();
  const { data: jobData, error: jobError } = await db.from("import_jobs").select("*").eq("id", jobId).single();
  if (jobError || !jobData) throw new Error(jobError?.message ?? "Import job not found");
  const job = jobData as ImportJob;
  if (job.status === "done" || job.status === "error") return job;

  const { data: examData, error: examError } = await db
    .from("documents")
    .select("*")
    .eq("id", job.exam_document_id)
    .single();
  if (examError || !examData) throw new Error(examError?.message ?? "Exam document not found");
  const exam = examData as DocumentRow;

  try {
    if (job.status === "pending") {
      await ensureAnthropicFiles(db, exam.module_id);
      const { lessonDocs } = await loadSources(db, exam);
      const lessonPages = lessonDocs.reduce((sum, d) => sum + (d.page_count ?? 0), 0);
      if (lessonPages > MAX_LESSON_PAGES) {
        throw new Error(
          `The lessons of this module total ${lessonPages} pages; the limit is ${MAX_LESSON_PAGES}. Split the module or remove some lessons.`,
        );
      }

      const examBytes = await downloadDocument(db, exam);
      const pageCount = await countPages(examBytes);
      await db.from("documents").update({ page_count: pageCount }).eq("id", exam.id);

      const { data, error } = await db
        .from("import_jobs")
        .update({ status: "running", chunks: planChunks(pageCount), updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as ImportJob;
    }

    const chunk = job.chunks[job.done_chunks];
    if (!chunk) {
      const { data } = await db.from("import_jobs").update({ status: "done" }).eq("id", job.id).select("*").single();
      return data as ImportJob;
    }

    // Claim this chunk. If another request holds a live lease on it, report the job unchanged.
    const now = new Date();
    const { data: claimed, error: claimError } = await db
      .from("import_jobs")
      .update({ locked_until: new Date(now.getTime() + LEASE_MS).toISOString() })
      .eq("id", job.id)
      .eq("done_chunks", job.done_chunks)
      .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
      .select("id");
    if (claimError) throw new Error(claimError.message);
    if (!claimed || claimed.length === 0) return job;

    const sources = await loadSources(db, exam);
    const examBytes = await downloadDocument(db, exam);
    const chunkPdf = await extractPages(examBytes, chunk.contextStart, chunk.end);
    const extracted = await extractQuestions({
      moduleName: sources.module.name,
      examTitle: exam.title,
      lessons: sources.lessons,
      corriges: sources.corriges,
      chunkPdf,
      chunk,
    });

    const rows = extracted.map((q) => toRows(q, { exam, lessonDocs: sources.lessonDocs, jobId: job.id }));
    if (rows.length > 0) {
      const { error: qError } = await db.from("questions").insert(rows.map((r) => r.question));
      if (qError) throw new Error(qError.message);
      const { error: cError } = await db.from("choices").insert(rows.flatMap((r) => r.choices));
      if (cError) throw new Error(cError.message);
    }

    const doneChunks = job.done_chunks + 1;
    const { data, error } = await db
      .from("import_jobs")
      .update({
        done_chunks: doneChunks,
        questions_created: job.questions_created + rows.length,
        status: doneChunks >= job.chunks.length ? "done" : "running",
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as ImportJob;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failJob(db, job.id, message);
    return { ...job, status: "error", error: message };
  }
}
