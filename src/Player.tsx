import { useEffect, useRef, useState } from "react";
import type { Activity } from "./curriculum/access";
import { formatMeta } from "./curriculum/types";
import {
  HEART_CAP,
  HEART_COST,
  XP_GAIN,
  freshAttempt,
  markComplete,
  type SaveData,
} from "./lib/storage";

export function buyBlock(save: SaveData): string | null {
  if (!save.attempt) return "Open a lesson before buying a heart.";
  if (save.attempt.hearts >= HEART_CAP) return "Hearts are already full at 5.";
  if (save.xp < HEART_COST) return `A heart costs 40 XP. You have ${save.xp}.`;
  return null;
}

export function Player({
  activity,
  save,
  onSave,
  onExit,
}: {
  activity: Activity;
  save: SaveData;
  onSave: (next: SaveData | ((current: SaveData) => SaveData)) => void;
  onExit: () => void;
}) {
  const attempt = save.attempt && save.attempt.lessonId === activity.id ? save.attempt : null;
  const finished = save.completed.includes(activity.id) && !attempt;
  const endRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [feedback, setFeedback] = useState<null | { ok: boolean; text: string; gained: boolean }>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    setReachedEnd(false);
    setFeedback(null);
    lockRef.current = false;
  }, [activity.id]);

  useEffect(() => {
    lockRef.current = false;
  }, [attempt?.index, attempt?.hearts, attempt?.status, attempt?.resolved.length]);

  useEffect(() => {
    const node = endRef.current;
    if (!node || attempt?.status !== "article") return;
    const mark = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) setReachedEnd(true);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setReachedEnd(true);
    }, { threshold: 0.01 });
    observer.observe(node);
    mark();
    window.addEventListener("scroll", mark, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", mark);
    };
  }, [activity.id, attempt?.status]);

  if (!attempt && finished) {
    return (
      <article className="player">
        <button className="text-button back" type="button" onClick={onExit}>Back</button>
        <div className="sheet done">
          <p className="kicker">{activity.place}</p>
          <h1>{activity.emoji} {activity.kind === "lesson" ? "Lesson complete" : "Quiz complete"}</h1>
          <p className="lede">The goal stays the same. This one is on the path now, and the next step can open.</p>
          <div className="hero-actions">
            <button className="primary" type="button" onClick={onExit}>Back to units</button>
            <button
              className="ghost"
              type="button"
              onClick={() => onSave({
                ...save,
                attempt: freshAttempt(activity.id, activity.questions.map((q) => q.id), activity.article !== null),
              })}
            >
              Practice again
            </button>
          </div>
        </div>
      </article>
    );
  }

  if (!attempt) return null;

  const question = activity.questions.find((item) => item.id === attempt.order[attempt.index]);
  const reason = buyBlock(save);

  function buyHeart() {
    onSave((current) => {
      if (buyBlock(current) || !current.attempt || current.attempt.lessonId !== activity.id) return current;
      return {
        ...current,
        xp: current.xp - HEART_COST,
        attempt: { ...current.attempt, hearts: current.attempt.hearts + 1, status: "question" },
      };
    });
  }

  function confirmRead() {
    onSave({
      ...save,
      attempt: { ...attempt!, status: "question", articleConfirmed: true },
    });
    window.scrollTo({ top: 0 });
  }

  function choose(index: number) {
    if (!question || !attempt || lockRef.current) return;
    if (attempt.status !== "question" || attempt.resolved.includes(question.id)) return;
    const eliminated = attempt.eliminated[question.id] ?? [];
    if (eliminated.includes(index)) return;
    const choice = question.choices[index];
    if (!choice) return;
    lockRef.current = true;
    const correct = choice.correct;
    const gained = correct && !save.earned.includes(question.id);
    onSave((current) => {
      const live = current.attempt;
      if (!live || live.lessonId !== activity.id || live.status !== "question") return current;
      if (live.resolved.includes(question.id)) return current;
      const taken = live.eliminated[question.id] ?? [];
      if (taken.includes(index)) return current;
      const picked = question.choices[index];
      if (!picked) return current;
      if (picked.correct) {
        const already = current.earned.includes(question.id);
        return {
          ...current,
          xp: already ? current.xp : current.xp + XP_GAIN,
          earned: already ? current.earned : [...current.earned, question.id],
          attempt: { ...live, resolved: [...live.resolved, question.id] },
        };
      }
      const hearts = live.hearts - 1;
      return {
        ...current,
        attempt: {
          ...live,
          hearts,
          status: hearts <= 0 ? "failed" : "question",
          eliminated: { ...live.eliminated, [question.id]: [...taken, index] },
        },
      };
    });
    setFeedback(correct
      ? { ok: true, text: question.why, gained }
      : { ok: false, text: question.hint, gained: false });
  }

  function next() {
    if (!attempt) return;
    const last = attempt.index >= attempt.order.length - 1;
    if (last) onSave(markComplete(save, activity.id));
    else onSave({ ...save, attempt: { ...attempt, index: attempt.index + 1 } });
    setFeedback(null);
    window.scrollTo({ top: 0 });
  }

  function retry() {
    onSave({
      ...save,
      attempt: freshAttempt(
        activity.id,
        activity.questions.map((item) => item.id),
        activity.article !== null,
        attempt?.order,
      ),
    });
    setFeedback(null);
    window.scrollTo({ top: 0 });
  }

  return (
    <article className="player">
      <button className="text-button back" type="button" onClick={onExit}>Back</button>
      <p className="kicker">{activity.place}</p>
      {attempt.status === "article" && activity.article ? (
        <div className="sheet">
          <h1>{activity.emoji} {activity.article.title}</h1>
          <p className="lede">{activity.article.concept}</p>
          <div className="blocks">
            {activity.article.blocks.map((block, index) => (
              <section key={`${block.heading ?? "p"}-${index}`}>
                {block.heading ? (block.level === 3 ? <h3>{block.heading}</h3> : <h2>{block.heading}</h2>) : null}
                {block.body ? <p>{block.body}</p> : null}
                {block.terms ? (
                  <dl>
                    {block.terms.map((item) => (
                      <div key={item.term}>
                        <dt>{item.term}</dt>
                        <dd>{item.definition}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {block.bullets ? (
                  <ul>
                    {block.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
          <div ref={endRef} className="sentinel" />
          <div className="hero-actions" style={{ marginTop: "1rem" }}>
            <button className="primary" type="button" disabled={!reachedEnd} onClick={confirmRead}>
              {reachedEnd ? "Start the questions" : "Keep reading to continue"}
            </button>
          </div>
        </div>
      ) : null}

      {attempt.status !== "article" && question ? (
        <div className="sheet">
          <p className="kicker">
            {formatMeta(question.format).emoji} {formatMeta(question.format).label} · {attempt.index + 1} of {attempt.order.length}
          </p>
          <h1 className="prompt-title">{question.prompt}</h1>
          {question.context ? (
            <blockquote className={question.quote ? "context quote" : "context"}>{question.context}</blockquote>
          ) : null}
          <div className="choices">
            {question.choices.map((choice, index) => {
              const missed = (attempt.eliminated[question.id] ?? []).includes(index);
              const selected = attempt.resolved.includes(question.id) && choice.correct;
              return (
                <button
                  key={choice.text}
                  className={`choice${selected ? " is-right" : ""}${missed ? " is-miss" : ""}`}
                  type="button"
                  disabled={missed || attempt.status !== "question" || attempt.resolved.includes(question.id)}
                  onClick={() => choose(index)}
                >
                  {choice.text}
                </button>
              );
            })}
          </div>
          {feedback ? (
            <div className={feedback.ok ? "feedback good" : "feedback miss"} tabIndex={-1} aria-live="polite">
              <h2>{feedback.ok ? (feedback.gained ? `⚡ +${XP_GAIN} XP` : "Already earned") : "❤️ A heart left this attempt"}</h2>
              <p>{feedback.text}</p>
            </div>
          ) : null}
          {attempt.resolved.includes(question.id) && attempt.status === "question" ? (
            <div className="hero-actions" style={{ marginTop: "0.7rem" }}>
              <button className="primary" type="button" onClick={next}>
                {attempt.index >= attempt.order.length - 1 ? "Finish" : "Next question"}
              </button>
            </div>
          ) : null}
          {attempt.status === "failed" ? (
            <div className="feedback miss">
              <h2>No hearts left</h2>
              <p>Stay on this question for 40 XP, or retry in a new order.</p>
              <div className="end-actions" style={{ marginTop: "0.7rem" }}>
                <button className="primary" type="button" disabled={Boolean(reason)} onClick={buyHeart}>
                  Stay — 40 XP
                </button>
                <button className="ghost" type="button" onClick={retry}>Retry</button>
              </div>
              {reason ? <p className="buy-note">{reason}</p> : null}
            </div>
          ) : attempt.hearts <= 1 ? (
            <div className="hero-actions" style={{ marginTop: "0.9rem" }}>
              <button className="ghost" type="button" disabled={Boolean(reason)} onClick={buyHeart}>
                Buy a heart — 40 XP
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
