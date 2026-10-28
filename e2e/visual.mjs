// Usage: node e2e/visual.mjs <route> [name] [--vp=1440x900,390x844] [--click=text]
// Screenshots Flutter reference (:8083) and Next (:3100) and writes diff to visual-report/.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const route = process.argv[2] || "/home";
const name = process.argv[3] || route.replace(/\W+/g, "_") || "root";
const vpArg = process.argv.find((a) => a.startsWith("--vp="));
const viewports = (vpArg ? vpArg.slice(5) : "1440x900,1024x768,390x844").split(",").map((s) => s.split("x").map(Number));
const FLUTTER = process.env.FLUTTER_URL || "http://localhost:8083", NEXT = process.env.NEXT_URL || "http://localhost:3100";
const scrollArg = process.argv.find((a) => a.startsWith("--scroll="));
const scrollY = scrollArg ? Number(scrollArg.slice(9)) : 0;
const keepModal = process.argv.includes("--modal");

fs.mkdirSync("visual-report", { recursive: true });
const browser = await chromium.launch();
for (const [w, h] of viewports) {
  const shots = {};
  for (const [label, base, wait] of [["flutter", FLUTTER, 9000], ["next", NEXT, 5000]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const branch = process.env.BRANCH_ID || "";
    if (branch) await page.addInitScript((b) => localStorage.setItem("flutter.branch_id", JSON.stringify(b)), branch);
    if (!keepModal) await page.addInitScript(() => { try { localStorage.setItem("flutter.download_modal_dismissed", String(Date.now())); } catch {} });
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(wait);
    if (scrollY) { await page.mouse.move(w / 2, h / 2); await page.mouse.wheel(0, scrollY); await page.waitForTimeout(1500); }
    const file = `visual-report/${name}-${w}x${h}-${label}.png`.replace(".png", scrollY ? `-s${scrollY}.png` : ".png");
    await page.screenshot({ path: file });
    shots[label] = file;
    await ctx.close();
  }
  const a = PNG.sync.read(fs.readFileSync(shots.flutter)), b = PNG.sync.read(fs.readFileSync(shots.next));
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.15 });
  fs.writeFileSync(`visual-report/${name}-${w}x${h}-diff${scrollY ? "-s" + scrollY : ""}.png`, PNG.sync.write(diff));
  console.log(`${name} ${w}x${h}: ${(100 * n / (w * h)).toFixed(2)}% pixels differ`);
}
await browser.close();
