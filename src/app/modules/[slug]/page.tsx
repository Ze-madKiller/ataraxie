import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleProgress } from "@/components/ModuleProgress";
import { createPublicClient } from "@/lib/supabase/server";
import type { Module } from "@/lib/types";

export const revalidate = 60;

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createPublicClient();
  const { data: moduleData } = await db.from("modules").select("*").eq("slug", slug).maybeSingle();
  if (!moduleData) notFound();
  const mod = moduleData as Module;

  const { data: rows, error } = await db.from("questions").select("id, exam_year, exam_session").eq("module_id", mod.id);
  if (error) throw new Error(error.message);
  const questions = rows ?? [];

  // Group by exam (year + session) so students can practise one paper at a time.
  const exams = new Map<string, { year: number | null; session: string | null; count: number }>();
  for (const q of questions) {
    const k = `${q.exam_year ?? ""}|${q.exam_session ?? ""}`;
    const entry = exams.get(k) ?? { year: q.exam_year, session: q.exam_session, count: 0 };
    entry.count++;
    exams.set(k, entry);
  }
  const examList = [...exams.values()].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Modules
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{mod.name}</h1>
        {mod.description && <p className="mt-1 text-muted">{mod.description}</p>}
      </div>

      {questions.length === 0 ? (
        <p className="card p-6 text-muted">Les questions de ce module arrivent bientôt.</p>
      ) : (
        <>
          <ModuleProgress moduleId={mod.id} slug={mod.slug} questionIds={questions.map((q) => q.id)} />

          <form action={`/modules/${mod.slug}/quiz`} method="get" className="card space-y-4 p-5">
            <h2 className="font-semibold">Nouvelle série</h2>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Examen</span>
              <select name="exam" className="input">
                <option value="">Tous les examens ({questions.length} questions)</option>
                {examList.map((e) => (
                  <option key={`${e.year}|${e.session}`} value={`${e.year ?? ""}|${e.session ?? ""}`}>
                    {[e.year ?? "Année inconnue", e.session].filter(Boolean).join(" — ")} ({e.count})
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="space-y-2 text-sm">
              <legend className="mb-1 text-muted">Mode</legend>
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" value="practice" defaultChecked className="mt-1" />
                <span>
                  <strong>Entraînement</strong> — correction après chaque question
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" value="exam" className="mt-1" />
                <span>
                  <strong>Examen</strong> — toutes les corrections à la fin
                </span>
              </label>
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="shuffle" value="1" />
              Ordre aléatoire
            </label>
            <button type="submit" className="btn btn-primary w-full sm:w-auto">
              Commencer
            </button>
          </form>
        </>
      )}
    </div>
  );
}
