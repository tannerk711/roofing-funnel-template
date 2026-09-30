// End-to-end funnel walk for QA. Drives the real funnel against a running dev
// or preview server, screenshotting every step and logging the /api/lead
// payloads plus any page errors.
//
// Usage: node tools/qa-walk.mjs [--base=http://localhost:4321] [--device=desktop|tablet|mobile] [--reduced-motion]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// puppeteer-core lives in the shared tools install (workspace
// convention: install once, reuse everywhere).
const sharedRequire = createRequire(
  "C:/Users/tanne/Downloads/Claude Code Master Projects/tools/anchor.js",
);
const puppeteer = sharedRequire("puppeteer-core");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];
const chrome = CHROME_PATHS.find(existsSync);
if (!chrome) {
  console.error("Chrome not found");
  process.exit(1);
}

const args = process.argv.slice(2);
const getFlag = (name, dflt) => {
  const f = args.find((a) => a.startsWith(`--${name}=`));
  return f ? f.split("=")[1] : dflt;
};
const BASE = getFlag("base", "http://localhost:4321");
const DEVICE = getFlag("device", "desktop");
const REDUCED = args.includes("--reduced-motion");

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  tablet: { width: 834, height: 1112, isMobile: true, hasTouch: true },
  mobile: { width: 375, height: 812, isMobile: true, hasTouch: true },
};
const vp = VIEWPORTS[DEVICE];
// Touch devices tap; mouse devices click. Matches real input for the device.
const press = (el) => (vp.hasTouch ? el.tap() : el.click());

const OUT = join(root, "qa");
mkdirSync(OUT, { recursive: true });

const ADDRESS = "1198 Cumberland Rd NE, Atlanta, GA 30306";

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ ...vp, deviceScaleFactor: 1 });
// CSS smooth scrolling makes puppeteer's scroll-then-click land mid-animation
// (the point is computed before the scroll settles). Force instant scrolls
// for automation; real users are unaffected.
await page.evaluateOnNewDocument(() => {
  const add = () => {
    const style = document.createElement("style");
    style.textContent = "html { scroll-behavior: auto !important; }";
    (document.head || document.documentElement).appendChild(style);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", add);
  } else {
    add();
  }
});
if (REDUCED) {
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
}

const problems = [];
page.on("pageerror", (e) => problems.push("PAGEERROR: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") problems.push("CONSOLE ERROR: " + m.text());
});
const leadPosts = [];
page.on("request", (r) => {
  if (r.url().includes("/api/lead") && r.method() === "POST") {
    try {
      leadPosts.push(JSON.parse(r.postData() || "{}"));
    } catch {
      leadPosts.push({ parseError: true });
    }
  }
});

