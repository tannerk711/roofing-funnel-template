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
import { formatMoney } from "../../lib/pricing";
import { SITE } from "../../config/site";

// "$7,200-$9,700" style single-field range for the Zap/CRM.
function tierRange(quote: QuoteResult, tier: string): string {
  const t = quote.tiers.find((x) => x.tier === tier);
  return t ? `${formatMoney(t.low)}-${formatMoney(t.high)}` : "";
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Google Ads conversion. Fired once, only after /api/lead accepts the
// lead_captured stage, and only when SITE.googleAds is configured. Suppressed
// for local dev and QA walks (?qa=1) so automated runs never pollute
// conversion counts.
function fireAdsConversion(contact: Contact): void {
  const { tagId, conversionLabel } = SITE.googleAds;
  if (!tagId || !conversionLabel) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const { hostname, search } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return;
  if (new URLSearchParams(search).has("qa")) return;
  window.gtag("set", "user_data", {
    email: contact.email,
    phone_number: contact.phone,
  });
  window.gtag("event", "conversion", {
    send_to: `${tagId}/${conversionLabel}`,
  });
}

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
            standardRange: tierRange(input.quote, "standard"),
            premiumRange: tierRange(input.quote, "premium"),
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
    const data = (await res.json()) as LeadResponse;
    if (input.stage === "lead_captured" && data.ok) {
      fireAdsConversion(input.contact);
    }
    return data;
  } catch (err) {
    console.warn("[funnel] lead submit failed", err);
    return null;
  }
}
