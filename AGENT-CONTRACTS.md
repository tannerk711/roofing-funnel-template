# BUILD CONTRACT - Roofing Instant-Quote Funnel

Four agents build this project in parallel. Each agent owns a disjoint set of
files. This document is the single source of truth for interfaces, design
language, and behavior. Follow it exactly. If you believe the contract is
wrong, still follow it, and flag the concern in your final report.

## 0. Project facts

- Directory: `c:/Users/tanne/Downloads/Claude Code Master Projects/templates/funnels/roofing-instant-quote`
- Stack: Astro 5 (`output: "static"`, Vercel adapter), React 19 islands, Tailwind v4 (via `@tailwindcss/vite`), GSAP (lazy-loaded only), Turf (server routes only).
- Placeholder client: "Apex Roofing Co.", metro Atlanta inside the I-285 loop plus Marietta. Everything client-specific comes from `src/config/site.ts` (the `SITE` object). NEVER hardcode the business name, phone, email, calendar URL, prices, or multipliers; always import `SITE`.
- Node modules are installed. Do NOT run `npm install`, `npm run build`, or the dev server. Write code only.

## 1. Hard rules (violations fail the build)

1. NO em-dash characters anywhere: not in code, comments, or copy. Use commas, periods, or the word "to". Price ranges read "$14,200 to $19,300".
2. Light mode. Warm paper background, real layered shadows for depth. Never flat gray-on-white, never dark mode.
3. TypeScript strict. No `any` unless truly unavoidable; prefer typed helpers from `src/lib/`.
4. Relative imports only (no path aliases).
5. Do not add npm dependencies. Available: astro, react, react-dom, gsap, @turf/area, @turf/helpers, @turf/boolean-point-in-polygon, tailwindcss, @fontsource-variable/archivo.
6. Do not edit shared files or files outside your ownership list. Shared (read-only for you): `src/config/site.ts`, `src/lib/*`, `src/styles/global.css`, `src/layouts/Layout.astro`, `package.json`, `astro.config.mjs`, `tsconfig.json`.
7. Mobile-first. Nothing may overflow horizontally at 375px.
8. `prefers-reduced-motion: reduce` must disable transform-based motion (keep opacity fades or show final state instantly). Use `prefersReducedMotion()` from `src/lib/motion-load.ts` in any JS-driven motion.
9. Tailwind v4 gotchas: `translate`/`scale`/`rotate` utilities are independent CSS properties, so JS overrides must set `el.style.translate` (or set `el.style.transform` only on elements that use no Tailwind transform utilities). Custom CSS classes must live in `@layer components` or they lose to utilities. You may add component-scoped `<style>` blocks in `.astro` files and inline styles/CSS-in-file for React; do not touch global.css.
10. GSAP may only be loaded through `loadGsap()` from `src/lib/motion-load.ts`, and only after first paint (use `onIdle`). React motion components (Agent D) must NOT use GSAP at all; CSS keyframes + rAF only.
11. Copy voice: helpful, straight, zero hype. No fake urgency, no invented review counts or star ratings, no "#1 in Atlanta" claims. The instant number is always framed as a starting estimate range, never a final bid. Invite and let the reader self-select; never hard sell.

## 2. Design language

Tokens already defined in `src/styles/global.css` (Tailwind v4 `@theme`):

- Colors: `brand` (burnt copper, from config), `brand-dark`, `ink` #1C1917, `ink-soft` #57534E, `paper` #FAF7F2, `paper-deep` #F2ECE1, `line` #E7E0D4, `scan` #2DD4BF (teal, ONLY for satellite/tech moments), `sky-deep` #102033 (deep navy for the scan scene and dark bands).
- Type: `font-display` / `font-body` = Archivo Variable (wdth axis loaded). Headlines use class `headline` (font-stretch 118%, weight 800, tight). Section labels use class `kicker`.
- Shadows: `shadow-(--shadow-card)` and `shadow-(--shadow-lift)` or the prebuilt `.card` / `.card-lift` classes. Buttons: `.btn-primary`, `.btn-ghost`.
- Loading states: `.shimmer` class (animated sweep).
- Radii: rounded-2xl cards, rounded-full buttons/chips.
- The scan/tech aesthetic (ScanOverlay, measuring step): deep navy `sky-deep` surfaces, teal `scan` strokes and glows (`--shadow-glow-scan`), thin 1px grid lines, monospace-feeling small caps labels (use `tracking-widest uppercase text-[11px]`).
- Spacing rhythm: sections `py-20 md:py-28`, content max width `max-w-6xl mx-auto px-4 sm:px-6`.

