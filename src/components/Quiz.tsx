"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { recordAttempt, reportQuestion } from "@/app/actions";
import { choiceState, isAnswerCorrect, scoreSummary, type ChoiceState } from "@/lib/scoring";
import type { QuestionWithChoices } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";

type Mode = "practice" | "exam";

// Colour is never the only signal: every revealed state also has an icon and a text tag.
const choiceStyles: Record<ChoiceState, string> = {
  correct: "border-good bg-good-soft",
  wrong: "border-bad bg-bad-soft",
  missed: "border-warn bg-warn-soft",
  neutral: "border-line",
};

const choiceTags: Record<ChoiceState, { icon: string; text: string; color: string } | null> = {
  correct: { icon: "✓", text: "Bonne réponse", color: "text-good" },
  wrong: { icon: "✗", text: "Fausse", color: "text-bad" },
  missed: { icon: "!", text: "Oubliée", color: "text-warn" },
  neutral: null,
};

function examLabel(q: QuestionWithChoices) {
  return [q.exam_year, q.exam_session, q.number !== null ? `Q${q.number}` : null].filter(Boolean).join(" · ");
}

function ChoiceList({
  question,
  selected,
  revealed,
  onToggle,
  labelledBy,
}: {
  question: QuestionWithChoices;
  selected: ReadonlySet<string>;
  revealed: boolean;
  onToggle?: (id: string) => void;
  labelledBy?: string;
}) {
  const hintId = useId();
  const interactive = Boolean(onToggle) && !revealed;
  return (
    <fieldset aria-labelledby={labelledBy} aria-describedby={interactive ? hintId : undefined} className="space-y-2.5">
      {interactive && (
        <p id={hintId} className="text-sm text-muted">
          Plusieurs réponses possibles. Cochez toutes les bonnes.
        </p>
      )}
      {question.choices.map((c) => {
        const state = choiceState(c, selected);
        const picked = selected.has(c.id);
        const tag = revealed ? choiceTags[state] : null;
        return (
          <label
            key={c.id}
            className={`choice ${revealed ? `${choiceStyles[state]} cursor-default` : picked ? "border-accent bg-accent-soft" : ""}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={picked}
              disabled={!interactive}
              onChange={() => onToggle?.(c.id)}
            />
            <span
              aria-hidden
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] text-sm font-semibold ${
                picked ? "border-accent bg-accent text-on-accent" : "border-control text-muted"
              }`}
            >
              {c.label}
            </span>
            <span className="flex-1">
              <span className="sr-only">{c.label}. </span>
              {c.text}
            </span>
            {tag && (
              <span className={`shrink-0 text-sm font-semibold ${tag.color}`}>
                <span aria-hidden>{tag.icon} </span>
                {tag.text}
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

function ReportButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | string>("idle");
  const fieldId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const sent = useRef<HTMLParagraphElement>(null);
  const wasOpen = useRef(false);

  // The form replaces the button (and the thank-you replaces the form): move focus along with them.
  useEffect(() => {
    if (status === "sent") sent.current?.focus();
    else if (open) area.current?.focus();
    else if (wasOpen.current) trigger.current?.focus();
    wasOpen.current = open;
  }, [open, status]);

  if (status === "sent") {
    return (
      <p ref={sent} tabIndex={-1} role="status" className="text-sm text-muted outline-none">
        Merci, le signalement a été envoyé.
      </p>
    );
  }
  if (!open) {
    return (
      <button ref={trigger} type="button" onClick={() => setOpen(true)} className="btn btn-quiet -ml-3 text-sm">
        Signaler une erreur
      </button>
    );
  }
  const failed = status !== "idle" && status !== "sending";
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
      <label htmlFor={fieldId} className="field-label">
        Quelle est l&apos;erreur ?
      </label>
      <textarea
        id={fieldId}
        ref={area}
        className="input min-h-24"
        placeholder="Réponse, énoncé, explication…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        required
        aria-invalid={failed || undefined}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-ghost" disabled={status === "sending"}>
          {status === "sending" ? "Envoi…" : "Envoyer"}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
          Annuler
        </button>
        {failed && (
          <span role="alert" className="text-sm text-bad">
            {status}
          </span>
        )}
      </div>
    </form>
  );
}

function Correction({
  question,
  correct,
  headingRef,
}: {
  question: QuestionWithChoices;
  correct: boolean;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const correctLabels = question.choices.filter((c) => c.is_correct).map((c) => c.label);
  return (
    <section className="space-y-4 border-t border-line pt-5" aria-label="Correction">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className={`flex items-center gap-2 text-lg font-semibold outline-none ${correct ? "text-good" : "text-bad"}`}
      >
        <span aria-hidden>{correct ? "✓" : "✗"}</span>
        {correct ? "Correct — 1 point" : "Incorrect — 0 point"}
      </h3>
      <p>
        <span className="text-muted">
          Réponse{correctLabels.length > 1 ? "s" : ""} correcte{correctLabels.length > 1 ? "s" : ""} :{" "}
        </span>
        <strong>{correctLabels.join(", ")}</strong>
      </p>
      {question.explanation && <p className="whitespace-pre-line">{question.explanation}</p>}
      {question.lesson_excerpt && (
        <figure className="citation">
          <blockquote className="whitespace-pre-line">« {question.lesson_excerpt} »</blockquote>
          {question.lesson_title && (
            <figcaption>
              Cours : {question.lesson_title}
              {question.lesson_page ? `, p. ${question.lesson_page}` : ""}
            </figcaption>
          )}
        </figure>
      )}
      <ReportButton questionId={question.id} />
    </section>
  );
}

export function Quiz({
  moduleSlug,
  questions,
  mode,
}: {
  moduleSlug: string;
  questions: QuestionWithChoices[];
  mode: Mode;
}) {
  const [list, setList] = useState<QuestionWithChoices[]>(questions);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);

  // Focus follows the step, so keyboard and screen-reader users never land on <body>.
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const correctionHeading = useRef<HTMLHeadingElement>(null);
  const scoreHeading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const statementId = useId();

  useEffect(() => {
    if (!moved.current) return; // not on first render: the page keeps its natural focus
    if (finished) scoreHeading.current?.focus();
    else if (revealed) correctionHeading.current?.focus();
    else questionHeading.current?.focus();
  }, [index, revealed, finished]);

  const results = useMemo(() => {
    return list
      .filter((q) => answers[q.id])
      .map((q) => ({ q, correct: isAnswerCorrect(q.choices, new Set(answers[q.id])) }));
  }, [list, answers]);

  const restart = (subset: QuestionWithChoices[]) => {
    moved.current = true;
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
    const reviewed = mode === "exam" ? results : wrong;
    return (
      <div className="space-y-6">
        <section className="card text-center sm:p-10" aria-labelledby="score-title">
          <p className="eyebrow">Série terminée</p>
          <h2 id="score-title" ref={scoreHeading} tabIndex={-1} className="mt-2 outline-none">
            <span className="sr-only">Score : </span>
            <span className="font-serif text-5xl font-semibold">
              {summary.score}
              <span className="text-muted">/{summary.total}</span>
            </span>
          </h2>
          <p className="mt-2 text-lg text-muted">{summary.percent} % de bonnes réponses</p>
          <ProgressBar
            className="mx-auto mt-5 max-w-xs"
            value={summary.score}
            max={summary.total}
            label="Score"
            segments={[
              { value: summary.score, className: "bg-good" },
              { value: summary.total - summary.score, className: "bg-bad" },
            ]}
          />
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {wrong.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={() => restart(wrong.map((r) => r.q))}>
                Refaire les {wrong.length} erreur{wrong.length > 1 ? "s" : ""}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => restart(list)}>
              Recommencer
            </button>
            <Link href={`/modules/${moduleSlug}`} className="btn btn-quiet">
              Retour au module
            </Link>
          </div>
        </section>

        {reviewed.length > 0 && (
          <section className="space-y-3" aria-labelledby="review-title">
            <h2 id="review-title" className="heading">
              {mode === "exam" ? "Toutes les corrections" : "Vos erreurs"}
            </h2>
            {reviewed.map(({ q, correct }) => (
              <details key={q.id} className="card group" open={mode === "exam" && !correct}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <span className={`font-semibold ${correct ? "text-good" : "text-bad"}`}>
                    <span aria-hidden>{correct ? "✓" : "✗"}</span>
                    <span className="sr-only">{correct ? "Correct" : "Incorrect"}</span>
                  </span>
                  <span className="font-medium">Question {list.indexOf(q) + 1}</span>
                  <span className="text-sm text-muted">{examLabel(q)}</span>
                  <span aria-hidden className="ml-auto text-muted transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  <p id={`review-${q.id}`} className="whitespace-pre-line font-medium">
                    {q.statement}
                  </p>
                  <ChoiceList question={q} selected={new Set(answers[q.id])} revealed labelledBy={`review-${q.id}`} />
                  <Correction question={q} correct={correct} />
                </div>
              </details>
            ))}
          </section>
        )}
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
    moved.current = true;
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
    moved.current = true;
    // Saved to the account (progress on every device + admin statistics). Never blocks the quiz.
    recordAttempt({ questionId: q.id, selected: [...selected], mode }).catch(() => {});
    setAnswers((prev) => ({ ...prev, [q.id]: [...selected] }));
    if (mode === "practice") setRevealed(true);
    else goNext();
  };

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            Question <strong className="text-foreground">{index + 1}</strong> sur {list.length}
            {mode === "exam" && " · mode examen"}
          </span>
          <span>{examLabel(q)}</span>
        </div>
        <ProgressBar value={index + 1} max={list.length} label="Avancement de la série" />
      </div>

      <article className="card space-y-5">
        <h2
          id={statementId}
          ref={questionHeading}
          tabIndex={-1}
          className="whitespace-pre-line text-[1.0625rem] leading-relaxed font-medium outline-none"
        >
          <span className="sr-only">Question {index + 1}. </span>
          {q.statement}
        </h2>
        <ChoiceList question={q} selected={selected} revealed={revealed} onToggle={toggle} labelledBy={statementId} />
        {revealed && <Correction question={q} correct={answeredCorrectly} headingRef={correctionHeading} />}
      </article>

      {/* Primary action under the thumb on phones, inline on larger screens. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-5xl justify-end">
          {revealed ? (
            <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" onClick={goNext}>
              {isLast ? "Voir le score" : "Question suivante →"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-lg w-full sm:w-auto"
              onClick={validate}
              disabled={selected.size === 0}
            >
              {mode === "exam" && isLast ? "Valider et voir le score" : "Valider"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
