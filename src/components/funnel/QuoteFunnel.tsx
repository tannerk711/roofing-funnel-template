// The quote funnel island. Mounted by the landing page as
// <QuoteFunnel client:idle /> inside <section id="quote-tool">.
// One screen at a time, 12 steps, no GSAP (contract rule 10): step
// transitions are keyed CSS animations, motion components handle the rest.

import { useEffect, useRef, useState } from "react";
import TiltCard from "../motion/TiltCard";
import { QUIZ_QUESTIONS } from "./quiz-data";
import { PROGRESS_INDEX, PROGRESS_TOTAL, useFunnel } from "./useFunnel";
import type { StepId } from "./useFunnel";
import { submitLead } from "./submitLead";
import type { Contact } from "../../lib/types";
import QuizStep from "./steps/QuizStep";
import AddressStep from "./steps/AddressStep";
import ConfirmStep from "./steps/ConfirmStep";
import MeasuringStep from "./steps/MeasuringStep";
import AssistStep from "./steps/AssistStep";
import LeadStep from "./steps/LeadStep";
import PitchStep from "./steps/PitchStep";
import QuoteStep from "./steps/QuoteStep";

const EXIT_MS = 150;

// Unlayered on purpose so these always win over utility classes. The step
// wrapper uses no Tailwind transform utilities, so animating transform on it
// is safe (Tailwind v4 translate/scale/rotate are separate properties).
const FUNNEL_CSS = `
@keyframes qf-step-in {
  from { opacity: 0; transform: translateX(var(--qf-from, 24px)); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes qf-step-out {
  to { opacity: 0; transform: translateX(var(--qf-to, -24px)); }
}
@keyframes qf-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}
.qf-step { outline: none; }
.qf-enter { animation: qf-step-in 280ms var(--ease-spring) both; }
.qf-exit { animation: qf-step-out ${EXIT_MS}ms ease-in both; pointer-events: none; }
.qf-enter-back { --qf-from: -24px; }
.qf-exit-back { --qf-to: 24px; }
.qf-fade { animation: qf-fade-in 320ms ease both; }
`;

export default function QuoteFunnel() {
  const { state, actions } = useFunnel();

  // Two-phase step transition: play the exit animation on the outgoing step,
  // then swap the keyed wrapper so the incoming step animates in on mount.
  const [display, setDisplay] = useState<{ step: StepId; dir: 1 | -1 }>({
    step: state.step,
    dir: 1,
  });
  const [exiting, setExiting] = useState(false);
  const stepRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (state.step === display.step) return;
    const dir = state.direction;
    setExiting(true);
    const t = window.setTimeout(() => {
      setDisplay({ step: state.step, dir });
      setExiting(false);
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [state.step, state.direction, display.step]);

  // Move focus to the new step for keyboard and screen reader users. Skipped
  // on the initial mount so hydration never yanks focus.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stepRef.current?.focus({ preventScroll: true });
  }, [display.step]);

  async function handleLeadSubmit(contact: Contact): Promise<void> {
    const { address, footprint } = state;
    if (address && footprint) {
      // Fire stage "lead_captured". keepalive on the fetch means it survives
      // the step change; the race keeps the pending state brief either way.
      const post = submitLead({
        stage: "lead_captured",
        quiz: state.quiz,
        address,
        footprint,
        contact,
      });
      await Promise.race([
        post,
        new Promise<void>((resolve) => window.setTimeout(resolve, 800)),
      ]);
    }
    actions.contactSubmit(contact);
  }

  function renderStep(step: StepId) {
    switch (step) {
      case "quiz-reason":
      case "quiz-age":
      case "quiz-material":
      case "quiz-insurance":
      case "quiz-timeline": {
        const idx = QUIZ_QUESTIONS.findIndex((q) => q.stepId === step);
        const question = QUIZ_QUESTIONS[idx];
        if (!question) return null;
        return (
          <QuizStep
            question={question}
            index={idx}
            value={state.quiz[question.field]}
            onAnswer={(v) => actions.answerQuiz(question.field, v)}
          />
        );
      }
      case "address":
        return (
          <AddressStep
            initial={state.address?.entered ?? ""}
            onFound={actions.addressFound}
          />
        );
      case "confirm":
        if (!state.address) return null;
        return (
          <ConfirmStep
            matched={state.address.matched}
            lat={state.address.lat}
            lng={state.address.lng}
            onYes={actions.confirmYes}
            onNo={actions.reenterAddress}
          />
        );
      case "measuring":
        if (!state.address) return null;
        return (
          <MeasuringStep
            lat={state.address.lat}
            lng={state.address.lng}
            onMeasured={actions.measured}
            onFailed={actions.measureFailed}
          />
        );
      case "assist":
        return (
          <AssistStep
            {...(state.footprint?.assist ? { initial: state.footprint.assist } : {})}
            onContinue={actions.assistSubmit}
          />
        );
      case "lead":
        return <LeadStep initial={state.contact} onSubmit={handleLeadSubmit} />;
      case "pitch":
        return <PitchStep value={state.pitch} onSelect={actions.pitchSelect} />;
      case "quote":
        if (!state.address || !state.footprint || !state.contact || !state.pitch) return null;
        return (
          <QuoteStep
            quiz={state.quiz}
            address={state.address}
            footprint={state.footprint}
            contact={state.contact}
            pitch={state.pitch}
          />
        );
      default:
        return null;
    }
  }

  const pct = Math.round((PROGRESS_INDEX[display.step] / PROGRESS_TOTAL) * 100);
  // Chevron hidden on the first step and on the quote screen (lead is already
  // captured there; the reducer still maps quote -> pitch defensively).
  const showBack = display.step !== "quiz-reason" && display.step !== "quote";

  const stepClass =
    "qf-step " +
    (exiting
      ? "qf-exit" + (state.direction === -1 ? " qf-exit-back" : "")
      : "qf-enter" + (display.dir === -1 ? " qf-enter-back" : ""));

  return (
    <div data-funnel className="mx-auto w-full max-w-2xl">
      <style>{FUNNEL_CSS}</style>
      <TiltCard maxDeg={4}>
        {/* x-clip (not hidden) so step slide animations stay contained while
            the address autocomplete dropdown can overflow the card bottom. */}
        <div className="card-lift relative overflow-x-clip px-5 pb-8 pt-14 sm:px-10 sm:pb-10 md:min-h-[520px]">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-line/50"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Estimate progress"
          >
            <div
              className="h-full rounded-r-full bg-brand"
              style={{ width: `${pct}%`, transition: "width 0.5s var(--ease-spring)" }}
            />
          </div>

          {showBack && (
            <button
              type="button"
              onClick={actions.goBack}
              disabled={exiting}
              aria-label="Go back one step"
              className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-ink-soft/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          <div
            key={display.step}
            ref={stepRef}
            data-step={display.step}
            tabIndex={-1}
            className={stepClass}
          >
            {renderStep(display.step)}
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
