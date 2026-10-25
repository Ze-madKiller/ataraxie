import { describe, expect, it } from "vitest";
import { choiceState, isAnswerCorrect, scoreSummary } from "./scoring";

const choices = [
  { id: "a", is_correct: true },
  { id: "b", is_correct: false },
  { id: "c", is_correct: true },
  { id: "d", is_correct: false },
];

describe("isAnswerCorrect", () => {
  it("gives the point when exactly the correct set is selected", () => {
    expect(isAnswerCorrect(choices, new Set(["a", "c"]))).toBe(true);
  });

  it("gives nothing when a correct choice is missing", () => {
    expect(isAnswerCorrect(choices, new Set(["a"]))).toBe(false);
  });

  it("gives nothing when an extra wrong choice is selected", () => {
    expect(isAnswerCorrect(choices, new Set(["a", "c", "d"]))).toBe(false);
  });

  it("gives nothing for an empty answer", () => {
    expect(isAnswerCorrect(choices, new Set())).toBe(false);
  });
});

describe("choiceState", () => {
  const selected = new Set(["a", "b"]);
  it("classifies each choice", () => {
    expect(choices.map((c) => choiceState(c, selected))).toEqual(["correct", "wrong", "missed", "neutral"]);
  });
});

describe("scoreSummary", () => {
  it("counts points and rounds the percentage", () => {
    expect(scoreSummary([true, false, true])).toEqual({ score: 2, total: 3, percent: 67 });
  });

  it("handles no questions", () => {
    expect(scoreSummary([])).toEqual({ score: 0, total: 0, percent: 0 });
  });
});
