// One quiz question per screen. Tap an option, see the selected state, then
// auto-advance after ~250ms.

import { useEffect, useRef, useState } from "react";
import { GLYPHS } from "../quiz-data";
import type { GlyphName, QuizQuestion } from "../quiz-data";

interface QuizStepProps {
  question: QuizQuestion;
  /** 0-based index among the five quiz questions, for "Question N of 5". */
  index: number;
  value: string | undefined;
  onAnswer: (value: string) => void;
}

function Glyph({ name }: { name: GlyphName }) {
  const spec = GLYPHS[name];
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {spec.circles?.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} stroke="currentColor" strokeWidth="1.8" />
      ))}
      {spec.paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default function QuizStep({ question, index, value, onAnswer }: QuizStepProps) {
  const [selected, setSelected] = useState<string | null>(value ?? null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  function pick(label: string) {
    // A second tap inside the auto-advance window is a correction: restart
    // the timer with the new choice instead of dropping the tap.
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setSelected(label);
    timerRef.current = window.setTimeout(() => onAnswer(label), 250);
  }

  return (
    <div>
      <p className="kicker">Question {index + 1} of 5</p>
      <h3 className="headline mt-2 text-2xl text-ink sm:text-[28px]">{question.question}</h3>
      <div className="mt-6 space-y-3" role="group" aria-label={question.question}>
        {question.options.map((opt) => {
          const isSelected = selected === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              data-qa="option"
              aria-pressed={isSelected}
              onClick={() => pick(opt.label)}
              className={
                "group flex min-h-[52px] w-full items-center gap-3.5 rounded-2xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
                (isSelected
                  ? "border-brand bg-brand/5 shadow-(--shadow-card)"
                  : "border-line bg-white hover:-translate-y-0.5 hover:border-ink-soft/30 hover:shadow-(--shadow-card)")
              }
            >
              <span
                aria-hidden="true"
                className={
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 " +
                  (isSelected
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-line bg-paper-deep text-ink-soft group-hover:text-brand")
                }
              >
                <Glyph name={opt.glyph} />
              </span>
              <span className="flex-1 font-semibold text-ink">{opt.label}</span>
              <span
                aria-hidden="true"
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 " +
                  (isSelected
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-transparent")
                }
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
