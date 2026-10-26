import type { SampleQuestion as Sample } from "@/lib/public-content";

/** Read-only question with its correction, for the public module pages. */
export function SampleQuestion({ question, index }: { question: Sample; index: number }) {
  const source = [question.exam_year, question.exam_session].filter(Boolean).join(" — ");
  return (
    <article className="card space-y-4" aria-labelledby={`sample-${question.id}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Exemple {index + 1}
        {source && ` · Examen ${source}`}
      </p>
      <h3 id={`sample-${question.id}`} className="font-medium leading-relaxed">
        {question.statement}
      </h3>
      <ul className="space-y-2">
        {question.choices.map((c) => (
          <li
            key={c.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${c.is_correct ? "border-good bg-good-soft" : "border-line"}`}
          >
            <span className="font-semibold">{c.label}</span>
            <span className="flex-1">{c.text}</span>
            {c.is_correct && (
              <span className="text-xs font-semibold text-good">
                <span aria-hidden>✓ </span>Bonne réponse
              </span>
            )}
          </li>
        ))}
      </ul>
      {question.explanation && <p className="text-muted">{question.explanation}</p>}
      {question.lesson_excerpt && (
        <figure className="rounded-r-lg border-l-4 border-accent bg-accent-soft p-4">
          <blockquote className="font-serif italic">« {question.lesson_excerpt} »</blockquote>
          {(question.lesson_title || question.lesson_page) && (
            <figcaption className="mt-2 text-xs text-muted">
              Cours : {question.lesson_title}
              {question.lesson_page ? `, p. ${question.lesson_page}` : ""}
            </figcaption>
          )}
        </figure>
      )}
    </article>
  );
}
