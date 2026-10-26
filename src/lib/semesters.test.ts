import { describe, expect, it } from "vitest";
import { parseSemester, safeNext } from "./semesters";

describe("parseSemester", () => {
  it("accepts 1 to 12", () => {
    expect(parseSemester("1")).toBe(1);
    expect(parseSemester(12)).toBe(12);
  });

  it("rejects anything else", () => {
    expect(parseSemester("0")).toBeNull();
    expect(parseSemester("13")).toBeNull();
    expect(parseSemester("2.5")).toBeNull();
    expect(parseSemester("")).toBeNull();
    expect(parseSemester(null)).toBeNull();
  });
});

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/modules/cardio")).toBe("/modules/cardio");
  });

  it("falls back for external or missing targets", () => {
    expect(safeNext("//evil.com")).toBe("/modules");
    expect(safeNext("/\\evil.com")).toBe("/modules");
    expect(safeNext("https://evil.com")).toBe("/modules");
    expect(safeNext(null)).toBe("/modules");
  });
});
