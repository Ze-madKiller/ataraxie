import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { DocumentRow, Module, QuestionWithChoices } from "@/lib/types";
import { ReviewCard } from "./ReviewCard";

const PAGE_SIZE = 25;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReviewPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const param = (name: string) => (typeof sp[name] === "string" ? (sp[name] as string) : "");
  const moduleId = param("module");
  const status = param("status") || "draft";
  const confidence = param("confidence");
  const single = param("q");
  const page = Math.max(1, Number(param("page")) || 1);

  const db = createServiceClient();
  const { data: modules } = await db.from("modules").select("*").order("position");

  let query = db
    .from("questions")
    .select("*, choices(*)", { count: "exact" })
    .order("exam_year", { ascending: false, nullsFirst: false })
    .order("exam_session")
    .order("number", { nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (single) {
    query = query.eq("id", single);
  } else {
    if (moduleId) query = query.eq("module_id", moduleId);
    if (status !== "all") query = query.eq("status", status);
    if (confidence) query = query.eq("ai_confidence", confidence);
  }
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const questions = (data ?? []) as QuestionWithChoices[];
  for (const q of questions) q.choices.sort((a, b) => a.position - b.position);

  // Short-lived links so the reviewer can open the exact exam page next to each question.
  const examIds = [...new Set(questions.map((q) => q.exam_document_id).filter((id): id is string => !!id))];
  const pdfUrls: Record<string, string> = {};
  if (examIds.length > 0) {
    const { data: exams } = await db.from("documents").select("id, storage_path").in("id", examIds);
    const docs = (exams ?? []) as Pick<DocumentRow, "id" | "storage_path">[];
    if (docs.length > 0) {
      const { data: signed } = await db.storage
        .from("documents")
        .createSignedUrls(docs.map((d) => d.storage_path), 3600);
      docs.forEach((d, i) => {
        const url = signed?.[i]?.signedUrl;
        if (url) pdfUrls[d.id] = url;
      });
    }
  }

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (moduleId) params.set("module", moduleId);
    if (status) params.set("status", status);
    if (confidence) params.set("confidence", confidence);
    params.set("page", String(p));
    return `/admin/review?${params}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Vérification</h1>

      <form method="get" className="card grid gap-3 p-4 sm:grid-cols-4">
        <select name="module" defaultValue={moduleId} className="input">
          <option value="">Tous les modules</option>
          {((modules ?? []) as Module[]).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="input">
          <option value="draft">À vérifier</option>
          <option value="approved">Publiées</option>
          <option value="rejected">Rejetées</option>
          <option value="all">Toutes</option>
        </select>
        <select name="confidence" defaultValue={confidence} className="input">
          <option value="">Toute confiance</option>
          <option value="low">Confiance basse</option>
          <option value="medium">Confiance moyenne</option>
          <option value="high">Confiance haute</option>
        </select>
        <button type="submit" className="btn btn-ghost">
          Filtrer
        </button>
      </form>

      <p className="text-sm text-muted">
        {total} question{total > 1 ? "s" : ""}
        {pages > 1 && ` · page ${page}/${pages}`}
      </p>

      {questions.length === 0 ? (
        <p className="card p-6 text-muted">Rien à vérifier ici.</p>
      ) : (
        <ul className="space-y-4">
          {questions.map((q) => (
            <li key={q.id}>
              <ReviewCard
                // Remount after a save or regeneration so the form shows the stored version.
                key={q.updated_at}
                question={q}
                pdfUrl={q.exam_document_id ? pdfUrls[q.exam_document_id] : undefined}
                aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
              />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex justify-between">
          {page > 1 ? (
            <Link href={link(page - 1)} className="btn btn-ghost">
              ← Précédentes
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={link(page + 1)} className="btn btn-ghost">
              Suivantes →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
