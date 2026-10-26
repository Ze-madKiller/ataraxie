// Medical school semesters (6 years × 2).
export const SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1);

export function semesterLabel(semester: number | null | undefined): string {
  return semester ? `Semestre ${semester} (S${semester})` : "Tous les semestres";
}

export function parseSemester(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

/** Only allow same-site relative redirects after login (blocks //evil.com, /\\evil.com and absolute URLs). */
export function safeNext(next: string | null | undefined, fallback = "/modules"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
