import { makeLesson, makeQuestions } from "./build";
import type { BeatSeed, LessonSeed, UnitSeed } from "./seed";
import { FORMATS, type ArticleBlock, type Course, type FormatId, type QuestionDraft, type Quiz } from "./types";

function withSlot(correct: string, wrongs: [string, string, string], slot: number): { choices: string[]; correct: number } {
  const choices = [...wrongs];
  const index = ((slot % 4) + 4) % 4;
  choices.splice(index, 0, correct);
  return { choices, correct: index };
}

function tidy(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function asSentence(text: string): string {
  const trimmed = tidy(text);
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (/[.!?]["”']?$/.test(capped)) return capped;
  return `${capped}.`;
}

function asChoice(text: string): string {
  return asSentence(text);
}

function asEnding(text: string): string {
  const trimmed = tidy(text).replace(/[.?!]+["”']?$/, "");
  return `${trimmed}.`;
}

function quizAsk(prompt: string): string {
  const trimmed = tidy(prompt);
  const asksDirectly = /^(who|what|when|where|why|how|which)\b/i.test(trimmed);
  if (asksDirectly || trimmed.endsWith("?")) {
    const question = trimmed.replace(/[?\s]+$/, "");
    return `🧩 ${question}?`;
  }
  return `🧩 Finish this sentence: ${trimmed}`;
}

function close(text: string): string {
  const trimmed = tidy(text);
  if (/[.!?]["”']?$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function spoken(text: string): string {
  const trimmed = tidy(text);
  if (/[.!?]["”']?$/.test(trimmed)) return `“${trimmed}”`;
  return `“${trimmed}.”`;
}

function sceneSentence(scene: string): string {
  const trimmed = tidy(scene);
  return close(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
}

function plainHeading(heading: string): string {
  return heading.replace(/^[^\p{L}\p{N}"“]+/u, "").trim();
}

function splitLead(text: string): { lead: string; rest: string } {
  const trimmed = tidy(text);
  const match = trimmed.match(/^(.*?[.!?])\s+(?=[A-Z“"])([\s\S]+)$/);
  if (!match) return { lead: trimmed, rest: "" };
  return { lead: match[1], rest: match[2].trim() };
}

function lessonArticle(lesson: LessonSeed): ArticleBlock[] {
  const blocks: ArticleBlock[] = [
    { body: lesson.opener },
    {
      heading: "Key terms",
      terms: lesson.beats.map((beat) => ({
        term: plainHeading(beat.heading),
        definition: splitLead(beat.research).lead,
      })),
    },
  ];

  lesson.beats.forEach((beat) => {
    const rest = splitLead(beat.research).rest;
    blocks.push({ heading: beat.heading, ...(rest ? { body: rest } : {}) });
    blocks.push({
      heading: "In the classroom",
      level: 3,
      bullets: [
        sceneSentence(beat.scene),
        `Obstacle: ${close(beat.barrier)}`,
        `Goal: ${close(beat.goal)}`,
        `Do this: ${close(beat.means)}`,
      ],
    });
    blocks.push({
      heading: "What to say",
      level: 3,
      bullets: [
        `Retire ${spoken(beat.deficit)}`,
        `Say instead: ${close(beat.reframe)}`,
        `A learner says ${spoken(beat.line)}`,
        `You can answer: ${spoken(beat.reply)}`,
      ],
    });
    blocks.push({
      heading: "Remember",
      level: 3,
      body: `The questions use this wording: ${close(beat.quizCorrect)}`,
    });
  });

  return blocks;
}

function draftFor(beat: BeatSeed, format: FormatId, slot: number, lessonTitle: string): Omit<QuestionDraft, "sourceLessonId" | "sourceUnitId"> {
  if (format === "friction") {
    const packed = withSlot(beat.barrier, beat.barrierWrongs, slot);
    return {
      anchor: beat.barrier,
      prompt: "🔍 Read the scene below. What is getting in the way of the learning?",
      context: asSentence(beat.scene),
      choices: packed.choices.map((choice) => `The obstacle is ${asEnding(choice)}`),
      correct: packed.correct,
      why: beat.why,
      hint: beat.hint,
    };
  }
  if (format === "reframe") {
    const packed = withSlot(beat.reframe, beat.reframeWrongs, slot);
    return {
      anchor: beat.reframe,
      prompt: `🔄 A teacher says the line below during “${lessonTitle}.” Which version says what is really happening, without blaming the learner?`,
      context: asSentence(beat.deficit),
      quote: true,
      choices: packed.choices.map(asChoice),
      correct: packed.correct,
      why: beat.why,
      hint: beat.hint,
    };
  }
  if (format === "makeover") {
    const packed = withSlot(beat.means, beat.meansWrongs, slot);
    return {
      anchor: beat.means,
      prompt: "🛠️ The learning goal is below. Which change keeps that goal and removes the obstacle?",
      context: `The goal is ${asChoice(beat.goal).charAt(0).toLowerCase()}${asChoice(beat.goal).slice(1)}`,
      choices: packed.choices.map(asChoice),
      correct: packed.correct,
      why: beat.why,
      hint: beat.hint,
    };
  }
  if (format === "quiz") {
    const packed = withSlot(beat.quizCorrect, beat.quizWrongs, slot);
    const stem = tidy(beat.quizPrompt);
    const asksDirectly = /^(who|what|when|where|why|how|which)\b/i.test(stem) || stem.endsWith("?");
    return {
      anchor: beat.quizCorrect,
      prompt: quizAsk(beat.quizPrompt),
      choices: packed.choices.map(asksDirectly ? asChoice : asEnding),
      correct: packed.correct,
      why: beat.why,
      hint: beat.hint,
    };
  }
  const packed = withSlot(beat.reply, beat.replyWrongs, slot);
  return {
    anchor: beat.reply,
    prompt: "🎭 A learner says the line below. Which reply should you give?",
    context: asSentence(beat.line),
    quote: true,
    choices: packed.choices.map(asChoice),
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
        lesson.article ?? lessonArticle(lesson),
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
