// Scrolls to a text marker and screenshots the viewport (desktop + mobile).
// Usage: node tools/shot-section.mjs <url> <marker-text> <out-base>
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const sharedRequire = createRequire(
  "C:/Users/tanne/Downloads/Claude Code Master Projects/tools/anchor.js",
);
const puppeteer = sharedRequire("puppeteer-core");

const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];
const chrome = CHROME_PATHS.find(existsSync);

const [url, marker, outBase] = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: "new", executablePath: chrome });

for (const [name, vp] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
  await page.evaluate((m) => {
    const els = [...document.querySelectorAll("h1,h2,h3,p")];
    const el = els.find((e) => e.textContent.includes(m));
    if (el) el.scrollIntoView({ block: "center" });
  }, marker);
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: `${outBase}-${name}.png` });
  await page.close();
}
await browser.close();
console.log("done");
