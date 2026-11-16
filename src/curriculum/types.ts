export type FormatId = "friction" | "reframe" | "makeover" | "quiz" | "roleplay";

export interface Choice {
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  format: FormatId;
  anchor: string;
  prompt: string;
  context?: string;
  quote?: boolean;
  choices: Choice[];
  why: string;
  hint: string;
  sourceLessonId?: string;
  sourceUnitId?: string;
}

export interface ArticleBlock {
  heading?: string;
  level?: 2 | 3;
  body?: string;
  terms?: { term: string; definition: string }[];
  bullets?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  concept: string;
  articleTitle: string;
  blocks: ArticleBlock[];
  questions: Question[];
}

export interface Quiz {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  questions: Question[];
  kind: "unit" | "final";
}

export interface Unit {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  stages: string;
  lessons: Lesson[];
  quiz: Quiz;
}

export interface Course {
  units: Unit[];
  finalQuiz: Quiz;
}

export interface QuestionDraft {
  anchor: string;
  prompt: string;
  context?: string;
  quote?: boolean;
  choices: string[];
  correct: number;
  why: string;
  hint: string;
  sourceLessonId?: string;
  sourceUnitId?: string;
}

export const FORMATS: { id: FormatId; emoji: string; label: string }[] = [
  { id: "friction", emoji: "🔍", label: "Spot the Friction" },
  { id: "reframe", emoji: "🔄", label: "Reframe the Deficit" },
  { id: "makeover", emoji: "🛠️", label: "UDL Lesson Makeover" },
  { id: "quiz", emoji: "🧩", label: "Rapid Quiz" },
  { id: "roleplay", emoji: "🎭", label: "Roleplay" },
];

export function formatMeta(id: FormatId) {
  return FORMATS.find((item) => item.id === id) ?? FORMATS[0];
}
