import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Choice, Module, Question } from "@/lib/types";

// Read with the service role key for visitors who are not logged in. Every query selects explicit
// columns and only approved content; full questions and answers are limited to is_sample ones.

export type PublicModule = Pick<Module, "id" | "name" | "slug" | "description" | "semester"> & { questionCount: number };

export type ExamSummary = { year: number | null; session: string | null; count: number };

export type SampleQuestion = Pick<
  Question,
  "id" | "exam_year" | "exam_session" | "number" | "statement" | "explanation" | "lesson_excerpt" | "lesson_title" | "lesson_page"
> & { choices: Pick<Choice, "id" | "label" | "text" | "is_correct" | "position">[] };

export const PUBLIC_REVALIDATE = 3600;
const MAX_SAMPLES = 3;

export const getPublicModules = unstable_cache(
  async (): Promise<PublicModule[]> => {
    // Embedded count instead of fetching question rows: PostgREST caps responses at 1000 rows.
    const { data, error } = await createServiceClient()
      .from("modules")
      .select("id, name, slug, description, semester, questions(count)")
      .eq("questions.status", "approved")
      .order("semester", { nullsFirst: false })
      .order("position");
    if (error) throw new Error(error.message);
    return (data ?? []).map(({ questions, ...m }) => ({ ...m, questionCount: questions[0]?.count ?? 0 }));
  },
  ["public-modules"],
  { revalidate: PUBLIC_REVALIDATE, tags: ["public-content"] },
);

export const getPublicModule = unstable_cache(
  async (slug: string): Promise<{ module: PublicModule; exams: ExamSummary[]; samples: SampleQuestion[] } | null> => {
    const db = createServiceClient();
    const { data: mod, error } = await db
      .from("modules")
      .select("id, name, slug, description, semester")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!mod) return null;

    const { data: rows, error: qError } = await db
      .from("questions")
      .select("exam_year, exam_session")
      .eq("module_id", mod.id)
      .eq("status", "approved");
    if (qError) throw new Error(qError.message);
    const exams = summariseExams(rows ?? []);

    const { data: samples, error: sError } = await db
      .from("questions")
      .select(
        "id, exam_year, exam_session, number, statement, explanation, lesson_excerpt, lesson_title, lesson_page, choices(id, label, text, is_correct, position)",
      )
      .eq("module_id", mod.id)
      .eq("status", "approved")
      .eq("is_sample", true)
      .order("exam_year", { ascending: false, nullsFirst: false })
      .order("number", { nullsFirst: false })
      .limit(MAX_SAMPLES);
    // Before migration 0005 the column does not exist: show the page without samples.
    const sampleList = sError ? [] : ((samples ?? []) as SampleQuestion[]);
    for (const q of sampleList) q.choices.sort((a, b) => a.position - b.position);

    return { module: { ...mod, questionCount: rows?.length ?? 0 }, exams, samples: sampleList };
  },
  ["public-module"],
  { revalidate: PUBLIC_REVALIDATE, tags: ["public-content"] },
);

/** Home page stat strip. */
export const getPublicStats = unstable_cache(
  async (): Promise<{ modules: number; questions: number; exams: number }> => {
    const db = createServiceClient();
    const [modules, questions, exams] = await Promise.all([
      db.from("modules").select("id", { count: "exact", head: true }),
      db.from("questions").select("id", { count: "exact", head: true }).eq("status", "approved"),
      db.from("documents").select("id", { count: "exact", head: true }).eq("kind", "exam"),
    ]);
    return { modules: modules.count ?? 0, questions: questions.count ?? 0, exams: exams.count ?? 0 };
  },
  ["public-stats"],
  { revalidate: PUBLIC_REVALIDATE, tags: ["public-content"] },
);

/** Groups questions by exam paper (year + session), newest first. */
export function summariseExams(rows: { exam_year: number | null; exam_session: string | null }[]): ExamSummary[] {
  const exams = new Map<string, ExamSummary>();
  for (const q of rows) {
    const k = `${q.exam_year ?? ""}|${q.exam_session ?? ""}`;
    const entry = exams.get(k) ?? { year: q.exam_year, session: q.exam_session, count: 0 };
    entry.count++;
    exams.set(k, entry);
  }
  return [...exams.values()].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}
