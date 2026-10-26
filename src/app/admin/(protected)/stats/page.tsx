import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SEMESTERS, semesterLabel } from "@/lib/semesters";
import { fillDays, parseStatsFilters, periodStart, successRate, type DayRow } from "@/lib/stats";
import { createServiceClient } from "@/lib/supabase/server";

const MIN_ANSWERS = 10;
const LOW_SUCCESS = 20;

interface Overview {
  students_total: number;
  students_new: number;
  active_students: number;
  answers: number;
  first_answers: number;
  first_correct: number;
  questions_approved: number;
  questions_draft: number;
  open_reports: number;
  first_attempt_at: string | null;
}

interface ModuleRow {
  module_id: string;
  name: string;
  semester: number | null;
  questions: number;
  students: number;
  answers: number;
  first_answers: number;
  first_correct: number;
  questions_seen: number;
}

interface QuestionRow {
  question_id: string;
  module_name: string;
  statement: string;
  exam_year: number | null;
  exam_session: string | null;
  question_number: number | null;
  answers: number;
  correct: number;
  open_reports: number;
}

interface ChoiceRow {
  question_id: string;
  choice_id: string;
  label: string;
  choice_text: string;
  is_correct: boolean;
  picks: number;
}

function formatRate(rate: number | null) {
  return rate === null ? "—" : `${rate} %`;
}

