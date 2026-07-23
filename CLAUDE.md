# Roofing Instant-Quote Funnel Template

Standalone lead-gen funnel for roofing companies. The centerpiece is an
instant roof-replacement price RANGE measured from the homeowner's actual
roof: address -> geocode -> "is this your house?" satellite confirm -> OSM
building footprint -> lead capture (BEFORE any price) -> pitch -> two-tier
ranged quote -> book inspection.

Placeholder client: "Apex Roofing Co.", metro Atlanta ITP + Marietta,
hail/insurance angle. This is a TEMPLATE, like `clients/dscr-funnel-template/`.

## Rebrand checklist (new client)

1. Edit `src/config/site.ts` only: businessName, legalName, phone/phoneHref,
   email, calendarUrl (GHL booking), serviceArea*, licenseLine, brand.primary
   + primaryDark, pricing (pricePerSquare, tier/pitch multipliers) if their
   market differs, aerial provider/key if switching to Google imagery.
2. Replace images: regenerate via fal into `public/img/_raw/` (hero, storm,
   aerial-texture, crew, inspection, blueprint), then `npm run images`.
3. Set `LEAD_WEBHOOK_URL` in `.env` locally and in Vercel env (server-side
   only; see `env.example`).
3b. Set `site` in `astro.config.mjs` to the client's real domain (drives
   canonical/og absolute URLs).
4. Sweep all section copy for the new market (county names, storm angle).
5. Run the QA pass: `npm run build`, then `node tools/qa-walk.mjs` against
   the dev server on 4321 (desktop + mobile + --reduced-motion).

## Architecture

- Astro 5, `output: "static"`, Vercel adapter. Three server routes with
  `export const prerender = false`: `/api/geocode` (Census primary,
  Nominatim fallback), `/api/footprint` (Overpass primary + kumi mirror,
  Turf area, 400..20000 sqft accept window, returns the building polygon),
  `/api/lead` (forwards to process.env.LEAD_WEBHOOK_URL; fires twice per
  lead: stage "lead_captured" then "quote_viewed").
- React islands: `src/components/funnel/QuoteFunnel.tsx` (the wizard) +
  `src/components/motion/*` (ScanOverlay, TiltCard, MagneticButton, CountUp).
- Landing sections are static Astro in `src/components/sections/`; page-level
  GSAP lives in `src/scripts/home-motion.ts`, lazy-loaded via
  `src/lib/motion-load.ts` (never blocks first paint).
- Pricing math: `src/lib/pricing.ts`. footprint x pitch x 1.12 waste ->
  sqft x ($pricePerSquare/100) -> tier multiplier -> +/-15% range rounded
  to $100. All coefficients in `src/config/site.ts`.
- Satellite imagery: `src/lib/aerial.ts`, keyless Esri World Imagery export
  (imageSR=4326 so the OSM polygon projects linearly onto the image).
  Swap to Google Static Maps via `SITE.aerial.provider`.
- Full build contract used to generate this project: `AGENT-CONTRACTS.md`.

## Commands

- `npm run dev` (port 4321), `npm run build`, `npm run images`
- QA walk: `node tools/qa-walk.mjs --device=desktop|tablet|mobile [--reduced-motion]`
- Screenshots land in `qa/` (gitignored)

## Hard rules

- NO em-dash characters anywhere (copy, code, comments). Ranges say "to".
- Light mode, real shadows. Lead capture stays BEFORE the price reveal.
- Quote is always a RANGE framed as a starting estimate, never a bid.
- Never read webhook URLs client-side (Vite strips non-PUBLIC_ vars).
- Known-good QA address: 1198 Cumberland Rd NE, Atlanta, GA 30306.

## Lessons Learned

- **[2026-07-22] Overpass primary can fail with HTTP 200 + HTML body:**
  overpass-api.de returns an XHTML "server too busy" page with status 200.
  Treat JSON parse failure as a retryable error (fall through to the kumi
  mirror), not just 429/504.
- **[2026-07-22] OSM services reject Node fetch without a User-Agent:**
  Overpass answers 406, mirrors answer 429, when no identifying UA is sent
  (curl works because curl sends its own). Both /api/footprint and the
  Nominatim fallback send `RoofQuoteTool/1.0 (SITE.email)`.
- **[2026-07-22] Port 4321 can be squatted by the OLD iteration:** stale
  `astro dev` trees under `products/roofing-funnel-template/` grab the port
  and QA silently runs against the wrong site. qa-walk.mjs asserts the
  555-0187 marker; kill any node process whose command line contains
  `products\roofing-funnel-template` before QAing.
