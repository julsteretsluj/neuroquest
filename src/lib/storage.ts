import { shuffleIds } from "./shuffle";

export const SAVE_KEY = "neuroquest-v1";
export const HEART_START = 3;
export const HEART_CAP = 5;
export const HEART_COST = 40;
export const XP_GAIN = 20;

export type AttemptStatus = "article" | "question" | "failed";

export interface Attempt {
  lessonId: string;
  order: string[];
  index: number;
  hearts: number;
  status: AttemptStatus;
  articleConfirmed: boolean;
  eliminated: Record<string, number[]>;
  resolved: string[];
}

export interface SaveData {
  xp: number;
  streak: number;
  lastCompletionDate: string | null;
  completed: string[];
  earned: string[];
  theme: "light" | "dark" | null;
  dyslexic: boolean;
  attempt: Attempt | null;
}

export function emptySave(): SaveData {
  return {
    xp: 0,
    streak: 0,
    lastCompletionDate: null,
    completed: [],
    earned: [],
    theme: null,
    dyslexic: false,
    attempt: null,
  };
}

export function localDate(date = new Date()): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
}

export function previousDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return localDate(date);
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = emptySave();
    return {
      ...base,
      ...parsed,
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : null,
      dyslexic: Boolean(parsed.dyslexic),
      attempt:
      parsed.attempt && typeof parsed.attempt.lessonId === "string"
        ? {
            lessonId: parsed.attempt.lessonId,
            order: Array.isArray(parsed.attempt.order) ? parsed.attempt.order : [],
            index: Number(parsed.attempt.index) || 0,
            hearts: Number.isFinite(parsed.attempt.hearts) ? parsed.attempt.hearts : HEART_START,
            status:
              parsed.attempt.status === "question" || parsed.attempt.status === "failed" || parsed.attempt.status === "article"
                ? parsed.attempt.status
                : "article",
            articleConfirmed: Boolean(parsed.attempt.articleConfirmed),
            eliminated: parsed.attempt.eliminated ?? {},
            resolved: Array.isArray(parsed.attempt.resolved) ? parsed.attempt.resolved : [],
          }
        : null,
    };
  } catch {
    return emptySave();
  }
}

export function writeSave(save: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function freshAttempt(id: string, questionIds: string[], article: boolean, avoid?: string[]): Attempt {
  return {
    lessonId: id,
    order: shuffleIds(questionIds, avoid),
    index: 0,
    hearts: HEART_START,
    status: article ? "article" : "question",
    articleConfirmed: !article,
    eliminated: {},
    resolved: [],
  };
}

export function markComplete(save: SaveData, lessonId: string): SaveData {
  const today = localDate();
  let streak = save.streak;
  if (save.lastCompletionDate === today) {
    streak = save.streak;
  } else if (save.lastCompletionDate === previousDate(today)) {
    streak = save.streak + 1;
  } else {
    streak = 1;
  }
  const completed = save.completed.includes(lessonId) ? save.completed : [...save.completed, lessonId];
  return {
    ...save,
    streak,
    lastCompletionDate: today,
    completed,
    attempt: null,
  };
}
