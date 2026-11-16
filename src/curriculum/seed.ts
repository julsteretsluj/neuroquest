export interface BeatSeed {
  heading: string;
  research: string;
  scene: string;
  barrier: string;
  barrierWrongs: [string, string, string];
  goal: string;
  means: string;
  meansWrongs: [string, string, string];
  deficit: string;
  reframe: string;
  reframeWrongs: [string, string, string];
  line: string;
  reply: string;
  replyWrongs: [string, string, string];
  quizPrompt: string;
  quizCorrect: string;
  quizWrongs: [string, string, string];
  why: string;
  hint: string;
}

export interface LessonSeed {
  title: string;
  emoji: string;
  concept: string;
  articleTitle: string;
  opener: string;
  beats: [BeatSeed, BeatSeed, BeatSeed, BeatSeed];
  /** When set, this article is used instead of the generated one. */
  article?: import("./types").ArticleBlock[];
}

export interface UnitSeed {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  stages: string;
  lessons: [LessonSeed, LessonSeed, LessonSeed, LessonSeed, LessonSeed];
}
