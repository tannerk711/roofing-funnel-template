// Two-tier ranged quote reveal. Ranges only, never a single number. Fires
// stage "quote_viewed" with the full payload on first render of this step.

import { useEffect, useMemo, useRef } from "react";
import TiltCard from "../../motion/TiltCard";
import CountUp from "../../motion/CountUp";
import MagneticButton from "../../motion/MagneticButton";
import { SITE } from "../../../config/site";
import { computeQuote, formatMoney, formatSqft } from "../../../lib/pricing";
import type { PitchKey, TierKey, TierQuote } from "../../../lib/pricing";
import type { Contact, QuizAnswers } from "../../../lib/types";
import type { AddressState, FootprintState } from "../useFunnel";
import { submitLead } from "../submitLead";

interface QuoteStepProps {
  quiz: Partial<QuizAnswers>;
  address: AddressState;
  footprint: FootprintState;
  contact: Contact;
  pitch: PitchKey;
}

const PITCH_LABELS: Record<PitchKey, string> = {
  low: "low slope",
  standard: "standard",
  steep: "steep",
};

const TIER_META: Record<TierKey, { name: string; blurb: string }> = {
  standard: {
    name: "Standard",
    blurb: "Architectural asphalt shingles with a 25 to 30 year manufacturer warranty.",
  },
  premium: {
    name: "Premium",
    blurb: "Dimensional impact-resistant shingles, extended warranty, better hail rating.",
  },
};

function SatelliteGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HouseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11.5 12 5l8 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10.5V19h11v-8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function QuoteStep({ quiz, address, footprint, contact, pitch }: QuoteStepProps) {
  const quote = useMemo(() => computeQuote(footprint.sqft, pitch), [footprint.sqft, pitch]);
  const posted = useRef(false);

  useEffect(() => {
    if (posted.current) return;
    posted.current = true;
    void submitLead({
      stage: "quote_viewed",
      quiz,
      address,
      footprint,
      contact,
      pitch,
      quote,
    });
    // Fires exactly once per mount of this step; the ref also guards
    // React StrictMode's dev double-invoke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const premium = quote.tiers.find((t) => t.tier === "premium");
  const standard = quote.tiers.find((t) => t.tier === "standard");
  const ordered = [premium, standard].filter((t): t is TierQuote => Boolean(t));
  const wastePct = Math.round((quote.wasteFactor - 1) * 100);
  const measured = footprint.source === "measured";

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-deep px-4 py-1.5 text-ink-soft">
        {measured ? <SatelliteGlyph /> : <HouseGlyph />}
        <span className="text-[11px] font-bold uppercase tracking-widest">
          {measured ? "Measured from satellite" : "Estimated from your home size"}
        </span>
      </div>
      <h3 className="headline mt-3 text-2xl text-ink sm:text-[28px]">
        Your roof replacement range
      </h3>

      <div className="mt-7 grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2">
        {ordered.map((tier) => {
          const meta = TIER_META[tier.tier];
          const isPremium = tier.tier === "premium";
          return (
            <TiltCard key={tier.tier} maxDeg={6} className="h-full">
              <div
                className={
                  "relative flex h-full flex-col gap-2.5 rounded-2xl border bg-white p-5 pt-6 text-left " +
                  (isPremium
                    ? "border-brand shadow-(--shadow-lift)"
                    : "border-line shadow-(--shadow-card)")
                }
              >
                {isPremium && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                    Most popular
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                  {meta.name}
                </p>
                <p className="headline text-[22px] leading-tight text-ink sm:text-2xl">
                  <CountUp value={tier.low} format={formatMoney} />
                  <span className="px-1 text-base font-semibold text-ink-soft">to</span>
                  <CountUp value={tier.high} format={formatMoney} delayMs={120} />
                </p>
                <p className="text-sm leading-relaxed text-ink-soft">{meta.blurb}</p>
              </div>
            </TiltCard>
          );
        })}
      </div>

      <div className="mx-auto mt-6 max-w-md rounded-xl border border-line bg-paper-deep/60 p-4 text-left">
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          How we got this
        </p>
        <ul className="mt-2 space-y-1 text-[13px] text-ink-soft">
          <li>
            Footprint: {formatSqft(quote.footprintSqft)} sqft,{" "}
            {measured ? "measured from satellite" : "estimated from your home size"}
          </li>
          <li>
            Pitch: {PITCH_LABELS[quote.pitch]} (x{quote.pitchMultiplier})
          </li>
          <li>Roof surface: {formatSqft(quote.roofSqft)} sqft</li>
          <li>
            {quote.squares} squares at {formatMoney(quote.pricePerSquare)} per square
          </li>
          <li>{wastePct}% waste included</li>
        </ul>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-soft">
          {measured
            ? "This range is your starting estimate, measured from your actual roof. A free 20 minute inspection pins down the exact number, and it's booked in 30 seconds."
            : "This range is your starting estimate, based on your home size. A free 20 minute inspection pins down the exact number, and it's booked in 30 seconds."}
        </p>
        <div className="mt-4 flex justify-center">
          <MagneticButton
            href={SITE.calendarUrl}
            target="_blank"
            rel="noopener"
            className="btn-primary"
          >
            Book my free inspection
          </MagneticButton>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Prefer to talk?{" "}
          <a
            href={SITE.phoneHref}
            className="font-bold text-ink underline decoration-brand decoration-2 underline-offset-2"
          >
            Call {SITE.phone}
          </a>
        </p>
        <p className="mt-5 text-xs text-ink-soft/80">
          Instant estimates are a planning range, not a final bid. Final pricing follows an
          on-site inspection.
        </p>
      </div>
    </div>
  );
}
