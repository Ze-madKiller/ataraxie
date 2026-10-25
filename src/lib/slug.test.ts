import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("Hématologie & Immunologie")).toBe("hematologie-immunologie");
  });

  it("trims separators", () => {
    expect(slugify("  --Cardio 2024--  ")).toBe("cardio-2024");
  });
});
