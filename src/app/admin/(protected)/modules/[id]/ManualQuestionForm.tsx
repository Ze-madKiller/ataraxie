"use client";

import { useState, useTransition } from "react";
import { createQuestion } from "@/app/admin/actions";

const emptyChoices = () => ["A", "B", "C", "D", "E"].map((label) => ({ label, text: "", is_correct: false }));

export function ManualQuestionForm({ moduleId, lessonTitles }: { moduleId: string; lessonTitles: string[] }) {
  // Exam and lesson fields stay filled between questions: you usually type a whole paper in a row.
  const [year, setYear] = useState("");
  const [session, setSession] = useState("Normale");
  const [number, setNumber] = useState("");
  const [statement, setStatement] = useState("");
  const [choices, setChoices] = useState(emptyChoices);
  const [explanation, setExplanation] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonPage, setLessonPage] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [added, setAdded] = useState(0);
  const [pending, startTransition] = useTransition();

  const updateChoice = (i: number, patch: Partial<(typeof choices)[number]>) =>
    setChoices((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const submit = (status: "draft" | "approved") =>
    startTransition(async () => {
      setMessage(null);
      const res = await createQuestion({
        moduleId,
        examYear: /^\d{4}$/.test(year.trim()) ? Number(year.trim()) : null,
        examSession: session || null,
        number: /^\d+$/.test(number.trim()) ? Number(number.trim()) : null,
        statement,
        explanation,
        lesson_excerpt: excerpt,
        lesson_title: lessonTitle,
        lesson_page: /^\d+$/.test(lessonPage.trim()) ? Number(lessonPage.trim()) : null,
        choices,
        status,
      });
      if (res.error) {
        setMessage({ kind: "error", text: res.error });
        return;
      }
      setAdded((n) => n + 1);
      setMessage({ kind: "ok", text: status === "approved" ? "Question publiée." : "Brouillon enregistré." });
      setStatement("");
      setChoices(emptyChoices());
      setExplanation("");
      setExcerpt("");
      setLessonPage("");
      if (/^\d+$/.test(number.trim())) setNumber(String(Number(number.trim()) + 1));
    });

  return (
    <details className="card p-5" open>
      <summary className="cursor-pointer font-semibold">
        Ajouter une question à la main{added > 0 && <span className="font-normal text-muted"> · {added} ajoutée{added > 1 ? "s" : ""}</span>}
      </summary>

      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Année</span>
            <input className="input" inputMode="numeric" placeholder="ex. 2024" value={year} onChange={(e) => setYear(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Session</span>
            <select className="input" value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="Normale">Normale</option>
              <option value="Rattrapage">Rattrapage</option>
              <option value="">Non précisée</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">N° de question</span>
            <input className="input" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-muted">Énoncé</span>
          <textarea className="input min-h-24" value={statement} onChange={(e) => setStatement(e.target.value)} />
        </label>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-muted">Propositions (cochez les bonnes réponses, laissez vides celles en trop)</legend>
          {choices.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={c.is_correct}
                onChange={(e) => updateChoice(i, { is_correct: e.target.checked })}
                className="mt-3 h-4 w-4 accent-[var(--good)]"
                aria-label={`Proposition ${c.label} correcte`}
              />
              <span className="mt-2 w-6 text-sm font-semibold">{c.label}</span>
              <textarea
                className={`input min-h-10 ${c.is_correct ? "border-good" : ""}`}
                rows={1}
                value={c.text}
                onChange={(e) => updateChoice(i, { text: e.target.value })}
              />
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
          <span className="mb-1 block text-muted">Explication (pourquoi chaque proposition est vraie ou fausse)</span>
          <textarea className="input min-h-20" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </label>

        <div className="space-y-2 text-sm">
          <span className="block text-muted">Extrait du cours du professeur</span>
          <textarea className="input min-h-20" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            <input
              className="input"
              placeholder="Titre du cours"
              list={`lessons-${moduleId}`}
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
            />
            <input className="input" placeholder="Page" inputMode="numeric" value={lessonPage} onChange={(e) => setLessonPage(e.target.value)} />
          </div>
          <datalist id={`lessons-${moduleId}`}>
            {lessonTitles.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => submit("approved")} disabled={pending}>
            Publier
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => submit("draft")} disabled={pending}>
            Enregistrer en brouillon
          </button>
          {message && <span className={`text-sm ${message.kind === "error" ? "text-bad" : "text-good"}`}>{message.text}</span>}
        </div>
      </div>
    </details>
  );
}
