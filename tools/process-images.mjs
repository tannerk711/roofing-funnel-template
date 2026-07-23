// Turns raw fal-generated PNGs (public/img/_raw/) into the compressed,
// responsive assets the site actually serves (public/img/).
// Run: npm run images
import sharp from "sharp";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(root, "public", "img", "_raw");
const OUT = join(root, "public", "img");

const WEBP_Q = 74;
const JPG_Q = 78;

const jobs = [
  {
    src: "hero.png",
    webp: [
      ["hero-1920.webp", 1920],
      ["hero-1280.webp", 1280],
      ["hero-768.webp", 768],
    ],
    jpg: ["hero.jpg", 1600],
  },
  {
    src: "storm.png",
    webp: [
      ["storm-1280.webp", 1280],
      ["storm-768.webp", 768],
    ],
    jpg: ["storm.jpg", 1280],
  },
  {
    src: "aerial-texture.png",
    webp: [["aerial-texture-1600.webp", 1600]],
    jpg: ["aerial-texture.jpg", 1600],
  },
  {
    src: "crew.png",
    webp: [
      ["crew-1280.webp", 1280],
      ["crew-768.webp", 768],
    ],
    jpg: ["crew.jpg", 1280],
  },
  {
    src: "inspection.png",
    webp: [
      ["inspection-1280.webp", 1280],
      ["inspection-768.webp", 768],
    ],
    jpg: ["inspection.jpg", 1280],
  },
  {
    src: "blueprint.png",
    webp: [["blueprint-1280.webp", 1280]],
    jpg: ["blueprint.jpg", 1280],
  },
];

let failures = 0;
for (const job of jobs) {
  const srcPath = join(RAW, job.src);
  if (!existsSync(srcPath)) {
    console.warn(`SKIP missing raw: ${job.src}`);
    failures++;
    continue;
  }
  for (const [name, width] of job.webp) {
    const out = join(OUT, name);
    const info = await sharp(srcPath)
      .resize({ width, withoutEnlargement: false })
      .webp({ quality: WEBP_Q })
      .toFile(out);
    console.log(`${name}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}kb`);
  }
  const [jpgName, jpgWidth] = job.jpg;
  const info = await sharp(srcPath)
    .resize({ width: jpgWidth, withoutEnlargement: false })
    .jpeg({ quality: JPG_Q, mozjpeg: true })
    .toFile(join(OUT, jpgName));
  console.log(`${jpgName}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}kb`);
}

if (failures > 0) {
  console.warn(`${failures} raw image(s) missing. Generate them first.`);
}
