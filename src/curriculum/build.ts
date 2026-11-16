import { FORMATS, type ArticleBlock, type Lesson, type Question, type QuestionDraft } from "./types";

const SCENE =
  "The classroom scenes in this lesson are composites, built for practice. They are not real students, and they are not clients or family members of anyone named in this reading.";

export function articleText(blocks: ArticleBlock[]): string {
  return blocks
    .map((block) =>
      [
        block.heading ?? "",
        block.body ?? "",
        ...(block.terms ?? []).flatMap((item) => [item.term, item.definition]),
        ...(block.bullets ?? []),
      ].join(" "),
    )
    .join("\n");
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function makeQuestions(id: string, drafts: QuestionDraft[]): Question[] {
  return drafts.map((draft, index) => ({
    id: `${id}-q${index + 1}`,
    format: FORMATS[index % FORMATS.length].id,
    anchor: draft.anchor,
    prompt: draft.prompt,
    context: draft.context,
    quote: draft.quote,
    choices: draft.choices.map((text, choiceIndex) => ({
      text,
      correct: choiceIndex === draft.correct,
    })),
    why: draft.why,
    hint: draft.hint,
    sourceLessonId: draft.sourceLessonId,
    sourceUnitId: draft.sourceUnitId,
  }));
}

export function makeLesson(
  id: string,
  title: string,
  emoji: string,
  concept: string,
  articleTitle: string,
  blocks: ArticleBlock[],
  drafts: QuestionDraft[],
): Lesson {
  return {
    id,
    title,
    emoji,
    concept,
    articleTitle,
    blocks: [...blocks, { heading: "Before the questions", body: SCENE }],
    questions: makeQuestions(id, drafts),
  };
}