function rateClass(rate: number | null) {
  if (rate === null) return "text-muted";
  if (rate < 40) return "text-bad";
  if (rate < 70) return "text-warn";
  return "text-good";
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Answers per day as bars; the correct share of each bar is drawn on top in the accent colour. */
function ActivityChart({ rows }: { rows: DayRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.answers));
  const width = 100 / rows.length;
  return (
    <div className="space-y-2">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Réponses par jour">
        {rows.map((r, i) => {
          const h = (r.answers / max) * 38;
          const hc = (r.correct / max) * 38;
          return (
            <g key={r.day}>
              <title>{`${r.day} : ${r.answers} réponses, ${r.correct} justes, ${r.students} étudiants`}</title>
              <rect x={i * width + width * 0.15} y={40 - h} width={width * 0.7} height={h} className="fill-line" />
              <rect x={i * width + width * 0.15} y={40 - hc} width={width * 0.7} height={hc} className="fill-accent" />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{rows[0]?.day}</span>
        <span>max {max} réponses / jour</span>
        <span>{rows.at(-1)?.day}</span>
      </div>
    </div>
  );
}

function questionLabel(q: QuestionRow) {
  return [q.module_name, q.exam_year, q.exam_session, q.question_number !== null ? `Q${q.question_number}` : null].filter(Boolean).join(" · ");
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; semestre?: string }>;
}) {
  await requireAdmin();
  const filters = parseStatsFilters(await searchParams);
  const since = periodStart(filters.days).toISOString();
  const chartDays = filters.days ?? 90;
  const db = createServiceClient();

  const [overviewRes, dailyRes, semesterRes, moduleRes, questionRes] = await Promise.all([
    db.rpc("admin_overview", { since }),
    db.rpc("admin_daily_activity", { since: periodStart(chartDays).toISOString() }),
    db.rpc("admin_students_by_semester"),
    db.rpc("admin_module_stats", { since, sem: filters.semester }),
    db.rpc("admin_question_stats", { since, sem: filters.semester, min_answers: MIN_ANSWERS }),
  ]);
  for (const res of [overviewRes, dailyRes, semesterRes, moduleRes, questionRes]) {
    if (res.error) throw new Error(`Statistiques indisponibles : ${res.error.message}. Avez-vous lancé la migration 0003 ?`);
  }

  const overview = overviewRes.data as Overview;
  const daily = fillDays((dailyRes.data ?? []) as DayRow[], chartDays);
  const bySemester = (semesterRes.data ?? []) as { semester: number | null; students: number }[];
  const modules = (moduleRes.data ?? []) as ModuleRow[];
  const questions = (questionRes.data ?? []) as QuestionRow[];

  const hardest = questions
    .filter((q) => q.answers >= MIN_ANSWERS)
    .sort((a, b) => a.correct / a.answers - b.correct / b.answers)
    .slice(0, 20);
  const toFix = questions
    .filter((q) => q.open_reports > 0 || (q.answers >= MIN_ANSWERS && (successRate(q.correct, q.answers) ?? 100) < LOW_SUCCESS))
    .sort((a, b) => b.open_reports - a.open_reports);

  const { data: choiceData, error: choiceError } = hardest.length
    ? await db.rpc("admin_choice_distribution", { question_ids: hardest.map((q) => q.question_id), since })
    : { data: [], error: null };
  if (choiceError) throw new Error(choiceError.message);
  const choicesByQuestion = new Map<string, ChoiceRow[]>();
  for (const c of (choiceData ?? []) as ChoiceRow[]) {
    choicesByQuestion.set(c.question_id, [...(choicesByQuestion.get(c.question_id) ?? []), c]);
  }

  const maxSemester = Math.max(1, ...bySemester.map((s) => s.students));
  const periodText = filters.days ? `${filters.days} derniers jours` : "depuis le début";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Statistiques</h1>
          <p className="text-sm text-muted">
            {overview.first_attempt_at
              ? `Réponses enregistrées depuis le ${new Date(overview.first_attempt_at).toLocaleDateString("fr-FR")}.`
              : "Aucune réponse enregistrée pour l'instant : les chiffres apparaîtront dès que les étudiants feront des QCM."}
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2 text-sm">
          <select name="periode" defaultValue={filters.days ? String(filters.days) : "tout"} className="input w-auto">
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="tout">Depuis le début</option>
          </select>
          <select name="semestre" defaultValue={filters.semester ?? ""} className="input w-auto">
            <option value="">Tous les semestres</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {semesterLabel(s)}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost">
            Filtrer
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Étudiants inscrits" value={overview.students_total} hint={`+${overview.students_new} sur la période`} />
        <StatCard label="Étudiants actifs" value={overview.active_students} hint={periodText} />
        <StatCard label="Réponses" value={overview.answers} hint={periodText} />
        <StatCard
          label="Réussite (1re tentative)"
          value={formatRate(successRate(overview.first_correct, overview.first_answers))}
          hint={`${overview.first_answers} premières réponses`}
        />
        <StatCard label="Questions publiées" value={overview.questions_approved} />
        <StatCard label="Questions à vérifier" value={overview.questions_draft} />
        <StatCard label="Signalements ouverts" value={overview.open_reports} />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Activité ({chartDays} derniers jours)</h2>
        <ActivityChart rows={daily} />
        <p className="flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 bg-accent" /> justes
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 bg-line" /> fausses
          </span>
        </p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Étudiants par semestre</h2>
        {bySemester.length === 0 ? (
          <p className="text-sm text-muted">Aucun étudiant inscrit.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {bySemester.map((s) => (
              <li key={s.semester ?? "none"} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-muted">{s.semester ? `S${s.semester}` : "Non renseigné"}</span>
                <span className="h-3 rounded bg-accent" style={{ width: `${(s.students / maxSemester) * 70}%` }} />
                <span className="tabular-nums">{s.students}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Modules</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-normal">Module</th>
                <th className="px-4 py-2 font-normal">Questions</th>
                <th className="px-4 py-2 font-normal">Étudiants</th>
                <th className="px-4 py-2 font-normal">Réponses</th>
                <th className="px-4 py-2 font-normal">Couverture</th>
                <th className="px-4 py-2 font-normal">Réussite</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => {
                const rate = successRate(m.first_correct, m.first_answers);
                return (
                  <tr key={m.module_id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/admin/modules/${m.module_id}`} className="font-medium hover:text-accent">
                        {m.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted">{m.semester ? `S${m.semester}` : "Tous"}</span>
                    </td>
                    <td className="px-4 py-2 tabular-nums">{m.questions}</td>
                    <td className="px-4 py-2 tabular-nums">{m.students}</td>
                    <td className="px-4 py-2 tabular-nums">{m.answers}</td>
                    <td className="px-4 py-2 tabular-nums">{formatRate(successRate(m.questions_seen, m.questions))}</td>
                    <td className={`px-4 py-2 tabular-nums ${rateClass(rate)}`}>{formatRate(rate)}</td>
                  </tr>
                );
              })}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-muted">
                    Aucun module.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Couverture : part des questions publiées auxquelles au moins un étudiant a répondu. Réussite : première tentative
          de chaque étudiant.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Questions à corriger</h2>
        {toFix.length === 0 ? (
          <p className="card p-4 text-sm text-muted">
            Rien à signaler : aucun signalement ouvert et aucune question sous {LOW_SUCCESS} % de réussite.
          </p>
        ) : (
          <ul className="card divide-y divide-line">
            {toFix.map((q) => {
              const rate = successRate(q.correct, q.answers);
              return (
                <li key={q.question_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">{questionLabel(q)}</p>
                    <p className="line-clamp-2">{q.statement}</p>
                    <p className="mt-1 text-xs">
                      {q.open_reports > 0 && <span className="mr-3 text-bad">{q.open_reports} signalement(s)</span>}
                      {rate !== null && q.answers >= MIN_ANSWERS && rate < LOW_SUCCESS && (
                        <span className="text-warn">{rate} % de réussite : vérifier la bonne réponse</span>
                      )}
                    </p>
                  </div>
                  <Link href={`/admin/review?q=${q.question_id}`} className="btn btn-ghost">
                    Corriger
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Questions les plus difficiles</h2>
        <p className="text-sm text-muted">
          Questions avec au moins {MIN_ANSWERS} réponses, de la moins réussie à la plus réussie. Les barres montrent la part
          d&apos;étudiants qui ont coché chaque proposition.
        </p>
        {hardest.length === 0 ? (
          <p className="card p-4 text-sm text-muted">Pas encore assez de réponses.</p>
        ) : (
          <ol className="space-y-3">
            {hardest.map((q) => {
              const rate = successRate(q.correct, q.answers);
              return (
                <li key={q.question_id} className="card space-y-3 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted">{questionLabel(q)}</p>
                      <p className="line-clamp-3 font-medium">{q.statement}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold tabular-nums ${rateClass(rate)}`}>{formatRate(rate)}</p>
                      <p className="text-xs text-muted">{q.answers} réponses</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {(choicesByQuestion.get(q.question_id) ?? []).map((c) => {
                      const share = successRate(c.picks, q.answers) ?? 0;
                      return (
                        <li key={c.choice_id} className="flex items-center gap-2">
                          <span className={`w-6 shrink-0 font-semibold ${c.is_correct ? "text-good" : "text-muted"}`}>
                            {c.label}
                          </span>
                          <span className="relative h-5 flex-1 overflow-hidden rounded bg-line/50">
                            <span
                              className={`absolute inset-y-0 left-0 ${c.is_correct ? "bg-good-soft" : "bg-bad-soft"}`}
                              style={{ width: `${share}%` }}
                            />
                            <span className="relative block truncate px-2 text-xs leading-5">{c.choice_text}</span>
                          </span>
                          <span className="w-10 shrink-0 text-right text-xs tabular-nums">{share} %</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href={`/admin/review?q=${q.question_id}`} className="inline-block text-accent underline">
                    Modifier la question
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
