"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveQuestion, setQuestionStatus } from "@/app/admin/actions";
import type { Confidence, QuestionStatus, QuestionWithChoices } from "@/lib/types";

const confidenceStyles: Record<Confidence, string> = {
  high: "bg-good-soft text-good",
  medium: "bg-warn-soft text-warn",
  low: "bg-bad-soft text-bad",
};
const confidenceLabels: Record<Confidence, string> = { high: "Confiance haute", medium: "Confiance moyenne", low: "Confiance basse" };
const sourceLabels: Record<string, string> = {
  corrige: "Réponses du corrigé",
  exam: "Réponses marquées sur l'examen",
  ai: "Réponses déduites du cours par l'IA",
  manual: "Saisie manuelle",
};
const statusLabels: Record<QuestionStatus, string> = { draft: "À vérifier", approved: "Publiée", rejected: "Rejetée" };

export function ReviewCard({
  question,
  pdfUrl,
  aiEnabled = true,
}: {
  question: QuestionWithChoices;
  pdfUrl?: string;
  aiEnabled?: boolean;
}) {
  const router = useRouter();
  const [statement, setStatement] = useState(question.statement);
  const [choices, setChoices] = useState(
    question.choices.map((c) => ({ label: c.label, text: c.text, is_correct: c.is_correct })),
  );
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [excerpt, setExcerpt] = useState(question.lesson_excerpt ?? "");
  const [lessonTitle, setLessonTitle] = useState(question.lesson_title ?? "");
  const [lessonPage, setLessonPage] = useState(question.lesson_page?.toString() ?? "");
  const [isSample, setIsSample] = useState(question.is_sample ?? false);
  const [showPdf, setShowPdf] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = pending || regenerating;

  const updateChoice = (i: number, patch: Partial<(typeof choices)[number]>) =>
    setChoices((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const save = (status: QuestionStatus) =>
    startTransition(async () => {
      setMessage(null);
      const res = await saveQuestion({
        id: question.id,
        statement,
        explanation,
        lesson_excerpt: excerpt,
        lesson_title: lessonTitle,
        lesson_page: /^\d+$/.test(lessonPage) ? Number(lessonPage) : null,
        choices,
        status,
        is_sample: isSample,
      });
      if (res.error) setMessage({ kind: "error", text: res.error });
      else {
        setMessage({ kind: "ok", text: status === "approved" ? "Publiée." : "Enregistrée." });
        router.refresh();
      }
    });

  const reject = () =>
    startTransition(async () => {
      const res = await setQuestionStatus(question.id, "rejected");
      if (res.error) setMessage({ kind: "error", text: res.error });
      else router.refresh();
    });

  const regenerate = async () => {
    setRegenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/questions/${question.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setFeedback("");
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setRegenerating(false);
    }
  };

  const pdfPage = question.source_page ?? 1;

  return (
    <article className="card space-y-4 p-5">
      <header className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-sm">
          {[question.exam_year, question.exam_session, question.number !== null ? `Q${question.number}` : null]
            .filter(Boolean)
            .join(" · ") || "Question"}
        </span>
        {question.ai_confidence && (
          <span className={`rounded-full px-2 py-0.5 ${confidenceStyles[question.ai_confidence]}`}>
            {confidenceLabels[question.ai_confidence]}
          </span>
        )}
        {question.answer_source && (
          <span className="rounded-full bg-background px-2 py-0.5 text-muted">{sourceLabels[question.answer_source]}</span>
        )}
        <span className="rounded-full bg-background px-2 py-0.5 text-muted">{statusLabels[question.status]}</span>
        {pdfUrl && (
          <button type="button" onClick={() => setShowPdf((v) => !v)} className="ml-auto text-accent underline">
            {showPdf ? "Masquer le PDF" : `Voir la page ${pdfPage} du PDF`}
          </button>
        )}
      </header>

      {question.ai_notes && (
        <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          <strong>Note de l&apos;IA :</strong> {question.ai_notes}
        </p>
      )}

      {showPdf && pdfUrl && (
        <iframe
          src={`${pdfUrl}#page=${pdfPage}`}
          title="Page de l'examen"
          className="h-[480px] w-full rounded-lg border border-line"
        />
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-muted">Énoncé</span>
        <textarea className="input min-h-24" value={statement} onChange={(e) => setStatement(e.target.value)} />
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-muted">Propositions (cochez les bonnes réponses)</legend>
        {choices.map((c, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={c.is_correct}
              onChange={(e) => updateChoice(i, { is_correct: e.target.checked })}
              className="mt-3 h-4 w-4 accent-[var(--good)]"
              aria-label={`Proposition ${c.label} correcte`}
            />
            <input className="input w-14 text-center" value={c.label} onChange={(e) => updateChoice(i, { label: e.target.value })} />
            <textarea
              className={`input min-h-10 ${c.is_correct ? "border-good" : ""}`}
              rows={1}
              value={c.text}
              onChange={(e) => updateChoice(i, { text: e.target.value })}
            />
            <button
              type="button"
              className="mt-2 text-xs text-muted hover:text-bad"
              onClick={() => setChoices((prev) => prev.filter((_, j) => j !== i))}
              aria-label={`Supprimer la proposition ${c.label}`}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-accent underline"
          onClick={() =>
            setChoices((prev) => [...prev, { label: String.fromCharCode(65 + prev.length), text: "", is_correct: false }])
          }
        >
          + Ajouter une proposition
        </button>
      </fieldset>

      <label className="block text-sm">
        <span className="mb-1 block text-muted">Explication</span>
        <textarea className="input min-h-20" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </label>

      <div className="space-y-2 text-sm">
        <span className="block text-muted">Extrait du cours</span>
        <textarea className="input min-h-20" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
          <input className="input" placeholder="Titre du cours" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
          <input className="input" placeholder="Page" inputMode="numeric" value={lessonPage} onChange={(e) => setLessonPage(e.target.value)} />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={isSample} onChange={(e) => setIsSample(e.target.checked)} />
        <span>
          <strong>Question exemple (publique)</strong>
          <span className="block text-muted">
            Visible avec sa correction sur la page publique du module, sans compte. 3 au maximum par module.
          </span>
        </span>
      </label>

      {aiEnabled && question.exam_document_id && (
      <details className="rounded-lg border border-line p-3 text-sm">
        <summary className="cursor-pointer font-medium">Régénérer avec l&apos;IA</summary>
        <div className="mt-3 space-y-2">
          <textarea
            className="input min-h-16"
            placeholder="Optionnel : ce qui ne va pas (ex. « la réponse C est fausse selon le cours p. 12 »)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <button type="button" className="btn btn-ghost" onClick={regenerate} disabled={busy}>
            {regenerating ? "L'IA relit l'examen… (1 à 2 min)" : "Régénérer"}
          </button>
          <p className="text-xs text-muted">Remplace l&apos;énoncé, les propositions et la correction par la nouvelle version.</p>
        </div>
      </details>
      )}

      <footer className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" onClick={() => save("approved")} disabled={busy}>
          Approuver et publier
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => save(question.status)} disabled={busy}>
          Enregistrer
        </button>
        {question.status !== "rejected" && (
          <button type="button" className="btn btn-ghost text-bad" onClick={reject} disabled={busy}>
            Rejeter
          </button>
        )}
        {message && (
          <span className={`text-sm ${message.kind === "error" ? "text-bad" : "text-good"}`}>{message.text}</span>
        )}
      </footer>
    </article>
  );
}
