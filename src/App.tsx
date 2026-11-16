import { useMemo, useState } from "react";
import { isUnlocked, listActivities, type Activity } from "./curriculum/access";
import { course } from "./curriculum/course";
import { freshAttempt, HEART_CAP, loadSave, writeSave, type SaveData } from "./lib/storage";
import { Player } from "./Player";

function themeNow(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [browseUnit, setBrowseUnit] = useState<number | null>(null);
  const [showDisplay, setShowDisplay] = useState(false);
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

  const browsed = browseUnit === null ? null : course.units[browseUnit];
  const finalActivity = activities.find((item) => item.kind === "final");

  return (
    <div className="shell">
      <header className="top">
        <button className="brand-button" type="button" onClick={() => { setActiveId(null); setBrowseUnit(null); }}>
          NeuroQuest
        </button>
        <p className="hud" aria-label="Progress">
          <span>🔥 {save.streak}</span>
          <span>⚡ {save.xp}</span>
          <span>❤️ {save.attempt ? `${save.attempt.hearts}/${HEART_CAP}` : "3"}</span>
        </p>
        <button className="text-button" type="button" aria-expanded={showDisplay} onClick={() => setShowDisplay((open) => !open)}>
          Display
        </button>
      </header>
      {showDisplay ? (
        <div className="display-panel">
          <button className="ghost" type="button" onClick={() => setTheme(themeNow() === "dark" ? "light" : "dark")}>
            {themeNow() === "dark" ? "Use light mode" : "Use dark mode"}
          </button>
          <button className="ghost" type="button" onClick={() => setFont(!save.dyslexic)}>
            {save.dyslexic ? "Use the system font" : "Use OpenDyslexic"}
          </button>
          <p className="quiet">OpenDyslexic is a preference. It does not fix dyslexia.</p>
        </div>
      ) : null}

      {active ? (
        <Player activity={active} save={save} onSave={commit} onExit={() => setActiveId(null)} />
      ) : browsed ? (
        <main className="column">
          <button className="text-button back" type="button" onClick={() => setBrowseUnit(null)}>All units</button>
          <p className="kicker">Unit {browseUnit! + 1}</p>
          <h1>{browsed.emoji} {browsed.title}</h1>
          <p className="quiet">{browsed.summary}</p>
          <div className="stack">
            {activities.filter((item) => item.unitIndex === browseUnit).map((item) => {
              const open = isUnlocked(course, save.completed, item);
              const done = save.completed.includes(item.id);
              const here = save.attempt?.lessonId === item.id;
              return (
                <button key={item.id} className="row" type="button" disabled={!open} onClick={() => openActivity(item)}>
                  <span>{item.emoji} {item.title}</span>
                  <small>{done ? "Done" : here ? "In progress" : open ? "Open" : "Locked"}</small>
                </button>
              );
            })}
          </div>
        </main>
      ) : (
        <main className="column">
          {featured ? (
            <section className="now">
              <p className="kicker">{featured.place}</p>
              <h1>{featured.emoji} {featured.title}</h1>
              <button className="primary" type="button" onClick={() => openActivity(featured)}>
                {inProgress ? "Resume" : save.completed.includes(featured.id) ? "Practice again" : "Continue"}
              </button>
            </section>
          ) : null}
          <section className="path" aria-label="Units">
            {course.units.map((unit, unitIndex) => {
              const first = activities.find((item) => item.unitIndex === unitIndex && item.lessonIndex === 0);
              const open = first ? isUnlocked(course, save.completed, first) : false;
              const done = activities.filter((item) => item.unitIndex === unitIndex && save.completed.includes(item.id)).length;
              return (
                <button
                  key={unit.id}
                  className="row"
                  type="button"
                  disabled={!open}
                  onClick={() => setBrowseUnit(unitIndex)}
                >
                  <span>{unit.emoji} {unit.title}</span>
                  <small>{open ? `${done}/6` : "Locked"}</small>
                </button>
              );
            })}
            {finalActivity ? (
              <button
                className="row"
                type="button"
                disabled={!isUnlocked(course, save.completed, finalActivity)}
                onClick={() => openActivity(finalActivity)}
              >
                <span>{finalActivity.emoji} {finalActivity.title}</span>
                <small>
                  {save.completed.includes(finalActivity.id)
                    ? "Done"
                    : isUnlocked(course, save.completed, finalActivity)
                      ? "Open"
                      : "Locked"}
                </small>
              </button>
            ) : null}
          </section>
        </main>
      )}
    </div>
  );
}
