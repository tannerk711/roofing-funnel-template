# Roofing Instant-Quote Funnel Template

Standalone lead-gen funnel for roofing companies. The centerpiece is an
instant roof-replacement price RANGE measured from the homeowner's actual
roof: address -> geocode -> "is this your house?" satellite confirm -> OSM
building footprint -> lead capture (BEFORE any price) -> pitch -> two-tier
ranged quote -> book inspection.

Placeholder client: "Apex Roofing Co.", metro Atlanta ITP + Marietta,
hail/insurance angle. This is a TEMPLATE, like `templates/funnels/dscr-1-private-credit/`.

## Rebrand checklist (new client)

1. Edit `src/config/site.ts` only: businessName, legalName, phone/phoneHref,
   email, calendarUrl (GHL booking), serviceArea* (including
   serviceAreaCenter lat/lng, which biases the address autocomplete),
   licenseLine, brand.primary + primaryDark, pricing (pricePerSquare,
   tier/pitch multipliers) if their market differs, aerial provider/key if
   switching to Google imagery.
2. Replace images: regenerate via fal into `public/img/_raw/` (hero, storm,
   aerial-texture, crew, inspection, blueprint), then `npm run images`.
3. Set `LEAD_WEBHOOK_URL` in Vercel env (server-side only; see `env.example`).
   Leaving local `.env` unset is fine and keeps dev submits out of the
   client's Zap/CRM (in dev /api/lead accepts and logs the payload; in
   production an unset URL answers 502 so the form shows its retry state).
   Honeypot contract (`.claude/rules/sites.md` item 6): trap `ff_hp`, filled
   trap drops only a sub-20-second submit, one `[lead]` log line per outcome;
   test with `node tools/hp-test.mjs` from the workspace root.
3b. Set `site` in `astro.config.mjs` to the client's real domain (drives
   canonical/og absolute URLs).
3c. Google Ads: fill `SITE.googleAds` (tagId + conversionLabel) and the tag
   wires itself: base tag in Layout head, conversion fired from submitLead.ts
   only on an accepted lead (never page load / raw click), suppressed on
   localhost and `?qa=1`. In the Ads UI turn ON both "Enhanced conversions"
   and "Enhanced conversions for leads". Leave both fields empty for
   clients without Google Ads (no script loads at all).
3d. No booking calendar? (Some clients schedule via a GHL workflow instead.)
   Follow the Guards Construction pattern: quote CTA "Request my free
   inspection" -> /thank-you rewritten to "we'll reach out shortly", strip
   every "booked in 30 seconds" / "you're on the calendar" promise. Reference:
   `clients/guards-construction/funnels/roofing-quote/`.
4. Sweep all section copy for the new market (county names, storm angle).
5. Run the QA pass: `npm run build`, then `node tools/qa-walk.mjs` against
   the dev server on 4321 (desktop + mobile + --reduced-motion). Update the
   site-identity phone marker in qa-walk.mjs to the client's number.
   Scrolled section shots: `node tools/shot-section.mjs <url> <marker> <out>`.

## Architecture

- Astro 5, `output: "static"`, Vercel adapter. Four server routes with
  `export const prerender = false`: `/api/suggest` (address typeahead, Esri
  World Geocoder suggest primary + Photon fallback, biased by
  `SITE.serviceAreaCenter`), `/api/geocode` (Census primary, Nominatim
  fallback), `/api/footprint` (Overpass primary + kumi mirror, Turf area,
  400..20000 sqft accept window, returns the building polygon), `/api/lead`
  (forwards to process.env.LEAD_WEBHOOK_URL; fires twice per lead: stage
  "lead_captured" then "quote_viewed").
- Address autocomplete: AddressStep debounces /api/suggest into a combobox
  dropdown; picking a suggestion auto-runs /api/geocode with the full label
  (Photon-sourced house-number coords as fallback so a pick never dead-ends).
  If /api/suggest is down the field degrades to plain typing.
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
- **[2026-07-28] Photon is not good enough for US house-number typeahead:**
  "1198 Cumberland Rd NE" returned a Nevada street. Esri World Geocoder
  `suggest` (geocode.arcgis.com, keyless, location-biased) nails partial US
  addresses; Photon is fallback only.
- **[2026-07-28] Dropdowns inside the wizard card get clipped:** the card
  used overflow-hidden for the step slide animations, which cut the
  autocomplete list at the card edge on mobile. Fix was overflow-x-clip
  (horizontal clip only, vertical overflow visible), not repositioning the
  dropdown.
- **[2026-07-28] Touch taps on dropdown options need onPointerDown, not
  onClick:** on touch the input's blur fires before the synthesized click,
  unmounting the list first, so onClick never lands. onMouseDown
  preventDefault only guards mouse. pointerdown fires before blur on both.
- **[2026-07-22] Port 4321 can be squatted by the OLD iteration:** the products/ copy was deleted 2026-09-29; the template is the only copy. qa-walk.mjs asserts the
  555-0187 marker.
