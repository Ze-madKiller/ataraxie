import { describe, expect, it } from "vitest";
import { buildProgress } from "./progress";

describe("buildProgress", () => {
  it("keeps the latest answer to each question", () => {
    const progress = buildProgress(
      [
        { questionId: "q1", correct: false, at: "2026-10-01T10:00:00Z" },
        { questionId: "q1", correct: true, at: "2026-10-02T10:00:00Z" },
        { questionId: "q2", correct: false, at: "2026-10-01T10:00:00Z" },
      ],
      null,
    );
    expect(progress.q1.correct).toBe(true);
    expect(progress.q2.correct).toBe(false);
  });

  it("does not depend on the order of the entries", () => {
    const progress = buildProgress(
      [
        { questionId: "q1", correct: true, at: "2026-10-02T10:00:00Z" },
        { questionId: "q1", correct: false, at: "2026-10-01T10:00:00Z" },
      ],
      null,
    );
    expect(progress.q1.correct).toBe(true);
  });

  it("ignores answers given before the last reset", () => {
    const progress = buildProgress(
      [
        { questionId: "q1", correct: false, at: "2026-10-01T10:00:00Z" },
        { questionId: "q2", correct: true, at: "2026-10-03T10:00:00Z" },
      ],
      "2026-10-02T00:00:00Z",
    );
    expect(Object.keys(progress)).toEqual(["q2"]);
  });
});