let shotIndex = 0;
async function shot(name) {
  shotIndex++;
  const file = join(OUT, `${DEVICE}-${String(shotIndex).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file });
  console.log("shot: " + file);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitStep(name, timeout = 15000) {
  await page.waitForSelector(`[data-step="${name}"]`, { timeout });
  await sleep(450);
  console.log("step: " + name);
}

async function clickOption(index = 0) {
  const options = await page.$$('[data-funnel] [data-qa="option"]');
  if (!options.length) throw new Error("no options found");
  const el = options[Math.min(index, options.length - 1)];
  await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await sleep(300);
  await press(el);
  await sleep(600);
  // Verify the tap registered (selected state or step change); if not,
  // diagnose what is at the click point and fall back to a DOM click.
  const registered = await el
    .evaluate((e) => e.getAttribute("aria-pressed") === "true" || !e.isConnected)
    .catch(() => true); // detached handle = step advanced
  if (!registered) {
    const diag = await el.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) },
        hit: hit ? hit.tagName + "." + String(hit.className).slice(0, 60) : "none",
        contains: hit ? e.contains(hit) : false,
      };
    });
    problems.push(`OPTION CLICK MISSED (idx ${index}); ${JSON.stringify(diag)}; DOM fallback used`);
    await el.evaluate((e) => e.click());
  }
}

// Click a button and confirm the funnel actually advanced. If the click does
// not land (moving target, interception), diagnose what element is at the
// click point, then fall back to a DOM click.
async function clickAdvance(selector, expectedSteps, timeout = 6000) {
  const el = await page.$(selector);
  if (!el) throw new Error("clickAdvance: not found " + selector);
  await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await sleep(400);
  // Hover first and let the 3D tilt settle, THEN click: el.click() recomputes
  // the point from the settled (transformed) geometry so it lands.
  await el.hover();
  await sleep(700);
  await press(el);
  const expectSel = expectedSteps.map((s) => `[data-step="${s}"]`).join(", ");
  try {
    await page.waitForSelector(expectSel, { timeout });
    return;
  } catch {
    const diag = await el.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        hit: hit ? hit.tagName + "." + String(hit.className).slice(0, 80) : "none",
        hitIsSelfOrChild: hit ? e.contains(hit) || hit === e : false,
      };
    });
    problems.push(
      `CLICK DID NOT ADVANCE on ${selector}; elementFromPoint: ${JSON.stringify(diag)}`,
    );
    await el.evaluate((e) => e.click());
    await page.waitForSelector(expectSel, { timeout });
  }
}

async function overflowCheck(label) {
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (over > 1) problems.push(`HORIZONTAL OVERFLOW at ${label}: ${over}px`);
}

try {
  // ?qa=1 suppresses the Google Ads conversion fire in submitLead.ts so QA
  // walks never pollute real conversion counts.
  await page.goto(BASE + "/?qa=1", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1200);
  // Identity check: another project's dev server has squatted 4321 before.
  const isOurs = await page.evaluate(() =>
    document.body.textContent.includes("555-0187"),
  );
  if (!isOurs) throw new Error("WRONG SITE on " + BASE + " (marker phone not found)");
  await shot("landing-top");
  await overflowCheck("landing");

  // scroll to the tool so client:idle has definitely hydrated
  await page.evaluate(() => {
    document.querySelector("#quote-tool")?.scrollIntoView({ block: "start" });
  });
  await sleep(1500);
  await page.waitForSelector("[data-funnel]", { timeout: 20000 });

  // 5 quiz steps, varied picks
  const quizSteps = [
    ["quiz-reason", 0],
    ["quiz-age", 1],
    ["quiz-material", 0],
    ["quiz-insurance", 1],
    ["quiz-timeline", 1],
  ];
  for (const [step, idx] of quizSteps) {
    await waitStep(step);
    await shot(step);
    await clickOption(idx);
    await sleep(600);
  }

  // address
  await waitStep("address");
  await shot("address-empty");
  const input = await page.$('[data-step="address"] input[type="text"], [data-step="address"] input:not([type])');
  if (!input) throw new Error("address input not found");
  await input.type(ADDRESS, { delay: 12 });
  await shot("address-filled");
  await clickAdvance('[data-step="address"] [data-qa="next"]', ["confirm"], 25000);

  // confirm (satellite)
  await waitStep("confirm", 25000);
  // give the esri image time to actually paint
  await sleep(4500);
  await shot("confirm-satellite");
  await overflowCheck("confirm");
  await clickAdvance('[data-step="confirm"] [data-qa="next"]', ["measuring", "assist"]);

  // measuring
  await waitStep("measuring", 15000);
  await sleep(1600);
  await shot("measuring-scan");
  // wait for either lead or assist
  await page.waitForSelector('[data-step="lead"], [data-step="assist"]', { timeout: 45000 });
  const isAssist = await page.$('[data-step="assist"]');
  if (isAssist) {
    console.log("PATH: assist fallback (no OSM footprint)");
    await shot("assist");
    const heated = await page.$('[data-step="assist"] input');
    await heated.type("2400", { delay: 15 });
    const assistOptions = await page.$$('[data-step="assist"] [data-qa="option"]');
    if (assistOptions.length) await press(assistOptions[0]);
    await sleep(300);
    await clickAdvance('[data-step="assist"] [data-qa="next"]', ["lead"]);
  } else {
    console.log("PATH: measured from satellite");
  }

  // lead capture, BEFORE any price
  await waitStep("lead", 15000);
  const priceLeak = await page.evaluate(() => {
    const t = document.querySelector("[data-funnel]")?.textContent || "";
    return /\$[\d,]{4,}/.test(t);
  });
  if (priceLeak) problems.push("PRICE VISIBLE BEFORE LEAD CAPTURE");
  await shot("lead-empty");
  await page.type('[data-step="lead"] input[autocomplete="name"], [data-step="lead"] input[name*="name" i]', "QA Tester");
  await page.type('[data-step="lead"] input[autocomplete="tel"], [data-step="lead"] input[type="tel"]', "4045551234");
  await page.type('[data-step="lead"] input[autocomplete="email"], [data-step="lead"] input[type="email"]', "qa@example.com");
  await shot("lead-filled");
  await clickAdvance('[data-step="lead"] [data-qa="next"]', ["pitch"]);

  // pitch
  await waitStep("pitch", 15000);
  await shot("pitch");
  const pitchOptions = await page.$$('[data-step="pitch"] [data-qa="option"]');
  const pitchPick = pitchOptions[Math.min(1, pitchOptions.length - 1)]; // standard
  await pitchPick.hover();
  await sleep(700);
  await press(pitchPick);
  try {
    await page.waitForSelector('[data-step="quote"]', { timeout: 5000 });
  } catch {
    problems.push("PITCH NATIVE CLICK DID NOT ADVANCE, used DOM fallback");
    await pitchPick.evaluate((e) => e.click());
  }

  // quote
  await waitStep("quote", 15000);
  await sleep(2200); // let count-up settle
  await shot("quote");
  await overflowCheck("quote");

  const quoteInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-step="quote"]');
    return el ? el.innerText.replace(/\n{2,}/g, "\n") : "QUOTE STEP MISSING";
  });
  console.log("---- QUOTE SCREEN TEXT ----");
  console.log(quoteInfo);
  console.log("---- LEAD POSTS (" + leadPosts.length + ") ----");
  for (const p of leadPosts) {
    console.log(
      JSON.stringify({
        stage: p.stage,
        sqft: p.footprint?.sqft,
        source: p.footprint?.source,
        pitch: p.pitch,
        tiers: p.quote?.tiers,
        contact: p.contact,
        matched: p.address?.matched,
      }),
    );
  }
} catch (e) {
  problems.push("WALK FAILED: " + e.message);
  await shot("FAILURE");
}

console.log("---- PROBLEMS (" + problems.length + ") ----");
for (const p of problems) console.log(p);
await browser.close();
process.exit(0);
