import Link from "next/link";
import { notFound } from "next/navigation";
import { Quiz } from "@/components/Quiz";
import { createPublicClient } from "@/lib/supabase/server";
import type { Module, QuestionWithChoices } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function QuizPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const param = (name: string) => (typeof sp[name] === "string" ? (sp[name] as string) : "");

  const db = createPublicClient();
  const { data: moduleData } = await db.from("modules").select("*").eq("slug", slug).maybeSingle();
  if (!moduleData) notFound();
  const mod = moduleData as Module;

  const { data, error } = await db
    .from("questions")
    .select(
      "id, module_id, exam_year, exam_session, number, statement, explanation, lesson_excerpt, lesson_title, lesson_page, choices(id, question_id, label, text, is_correct, position)",
    )
    .eq("module_id", mod.id)
    .order("exam_year", { ascending: false, nullsFirst: false })
    .order("exam_session")
    .order("number", { nullsFirst: false });
  if (error) throw new Error(error.message);

  let questions = (data ?? []) as unknown as QuestionWithChoices[];
  const exam = param("exam");
  if (exam) {
    const [year, session] = exam.split("|");
    questions = questions.filter(
      (q) => String(q.exam_year ?? "") === year && (q.exam_session ?? "") === (session ?? ""),
    );
  }
  for (const q of questions) q.choices.sort((a, b) => a.position - b.position);
  // Shuffled on the server so the client renders the same order it was sent (no hydration mismatch).
  if (param("shuffle") === "1") questions = shuffle(questions);

  return (
    <div className="space-y-4">
      <Link href={`/modules/${mod.slug}`} className="text-sm text-muted hover:text-foreground">
        ← {mod.name}
      </Link>
      {questions.length === 0 ? (
        <p className="card p-6 text-muted">Aucune question pour cette sélection.</p>
      ) : (
        <Quiz
          moduleId={mod.id}
          moduleSlug={mod.slug}
          questions={questions}
          mode={param("mode") === "exam" ? "exam" : "practice"}
          onlyWrong={param("only") === "wrong"}
        />
      )}
    </div>
  );
}
