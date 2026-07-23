// GET /api/footprint?lat=...&lng=...
// Queries OpenStreetMap building footprints via Overpass, picks the building
// at (or nearest to) the point, measures it with Turf, and returns the outer
// ring. Never fabricates a number: outside the accept window means found:false.
// Response shape: FootprintResponse from src/lib/types.ts.

import type { APIRoute } from "astro";
import { area } from "@turf/area";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import { SITE } from "../../config/site";
import type { FootprintResponse } from "../../lib/types";

export const prerender = false;

// Tried in order, one attempt each. Public Overpass instances all get busy;
// three independent operators makes a full miss rare.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const UPSTREAM_TIMEOUT_MS = 6500;
const MIRROR_RETRY_DELAY_MS = 1200;
const SQFT_PER_SQM = 10.7639;
const METERS_PER_DEG_LAT = 111320;

function json(body: FootprintResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

interface OverpassGeomPoint {
  lat: number;
  lon: number;
}

interface OverpassMember {
  type?: string;
  role?: string;
  geometry?: OverpassGeomPoint[];
}

interface OverpassElement {
  type?: string;
  id?: number;
  geometry?: OverpassGeomPoint[];
  members?: OverpassMember[];
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface Candidate {
  /** Outer ring as [lat, lng] pairs for the API response. */
  latLngRing: [number, number][];
  sqft: number;
  centroid: { lat: number; lng: number };
  containsPoint: boolean;
}

function buildQuery(lat: number, lng: number, radiusMeters: number): string {
  const at = `${lat.toFixed(7)},${lng.toFixed(7)}`;
  return (
    `[out:json][timeout:25];` +
    `(way["building"](around:${radiusMeters},${at});` +
    `relation["building"](around:${radiusMeters},${at}););` +
    `out geom;`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function overpassPost(endpoint: string, query: string): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // OSM usage policy requires an identifying User-Agent. Node's fetch
      // sends none by default and Overpass instances answer 406/429 without
      // one; curl works only because curl sends its own.
      "User-Agent": `RoofQuoteTool/1.0 (${SITE.email})`,
      Accept: "application/json",
    },
    body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

/**
 * One attempt against one endpoint. Returns parsed JSON, or null when the
 * endpoint failed in a retryable way: network error, error status (429/504
 * etc.), or a non-JSON body. overpass-api.de serves an XHTML "server too busy"
 * page with HTTP 200 under load, so a parse failure MUST count as retryable.
 */
async function tryEndpoint(endpoint: string, query: string): Promise<OverpassResponse | null> {
  let res: Response;
  try {
    res = await overpassPost(endpoint, query);
  } catch (err) {
    console.error(`[footprint] ${endpoint} network failure:`, err);
    return null;
  }
  if (!res.ok) {
    console.error(`[footprint] ${endpoint} http ${res.status}`);
    return null;
  }
  try {
    return (await res.json()) as OverpassResponse;
  } catch {
    console.error(`[footprint] ${endpoint} returned non-JSON (busy page)`);
    return null;
  }
}

/**
 * Run one Overpass query: walk the endpoint chain in order, one attempt each,
 * pausing briefly between endpoints. Throws when the query cannot be
 * completed anywhere.
 */
async function runQuery(query: string, deadline: number): Promise<OverpassResponse> {
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];
    if (!endpoint) continue;
    if (Date.now() > deadline) break;
    if (i > 0) await sleep(MIRROR_RETRY_DELAY_MS);
    const result = await tryEndpoint(endpoint, query);
    if (result) return result;
  }
  throw new Error("overpass_unreachable");
}

const STITCH_EPS = 1e-7;

function samePoint(a: OverpassGeomPoint, b: OverpassGeomPoint): boolean {
  return Math.abs(a.lat - b.lat) < STITCH_EPS && Math.abs(a.lon - b.lon) < STITCH_EPS;
}

/**
 * Stitch multiple outer way fragments into one ring by matching endpoints.
 * Multipolygon relations commonly split the outer boundary across several
 * ways; measuring a single fragment as if it were the building is wrong, so
 * when stitching fails the relation is skipped entirely.
 */
function stitchOuterWays(fragments: OverpassGeomPoint[][]): OverpassGeomPoint[] | null {
  if (fragments.length === 0) return null;
  const firstFragment = fragments[0];
  if (!firstFragment) return null;
  if (fragments.length === 1) return firstFragment;

  const remaining = fragments.slice(1);
  const chain: OverpassGeomPoint[] = [...firstFragment];
  let guard = fragments.length * 2;

  while (remaining.length > 0 && guard-- > 0) {
    const end = chain[chain.length - 1];
    if (!end) return null;
    let attached = false;
    for (let i = 0; i < remaining.length; i++) {
      const frag = remaining[i];
      if (!frag || frag.length < 2) {
        remaining.splice(i, 1);
        attached = true;
        break;
      }
      const fragStart = frag[0];
      const fragEnd = frag[frag.length - 1];
      if (fragStart && samePoint(end, fragStart)) {
        chain.push(...frag.slice(1));
        remaining.splice(i, 1);
        attached = true;
        break;
      }
      if (fragEnd && samePoint(end, fragEnd)) {
        chain.push(...frag.slice(0, -1).reverse());
        remaining.splice(i, 1);
        attached = true;
        break;
      }
    }
    if (!attached) return null; // disjoint fragments: not a stitchable ring
  }
  return remaining.length === 0 && chain.length >= 3 ? chain : null;
}

/** Extract the outer ring points for an element, or null if unusable. */
function outerRingOf(el: OverpassElement): OverpassGeomPoint[] | null {
  if (el.type === "way" && Array.isArray(el.geometry) && el.geometry.length >= 3) {
    return el.geometry;
  }
  if (el.type === "relation" && Array.isArray(el.members)) {
    const outers = el.members
      .filter(
        (m) =>
          m.type === "way" &&
          m.role === "outer" &&
          Array.isArray(m.geometry) &&
          m.geometry.length >= 2,
      )
      .map((m) => m.geometry as OverpassGeomPoint[]);
    return stitchOuterWays(outers);
  }
  return null;
}

function buildCandidates(
  elements: OverpassElement[],
  lat: number,
  lng: number,
): Candidate[] {
  const candidates: Candidate[] = [];
  const queryPoint = point([lng, lat]);

  for (const el of elements) {
    const geom = outerRingOf(el);
    if (!geom) continue;
    try {
      // Turf wants a closed lng-lat ring.
      const ring: [number, number][] = geom
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
        .map((p) => [p.lon, p.lat]);
      if (ring.length < 3) continue;
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (!first || !last) continue;
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
      if (ring.length < 4) continue;

      const poly = polygon([ring]);
      const sqft = area(poly) * SQFT_PER_SQM;

      // Centroid = mean of ring vertices (closing duplicate excluded).
      const verts = ring.slice(0, ring.length - 1);
      const cLng = verts.reduce((sum, p) => sum + p[0], 0) / verts.length;
      const cLat = verts.reduce((sum, p) => sum + p[1], 0) / verts.length;

      candidates.push({
        latLngRing: ring.map((p) => [p[1], p[0]] as [number, number]),
        sqft,
        centroid: { lat: cLat, lng: cLng },
        containsPoint: booleanPointInPolygon(queryPoint, poly),
      });
    } catch {
      // Invalid ring geometry: skip this candidate.
    }
  }
  return candidates;
}

/** Approximate ground distance in meters (equirectangular, fine at parcel scale). */
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * METERS_PER_DEG_LAT;
  const dLng =
    (bLng - aLng) * METERS_PER_DEG_LAT * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Selection rules: a polygon containing the point wins (smallest one when
 * several nest). Otherwise the nearest-centroid candidate, considering only
 * candidates whose area is inside the accept window. The caller applies the
 * final accept-window gate to whatever is returned.
 */
function pickCandidate(candidates: Candidate[], lat: number, lng: number): Candidate | null {
  const containing = candidates
    .filter((c) => c.containsPoint)
    .sort((a, b) => a.sqft - b.sqft);
  if (containing.length > 0) return containing[0] ?? null;

  const { minSqft, maxSqft } = SITE.footprint;
  const inWindow = candidates.filter((c) => c.sqft >= minSqft && c.sqft <= maxSqft);
  let best: Candidate | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of inWindow) {
    const d = distanceMeters(lat, lng, c.centroid.lat, c.centroid.lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

// The whole route must answer well before any serverless platform timeout;
// past this deadline remaining endpoint attempts are skipped and the funnel
// degrades to the visible assist step.
const ROUTE_BUDGET_MS = 16000;

export const GET: APIRoute = async ({ url }) => {
  try {
    // Reject absent/empty params before coercion: Number(null) and Number("")
    // are both 0, which would silently query Null Island.
    const rawLat = url.searchParams.get("lat");
    const rawLng = url.searchParams.get("lng");
    if (!rawLat?.trim() || !rawLng?.trim()) {
      return json({ ok: false, error: "invalid" }, 400);
    }
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return json({ ok: false, error: "invalid" }, 400);
    }

    const deadline = Date.now() + ROUTE_BUDGET_MS;
    let candidates: Candidate[];
    try {
      const narrow = await runQuery(buildQuery(lat, lng, 50), deadline);
      candidates = buildCandidates(narrow.elements ?? [], lat, lng);
      if (candidates.length === 0) {
        const wide = await runQuery(buildQuery(lat, lng, 90), deadline);
        candidates = buildCandidates(wide.elements ?? [], lat, lng);
      }
    } catch (err) {
      console.error("[footprint] overpass unreachable:", err);
      return json({ ok: false, error: "overpass_unreachable" }, 502);
    }

    const chosen = pickCandidate(candidates, lat, lng);
    const { minSqft, maxSqft } = SITE.footprint;
    if (!chosen || chosen.sqft < minSqft || chosen.sqft > maxSqft) {
      // No usable building, or the measurement is outside the trustable
      // window. Never fabricate a number; the funnel falls back to assist.
      return json({ ok: true, found: false });
    }

    return json({
      ok: true,
      found: true,
      sqft: Math.round(chosen.sqft),
      polygon: chosen.latLngRing,
    });
  } catch (err) {
    console.error("[footprint] unexpected error:", err);
    return json({ ok: false, error: "server_error" }, 500);
  }
};
