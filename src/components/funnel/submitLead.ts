// Builds the LeadPayload and POSTs it to /api/lead. Fired twice per lead:
// once at lead capture (stage "lead_captured", no pitch/quote yet) and once
// at quote reveal (stage "quote_viewed", full payload). Never reads env vars
// client-side; the server route owns the webhook forward.

import type {
  Contact,
  FootprintSource,
  LeadPayload,
  LeadResponse,
  QuizAnswers,
} from "../../lib/types";
import type { PitchKey, QuoteResult } from "../../lib/pricing";

export interface SubmitLeadInput {
  stage: LeadPayload["stage"];
  quiz: Partial<QuizAnswers>;
  address: { entered: string; matched: string; lat: number; lng: number };
  footprint: {
    sqft: number;
    source: FootprintSource;
    assist?: { heatedSqft: number; stories: number };
  };
  contact: Contact;
  pitch?: PitchKey;
  quote?: QuoteResult;
}

export async function submitLead(input: SubmitLeadInput): Promise<LeadResponse | null> {
  const quiz: QuizAnswers = {
    reason: input.quiz.reason ?? "",
    roofAge: input.quiz.roofAge ?? "",
    material: input.quiz.material ?? "",
    insurance: input.quiz.insurance ?? "",
    timeline: input.quiz.timeline ?? "",
  };

  const payload: LeadPayload = {
    stage: input.stage,
    quiz,
    address: {
      entered: input.address.entered,
      matched: input.address.matched,
      lat: input.address.lat,
      lng: input.address.lng,
    },
    footprint: {
      sqft: input.footprint.sqft,
      source: input.footprint.source,
      ...(input.footprint.assist ? { assist: input.footprint.assist } : {}),
    },
    contact: input.contact,
    ...(input.pitch ? { pitch: input.pitch } : {}),
    ...(input.quote
      ? {
          quote: {
            roofSqft: input.quote.roofSqft,
            squares: input.quote.squares,
            pricePerSquare: input.quote.pricePerSquare,
            tiers: input.quote.tiers.map((t) => ({
              tier: t.tier,
              low: t.low,
              high: t.high,
            })),
          },
        }
      : {}),
    submittedAt: new Date().toISOString(),
    page: typeof location !== "undefined" ? location.pathname : "/",
  };

  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return (await res.json()) as LeadResponse;
  } catch (err) {
    console.warn("[funnel] lead submit failed", err);
    return null;
  }
}
