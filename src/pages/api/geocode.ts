// GET /api/geocode?address=...
// Primary: US Census Geocoder (keyless, US-only). Fallback: Nominatim.
// Response shape: GeocodeResponse from src/lib/types.ts.

import type { APIRoute } from "astro";
import { SITE } from "../../config/site";
import type { GeocodeResponse } from "../../lib/types";

export const prerender = false;

const UPSTREAM_TIMEOUT_MS = 6500;

function json(body: GeocodeResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

interface GeocodeHit {
  lat: number;
  lng: number;
  matchedAddress: string;
}

interface CensusResponse {
  result?: {
    addressMatches?: {
      matchedAddress?: string;
      coordinates?: { x?: number; y?: number };
    }[];
  };
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
}

/** Returns a hit, null when the service answered but found nothing. Throws on hard failure. */
async function tryCensus(address: string): Promise<GeocodeHit | null> {
  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    `?address=${encodeURIComponent(address)}` +
    "&benchmark=Public_AR_Current&format=json";
  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`census_http_${res.status}`);
  const data = (await res.json()) as CensusResponse;
  const match = data.result?.addressMatches?.[0];
  if (!match) return null;
  const lng = match.coordinates?.x;
  const lat = match.coordinates?.y;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, matchedAddress: match.matchedAddress ?? address };
}

/** Returns a hit, null when the service answered but found nothing. Throws on hard failure. */
async function tryNominatim(address: string): Promise<GeocodeHit | null> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?q=${encodeURIComponent(address)}` +
    "&format=jsonv2&limit=1&countrycodes=us";
  const res = await fetch(url, {
    headers: { "User-Agent": `RoofQuoteTool/1.0 (${SITE.email})` },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`nominatim_http_${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  const first = Array.isArray(data) ? data[0] : undefined;
  if (!first) return null;
  const lat = Number.parseFloat(first.lat ?? "");
  const lng = Number.parseFloat(first.lon ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, matchedAddress: first.display_name ?? address };
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const address = (url.searchParams.get("address") ?? "").trim();
    if (address.length < 5) {
      return json({ ok: false, error: "invalid" }, 400);
    }

    let censusHardFailed = false;
    try {
      const hit = await tryCensus(address);
      if (hit) {
        return json({ ok: true, lat: hit.lat, lng: hit.lng, matchedAddress: hit.matchedAddress });
      }
    } catch (err) {
      censusHardFailed = true;
      console.error("[geocode] census failed:", err);
    }

    let nominatimHardFailed = false;
    try {
      const hit = await tryNominatim(address);
      if (hit) {
        return json({ ok: true, lat: hit.lat, lng: hit.lng, matchedAddress: hit.matchedAddress });
      }
    } catch (err) {
      nominatimHardFailed = true;
      console.error("[geocode] nominatim failed:", err);
    }

    if (censusHardFailed && nominatimHardFailed) {
      return json({ ok: false, error: "upstream" }, 502);
    }
    return json({ ok: false, error: "not_found" });
  } catch (err) {
    console.error("[geocode] unexpected error:", err);
    return json({ ok: false, error: "upstream" }, 500);
  }
};
