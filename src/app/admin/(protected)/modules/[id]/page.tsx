import Link from "next/link";
import { notFound } from "next/navigation";
import { updateModuleSemester } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { SEMESTERS, semesterLabel } from "@/lib/semesters";
import { createServiceClient } from "@/lib/supabase/server";
import type { DocumentKind, DocumentRow, ImportJob, Module } from "@/lib/types";
import { DeleteDocumentButton } from "./DeleteDocumentButton";
import { DocumentUploader } from "./DocumentUploader";
import { ImportPanel } from "./ImportPanel";
import { ManualQuestionForm } from "./ManualQuestionForm";

const kindLabels: Record<DocumentKind, string> = {
  exam: "Examens",
  cours: "Cours du professeur",
  corrige: "Corrigés",
};

export default async function AdminModulePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = createServiceClient();

  const { data: moduleData } = await db.from("modules").select("*").eq("id", id).maybeSingle();
  if (!moduleData) notFound();
  const mod = moduleData as Module;

  const [{ data: docs, error: docsError }, { data: jobs, error: jobsError }] = await Promise.all([
    db.from("documents").select("*").eq("module_id", id).order("created_at"),
    db.from("import_jobs").select("*").eq("module_id", id).order("created_at"),
  ]);
  if (docsError) throw new Error(docsError.message);
  if (jobsError) throw new Error(jobsError.message);

  const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
  const documents = (docs ?? []) as DocumentRow[];
  const titles = new Map(documents.map((d) => [d.id, d.title]));
  const jobRows = ((jobs ?? []) as ImportJob[]).map((j) => ({
    id: j.id,
    status: j.status,
    doneChunks: j.done_chunks,
    totalChunks: j.chunks.length,
    questionsCreated: j.questions_created,
    error: j.error,
    examTitle: titles.get(j.exam_document_id) ?? "Examen",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-foreground">
            ← Modules
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{mod.name}</h1>
          <form action={updateModuleSemester} className="mt-2 flex items-center gap-2 text-sm">
            <input type="hidden" name="id" value={mod.id} />
            <select name="semester" defaultValue={mod.semester ?? ""} className="input w-auto">
              <option value="">Tous les semestres</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {semesterLabel(s)}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-ghost">
              Enregistrer
            </button>
          </form>
        </div>
        <Link href={`/admin/review?module=${mod.id}`} className="btn btn-primary">
          Vérifier les questions
        </Link>
      </div>

      <ManualQuestionForm
        moduleId={mod.id}
        lessonTitles={documents.filter((d) => d.kind === "cours").map((d) => d.title)}
      />

      {!aiEnabled && (
        <p className="card p-4 text-sm text-muted">
          Import automatique par l&apos;IA désactivé : ajoutez <code>ANTHROPIC_API_KEY</code> dans <code>.env.local</code>{" "}
          pour l&apos;activer. Vous pouvez déjà déposer les PDF ci-dessous pour les garder ici.
        </p>
      )}

      {aiEnabled && (
      <section className="card space-y-3 p-5 text-sm">
        <h2 className="text-base font-semibold">Comment importer</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>
            Déposez d&apos;abord les <strong>cours</strong> du professeur : l&apos;IA s&apos;en sert pour corriger.
          </li>
          <li>
            Déposez les <strong>corrigés</strong> s&apos;il y en a, avec la même année et session que l&apos;examen.
          </li>
          <li>
            Déposez les <strong>examens</strong> (année + session), puis lancez l&apos;import.
          </li>
          <li>Vérifiez chaque question dans l&apos;onglet Vérification avant publication.</li>
        </ol>
      </section>
      )}

      <DocumentUploader moduleId={mod.id} />

      {aiEnabled && <ImportPanel jobs={jobRows} />}

      {(Object.keys(kindLabels) as DocumentKind[]).map((kind) => {
        const list = documents.filter((d) => d.kind === kind);
        return (
          <section key={kind} className="space-y-2">
            <h2 className="font-semibold">
              {kindLabels[kind]} <span className="text-sm font-normal text-muted">({list.length})</span>
            </h2>
            {list.length === 0 ? (
              <p className="text-sm text-muted">Aucun fichier.</p>
            ) : (
              <ul className="card divide-y divide-line">
                {list.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-muted">
                        {[d.exam_year, d.exam_session, d.page_count ? `${d.page_count} pages` : null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <DeleteDocumentButton documentId={d.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