Aesthetic north star: premium contractor, warm and physical (paper, copper, deep
shadow), with one cold high-tech accent reserved for the satellite measuring
moments. Expensive, not flashy.

## 3. Shared modules (import, never re-implement)

From `src/config/site.ts`: `SITE` (businessName, phone, phoneHref, email, calendarUrl, serviceAreaShort, serviceAreaCounties, licenseLine, brand, pricing {pricePerSquare, wasteFactor, rangeSpread, pitchMultipliers {low 1.06, standard 1.15, steep 1.3}, tierMultipliers {standard 1.0, premium 1.35}}, aerial {provider, imageSize 800, boxMeters 150}, footprint {minSqft 400, maxSqft 20000}).

From `src/lib/pricing.ts`: `computeQuote(footprintSqft, pitch) => QuoteResult`, `formatMoney`, `formatRange`, `formatSqft`, `roundTo100`, types `PitchKey` ("low"|"standard"|"steep"), `TierKey` ("standard"|"premium"), `QuoteResult { footprintSqft, pitch, pitchMultiplier, wasteFactor, roofSqft, squares, pricePerSquare, tiers: [{tier, mid, low, high}] }`.

From `src/lib/aerial.ts`: `getAerialImageUrl(lat, lng)`, `getAerialBbox(lat, lng, boxMeters?)`, `projectToImage(lat, lng, bbox) => {x, y}` normalized 0..1 top-left origin. Client-safe pure math.

From `src/lib/types.ts`: `QuizAnswers`, `FootprintSource`, `Contact`, `GeocodeResponse`, `FootprintResponse`, `LeadPayload`, `LeadResponse`. These are the EXACT API shapes; both the API agent and the funnel agent import them.

From `src/lib/motion-load.ts`: `loadGsap()`, `prefersReducedMotion()`, `onIdle(fn)`.

## 4. Image manifest (already generated, in `public/img/`)

| File(s) | Content | Use |
|---|---|---|
| `hero-1920.webp`, `hero-1280.webp`, `hero-768.webp`, `hero.jpg` | Golden-hour architectural shingle roof on an upscale Atlanta home, dramatic sky | Hero background (eager, fetchpriority high, srcset all three widths) |
| `storm-1280.webp`, `storm-768.webp`, `storm.jpg` | Storm/hail vignette over a suburban roof | Storm + insurance section (lazy) |
| `aerial-texture-1600.webp`, `aerial-texture.jpg` | Straight-down aerial of a leafy suburb | Low-opacity parallax layer behind how-it-works (lazy) |
| `crew-1280.webp`, `crew-768.webp`, `crew.jpg` | Roofer's hands nailing a shingle, golden hour | Trust/why-us section (lazy) |
| `inspection-1280.webp`, `inspection-768.webp`, `inspection.jpg` | Inspector with tablet at a brick home | Trust/why-us section (lazy) |
| `blueprint-1280.webp`, `blueprint.jpg` | Stylized navy/teal blueprint scan illustration of a house | Accent behind quote-tool section heading or how-it-works step 2 (lazy) |

Always render via `<picture>` or `srcset` with explicit `width`/`height` attributes (prevent CLS), `loading="lazy" decoding="async"` for everything below the fold. Hero is the ONLY eager image.

## 5. AGENT A: API routes

Owns ONLY: `src/pages/api/geocode.ts`, `src/pages/api/footprint.ts`, `src/pages/api/lead.ts`.

