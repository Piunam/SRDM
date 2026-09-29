// Screenshots of the hero at the midpoint of every act, desktop and mobile,
// plus a reduced-motion full page. Also checks that at most one copy block is
// visible per shot and that the page logs no console errors.
//
// Usage:  npm run build && npm start   (in another terminal)
//         node scripts/shots.mjs [baseUrl] [--channel=chrome|msedge]
// Output: scripts/shots/*.png

import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3000";
const channel = (args.find((a) => a.startsWith("--channel=")) ?? "--channel=chrome").split("=")[1];
const outDir = path.join(root, "shots");
await mkdir(outDir, { recursive: true });

// Act spans and window edge come straight from hero-config.ts.
const config = await readFile(path.join(root, "../src/components/hero/hero-config.ts"), "utf8");
const acts = [...config.matchAll(/\{ id: "(act\d)", start: ([\d.]+), end: ([\d.]+) \}/g)].map((m) => ({
  id: m[1],
  start: Number(m[2]),
  end: Number(m[3]),
}));
const pinVh = {
  desktop: Number(config.match(/desktopVh: (\d+)/)[1]),
  mobile: Number(config.match(/mobileVh: (\d+)/)[1]),
};
const edge = Number(config.match(/edge: ([\d.]+)/)[1]);
const holdMid = (a) => {
  const e = (a.end - a.start) * edge;
  return (a.start + e + a.end - e) / 2;
};

const phone = (width, height) => ({ width, height, isMobile: true, hasTouch: true, kind: "mobile" });
const viewports = {
  desktop: { width: 1440, height: 900, kind: "desktop" },
  "mobile-390": phone(390, 844),
  "mobile-360": phone(360, 780),
  "mobile-430": phone(430, 932),
};

const browser = await chromium.launch({ channel, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const problems = [];

for (const [name, viewport] of Object.entries(viewports)) {
  const { kind, isMobile, hasTouch, ...size } = viewport;
  const ctx = await browser.newContext({ viewport: size, isMobile, hasTouch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(`[${name}] console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`[${name}] pageerror: ${e.message}`));
  await page.goto(base, { waitUntil: "load" });
  await page.waitForTimeout(3000);

  for (const a of acts) {
    const pct = a.id === "act0" ? 2 : holdMid(a);
    const y = Math.round((viewport.height * pinVh[kind]) / 100 * (pct / 100));
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(2600);
    const file = path.join(outDir, `${name}-${a.id}.png`);
    await page.screenshot({ path: file });
    const visibleCopy = await page.$$eval("[data-copy]", (els) =>
      els.filter((el) => getComputedStyle(el).visibility !== "hidden" && Number(getComputedStyle(el).opacity) > 0.01).length,
    );
    if (visibleCopy > 1) problems.push(`[${name}] ${a.id}: ${visibleCopy} copy blocks visible`);
    console.log(`${name} ${a.id} @ ${pct.toFixed(1)}% → ${path.relative(process.cwd(), file)}`);
  }
  await ctx.close();
}

const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const rp = await reduced.newPage();
rp.on("pageerror", (e) => problems.push(`[reduced] pageerror: ${e.message}`));
await rp.goto(base, { waitUntil: "load" });
await rp.waitForTimeout(1500);
await rp.screenshot({ path: path.join(outDir, "reduced-motion.png"), fullPage: true });
await reduced.close();

await browser.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log("ok: no console errors, never more than one copy block visible");
}
