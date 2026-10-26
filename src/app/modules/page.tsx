import type { Metadata } from "next";
import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { getProfile, getUser } from "@/lib/auth";
import { loadProgressSummary } from "@/lib/progress-server";
import { getPublicModules, type PublicModule } from "@/lib/public-content";
import { semesterLabel } from "@/lib/semesters";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Modules et annales de QCM — Médecine Fès",
  description:
    "Tous les modules de la Faculté de Médecine de Fès, semestre par semestre, avec les QCM des examens passés corrigés par le cours.",
  alternates: { canonical: "/modules" },
};

function ModuleCard({ m, done }: { m: PublicModule; done?: number }) {
  const count = m.questionCount;
  return (
    <Link href={`/modules/${m.slug}`} className="card card-link block h-full">
      <h3 className="heading">{m.name}</h3>
      {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{m.description}</p>}
      {done !== undefined && count > 0 ? (
        <div className="mt-4 space-y-1.5">
          <ProgressBar value={done} max={count} label={`Progression en ${m.name}`} animateIn />
          <p className="text-sm text-muted">
            {done}/{count} question{count > 1 ? "s" : ""} faite{done > 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm font-medium text-accent">
          {count} question{count > 1 ? "s" : ""}
        </p>
      )}
    </Link>
  );
}

function ModuleGrid({ modules, progress }: { modules: PublicModule[]; progress?: Record<string, number> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {modules.map((m, i) => (
        <li key={m.id} className="animate-rise" style={{ "--i": Math.min(i, 5) } as React.CSSProperties}>
          <ModuleCard m={m} done={progress ? (progress[m.id] ?? 0) : undefined} />
        </li>
      ))}
    </ul>
  );
}

function BySemester({ modules, progress }: { modules: PublicModule[]; progress?: Record<string, number> }) {
  const groups = new Map<number | null, PublicModule[]>();
  for (const m of modules) groups.set(m.semester, [...(groups.get(m.semester) ?? []), m]);
  return [...groups.entries()].map(([s, list]) => (
    <section key={s ?? "all"} className="space-y-3" aria-labelledby={`sem-${s ?? "all"}`}>
      <h2 id={`sem-${s ?? "all"}`} className="eyebrow">
        {s ? semesterLabel(s) : "Tous semestres"}
      </h2>
      <ModuleGrid modules={list} progress={progress} />
    </section>
  ));
}

export default async function ModulesPage({ searchParams }: { searchParams: SearchParams }) {
  const [user, all] = await Promise.all([getUser(), getPublicModules()]);

  if (!user) {
    return (
      <div className="space-y-8">
        <header className="space-y-3 animate-rise">
          <p className="eyebrow">Faculté de Médecine de Fès</p>
          <h1 className="display">Modules et annales de QCM</h1>
          <p className="lead">
            Choisissez un module pour voir les examens disponibles et des exemples de questions corrigées.
          </p>
        </header>
        {all.length === 0 ? <p className="card text-muted">Les modules arrivent bientôt.</p> : <BySemester modules={all} />}
      </div>
    );
  }

  const [profile, progress, sp] = await Promise.all([getProfile(user.id), loadProgressSummary(), searchParams]);
  const semester = profile?.semester ?? null;
  const showAll = sp.tous === "1" || semester === null;
  const visible = showAll ? all : all.filter((m) => m.semester === semester || m.semester === null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="title">
            {profile?.full_name ? `Bonjour ${profile.full_name.split(" ")[0]}` : "Mes modules"}
          </h1>
          <p className="mt-1 text-muted">
            {semester ? semesterLabel(semester) : "Aucun semestre choisi"} ·{" "}
            <Link href="/compte" className="underline hover:text-foreground">
              changer
            </Link>
          </p>
        </div>
        {semester !== null && (
          <Link href={showAll ? "/modules" : "/modules?tous=1"} className="btn btn-ghost">
            {showAll ? "Seulement mon semestre" : "Voir tous les semestres"}
          </Link>
        )}
      </div>

      {semester === null && (
        <p className="notice notice-warn">
          Choisissez votre semestre dans{" "}
          <Link href="/compte" className="font-medium underline">
            Mon compte
          </Link>{" "}
          pour voir d&apos;abord vos modules.
        </p>
      )}

      {visible.length === 0 ? (
        <div className="card space-y-3">
          <p className="text-muted">Pas encore de module pour ce semestre.</p>
          <Link href="/modules?tous=1" className="btn btn-ghost">
            Voir tous les semestres
          </Link>
        </div>
      ) : showAll ? (
        <BySemester modules={visible} progress={progress} />
      ) : (
        <ModuleGrid modules={visible} progress={progress} />
      )}
    </div>
  );
}