All three: `export const prerender = false;`, typed with `import type { APIRoute } from "astro"`, always return JSON with `Cache-Control: no-store`, wrap everything in try/catch so a route never throws HTML error pages. Use `AbortSignal.timeout(6500)` on upstream fetches. Return types must match `src/lib/types.ts` exactly.

### GET /api/geocode?address=...
1. Trim address; if < 5 chars return `{ ok: false, error: "invalid" }` (400).
2. Primary: US Census Geocoder `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=<enc>&benchmark=Public_AR_Current&format=json`. Parse `result.addressMatches[0]`: `coordinates.x` = lng, `coordinates.y` = lat, `matchedAddress`.
3. Fallback (Census empty or errored): Nominatim `https://nominatim.openstreetmap.org/search?q=<enc>&format=jsonv2&limit=1&countrycodes=us` with header `User-Agent: RoofQuoteTool/1.0 (<SITE.email>)`. Use `display_name` as matchedAddress.
4. Both empty: `{ ok: false, error: "not_found" }` (200 with ok false is fine). Upstream hard failure on both: `{ ok: false, error: "upstream" }`.

### GET /api/footprint?lat=...&lng=...
1. Validate finite lat/lng else 400 `{ ok: false, error: "invalid" }`.
2. Overpass QL, POST body `data=<query>` to `https://overpass-api.de/api/interpreter`:
   `[out:json][timeout:25];(way["building"](around:50,LAT,LNG);relation["building"](around:50,LAT,LNG););out geom;`
3. If HTTP 429 or 504: retry ONCE against the mirror `https://overpass.kumi.systems/api/interpreter` after ~1200ms.
4. If no elements: widen to `around:90` and repeat (same single-retry rule).
5. Candidate polygons: ways with `geometry` arrays; for relations use the outer way geometry if present, else skip. Build closed rings (repeat first point if needed), lng-lat order for Turf (`polygon([[ [lng,lat], ... ]])` from @turf/helpers).
6. Selection: a polygon containing the point (@turf/boolean-point-in-polygon) wins. Else the candidate whose centroid (mean of ring vertices is fine) is nearest to the point, considering only candidates whose area is inside the accept window.
7. Area: `@turf/area` (m2) x 10.7639 = sqft. Accept only `SITE.footprint.minSqft <= sqft <= SITE.footprint.maxSqft`. Outside window or no candidate: `{ ok: true, found: false }`. NEVER fabricate a number.
8. Success: `{ ok: true, found: true, sqft: <rounded>, polygon: [[lat,lng], ...] }` (outer ring of the chosen building).
9. Network failure after retries: `{ ok: false, error: "overpass_unreachable" }`. The client treats found:false and ok:false the same way (manual assist), so degrade gracefully.

