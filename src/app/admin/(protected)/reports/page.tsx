import Link from "next/link";
import { resolveReport } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  await requireAdmin();
  const { data, error } = await createServiceClient()
    .from("question_reports")
    .select("id, message, created_at, question_id, questions(statement)")
    .eq("resolved", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const reports = (data ?? []) as unknown as {
    id: string;
    message: string;
    created_at: string;
    question_id: string;
    questions: { statement: string } | null;
  }[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Signalements</h1>
      {reports.length === 0 ? (
        <p className="card p-6 text-muted">Aucun signalement en attente.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="card space-y-2 p-4 text-sm">
              <p className="line-clamp-2 text-muted">{r.questions?.statement}</p>
              <p className="whitespace-pre-line">{r.message}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/admin/review?q=${r.question_id}`} className="btn btn-ghost">
                  Corriger la question
                </Link>
                <form action={resolveReport.bind(null, r.id)}>
                  <button type="submit" className="btn btn-ghost">
                    Marquer comme traité
                  </button>
                </form>
                <span className="ml-auto text-xs text-muted">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
