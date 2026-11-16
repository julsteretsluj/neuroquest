import { articleText, wordCount } from "./build";
import { FORMATS, type Course } from "./types";

export function curriculumProblems(course: Course): string[] {
  const problems: string[] = [];
  const { units, finalQuiz } = course;
  if (units.length < 15) problems.push(`Expected at least 15 units, found ${units.length}.`);
  const titles = new Set<string>();
  const bodies = new Set<string>();

  units.forEach((unit) => {
    if (unit.lessons.length !== 5) problems.push(`${unit.title} has ${unit.lessons.length} lessons.`);
    const unitArticles = new Map<string, string>();
    unit.lessons.forEach((lesson) => {
      if (titles.has(lesson.articleTitle)) problems.push(`Duplicate article title: ${lesson.articleTitle}`);
      titles.add(lesson.articleTitle);
      const text = articleText(lesson.blocks);
      if (bodies.has(text)) problems.push(`Duplicate article body: ${lesson.title}`);
      bodies.add(text);
      unitArticles.set(lesson.id, text);
      const words = wordCount(text);
      if (words < 500 || words > 800) problems.push(`${lesson.title} article is ${words} words.`);
      if (lesson.questions.length < 20) problems.push(`${lesson.title} has ${lesson.questions.length} questions.`);
      lesson.questions.forEach((question, index) => {
        const expected = FORMATS[index % FORMATS.length].id;
        if (question.format !== expected) {
          problems.push(`${lesson.id} question ${index + 1} format is ${question.format}.`);
        }
        if (!text.includes(question.anchor)) {
          problems.push(`${lesson.id} q${index + 1} anchor missing: ${question.anchor}`);
        }
        if (question.choices.filter((choice) => choice.correct).length !== 1) {
          problems.push(`${lesson.id} q${index + 1} needs one correct choice.`);
        }
      });
    });

    if (unit.quiz.questions.length !== 20) {
      problems.push(`${unit.title} quiz has ${unit.quiz.questions.length} questions.`);
    }
    const seenLessons = new Set<string>();
    unit.quiz.questions.forEach((question, index) => {
      const expected = FORMATS[index % FORMATS.length].id;
      if (question.format !== expected) problems.push(`${unit.quiz.id} q${index + 1} format drifted.`);
      const lessonText = question.sourceLessonId ? unitArticles.get(question.sourceLessonId) : undefined;
      if (!lessonText) problems.push(`${unit.quiz.id} q${index + 1} has no source lesson.`);
      else if (!lessonText.includes(question.anchor)) {
        problems.push(`${unit.quiz.id} q${index + 1} is not taught in its source article.`);
      }
      if (question.sourceLessonId) seenLessons.add(question.sourceLessonId);
    });
    unit.lessons.forEach((lesson) => {
      if (!seenLessons.has(lesson.id)) problems.push(`${unit.title} quiz skips ${lesson.title}.`);
    });
  });

  if (finalQuiz.questions.length !== 30) problems.push(`Final quiz has ${finalQuiz.questions.length} questions.`);
  const seenUnits = new Set<string>();
  const allArticles = new Map<string, string>();
  units.forEach((unit) => {
    unit.lessons.forEach((lesson) => allArticles.set(lesson.id, articleText(lesson.blocks)));
  });
  finalQuiz.questions.forEach((question, index) => {
    const expected = FORMATS[index % FORMATS.length].id;
    if (question.format !== expected) problems.push(`Final q${index + 1} format drifted.`);
    if (!question.sourceUnitId) problems.push(`Final q${index + 1} has no unit.`);
    else seenUnits.add(question.sourceUnitId);
    const text = question.sourceLessonId ? allArticles.get(question.sourceLessonId) : undefined;
    if (!text || !text.includes(question.anchor)) problems.push(`Final q${index + 1} is not taught in the course.`);
  });
  units.forEach((unit) => {
    if (!seenUnits.has(unit.id)) problems.push(`Final quiz skips ${unit.title}.`);
  });

  const blob = [...bodies].join("\n");
  if (!blob.includes("kaligirwa (@blackspectrumscholar)")) problems.push("Missing kaligirwa credit.");
  if (!blob.includes("Tychelle (@childofautism)")) problems.push("Missing Tychelle credit.");
  return problems;
}