### POST /api/lead
1. Parse JSON body as `LeadPayload`. Reject (400, ok false) if `contact.name`, `contact.phone`, or `contact.email` missing.
2. Read `process.env.LEAD_WEBHOOK_URL` (NOT import.meta.env; Vercel runtime env). If unset: `console.warn`, return `{ ok: true, forwarded: false }` so the funnel never breaks in preview.
3. Forward the payload plus `receivedAt` (ISO) via POST JSON, 5s timeout. Upstream failure: log, return `{ ok: true, forwarded: false }` (lead flow must never dead-end the user; the client-side payload is also in GHL's retry window).
4. Success: `{ ok: true, forwarded: true }`.

## 6. AGENT B: Quote funnel island

Owns ONLY files inside `src/components/funnel/` (suggested: `QuoteFunnel.tsx`, `quiz-data.ts`, `useFunnel.ts`, `steps/*.tsx`, `submitLead.ts`, plus a small `PitchIllustration.tsx`). Default export `QuoteFunnel` from `src/components/funnel/QuoteFunnel.tsx`, no required props (imports SITE directly). It will be mounted by Agent C as `<QuoteFunnel client:idle />` inside `<section id="quote-tool">`.

This is the heart of the product. A multi-step wizard, ONE screen at a time,
inside a self-contained card (max-w-2xl centered, `.card-lift`, generous
padding, min-height ~520px desktop / fluid mobile so steps do not jump). The
CARD ITSELF gets the 3D tilt treatment: wrap the card content in `TiltCard`
from `../motion/TiltCard` (maxDeg 4 here, subtle).

Chrome shared by every step: a thin progress bar pinned to the card top
(percent = completed steps / 11, animated width, brand color), a small back
chevron (hidden on the first step and after lead capture on the quote screen),
and a step transition: outgoing step fades/slides 24px left, incoming from
right, ~280ms, `--ease-spring`, no hard cuts (a simple keyed CSS animation on
mount is fine; do not use GSAP inside the island).

Add these data attributes for automated QA: the card root `data-funnel`, each
step root `data-step="quiz-reason" | "quiz-age" | "quiz-material" | "quiz-insurance" | "quiz-timeline" | "address" | "confirm" | "measuring" | "assist" | "lead" | "pitch" | "quote"`,
every tappable quiz/pitch option `data-qa="option"`, every primary submit
button `data-qa="next"`.

### Step order (EXACT, no reordering)

1-5. QUIZ, one question per screen, auto-advance ~250ms after tap (show the
selected state first). Questions and options, verbatim:
   1. "What's the main reason you're looking at a new roof?" Options: "Storm or hail damage" / "Roof is old or worn out" / "Active leaks" / "Preparing to sell" / "Upgrade or curb appeal"
   2. "How old is your current roof?" Options: "Under 10 years" / "10 to 20 years" / "20 to 30 years" / "30+ years or not sure"
   3. "What material is your current roof?" Options: "Asphalt shingles" / "Metal" / "Tile or slate" / "Other or not sure"
   4. "Are you filing an insurance claim?" Options: "Yes, already filed" / "Considering it" / "No, paying out of pocket"
   5. "What's your timeline?" Options: "ASAP, it's urgent" / "1 to 3 months" / "3 to 6 months" / "Just researching"
   Options are large tappable rows/cards (min 52px tall), each with a simple inline SVG glyph, hover lift, selected = brand border + tint. Store answers as the option label strings in `QuizAnswers`.

6. ADDRESS. Heading like "Where's the house?". One text input
(autocomplete="street-address", placeholder "123 Peachtree St NE, Atlanta, GA"),
submit button "Find my roof". On submit: shimmer/loading state on the button,
`fetch('/api/geocode?address=' + encodeURIComponent(addr))`. Failure: inline
friendly error ("We couldn't find that address. Add the city and state and try
again."), keep the input. Success: store `{entered, matched, lat, lng}`, go to
confirm. Microcopy under input: "We only use this to measure your roof."

7. CONFIRM ("Is this your house?"). Show the satellite crop via
`getAerialImageUrl(lat, lng)` in a rounded frame (square aspect, max ~420px),
with a `.shimmer` skeleton while the image loads. Heading: "Just confirming.
Is this your home?" with the matched address shown small underneath. Two
buttons: "Yes, that's it" (primary, data-qa="next") and "No, re-enter address"
(ghost) which returns to the address step. Preload the image as soon as
geocode succeeds.

8. MEASURING (the centerpiece). On entry, kick off
`fetch('/api/footprint?lat=..&lng=..')`. Render `ScanOverlay` from
`../motion/ScanOverlay` over the SAME satellite image
(`status="scanning"`), full card width, with rotating status lines beneath
("Locking satellite view...", "Tracing roof edges...", "Calculating area...")
cycling ~1.1s. Minimum theatrical duration 3.2s even if the API returns
instantly. When footprint found: project the polygon with
`getAerialBbox(lat, lng)` + `projectToImage` into normalized coords, flip
`status="locked"` and pass `polygon`, show "Roof footprint locked: N sqft",
then auto-advance to lead after ~1.6s. Store `{sqft, source: "measured", polygon}`.
If `found:false` or fetch error: go to ASSIST instead. Never silently guess.

9. ASSIST (visible fallback). Copy: "Satellite data is thin for your street,
so let's do it the simple way." Inputs: heated square footage (number,
500..12000, inputmode="numeric") and stories (two big toggle cards: "1 story" /
"2+ stories"). Footprint = heated / stories (stories value 2 for "2+").
Validate before continuing. Store `{sqft, source: "estimated", assist: {heatedSqft, stories}}`.
Continue button data-qa="next".

10. LEAD CAPTURE. This screen appears BEFORE any price is shown. Never move it
after. Heading: "Your estimate is ready". Subcopy: "Tell us where to send it
and it unlocks instantly. We'll also text you a copy." Fields, all required:
Full name (autocomplete="name"), Mobile phone (autocomplete="tel",
inputmode="tel"; strip non-digits, strip a leading "1" from 11-digit autofill,
require exactly 10 digits), Email (autocomplete="email", basic regex).
Inline validation messages, not alerts. Trust microcopy with a small lock
glyph: "No spam. Your info goes to our local team only." Submit button
"Unlock my estimate" (data-qa="next"). On submit: POST stage
`"lead_captured"` via `submitLead` (see payload rules below) without blocking
UX more than a brief pending state; even if the POST fails, proceed (log to
console). Advance to pitch.

11. PITCH PICKER. Heading: "Last one. How steep is your roof?" Three
illustrated option cards side by side (stack on mobile): "Low slope. Easy to
walk" / "Standard. Most common" (badge "Most homes", preselected visual
default) / "Steep. Hard to walk". Each card contains `PitchIllustration`
(inline SVG house gable profiles at three slopes, small brand-colored roof
stroke). Tap = select + auto-advance ~300ms. Maps to PitchKey low/standard/steep.

