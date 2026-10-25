// All-or-nothing scoring: a question is worth 1 point, earned only when the
// selected choices are exactly the set of correct choices.

export type ChoiceState = "correct" | "wrong" | "missed" | "neutral";

export interface ScorableChoice {
  id: string;
  is_correct: boolean;
}

export function isAnswerCorrect(choices: ScorableChoice[], selected: ReadonlySet<string>): boolean {
  return choices.every((c) => c.is_correct === selected.has(c.id));
}

export function choiceState(choice: ScorableChoice, selected: ReadonlySet<string>): ChoiceState {
  const picked = selected.has(choice.id);
  if (choice.is_correct && picked) return "correct";
  if (!choice.is_correct && picked) return "wrong";
  if (choice.is_correct && !picked) return "missed";
  return "neutral";
}

export function scoreSummary(results: boolean[]) {
  const score = results.filter(Boolean).length;
  const total = results.length;
  return { score, total, percent: total === 0 ? 0 : Math.round((score / total) * 100) };
}
