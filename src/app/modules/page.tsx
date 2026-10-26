import Link from "next/link";
import { getProfile, requireUser } from "@/lib/auth";
import { semesterLabel } from "@/lib/semesters";
import { createSessionClient } from "@/lib/supabase/server";
import type { Module } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ModuleWithCount = Module & { questions: { count: number }[] };

function ModuleCard({ m }: { m: ModuleWithCount }) {
  const count = m.questions[0]?.count ?? 0;
  return (
    <Link href={`/modules/${m.slug}`} className="card block h-full p-5 transition hover:border-accent">
      <h3 className="font-semibold">{m.name}</h3>
      {m.description && <p className="mt-1 text-sm text-muted">{m.description}</p>}
      <p className="mt-3 text-sm font-medium text-accent">
        {count} question{count > 1 ? "s" : ""}
      </p>
    </Link>
  );
}

export default async function ModulesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/modules");
  const profile = await getProfile(user.id);
  const sp = await searchParams;
  const semester = profile?.semester ?? null;
  const showAll = sp.tous === "1" || semester === null;

  const session = await createSessionClient();
  const { data, error } = await session
    .from("modules")
    .select("*, questions(count)")
    .order("semester", { nullsFirst: false })
    .order("position");
  if (error) throw new Error(error.message);
  // RLS only exposes approved questions, so the counts are what students can practise.
  const all = (data ?? []) as ModuleWithCount[];
  const visible = showAll ? all : all.filter((m) => m.semester === semester || m.semester === null);

  // When showing everything, group by semester so the list stays readable.
  const groups = new Map<number | null, ModuleWithCount[]>();
  for (const m of visible) groups.set(m.semester, [...(groups.get(m.semester) ?? []), m]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
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
        <p className="rounded-lg bg-warn-soft p-4 text-sm text-warn">
          Choisissez votre semestre dans{" "}
          <Link href="/compte" className="font-medium underline">
            Mon compte
          </Link>{" "}
          pour voir d&apos;abord vos modules.
        </p>
      )}

      {visible.length === 0 ? (
        <div className="card space-y-3 p-6">
          <p className="text-muted">Pas encore de module pour ce semestre.</p>
          <Link href="/modules?tous=1" className="btn btn-ghost">
            Voir tous les semestres
          </Link>
        </div>
      ) : showAll ? (
        [...groups.entries()].map(([s, list]) => (
          <section key={s ?? "all"} className="space-y-3">
            <h2 className="font-semibold">{s ? semesterLabel(s) : "Tous semestres"}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((m) => (
                <li key={m.id}>
                  <ModuleCard m={m} />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((m) => (
            <li key={m.id}>
              <ModuleCard m={m} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