12. QUOTE REVEAL. Compute via `computeQuote(footprintSqft, pitch)`. Layout:
   - Source badge chip at top: satellite glyph + "Measured from satellite" (source=measured) or house glyph + "Estimated from your home size" (estimated). ALWAYS visible.
   - Two tier cards, side by side desktop, stacked mobile, each wrapped in `TiltCard` (maxDeg 6): "Standard", architectural asphalt shingles, 25 to 30 year warranty; "Premium" (badge "Most popular", brand border): dimensional impact-resistant shingles, extended warranty, better hail rating. Premium visually leads.
   - Each card shows its RANGE with `CountUp` on both numbers, e.g. "$14,200 to $19,300" (formatMoney; the word "to"). Never a single number.
   - Under the numbers, the working, small and honest: "Footprint: N sqft" + source, "Pitch: standard (x1.15)", "Roof surface: N sqft", "N squares at $320 per square", "12% waste included". Derive every figure from QuoteResult/SITE, no hardcoding.
   - Below: booking block. Copy: "This range is your starting estimate, measured from your actual roof. A free 20 minute inspection pins down the exact number, and it's booked in 30 seconds." `MagneticButton` as anchor to `SITE.calendarUrl` (target="_blank" rel="noopener"), label "Book my free inspection". Secondary line: "Prefer to talk? Call {SITE.phone}" as tel link.
   - Small print: "Instant estimates are a planning range, not a final bid. Final pricing follows an on-site inspection."
   - On first render of this step: POST stage `"quote_viewed"` with the FULL payload including pitch + quote numbers.

### submitLead.ts
Builds `LeadPayload` (types.ts): stage, quiz, address {entered, matched, lat, lng}, footprint {sqft, source, assist?}, contact, pitch?, quote? ({roofSqft, squares, pricePerSquare, tiers: [{tier, low, high}]}), submittedAt = new Date().toISOString(), page = location.pathname. POST JSON to `/api/lead` with `keepalive: true`. Fire twice total: once at lead capture (no pitch/quote yet), once at quote reveal (full). Never read env vars client-side.

### Funnel behavior details
- State in one `useFunnel` reducer/hook; in-memory only.
- Back button walks back sensibly (from confirm to address, from assist to confirm, etc.); never back from quote into lead (lead is already captured; back from quote goes to pitch).
- Loading states use `.shimmer` or spinner on buttons; all fetches have try/catch with friendly fallbacks. Geocode/footprint failures NEVER dead-end: worst case path is assist.
- Keyboard: Enter submits text steps; options focusable with visible focus rings (focus-visible ring brand).
- No em-dashes anywhere, including placeholder text.

