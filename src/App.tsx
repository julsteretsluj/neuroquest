import { useMemo, useState } from "react";
import { isUnlocked, listActivities, lockReason, type Activity } from "./curriculum/access";
import { course } from "./curriculum/course";
import { FORMATS } from "./curriculum/types";
import { freshAttempt, HEART_CAP, loadSave, writeSave, type SaveData } from "./lib/storage";
import { Player } from "./Player";

function themeNow(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [activeId, setActiveId] = useState<string | null>(null);
  const activities = useMemo(() => listActivities(course), []);
  const active = activities.find((item) => item.id === activeId) ?? null;

  function commit(next: SaveData | ((current: SaveData) => SaveData)) {
    setSave((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      writeSave(resolved);
      return resolved;
    });
  }

  function setTheme(theme: "light" | "dark") {
    document.documentElement.dataset.theme = theme;
    commit({ ...save, theme });
  }

  function setFont(dyslexic: boolean) {
    if (dyslexic) document.documentElement.dataset.font = "opendyslexic";
    else delete document.documentElement.dataset.font;
    commit({ ...save, dyslexic });
  }

  function openActivity(activity: Activity) {
    if (!isUnlocked(course, save.completed, activity)) return;
    const same = save.attempt?.lessonId === activity.id;
    const next = same
      ? save
      : {
          ...save,
          attempt: freshAttempt(activity.id, activity.questions.map((q) => q.id), activity.article !== null),
        };
    if (!same) commit(next);
    setActiveId(activity.id);
  }

  const inProgress = save.attempt ? activities.find((item) => item.id === save.attempt?.lessonId) : undefined;
  const upcoming = activities.find((item) => isUnlocked(course, save.completed, item) && !save.completed.includes(item.id));
  const featured = inProgress ?? upcoming ?? activities[0];

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <p className="kicker">NeuroQuest</p>
          <strong>UDL and neurodiversity</strong>
        </div>
        <div className="prefs">
          <button className="ghost" type="button" onClick={() => setTheme(themeNow() === "dark" ? "light" : "dark")}>
            {themeNow() === "dark" ? "☀️ Use light mode" : "🌙 Use dark mode"}
          </button>
          <button className="ghost" type="button" onClick={() => setFont(!save.dyslexic)}>
            {save.dyslexic ? "Aa Use the system font" : "🔤 Read in OpenDyslexic"}
          </button>
        </div>
        <div className="hud" aria-label="Progress">
          <span>🔥 Streak {save.streak}</span>
          <span>⚡ {save.xp} XP</span>
          <span>❤️ {save.attempt ? `${save.attempt.hearts}/${HEART_CAP}` : "3 at the start"}</span>
          {active ? <span>📍 {active.place}</span> : <span>📍 {course.units.length} units</span>}
        </div>
      </header>

      {active ? (
        <Player activity={active} save={save} onSave={commit} onExit={() => setActiveId(null)} />
      ) : (
        <main>
          <section className="hero">
            <div>
              <p className="kicker">{featured?.place ?? "Course"}</p>
              <h1>Read the room before you score the child.</h1>
              <p className="lede">
                Fifteen units on neurodivergence and CAST UDL Guidelines 3.0. Five lessons in each, then a unit quiz.
                A final quiz waits after those. Every lesson opens with its own article, and the questions stay locked until you reach the end.
              </p>
              {featured ? (
                <div className="hero-actions">
                  <button className="primary" type="button" onClick={() => openActivity(featured)}>
                    {inProgress ? `Resume ${featured.title}` : save.completed.includes(featured.id) ? `Practice ${featured.title}` : `Open ${featured.title}`}
                  </button>
                </div>
              ) : null}
              <p className="quiet">OpenDyslexic is a reading preference. It does not fix dyslexia, and it does not help every reader.</p>
            </div>
            <aside className="note">
              <h2>A lesson has five beats</h2>
              <ol>
                {FORMATS.map((format) => (
                  <li key={format.id}><span aria-hidden="true">{format.emoji}</span> {format.label}</li>
                ))}
              </ol>
              <p className="quiet">Three misses empty your hearts. 40 XP buys one heart back, up to five. A free retry shuffles the questions.</p>
            </aside>
          </section>

          <section className="path" aria-label="Course path">
            {course.units.map((unit, unitIndex) => (
              <article className="unit" key={unit.id}>
                <p className="unit-index" aria-hidden="true">{unit.emoji}</p>
                <div>
                  <p className="kicker">Unit {unitIndex + 1} · {unit.stages}</p>
                  <h2>{unit.title}</h2>
                  <p className="summary quiet">{unit.summary}</p>
                  <div className="stack">
                    {activities
                      .filter((item) => item.unitIndex === unitIndex)
                      .map((item) => {
                        const open = isUnlocked(course, save.completed, item);
                        const done = save.completed.includes(item.id);
                        const here = save.attempt?.lessonId === item.id;
                        return (
                          <button
                            key={item.id}
                            className={item.kind === "lesson" ? "row" : "row quiz"}
                            type="button"
                            disabled={!open}
                            onClick={() => openActivity(item)}
                          >
                            <span>
                              {item.emoji} {item.title}
                              <small>
                                {item.kind === "lesson"
                                  ? `Lesson ${(item.lessonIndex ?? 0) + 1} · article, then ${item.questions.length} questions`
                                  : `Quiz · ${item.questions.length} questions · no new article`}
                              </small>
                            </span>
                            <small>{done ? "Done" : here ? "In progress" : open ? "Open" : lockReason(course, item)}</small>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="final">
            <p className="kicker">After every unit quiz</p>
            <h2>🏁 Course final</h2>
            <p className="quiet">Thirty questions, one thread from each unit. Nothing new to read. Locked until the unit quizzes are done.</p>
            {activities.filter((item) => item.kind === "final").map((item) => {
              const open = isUnlocked(course, save.completed, item);
              const done = save.completed.includes(item.id);
              return (
                <button key={item.id} className="row quiz" type="button" disabled={!open} onClick={() => openActivity(item)}>
                  <span>
                    {item.emoji} {item.title}
                    <small>{item.questions.length} questions drawn from the units you already read</small>
                  </span>
                  <small>{done ? "Done" : open ? "Open" : lockReason(course, item)}</small>
                </button>
              );
            })}
          </section>
        </main>
      )}
    </div>
  );
}
