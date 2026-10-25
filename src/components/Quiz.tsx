"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { reportQuestion } from "@/app/actions";
import { loadProgress, recordAnswer } from "@/lib/progress";
import { choiceState, isAnswerCorrect, scoreSummary, type ChoiceState } from "@/lib/scoring";
import type { QuestionWithChoices } from "@/lib/types";

type Mode = "practice" | "exam";

const choiceStyles: Record<ChoiceState, string> = {
  correct: "border-good bg-good-soft",
  wrong: "border-bad bg-bad-soft",
  missed: "border-warn bg-warn-soft",
  neutral: "border-line opacity-70",
};

const choiceTags: Record<ChoiceState, string> = {
  correct: "Bonne réponse",
  wrong: "Fausse",
  missed: "Oubliée",
  neutral: "",
};

function examLabel(q: QuestionWithChoices) {
  return [q.exam_year, q.exam_session, q.number !== null ? `Q${q.number}` : null].filter(Boolean).join(" · ");
}

function ChoiceList({
  question,
  selected,
  revealed,
  onToggle,
}: {
  question: QuestionWithChoices;
  selected: ReadonlySet<string>;
  revealed: boolean;
  onToggle?: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {question.choices.map((c) => {
        const state = choiceState(c, selected);
        const picked = selected.has(c.id);
        return (
          <li key={c.id}>
            <button
              type="button"
              disabled={revealed || !onToggle}
              onClick={() => onToggle?.(c.id)}
              aria-pressed={picked}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition ${
                revealed
                  ? choiceStyles[state]
                  : picked
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:border-accent"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-semibold ${
                  picked ? "border-accent bg-accent text-on-accent" : "border-line"
                }`}
              >
                {c.label}
              </span>
              <span className="flex-1">{c.text}</span>
              {revealed && choiceTags[state] && (
                <span className="shrink-0 text-xs font-medium">{choiceTags[state]}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ReportButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | string>("idle");

  if (status === "sent") return <p className="text-xs text-muted">Merci, le signalement a été envoyé.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline hover:text-foreground">
        Signaler une erreur
      </button>
    );
  }
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("sending");
        const res = await reportQuestion(questionId, message);
        setStatus(res.error ?? "sent");
      }}
    >
      <textarea
        className="input min-h-20"
        placeholder="Quelle est l'erreur ? (réponse, énoncé, explication…)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        required
      />
      <div className="flex items-center gap-2">
        <button type="submit" className="btn btn-ghost" disabled={status === "sending"}>
          Envoyer
        </button>
        {status !== "idle" && status !== "sending" && <span className="text-xs text-bad">{status}</span>}
      </div>
    </form>
  );
}

function Correction({ question, correct }: { question: QuestionWithChoices; correct: boolean }) {
  const correctLabels = question.choices.filter((c) => c.is_correct).map((c) => c.label);
  return (
    <div className="space-y-3 rounded-lg border border-line bg-background p-4 text-sm">
      <p className={`font-semibold ${correct ? "text-good" : "text-bad"}`}>
        {correct ? "Correct — 1 point" : "Incorrect — 0 point"}
      </p>
      <p>
        <span className="text-muted">Réponse{correctLabels.length > 1 ? "s" : ""} correcte{correctLabels.length > 1 ? "s" : ""} : </span>
        <strong>{correctLabels.join(", ")}</strong>
      </p>
      {question.explanation && <p className="whitespace-pre-line">{question.explanation}</p>}
      {question.lesson_excerpt && (
        <figure className="border-l-4 border-accent bg-accent-soft p-3">
          <blockquote className="whitespace-pre-line italic">« {question.lesson_excerpt} »</blockquote>
          {question.lesson_title && (
            <figcaption className="mt-2 text-xs text-muted">
              Cours : {question.lesson_title}
              {question.lesson_page ? `, p. ${question.lesson_page}` : ""}
            </figcaption>
          )}
        </figure>
      )}
      <ReportButton questionId={question.id} />
    </div>
  );
}

export function Quiz({
  moduleId,
  moduleSlug,
  questions,
  mode,
  onlyWrong,
}: {
  moduleId: string;
  moduleSlug: string;
  questions: QuestionWithChoices[];
  mode: Mode;
  onlyWrong: boolean;
}) {
  // With onlyWrong the list depends on localStorage, so it is resolved after mount.
  const [list, setList] = useState<QuestionWithChoices[] | null>(onlyWrong ? null : questions);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!onlyWrong) return;
    const progress = loadProgress(moduleId);
    setList(questions.filter((q) => progress[q.id] && !progress[q.id].correct));
  }, [onlyWrong, moduleId, questions]);

  const results = useMemo(() => {
    if (!list) return [];
    return list
      .filter((q) => answers[q.id])
      .map((q) => ({ q, correct: isAnswerCorrect(q.choices, new Set(answers[q.id])) }));
  }, [list, answers]);

  if (!list) return <p className="card p-6 text-muted">Chargement…</p>;
  if (list.length === 0) {
    return (
      <div className="card space-y-3 p-6">
        <p>Aucune erreur à revoir. Bravo !</p>
        <Link href={`/modules/${moduleSlug}`} className="btn btn-ghost">
          Retour au module
        </Link>
      </div>
    );
  }

  const restart = (subset: QuestionWithChoices[]) => {
    setList(subset);
    setIndex(0);
    setSelected(new Set());
    setRevealed(false);
    setAnswers({});
    setFinished(false);
    window.scrollTo({ top: 0 });
  };

  if (finished) {
    const summary = scoreSummary(results.map((r) => r.correct));
    const wrong = results.filter((r) => !r.correct);
    return (
      <div className="space-y-4">
        <div className="card p-6 text-center">
          <p className="text-sm text-muted">Score</p>
          <p className="text-4xl font-semibold">
            {summary.score}/{summary.total}
          </p>
          <p className="mt-1 text-muted">{summary.percent} %</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {wrong.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={() => restart(wrong.map((r) => r.q))}>
                Refaire les {wrong.length} erreur{wrong.length > 1 ? "s" : ""}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => restart(list)}>
              Recommencer
            </button>
            <Link href={`/modules/${moduleSlug}`} className="btn btn-ghost">
              Retour au module
            </Link>
          </div>
        </div>

        {(mode === "exam" ? results : wrong).map(({ q, correct }, i) => (
          <details key={q.id} className="card p-4" open={mode === "exam" && !correct}>
            <summary className="cursor-pointer text-sm">
              <span className={correct ? "text-good" : "text-bad"}>{correct ? "✓" : "✗"}</span>{" "}
              <span className="font-medium">Question {i + 1}</span>{" "}
              <span className="text-muted">{examLabel(q)}</span>
            </summary>
            <div className="mt-3 space-y-3">
              <p className="whitespace-pre-line">{q.statement}</p>
              <ChoiceList question={q} selected={new Set(answers[q.id])} revealed />
              <Correction question={q} correct={correct} />
            </div>
          </details>
        ))}
      </div>
    );
  }

  const q = list[index];
  const isLast = index === list.length - 1;
  const answeredCorrectly = revealed && isAnswerCorrect(q.choices, selected);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goNext = () => {
    if (isLast) {
      setFinished(true);
      window.scrollTo({ top: 0 });
      return;
    }
    setIndex(index + 1);
    setSelected(new Set());
    setRevealed(false);
    window.scrollTo({ top: 0 });
  };

  const validate = () => {
    const correct = isAnswerCorrect(q.choices, selected);
    recordAnswer(moduleId, q.id, correct);
    setAnswers((prev) => ({ ...prev, [q.id]: [...selected] }));
    if (mode === "practice") setRevealed(true);
    else goNext();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Question {index + 1}/{list.length}
        </span>
        <span>{examLabel(q)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-accent transition-all" style={{ width: `${(index / list.length) * 100}%` }} />
      </div>

      <div className="card space-y-4 p-5">
        <p className="whitespace-pre-line font-medium">{q.statement}</p>
        <ChoiceList question={q} selected={selected} revealed={revealed} onToggle={toggle} />
        {revealed && <Correction question={q} correct={answeredCorrectly} />}
        <div className="flex justify-end">
          {revealed ? (
            <button type="button" className="btn btn-primary" onClick={goNext}>
              {isLast ? "Voir le score" : "Question suivante"}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={validate} disabled={selected.size === 0}>
              Valider
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
