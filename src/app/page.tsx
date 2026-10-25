import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/server";
import type { Module } from "@/lib/types";

// Rendered per request so newly approved modules show up at once (and the build needs no database).
export const dynamic = "force-dynamic";

export default async function Home() {
  const { data, error } = await createPublicClient()
    .from("modules")
    .select("*, questions(count)")
    .order("position");
  if (error) throw new Error(error.message);
  // RLS only exposes approved questions, so this count is what students can practise.
  const modules = (data ?? []) as (Module & { questions: { count: number }[] })[];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Modules</h1>
        <p className="mt-1 text-muted">
          Choisissez un module, répondez aux QCM des examens passés et voyez la correction tirée du cours.
        </p>
      </section>

      {modules.length === 0 ? (
        <p className="card p-6 text-muted">Aucun module pour le moment.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {modules.map((m) => {
            const count = m.questions[0]?.count ?? 0;
            return (
              <li key={m.id}>
                <Link href={`/modules/${m.slug}`} className="card block p-5 transition hover:border-accent">
                  <h2 className="font-semibold">{m.name}</h2>
                  {m.description && <p className="mt-1 text-sm text-muted">{m.description}</p>}
                  <p className="mt-3 text-sm font-medium text-accent">
                    {count} question{count > 1 ? "s" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
