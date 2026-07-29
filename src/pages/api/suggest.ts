// GET /api/suggest?q=...
// Address typeahead. Primary: Esri World Geocoder suggest (keyless, same
// vendor as the satellite imagery, US house-number coverage is excellent,
// biased toward the service area). Fallback: Photon (photon.komoot.io).
// Degrades gracefully: if this route fails the form still works, the user
// just types the full address like before.

import type { APIRoute } from "astro";
import { SITE } from "../../config/site";
import type { AddressSuggestion, SuggestResponse } from "../../lib/types";

export const prerender = false;

const UPSTREAM_TIMEOUT_MS = 4000;
const MAX_SUGGESTIONS = 6;
const UA = `RoofQuoteTool/1.0 (${SITE.email})`;

function json(body: SuggestResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

interface EsriSuggestResponse {
  suggestions?: { text?: string; isCollection?: boolean }[];
}

/** Returns [] when the service answered but found nothing. Throws on hard failure. */
async function tryEsri(q: string): Promise<AddressSuggestion[]> {
  const url =
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest" +
    "?f=json&countryCode=USA" +
    `&maxSuggestions=${MAX_SUGGESTIONS}` +
    `&location=${encodeURIComponent(`${SITE.serviceAreaCenter.lng},${SITE.serviceAreaCenter.lat}`)}` +
    `&text=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`esri_http_${res.status}`);
  const data = (await res.json()) as EsriSuggestResponse;
  const out: AddressSuggestion[] = [];
  for (const s of data.suggestions ?? []) {
    // isCollection entries are category buckets ("Restaurants"), not addresses.
    if (!s.text || s.isCollection) continue;
    out.push({ label: s.text.replace(/,\s*USA$/i, "") });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    countrycode?: string;
    housenumber?: string;
    street?: string;
    name?: string;
    osm_key?: string;
    city?: string;
    district?: string;
    state?: string;
    postcode?: string;
  };
}

function photonLabel(p: NonNullable<PhotonFeature["properties"]>): string | null {
  // Streets come back as name (osm_key "highway") when there's no housenumber.
  const street = p.street ?? (p.osm_key === "highway" ? p.name : undefined);
  if (!street) return null;
  const line1 = p.housenumber ? `${p.housenumber} ${street}` : street;
  const region = [p.state, p.postcode].filter(Boolean).join(" ");
  return [line1, p.city ?? p.district, region].filter(Boolean).join(", ");
}

/** Returns [] when the service answered but found nothing. Throws on hard failure. */
async function tryPhoton(q: string): Promise<AddressSuggestion[]> {
  const url =
    "https://photon.komoot.io/api/" +
    `?q=${encodeURIComponent(q)}` +
    `&limit=${MAX_SUGGESTIONS * 2}` +
    "&lang=en" +
    `&lat=${SITE.serviceAreaCenter.lat}&lon=${SITE.serviceAreaCenter.lng}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`photon_http_${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };

  const seen = new Set<string>();
  const out: AddressSuggestion[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    const coords = f.geometry?.coordinates;
    if (!p || !coords) continue;
    if ((p.countrycode ?? "").toUpperCase() !== "US") continue;
    const label = photonLabel(p);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ label, lat, lng, precise: Boolean(p.housenumber) });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 128);
  if (q.length < 4) {
    return json({ ok: false, error: "invalid" }, 400);
  }

  let esriHardFailed = false;
  try {
    const suggestions = await tryEsri(q);
    if (suggestions.length > 0) return json({ ok: true, suggestions });
  } catch (err) {
    esriHardFailed = true;
    console.error("[suggest] esri failed:", err);
  }

  try {
    const suggestions = await tryPhoton(q);
    return json({ ok: true, suggestions });
  } catch (err) {
    console.error("[suggest] photon failed:", err);
  }

  // Both empty-or-failed. An empty list is only an error if Esri hard-failed
  // too; otherwise "no matches" is a valid answer.
  if (esriHardFailed) return json({ ok: false, error: "upstream" }, 502);
  return json({ ok: true, suggestions: [] });
};
