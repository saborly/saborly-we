// node e2e/crop.mjs <prefix> x y w h [scale]  -> writes <prefix>-crop-{flutter,next}.png side by side stacked
import fs from "node:fs"; import { PNG } from "pngjs";
const [prefix, x, y, w, h, s = 3] = [process.argv[2], ...process.argv.slice(3, 7).map(Number), Number(process.argv[7] || 3)];
const out = new PNG({ width: w * s, height: h * s * 2 + 6 });
out.data.fill(255);
["flutter", "next"].forEach((label, k) => {
  const src = PNG.sync.read(fs.readFileSync(`${prefix}-${label}.png`));
  for (let j = 0; j < h * s; j++) for (let i = 0; i < w * s; i++) {
    const si = ((y + Math.floor(j / s)) * src.width + x + Math.floor(i / s)) * 4, di = ((j + k * (h * s + 6)) * out.width + i) * 4;
    for (let c = 0; c < 4; c++) out.data[di + c] = src.data[si + c];
  }
});
fs.writeFileSync(`${prefix}-crop.png`, PNG.sync.write(out));
