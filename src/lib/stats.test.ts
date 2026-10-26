import { describe, expect, it } from "vitest";
import { fillDays, parseStatsFilters, periodStart, successRate } from "./stats";

describe("parseStatsFilters", () => {
  it("defaults to 30 days and all semesters", () => {
    expect(parseStatsFilters({})).toEqual({ days: 30, semester: null });
  });

  it("reads a known period and a semester", () => {
    expect(parseStatsFilters({ periode: "7", semestre: "3" })).toEqual({ days: 7, semester: 3 });
    expect(parseStatsFilters({ periode: "tout" })).toEqual({ days: null, semester: null });
  });

  it("ignores unknown values", () => {
    expect(parseStatsFilters({ periode: "12", semestre: "99" })).toEqual({ days: 30, semester: null });
  });
});

describe("periodStart", () => {
  it("goes back the given number of days", () => {
    const now = new Date("2026-10-26T12:00:00Z");
    expect(periodStart(7, now).toISOString()).toBe("2026-10-19T12:00:00.000Z");
    expect(periodStart(null, now).getTime()).toBe(0);
  });
});

describe("successRate", () => {
  it("rounds to a percent and is null without data", () => {
    expect(successRate(1, 3)).toBe(33);
    expect(successRate(0, 0)).toBeNull();
  });
});

describe("fillDays", () => {
  it("adds empty days and keeps existing ones in order", () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const rows = fillDays([{ day: "2026-10-25", answers: 4, correct: 2, students: 1 }], 3, now);
    expect(rows.map((r) => [r.day, r.answers])).toEqual([
      ["2026-10-24", 0],
      ["2026-10-25", 4],
      ["2026-10-26", 0],
    ]);
  });
});
