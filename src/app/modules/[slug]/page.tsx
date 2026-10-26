import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleProgress } from "@/components/ModuleProgress";
import { SampleQuestion } from "@/components/SampleQuestion";
import { getUser } from "@/lib/auth";
import { loadModuleProgress } from "@/lib/progress-server";
import { getPublicModule, summariseExams, type ExamSummary } from "@/lib/public-content";
import { semesterLabel } from "@/lib/semesters";
import { SITE_URL, jsonLd } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/server";
import type { Module } from "@/lib/types";

type Params = Promise<{ slug: string }>;

const examLabel = (e: ExamSummary) => [e.year ?? "Année inconnue", e.session].filter(Boolean).join(" — ");

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicModule(slug);
  if (!data) return { title: "Module introuvable", robots: { index: false } };
  const { module: mod, exams } = data;
  const years = exams.map((e) => e.year).filter((y): y is number => y !== null);
  const range = years.length ? ` (${Math.min(...years)}–${Math.max(...years)})` : "";
  return {
    title: `QCM ${mod.name} — annales corrigées, Médecine Fès`,
    description: `${mod.questionCount} QCM d'examen de ${mod.name}${range} à la Faculté de Médecine de Fès, avec la correction et l'extrait du cours. Exemples gratuits.`,
    alternates: { canonical: `/modules/${mod.slug}` },
    openGraph: { url: `/modules/${mod.slug}`, title: `QCM ${mod.name} — annales corrigées` },
  };
}

export default async function ModulePage({ params }: { params: Params }) {
  const { slug } = await params;
  const user = await getUser();
  return user ? <StudentModule slug={slug} /> : <PublicModule slug={slug} />;
}

/** Logged-out view: indexable landing page with a few sample questions. */
async function PublicModule({ slug }: { slug: string }) {
  const data = await getPublicModule(slug);
  if (!data) notFound();
  const { module: mod, exams, samples } = data;
  const signUp = `/inscription?next=${encodeURIComponent(`/modules/${mod.slug}`)}`;
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Modules", item: `${SITE_URL}/modules` },
      { "@type": "ListItem", position: 3, name: mod.name, item: `${SITE_URL}/modules/${mod.slug}` },
    ],
  };

  return (
    <div className="space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }} />
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
        <Link href="/modules" className="link-quiet">
          Modules
        </Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{mod.name}</span>
      </nav>

      <header className="space-y-4">
        <p className="eyebrow">{mod.semester ? semesterLabel(mod.semester) : "Tous semestres"} · Médecine Fès</p>
        <h1 className="display">QCM de {mod.name} : annales corrigées</h1>
        <p className="lead">
          {mod.description ??
            `Les questions des examens passés de ${mod.name} à la Faculté de Médecine de Fès, corrigées avec l'extrait exact du cours.`}
        </p>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-muted">Questions</dt>
            <dd className="text-2xl font-semibold">{mod.questionCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Examens</dt>
            <dd className="text-2xl font-semibold">{exams.length}</dd>
          </div>
        </dl>
        <Link href={signUp} className="btn btn-primary btn-lg">
          Faire les {mod.questionCount} QCM gratuitement
        </Link>
      </header>

      {exams.length > 0 && (
        <section className="space-y-3" aria-labelledby="exams-title">
          <h2 id="exams-title" className="heading">
            Examens disponibles
          </h2>
          <ul className="flex flex-wrap gap-2">
            {exams.map((e) => (
              <li key={`${e.year}|${e.session}`} className="chip">
                {examLabel(e)} · {e.count} QCM
              </li>
            ))}
          </ul>
        </section>
      )}

      {samples.length > 0 && (
        <section className="space-y-4" aria-labelledby="samples-title">
          <h2 id="samples-title" className="heading">
            Exemples de questions corrigées
          </h2>
          {samples.map((q, i) => (
            <SampleQuestion key={q.id} question={q} index={i} />
          ))}
        </section>
      )}

      <section className="card flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="heading">Continuer avec les {mod.questionCount} questions</h2>
          <p className="text-muted">Compte gratuit : progression enregistrée, erreurs à refaire, mode examen.</p>
        </div>
        <Link href={signUp} className="btn btn-primary btn-lg shrink-0">
          Créer mon compte
        </Link>
      </section>
    </div>
  );
}

/** Logged-in view: progress and a form to start a series. */
async function StudentModule({ slug }: { slug: string }) {
  const db = await createSessionClient();
  const { data: moduleData } = await db.from("modules").select("*").eq("slug", slug).maybeSingle();
  if (!moduleData) notFound();
  const mod = moduleData as Module;

  const { data: rows, error } = await db.from("questions").select("id, exam_year, exam_session").eq("module_id", mod.id);
  if (error) throw new Error(error.message);
  const questions = rows ?? [];
  const progress = await loadModuleProgress(mod.id);
  const answered = questions.filter((q) => progress[q.id]);
  const correct = answered.filter((q) => progress[q.id].correct).length;

  // Group by exam (year + session) so students can practise one paper at a time.
  const examList = summariseExams(questions);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/modules" className="link-quiet inline-flex min-h-11 items-center text-sm">
          ← Modules
        </Link>
        <h1 className="title">{mod.name}</h1>
        {mod.description && <p className="mt-1 text-muted">{mod.description}</p>}
      </div>

      {questions.length === 0 ? (
        <p className="card text-muted">Les questions de ce module arrivent bientôt.</p>
      ) : (
        <>
          <ModuleProgress
            moduleId={mod.id}
            slug={mod.slug}
            total={questions.length}
            correct={correct}
            wrong={answered.length - correct}
          />

          <form action={`/modules/${mod.slug}/quiz`} method="get" className="card space-y-5">
            <h2 className="heading">Nouvelle série</h2>
            <label className="field">
              <span className="field-label">Examen</span>
              <select name="exam" className="input">
                <option value="">Tous les examens ({questions.length} questions)</option>
                {examList.map((e) => (
                  <option key={`${e.year ?? ""}|${e.session ?? ""}`} value={`${e.year ?? ""}|${e.session ?? ""}`}>
                    {examLabel(e)} ({e.count})
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="field-label">Mode</legend>
              <label className="option">
                <input type="radio" name="mode" value="practice" defaultChecked />
                <span>
                  <strong>Entraînement</strong>
                  <span className="block text-sm text-muted">Correction après chaque question</span>
                </span>
              </label>
              <label className="option">
                <input type="radio" name="mode" value="exam" />
                <span>
                  <strong>Examen</strong>
                  <span className="block text-sm text-muted">Toutes les corrections à la fin</span>
                </span>
              </label>
            </fieldset>
            <label className="option">
              <input type="checkbox" name="shuffle" value="1" />
              <span>Ordre aléatoire</span>
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
