import { articleText, wordCount } from "./curriculum/build";
import { assemble } from "./curriculum/assemble";
import { curriculumProblems } from "./curriculum/validate";
import { unit01 } from "./curriculum/units/unit01";
import { units } from "./curriculum/units";

const sample = assemble([unit01]);
for (const lesson of sample.units[0].lessons) {
  console.log("SAMPLE", lesson.title, wordCount(articleText(lesson.blocks)));
}

const course = assemble(units);
const problems = curriculumProblems(course);
console.log(`units ${course.units.length}`);
console.log(`lessons ${course.units.reduce((sum, unit) => sum + unit.lessons.length, 0)}`);
console.log(`articles ${course.units.reduce((sum, unit) => sum + unit.lessons.length, 0)}`);
console.log(`unit quizzes ${course.units.length} x ${course.units[0]?.quiz.questions.length ?? 0}`);
console.log(`final ${course.finalQuiz.questions.length}`);
if (problems.length) {
  console.log(problems.slice(0, 40).join("\n"));
  console.log(`TOTAL PROBLEMS ${problems.length}`);
  process.exit(1);
}
console.log("curriculum ok");
