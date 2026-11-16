import { makeLesson, makeQuestions } from "./build";
import type { BeatSeed, LessonSeed, UnitSeed } from "./seed";
import { FORMATS, type Course, type FormatId, type QuestionDraft, type Quiz } from "./types";

function withSlot(correct: string, wrongs: [string, string, string], slot: number): { choices: string[]; correct: number } {
  const choices = [...wrongs];
  const index = ((slot % 4) + 4) % 4;
  choices.splice(index, 0, correct);
  return { choices, correct: index };
}

function frame(beat: BeatSeed, index: number): string {
  const shared = `Composite: ${beat.scene} Barrier: ${beat.barrier}. Goal: ${beat.goal}. Means: ${beat.means}. Retire “${beat.deficit}.” Instead: ${beat.reframe} If you hear “${beat.line},” say “${beat.reply}” Check: ${beat.quizCorrect}`;
  if (index % 4 === 1) {
    return `${beat.research} Goal first: ${beat.goal}. Composite: ${beat.scene} Barrier: ${beat.barrier}. Means: ${beat.means}. “${beat.deficit}” is the deficit line. Instead: ${beat.reframe} Reply to “${beat.line}”: “${beat.reply}” Check: ${beat.quizCorrect}`;
  }
  if (index % 4 === 2) {
    return `Check: ${beat.quizCorrect} ${beat.research} Composite: ${beat.scene} Barrier: ${beat.barrier}. Goal: ${beat.goal}. Means: ${beat.means}. Translate “${beat.deficit}” as: ${beat.reframe} “${beat.line}” gets this reply: “${beat.reply}”`;
  }
  if (index % 4 === 3) {
    return `${beat.research} “${beat.line}” gets this reply: “${beat.reply}” Composite: ${beat.scene} Barrier: ${beat.barrier}. Goal: ${beat.goal}. Means: ${beat.means}. Not “${beat.deficit}.” Instead: ${beat.reframe} Check: ${beat.quizCorrect}`;
  }
  return `${beat.research} ${shared}`;
}

function draftFor(beat: BeatSeed, format: FormatId, slot: number, lessonTitle: string): Omit<QuestionDraft, "sourceLessonId" | "sourceUnitId"> {
  if (format === "friction") {
    const packed = withSlot(beat.barrier, beat.barrierWrongs, slot);
    return {
      anchor: beat.barrier,
      prompt: `🔍 What is the hidden barrier in this scene from “${lessonTitle}”?`,
      context: beat.scene,
      choices: packed.choices,
      correct: packed.correct,
      why: beat.why,
      hint: beat.hint,
    };
  }
  if (format === "reframe") {
    const packed = withSlot(beat.reframe, beat.reframeWrongs, slot);
    return {
      anchor: beat.reframe,
      prompt: `🔄 Which translation fits the deficit line in “${lessonTitle}”?`,
      context: beat.deficit,
      quote: true,
      choices: packed.choices,
      correct: packed.correct,
      why: beat.why,
      hint: beat.hint,
    };
  }
  if (format === "makeover") {
    const packed = withSlot(beat.means, beat.meansWrongs, slot);
    return {
      anchor: beat.means,
      prompt: `🛠️ Which option keeps the goal from “${lessonTitle}” and removes the incidental barrier?`,
      context: `Goal: ${beat.goal}`,
      choices: packed.choices,
      correct: packed.correct,
      why: beat.why,
      hint: beat.hint,
    };
  }
  if (format === "quiz") {
    const packed = withSlot(beat.quizCorrect, beat.quizWrongs, slot);
    return {
      anchor: beat.quizCorrect,
      prompt: `🧩 ${beat.quizPrompt}`,
      choices: packed.choices,
      correct: packed.correct,
      why: beat.why,
      hint: beat.hint,
    };
  }
  const packed = withSlot(beat.reply, beat.replyWrongs, slot);
  return {
    anchor: beat.reply,
    prompt: `🎭 Which reply is psychologically safer in “${lessonTitle}”?`,
    context: beat.line,
    quote: true,
    choices: packed.choices,
    correct: packed.correct,
    why: beat.why,
    hint: beat.hint,
  };
}

function lessonDrafts(lesson: LessonSeed): QuestionDraft[] {
  const drafts: QuestionDraft[] = [];
  lesson.beats.forEach((beat) => {
    FORMATS.forEach((format, formatIndex) => {
      drafts.push(draftFor(beat, format.id, drafts.length + formatIndex, lesson.title));
    });
  });
  return drafts;
}

export function assemble(seeds: UnitSeed[]): Course {
  const builtUnits = seeds.map((seed) => {
    const lessons = seed.lessons.map((lesson, lessonIndex) => {
      const id = `${seed.id}-l${lessonIndex + 1}`;
      return makeLesson(
        id,
        lesson.title,
        lesson.emoji,
        lesson.concept,
        lesson.articleTitle,
        [
          { body: lesson.opener },
          ...lesson.beats.map((beat, beatIndex) => ({
            heading: beat.heading,
            body: frame(beat, beatIndex),
          })),
        ],
        lessonDrafts(lesson).map((draft) => ({ ...draft, sourceLessonId: id, sourceUnitId: seed.id })),
      );
    });

    const quizDrafts: QuestionDraft[] = [];
    for (let round = 0; round < 4; round += 1) {
      lessons.forEach((lesson, lessonIndex) => {
        const beat = seed.lessons[lessonIndex].beats[round];
        const format = FORMATS[quizDrafts.length % FORMATS.length].id;
        quizDrafts.push({
          ...draftFor(beat, format, quizDrafts.length, lesson.title),
          prompt: `From the reading “${lesson.articleTitle}”: ${draftFor(beat, format, quizDrafts.length, lesson.title).prompt}`,
          sourceLessonId: lesson.id,
          sourceUnitId: seed.id,
        });
      });
    }

    const quiz: Quiz = {
      id: `${seed.id}-quiz`,
      title: `${seed.title} quiz`,
      emoji: "📝",
      blurb: `This quiz checks ideas from all five readings in ${seed.title}. There is no new article. Three misses end the attempt, and a free retry shuffles the questions.`,
      kind: "unit",
      questions: makeQuestions(`${seed.id}-quiz`, quizDrafts),
    };

    return {
      id: seed.id,
      title: seed.title,
      emoji: seed.emoji,
      summary: seed.summary,
      stages: seed.stages,
      lessons,
      quiz,
    };
  });

  const finalDrafts: QuestionDraft[] = [];
  builtUnits.forEach((unit, unitIndex) => {
    const seed = seeds[unitIndex];
    [0, 4].forEach((lessonIndex) => {
      const lesson = unit.lessons[lessonIndex];
      const beat = seed.lessons[lessonIndex].beats[lessonIndex === 0 ? 0 : 2];
      const format = FORMATS[finalDrafts.length % FORMATS.length].id;
      const drafted = draftFor(beat, format, finalDrafts.length, lesson.title);
      finalDrafts.push({
        ...drafted,
        prompt: `Unit ${unitIndex + 1} · ${unit.title}. ${drafted.prompt}`,
        sourceLessonId: lesson.id,
        sourceUnitId: unit.id,
      });
    });
  });

  return {
    units: builtUnits,
    finalQuiz: {
      id: "final-quiz",
      title: "Course final",
      emoji: "🏁",
      blurb: "The final draws on every unit you already read. There is no new article. One question set is grounded in each unit. Three misses end the attempt.",
      kind: "final",
      questions: makeQuestions("final-quiz", finalDrafts),
    },
  };
}