## 7. AGENT C: Landing page + thank-you + page motion

Owns ONLY: `src/pages/index.astro`, `src/pages/thank-you.astro`,
`src/components/site/Header.astro`, `src/components/site/Footer.astro`,
`src/components/sections/*.astro`, `src/scripts/home-motion.ts`.

`index.astro`: `<Layout preloadHero={true}>`, then Header, Hero, QuoteToolSection, HowItWorks, StormInsurance, WhyUs, Faq, FinalCta, Footer. Loads the motion script exactly once:
```astro
<script>
  import { initHomeMotion } from "../scripts/home-motion";
  initHomeMotion();
</script>
```

### Header.astro
Sticky top, translucent paper with backdrop-blur and a bottom hairline once
scrolled (a tiny inline script toggling a class is fine). Left: wordmark, an
inline SVG roof glyph + `SITE.businessName` in heavy display type. Right:
phone link (tel:, bold, with phone glyph) and "Get my estimate" `.btn-primary`
(anchor href="#quote-tool") hidden on small mobile where the phone stays.

### Hero (`sections/Hero.astro`)
Full-bleed, min-h ~[88svh], layered:
- Background `<picture>`: hero webp srcset (768/1280/1920) + jpg fallback, `fetchpriority="high"`, explicit dimensions, object-cover. Wrapped in a div with class `hero-media` for motion (Ken Burns: CSS animation scale 1.0 to 1.08 with a slight translate pan over ~28s ease-in-out infinite alternate; also given a data attr for GSAP parallax so background drifts slower than foreground on scroll).
- Gradient scrim: warm dark from bottom-left (ink 80% to transparent 55% up) so text always reads.
- Light sweep: absolutely positioned skewed highlight bar animating across every ~9s (CSS keyframes, opacity ~0.14, blend screen), class `hero-sweep`.
- Optional slow-drifting subtle cloud/dust layer via a second copy of the gradient, cheap.
- Content (left-aligned, max-w-2xl): kicker "Instant roof estimate", H1 headline class `headline` text-white, e.g. "See what your new roof costs. From your address. In about 60 seconds." Subcopy: satellite measurement, straight talk, no pushy sales call required to get a number. CTA row: `.btn-primary` "Get my instant estimate" (href="#quote-tool") + ghost-on-dark tel link "Or call {SITE.phone}". Trust row beneath (small, white/70): "Licensed and insured in Georgia" dot "Serving Atlanta ITP and Marietta" dot "Real satellite measurement, not a guess".
- Pointer parallax: hero-media and content get `data-parallax-depth` attrs; home-motion.ts moves them a few px opposite the pointer (desktop only).
- Scroll cue at bottom center (animated chevron, subtle).

### QuoteToolSection (`sections/QuoteToolSection.astro`)
`<section id="quote-tool">`, paper-deep band with the blueprint image as a
soft low-opacity right-side accent (lazy). Centered kicker "The 60 second
estimate", H2 "Answer five questions. We measure the rest from space." Short
reassurance line ("No obligation. No site visit needed for the range."). Then
`<QuoteFunnel client:idle />` (import from `../funnel/QuoteFunnel`).

### HowItWorks (`sections/HowItWorks.astro`)
3 steps: "Tell us about the roof" (five taps), "We measure from satellite"
(real imagery of your actual roof, square footage, pitch), "Get your range
and lock it in" (two tiers, then a free inspection for the exact quote).
Desktop: pinned ScrollTrigger section, steps activate one at a time with a
progress line while pinned (wire via data attrs `data-hiw`, `data-hiw-step`;
implement in home-motion.ts with `ScrollTrigger.matchMedia`/`gsap.matchMedia`
min-width 1024 ONLY). Mobile: normal vertical stack with staggered reveals,
NO pinning. Behind the section: `aerial-texture` image layer, low opacity
(~0.12), slight GSAP y-parallax (data attr `data-parallax-bg`), lazy loaded.
Step numbers big display type; step 2 card can reuse the scan aesthetic
(sky-deep card, teal accents) as a visual echo of the funnel.

