import { NextResponse } from "next/server";
import { regenerateQuestion } from "@/lib/ai/extract";
import { getAdminUser } from "@/lib/auth";
import { downloadDocument, loadSources, toRows } from "@/lib/import/run-step";
import { countPages, extractPages } from "@/lib/pdf";
import { createServiceClient } from "@/lib/supabase/server";
import type { DocumentRow, QuestionWithChoices } from "@/lib/types";

export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { feedback?: unknown };
  const feedback = typeof body.feedback === "string" ? body.feedback.slice(0, 2000) : "";

  try {
    const db = createServiceClient();
    const { data: qData, error: qError } = await db.from("questions").select("*, choices(*)").eq("id", id).single();
    if (qError || !qData) throw new Error(qError?.message ?? "Question not found");
    const question = qData as QuestionWithChoices;
    if (!question.exam_document_id) throw new Error("This question has no source exam PDF to re-read.");

    const { data: examData, error: examError } = await db
      .from("documents")
      .select("*")
      .eq("id", question.exam_document_id)
      .single();
    if (examError || !examData) throw new Error(examError?.message ?? "Exam document not found");
    const exam = examData as DocumentRow;

    const sources = await loadSources(db, exam);
    const examBytes = await downloadDocument(db, exam);
    const pageCount = exam.page_count ?? (await countPages(examBytes));
    const page = question.source_page ?? 1;
    const firstPage = Math.max(1, page - 1);
    const lastPage = Math.min(pageCount, page + 1);
    const pagesPdf = await extractPages(examBytes, firstPage, lastPage);

    const current = {
      number: question.number,
      statement: question.statement,
      choices: [...question.choices]
        .sort((a, b) => a.position - b.position)
        .map((c) => ({ label: c.label, text: c.text, is_correct: c.is_correct })),
      explanation: question.explanation,
      lesson_excerpt: question.lesson_excerpt,
      exam_page: question.source_page,
    };

    const regenerated = await regenerateQuestion({
      moduleName: sources.module.name,
      examTitle: exam.title,
      lessons: sources.lessons,
      corriges: sources.corriges,
      pagesPdf,
      firstPage,
      current,
      feedback,
    });

    const { question: row, choices } = toRows(regenerated, {
      exam,
      lessonDocs: sources.lessonDocs,
      jobId: null,
      questionId: question.id,
    });
    // Keep the question's id and original import job; replace everything Claude produced.
    const fields: Partial<typeof row> = { ...row };
    delete fields.id;
    delete fields.import_job_id;
    const { error: updateError } = await db
      .from("questions")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", question.id);
    if (updateError) throw new Error(updateError.message);
    const { error: deleteError } = await db.from("choices").delete().eq("question_id", question.id);
    if (deleteError) throw new Error(deleteError.message);
    const { error: insertError } = await db.from("choices").insert(choices);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
