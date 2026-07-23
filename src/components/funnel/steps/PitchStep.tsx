// Pitch picker. Three illustrated cards; "Standard" is the preselected visual
// default. Tap selects and auto-advances after ~300ms.

import { useEffect, useRef, useState } from "react";
import PitchIllustration from "../PitchIllustration";
import type { PitchKey } from "../../../lib/pricing";

interface PitchStepProps {
  value: PitchKey | null;
  onSelect: (pitch: PitchKey) => void;
}

const PITCH_OPTIONS: { key: PitchKey; title: string; sub: string; badge?: string }[] = [
  { key: "low", title: "Low slope", sub: "Easy to walk" },
  { key: "standard", title: "Standard", sub: "Most common", badge: "Most homes" },
  { key: "steep", title: "Steep", sub: "Hard to walk" },
];

export default function PitchStep({ value, onSelect }: PitchStepProps) {
  const [selected, setSelected] = useState<PitchKey>(value ?? "standard");
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  function pick(key: PitchKey) {
    // A second tap inside the auto-advance window is a correction: restart
    // the timer with the new choice instead of dropping the tap.
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setSelected(key);
    timerRef.current = window.setTimeout(() => onSelect(key), 300);
  }

  return (
    <div>
      <p className="kicker">Last question</p>
      <h3 className="headline mt-2 text-2xl text-ink sm:text-[28px]">
        Last one. How steep is your roof?
      </h3>
      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PITCH_OPTIONS.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              data-qa="option"
              aria-pressed={isSelected}
              onClick={() => pick(opt.key)}
              className={
                "relative flex items-center gap-4 rounded-2xl border p-4 pt-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:flex-col sm:gap-2 sm:text-center " +
                (isSelected
                  ? "border-brand bg-brand/5 shadow-(--shadow-card)"
                  : "border-line bg-white hover:-translate-y-0.5 hover:border-ink-soft/30 hover:shadow-(--shadow-card)")
              }
            >
              {opt.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                  {opt.badge}
                </span>
              )}
              <PitchIllustration
                pitch={opt.key}
                className="w-20 shrink-0 sm:w-full sm:max-w-[120px]"
              />
              <span className="block">
                <span className="block font-bold text-ink">{opt.title}</span>
                <span className="block text-sm text-ink-soft">{opt.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