### StormInsurance (`sections/StormInsurance.astro`)
Two-column (stack mobile): storm image (lazy, rounded-2xl, shadow-lift, slight
GSAP parallax) + copy. Kicker "Storm and hail claims". H2 like "Hail hit your
neighborhood? Your insurance may owe you a roof." Body: metro Atlanta hail
reality (Cobb, Fulton, DeKalb, Clayton see damaging hail most years), what an
insurance-covered replacement means, we document damage and meet your
adjuster, you get a straight answer on whether a claim is worth filing, no
scare tactics. Bullet checklist (3-4 items, inline SVG checks). CTA ghost
button to #quote-tool: "Start with your instant estimate".

### WhyUs (`sections/WhyUs.astro`)
Kicker "Why homeowners pick us". Grid of 4 value cards (.card, hover lift):
manufacturer-certified installers; workmanship warranty in writing; local
crews, tarped landscaping, magnetic nail sweep; you see the same price math we
see. Beside/above: crew + inspection images in a slight overlapping collage
(rounded, shadow-lift, small rotation on one, GSAP reveal). Include
`SITE.licenseLine` somewhere honest and small.

### Faq (`sections/Faq.astro`)
Native `<details>` accordion, styled (.card rows, plus/minus glyph rotation,
smooth open via CSS grid-template-rows trick or interpolate-size). 6 questions:
How accurate is the instant estimate; Do you share my information; How does
the insurance claim process work; How long does a replacement take; Do you
offer financing (answer: yes, options reviewed at inspection, placeholder);
What shingles do you install (architectural + impact-resistant lines). Straight
answers, 2-3 sentences each, quote framed as planning range.

