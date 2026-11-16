import type { ArticleBlock, Course, Question } from "./types";

export interface Activity {
  id: string;
  title: string;
  emoji: string;
  unitTitle: string;
  unitEmoji: string;
  place: string;
  questions: Question[];
  article: { title: string; concept: string; blocks: ArticleBlock[] } | null;
  kind: "lesson" | "unit-quiz" | "final";
  unitIndex: number;
  lessonIndex: number | null;
}

export function listActivities(course: Course): Activity[] {
  const items: Activity[] = [];
  course.units.forEach((unit, unitIndex) => {
    unit.lessons.forEach((lesson, lessonIndex) => {
      items.push({
        id: lesson.id,
        title: lesson.title,
        emoji: lesson.emoji,
        unitTitle: unit.title,
        unitEmoji: unit.emoji,
        place: `Unit ${unitIndex + 1} · Lesson ${lessonIndex + 1}`,
        questions: lesson.questions,
        article: {
          title: lesson.articleTitle,
          concept: lesson.concept,
          blocks: lesson.blocks,
        },
        kind: "lesson",
        unitIndex,
        lessonIndex,
      });
    });
    items.push({
      id: unit.quiz.id,
      title: unit.quiz.title,
      emoji: unit.quiz.emoji,
      unitTitle: unit.title,
      unitEmoji: unit.emoji,
      place: `Unit ${unitIndex + 1} · Quiz`,
      questions: unit.quiz.questions,
      article: null,
      kind: "unit-quiz",
      unitIndex,
      lessonIndex: null,
    });
  });
  items.push({
    id: course.finalQuiz.id,
    title: course.finalQuiz.title,
    emoji: course.finalQuiz.emoji,
    unitTitle: "Course final",
    unitEmoji: "🏁",
    place: "Final quiz",
    questions: course.finalQuiz.questions,
    article: null,
    kind: "final",
    unitIndex: course.units.length,
    lessonIndex: null,
  });
  return items;
}

export function isUnlocked(course: Course, completed: string[], activity: Activity): boolean {
  if (activity.kind === "final") {
    return course.units.every((unit) => completed.includes(unit.quiz.id));
  }
  const unit = course.units[activity.unitIndex];
  if (activity.kind === "unit-quiz") {
    return unit.lessons.every((lesson) => completed.includes(lesson.id));
  }
  const lessonIndex = activity.lessonIndex ?? 0;
  if (activity.unitIndex === 0 && lessonIndex === 0) return true;
  if (lessonIndex > 0) return completed.includes(unit.lessons[lessonIndex - 1].id);
  return completed.includes(course.units[activity.unitIndex - 1].quiz.id);
}

export function lockReason(course: Course, activity: Activity): string {
  if (activity.kind === "final") return "Finish every unit quiz to open the final.";
  if (activity.kind === "unit-quiz") return "Finish the five lessons in this unit to open the quiz.";
  if ((activity.lessonIndex ?? 0) > 0) {
    const previous = course.units[activity.unitIndex].lessons[(activity.lessonIndex ?? 1) - 1];
    return `Finish “${previous.title}” to open this lesson.`;
  }
  const previousUnit = course.units[activity.unitIndex - 1];
  return `Pass the ${previousUnit.title} quiz to open the next unit.`;
}
