// Per-browser progress (no student accounts). Wrapped in try/catch: storage can be blocked or full.

export type Progress = Record<string, { correct: boolean; at: string }>;

const key = (moduleId: string) => `ataraxie:progress:${moduleId}`;

export function loadProgress(moduleId: string): Progress {
  try {
    const raw = localStorage.getItem(key(moduleId));
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

export function recordAnswer(moduleId: string, questionId: string, correct: boolean): void {
  try {
    const progress = loadProgress(moduleId);
    progress[questionId] = { correct, at: new Date().toISOString() };
    localStorage.setItem(key(moduleId), JSON.stringify(progress));
  } catch {
    // Progress is a convenience; the quiz works without it.
  }
}

export function resetProgress(moduleId: string): void {
  try {
    localStorage.removeItem(key(moduleId));
  } catch {
    // ignore
  }
}
