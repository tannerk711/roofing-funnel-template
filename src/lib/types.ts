import type { PitchKey, TierKey } from "./pricing";

export interface QuizAnswers {
  reason: string;
  roofAge: string;
  material: string;
  insurance: string;
  timeline: string;
}

export type FootprintSource = "measured" | "estimated";

export interface Contact {
  name: string;
  phone: string;
  email: string;
}

/** One typeahead result from GET /api/suggest?q=... */
export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  /** True when the match includes a house number (safe to use coords directly). */
  precise: boolean;
}

/** GET /api/suggest?q=... */
export type SuggestResponse =
  | { ok: true; suggestions: AddressSuggestion[] }
  | { ok: false; error: "invalid" | "upstream" };

/** GET /api/geocode?address=... */
export type GeocodeResponse =
  | { ok: true; lat: number; lng: number; matchedAddress: string }
  | { ok: false; error: "invalid" | "not_found" | "upstream" };

/** GET /api/footprint?lat=...&lng=... */
export type FootprintResponse =
  | {
      ok: true;
      found: true;
      sqft: number;
      /** Outer ring of the matched building, [lat, lng] pairs, closed or open. */
      polygon: [number, number][];
    }
  | { ok: true; found: false }
  | { ok: false; error: string };

/** POST /api/lead body. Sent twice: at lead capture, then enriched at quote reveal. */
export interface LeadPayload {
  stage: "lead_captured" | "quote_viewed";
  quiz: QuizAnswers;
  address: {
    entered: string;
    matched: string;
    lat: number;
    lng: number;
  };
  footprint: {
    sqft: number;
    source: FootprintSource;
    assist?: { heatedSqft: number; stories: number };
  };
  contact: Contact;
  pitch?: PitchKey;
  quote?: {
    roofSqft: number;
    squares: number;
    pricePerSquare: number;
    tiers: { tier: TierKey; low: number; high: number }[];
    // Flat pre-formatted ranges ("$7,200-$9,700") so the Zap/CRM maps a single
    // clean field per tier instead of joining the tiers array.
    standardRange: string;
    premiumRange: string;
  };
  /** Honeypot trap value (empty for humans) and seconds from first interaction. */
  ff_hp?: string;
  secondsToComplete?: number | null;
  submittedAt: string;
  page: string;
}

export type LeadResponse = { ok: boolean; forwarded?: boolean };
