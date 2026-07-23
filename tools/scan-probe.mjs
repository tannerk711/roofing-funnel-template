// Focused probe of the ScanOverlay scene: element-scoped screenshots with and
// without the fixed header/grain, plus a DOM audit of the overlay layers.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sharedRequire = createRequire(
  "C:/Users/tanne/Downloads/Claude Code Master Projects/foundation/tools/anchor.js",
);
const puppeteer = sharedRequire("puppeteer-core");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].find(existsSync);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  const add = () => {
    const style = document.createElement("style");
    style.textContent = "html { scroll-behavior: auto !important; }";
    (document.head || document.documentElement).appendChild(style);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
  else add();
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto("http://localhost:4321/", { waitUntil: "networkidle2" });
await page.evaluate(() => document.querySelector("#quote-tool")?.scrollIntoView());
await sleep(1500);
await page.waitForSelector("[data-funnel]");
// blitz through quiz
for (let i = 0; i < 5; i++) {
  const opts = await page.$$('[data-funnel] [data-qa="option"]');
  await opts[0].evaluate((e) => e.click());
  await sleep(500);
}
await page.waitForSelector('[data-step="address"]');
await page.type('[data-step="address"] input', "1198 Cumberland Rd NE, Atlanta, GA 30306");
await page.$eval('[data-step="address"] [data-qa="next"]', (e) => e.click());
await page.waitForSelector('[data-step="confirm"]', { timeout: 25000 });
await sleep(1500);
await page.$eval('[data-step="confirm"] [data-qa="next"]', (e) => e.click());
await page.waitForSelector('[data-step="measuring"]', { timeout: 10000 });
await sleep(1200);

const overlay = await page.$('[data-step="measuring"] [role="img"]');
if (!overlay) {
  console.log("NO OVERLAY FOUND");
  process.exit(1);
}
await overlay.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
await sleep(400);

// audit layers
const audit = await overlay.evaluate((e) => {
  const styles = [];
  const walk = (n, depth) => {
    if (!(n instanceof Element) || depth > 3) return;
    const cs = getComputedStyle(n);
    styles.push(
      `${"  ".repeat(depth)}${n.tagName}${n.getAttribute("style") ? "" : ""} bg=${cs.backgroundColor.slice(0, 30)} anim=${cs.animationName.slice(0, 30)} op=${cs.opacity}`,
    );
    for (const c of n.children) walk(c, depth + 1);
  };
  walk(e, 0);
  return styles.join("\n");
});
console.log(audit);

await overlay.screenshot({ path: join(root, "qa", "scan-element-with-chrome.png") });
await page.addStyleTag({
  content: "header, .grain-overlay { display: none !important; }",
});
await sleep(300);
await overlay.screenshot({ path: join(root, "qa", "scan-element-clean.png") });

// wait for the locked state (min theatrics 3.2s + trace) and shoot the
// polygon moment; bail gracefully if this run lands on the assist path
try {
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[data-step="measuring"] [role="img"] svg[viewBox="0 0 100 100"] path',
      ),
    { timeout: 12000 },
  );
  await sleep(1300); // let the trace complete and the fill pulse begin
  const overlay2 = await page.$('[data-step="measuring"] [role="img"]');
  if (overlay2) {
    await overlay2.screenshot({ path: join(root, "qa", "scan-element-locked.png") });
    console.log("locked shot written");
  }
} catch {
  console.log("no polygon appeared (assist path this run)");
}
console.log("shots written");
await browser.close();