### FinalCta (`sections/FinalCta.astro`)
Full-width band, ink/sky-deep background with a subtle brand gradient edge
glow and the grain doing its work. H2 "Get your number. Then decide." Line
about zero pressure, the estimate is yours either way. `.btn-primary`
"Get my instant estimate" (#quote-tool) + tel ghost. Section divider above:
angled SVG.

### Footer.astro
Paper-deep, hairline top. Business name + tagline, phone + email links,
service area line (counties from SITE.serviceAreaCounties + "inside the
I-285 loop and Marietta"), `SITE.licenseLine`, small print: "Instant
estimates are planning ranges based on satellite measurement and typical
install pricing, not a contract price." Copyright line with `SITE.legalName`.

### thank-you.astro
Simple centered page (Header + Footer reused): big check glyph, H1 "You're on
the calendar.", copy: what happens next (we confirm by text, your inspector
arrives in a marked truck, 20 minutes on the roof, exact quote same day),
phone link for changes, `.btn-ghost` back home. No index of it needed.

### home-motion.ts
Export `initHomeMotion()`. Inside: if `prefersReducedMotion()`, bail entirely
(CSS backstop already handles the rest). Use `onIdle` + `loadGsap()`. Set up:
hero scroll parallax (media slower than content, subtle, scrub), pointer
parallax for `[data-parallax-depth]` (desktop only, small translate via
`el.style.translate`), `[data-reveal]` elements: opacity 0 to 1 + y 28 to 0,
staggered by `[data-reveal-group]`, ScrollTrigger start "top 80%", pinned
how-it-works (gsap.matchMedia "(min-width: 1024px)"), `[data-parallax-bg]`
slow y drift, FinalCta edge-glow slow pulse. Every section component adds its
own `data-reveal` attrs. Keep total JS tiny; no other libraries.

## 8. AGENT D: Motion components (React, no GSAP)

Owns ONLY: `src/components/motion/ScanOverlay.tsx`, `src/components/motion/TiltCard.tsx`, `src/components/motion/MagneticButton.tsx`, `src/components/motion/CountUp.tsx`.

Pure React + CSS keyframes (inline `<style>` via styled JSX is not available; use a `<style>` tag rendered inside the component with a unique class namespace, or Tailwind classes + small inline style objects + CSS animations defined in a component-emitted `<style>` tag). rAF for pointer springs. Every component: check `prefersReducedMotion()` (import from `../../lib/motion-load`) once on mount (useState + useEffect to stay SSR-safe) and render the static end state when true. All components must be SSR-safe (no window access during render).

### ScanOverlay
```ts
interface ScanOverlayProps {
  imageUrl: string;
  polygon?: { x: number; y: number }[]; // normalized 0..1, top-left origin
  status: "scanning" | "locked" | "failed";
  sweepDurationMs?: number; // default 2600
  className?: string;
}
```
The satellite "3D scan" scene, the wow moment of the funnel. Container:
rounded-2xl overflow-hidden, `sky-deep` background, aspect-square, subtle
perspective tilt (`perspective(900px) rotateX(7deg) scale(1.02)` on an inner
wrapper, eased in on mount, flattening to rotateX(2deg) when locked). Layers,
bottom to top:
1. The satellite `<img>` (imageUrl, object-cover, slight brightness/saturation lift while scanning).
2. Teal grid: SVG pattern of 1px lines, opacity 0.14.
3. Scanning beam while `status="scanning"`: horizontal bar (~18% height gradient, teal core line with `--shadow-glow-scan`) sweeping top to bottom and back, duration sweepDurationMs, CSS keyframes.
4. Roof polygon (when `polygon` provided): SVG path over viewBox 0 0 100 100 (points x*100/y*100, vector-effect non-scaling-stroke, stroke `--color-scan` 2.5px, glow via SVG filter or drop-shadow, fill teal at 0.12). Trace-in with stroke-dasharray/dashoffset ~1100ms when it first appears, then gentle fill pulse.
5. Four corner reticles: L-shaped teal strokes inset ~10px, slow pulse (opacity 0.5 to 1).
6. Center lock dot: small teal dot + expanding ring ping, visible when locked (replaces beam; beam stops on locked).
7. `status="failed"`: dim image, stop beam, amber corner reticles (no red panic).
Reduced motion: no beam, no tilt, polygon appears fully drawn, static reticles.

### TiltCard
```ts
interface TiltCardProps {
  children: React.ReactNode;
  maxDeg?: number;        // default 7
  className?: string;
  glare?: boolean;        // default true, radial highlight following pointer
}
```
Pointer-driven rotateX/rotateY around center with `perspective(900px)`,
spring-lerped via rAF (current += (target - current) * 0.12), reset to 0 on
pointerleave. Sets `el.style.transform` on its OWN wrapper div (which uses no
Tailwind transform utilities, so this is safe). Disabled entirely when
`(hover: none)` matches (touch devices) or reduced motion. Glare: absolutely
positioned radial-gradient div tracking the pointer, opacity ~0.1, blend
screen. `transform-style: preserve-3d` so children can pop 1-2px.

### MagneticButton
```ts
interface MagneticButtonProps {
  href?: string;                 // renders <a> when set, else <button>
  onClick?: () => void;
  className?: string;            // caller passes .btn-primary etc.
  strength?: number;             // default 0.3
  target?: string; rel?: string; type?: "button" | "submit";
  children: React.ReactNode;
}
```
Translates toward the pointer within its own bounds x strength (max ~10px),
via `el.style.translate` (Tailwind v4 safe), rAF-lerped, springs back on
leave. Disabled on touch/reduced motion (renders plain element).

### CountUp
```ts
interface CountUpProps {
  value: number;
  format?: (n: number) => string; // default en-US toLocaleString
  durationMs?: number;            // default 1100
  delayMs?: number;               // default 0
  className?: string;
}
```
On mount (component only mounts when visible in the funnel, so no
IntersectionObserver needed) animate 0 to value, easeOutCubic, rAF, render
`format(current)`. Reduced motion: render `format(value)` immediately.
`aria-live="polite"` NOT needed; wrap in a span with the final value as
`aria-label` so screen readers get the end number.

## 9. Report format (every agent)

Return: list of files written; any contract deviations (and why); any
integration risks the merger should double-check. Keep it under 30 lines.
