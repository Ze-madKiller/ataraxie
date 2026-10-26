import Link from "next/link";
import { createModule } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { SEMESTERS, semesterLabel } from "@/lib/semesters";
import { createServiceClient } from "@/lib/supabase/server";
import type { Module } from "@/lib/types";

export default async function AdminHome() {
  await requireAdmin();
  const db = createServiceClient();
  const [{ data: modules, error }, { data: questions, error: qError }] = await Promise.all([
    db.from("modules").select("*").order("semester", { nullsFirst: false }).order("position"),
    db.from("questions").select("module_id, status"),
  ]);
  if (error) throw new Error(error.message);
  if (qError) throw new Error(qError.message);

  const counts = new Map<string, { draft: number; approved: number }>();
  for (const q of questions ?? []) {
    const c = counts.get(q.module_id) ?? { draft: 0, approved: 0 };
    if (q.status === "draft") c.draft++;
    if (q.status === "approved") c.approved++;
    counts.set(q.module_id, c);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Modules</h1>

      <ul className="space-y-2">
        {((modules ?? []) as Module[]).map((m) => {
          const c = counts.get(m.id) ?? { draft: 0, approved: 0 };
          return (
            <li key={m.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/modules/${m.id}`} className="font-semibold hover:text-accent">
                  {m.name}
                </Link>
                <p className="text-sm text-muted">
                  {m.semester ? `S${m.semester}` : "Tous semestres"} · {c.approved} publiées · {c.draft} à vérifier
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/modules/${m.id}`} className="btn btn-ghost">
                  Importer des PDF
                </Link>
                {c.draft > 0 && (
                  <Link href={`/admin/review?module=${m.id}`} className="btn btn-primary">
                    Vérifier ({c.draft})
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <form action={createModule} className="card space-y-3 p-5">
        <h2 className="font-semibold">Nouveau module</h2>
        <input name="name" className="input" placeholder="Nom, ex. Cardiologie" required />
        <input name="description" className="input" placeholder="Description (optionnelle)" />
        <select name="semester" className="input" defaultValue="">
          <option value="">Tous les semestres</option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {semesterLabel(s)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Créer le module
        </button>
      </form>
    </div>
  );
}
