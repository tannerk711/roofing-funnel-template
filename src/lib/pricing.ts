import { SITE } from "../config/site";

export type PitchKey = keyof typeof SITE.pricing.pitchMultipliers;
export type TierKey = keyof typeof SITE.pricing.tierMultipliers;

export interface TierQuote {
  tier: TierKey;
  /** Unrounded midpoint price for this tier. */
  mid: number;
  /** Range floor, rounded to the nearest $100. */
  low: number;
  /** Range ceiling, rounded to the nearest $100. */
  high: number;
}

export interface QuoteResult {
  footprintSqft: number;
  pitch: PitchKey;
  pitchMultiplier: number;
  wasteFactor: number;
  /** footprint x pitch x waste, rounded to whole sqft for display. */
  roofSqft: number;
  /** roofSqft / 100, one decimal. */
  squares: number;
  pricePerSquare: number;
  tiers: TierQuote[];
}

export function roundTo100(n: number): number {
  return Math.round(n / 100) * 100;
}

export function formatMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** "$14,200 to $19,300" - always the word "to", never a dash. */
export function formatRange(low: number, high: number): string {
  return `${formatMoney(low)} to ${formatMoney(high)}`;
}

export function formatSqft(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function computeQuote(footprintSqft: number, pitch: PitchKey): QuoteResult {
  const { pricePerSquare, wasteFactor, rangeSpread, pitchMultipliers, tierMultipliers } =
    SITE.pricing;
  const pitchMultiplier = pitchMultipliers[pitch];
  const roofSqftExact = footprintSqft * pitchMultiplier * wasteFactor;
  const pricePerSqft = pricePerSquare / 100;
  const baseInstall = roofSqftExact * pricePerSqft;

  const tiers: TierQuote[] = (Object.keys(tierMultipliers) as TierKey[]).map((tier) => {
    const mid = baseInstall * tierMultipliers[tier];
    return {
      tier,
      mid,
      low: roundTo100(mid * (1 - rangeSpread)),
      high: roundTo100(mid * (1 + rangeSpread)),
    };
  });

  return {
    footprintSqft: Math.round(footprintSqft),
    pitch,
    pitchMultiplier,
    wasteFactor,
    roofSqft: Math.round(roofSqftExact),
    squares: Math.round((roofSqftExact / 100) * 10) / 10,
    pricePerSquare,
    tiers,
  };
}
