// Visible manual fallback when the satellite footprint is unavailable.
// Footprint = heated sqft / stories (2 for "2+ stories"). Validated inline.

import { useState } from "react";
import type { FormEvent } from "react";
import type { FootprintState } from "../useFunnel";

interface AssistStepProps {
  initial?: { heatedSqft: number; stories: number };
  onContinue: (footprint: FootprintState) => void;
}

const STORY_OPTIONS: { value: 1 | 2; label: string }[] = [
  { value: 1, label: "1 story" },
  { value: 2, label: "2+ stories" },
];

function StoryGlyph({ stories }: { stories: 1 | 2 }) {
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {stories === 1 ? (
        <>
          <path
            d="M10 24h28v14H10Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M7 24 24 13l17 11"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path
            d="M12 20h24v22H12Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M12 31h24" stroke="currentColor" strokeWidth="2.5" />
          <path
            d="M9 20 24 9l15 11"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

export default function AssistStep({ initial, onContinue }: AssistStepProps) {
  const [heated, setHeated] = useState(initial ? String(initial.heatedSqft) : "");
  const [stories, setStories] = useState<1 | 2 | null>(
    initial ? (initial.stories >= 2 ? 2 : 1) : null,
  );
  const [errors, setErrors] = useState<{ heated?: string; stories?: string }>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: { heated?: string; stories?: string } = {};
    // Strip thousands separators only; keep the decimal point so "999.9"
    // stays ~1000 instead of concatenating to 9999. Round to whole sqft.
    const parsed = Math.round(Number(heated.replace(/,/g, "")));
    if (!Number.isFinite(parsed) || parsed < 500 || parsed > 12000) {
      next.heated = "Enter a number between 500 and 12,000.";
    }
    if (stories === null) {
      next.stories = "Pick one so we can do the math.";
    }
    setErrors(next);
    if (next.heated || next.stories || stories === null) return;
    const sqft = Math.round(parsed / stories);
    onContinue({
      sqft,
      source: "estimated",
      assist: { heatedSqft: parsed, stories },
    });
  }

  return (
    <div>
      <p className="kicker">Quick backup</p>
      <h3 className="headline mt-2 leading-[1.3] text-2xl text-ink sm:text-[28px]">
        Satellite data is thin for your street, so let's do it the simple way.
      </h3>
      <p className="mt-2 text-ink-soft">Two quick numbers and we can still get your range.</p>
      <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
        <div>
          <label htmlFor="assist-heated" className="block text-sm font-semibold text-ink">
            Heated square footage of your home
          </label>
          <p className="mt-0.5 text-xs text-ink-soft">
            The living area from your listing or tax record. A close guess works.
          </p>
          <input
            id="assist-heated"
            type="number"
            inputMode="numeric"
            min={500}
            max={12000}
            step={50}
            placeholder="2400"
            aria-invalid={errors.heated ? true : undefined}
            value={heated}
            onChange={(e) => {
              setHeated(e.target.value);
              if (errors.heated) setErrors((prev) => ({ ...prev, heated: undefined }));
            }}
            className={
              "mt-2 w-full rounded-xl border bg-white px-4 py-3 text-ink transition-shadow placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-brand/30 " +
              (errors.heated ? "border-[#B42318]" : "border-line focus:border-brand")
            }
          />
          {errors.heated && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-[#B42318]">
              {errors.heated}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">How many stories?</p>
          <div className="mt-2 grid grid-cols-2 gap-3" role="group" aria-label="How many stories?">
            {STORY_OPTIONS.map((opt) => {
              const isSelected = stories === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-qa="option"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setStories(opt.value);
                    if (errors.stories) setErrors((prev) => ({ ...prev, stories: undefined }));
                  }}
                  className={
                    "flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 " +
                    (isSelected
                      ? "border-brand bg-brand/5 text-brand shadow-(--shadow-card)"
                      : "border-line bg-white text-ink-soft hover:-translate-y-0.5 hover:shadow-(--shadow-card)")
                  }
                >
                  <StoryGlyph stories={opt.value} />
                  <span className={"font-bold " + (isSelected ? "text-ink" : "text-ink")}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.stories && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-[#B42318]">
              {errors.stories}
            </p>
          )}
        </div>

        <button type="submit" data-qa="next" className="btn-primary w-full">
          Continue
        </button>
      </form>
    </div>
  );
}
