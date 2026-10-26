// Student progress on a module: the latest answer to each question since the last reset.
// The source of truth is the database (see progress-server.ts). Older versions kept progress
// only in the browser; the localStorage helpers below exist to import it into the account once.

export type Progress = Record<string, { correct: boolean; at: string }>;

export interface ProgressEntry {
  questionId: string;
  correct: boolean;
  at: string;
}

/** Keeps the latest answer per question, ignoring answers given before `resetAt`. */
export function buildProgress(entries: ProgressEntry[], resetAt: string | null): Progress {
  const reset = resetAt ? Date.parse(resetAt) : -Infinity;
  const progress: Progress = {};
  for (const e of entries) {
    const time = Date.parse(e.at);
    if (time <= reset) continue;
    const current = progress[e.questionId];
    if (!current || time > Date.parse(current.at)) progress[e.questionId] = { correct: e.correct, at: e.at };
  }
  return progress;
}

const key = (moduleId: string) => `ataraxie:progress:${moduleId}`;

/** Progress saved in this browser by older versions. Wrapped in try/catch: storage can be blocked. */
export function loadLegacyProgress(moduleId: string): Progress {
  try {
    const raw = localStorage.getItem(key(moduleId));
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

export function clearLegacyProgress(moduleId: string): void {
  try {
    localStorage.removeItem(key(moduleId));
  } catch {
    // ignore
  }
}
