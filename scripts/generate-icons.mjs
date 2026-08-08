import { PNG } from "pngjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");

const NAVY = [15, 23, 42]; // #0f172a
const AMBER = [251, 191, 36]; // #fbbf24
const WHITE = [248, 250, 252]; // #f8fafc

function angleToVec(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { dx: Math.sin(rad), dy: -Math.cos(rad) };
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  let t = abLenSq === 0 ? 0 : (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  const dx = px - closestX;
  const dy = py - closestY;
  return Math.sqrt(dx * dx + dy * dy);
}

function setPixel(png, x, y, [r, g, b], alpha = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = alpha;
}

function drawIcon(size) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const faceRadius = size * 0.32;
  const hubRadius = size * 0.045;

  const hour = angleToVec(-60);
  const hourLen = size * 0.22;
  const hourThickness = size * 0.05;

  const minute = angleToVec(60);
  const minuteLen = size * 0.32;
  const minuteThickness = size * 0.038;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Background: navy, full bleed.
      let color = NAVY;

      const dx = x - cx;
      const dy = y - cy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      if (distFromCenter <= faceRadius) {
        color = AMBER;
      }

      const distToHour = distanceToSegment(
        x,
        y,
        cx,
        cy,
        cx + hour.dx * hourLen,
        cy + hour.dy * hourLen
      );
      const distToMinute = distanceToSegment(
        x,
        y,
        cx,
        cy,
        cx + minute.dx * minuteLen,
        cy + minute.dy * minuteLen
      );

      if (distToHour <= hourThickness / 2 || distToMinute <= minuteThickness / 2) {
        color = WHITE;
      }

      if (distFromCenter <= hubRadius) {
        color = NAVY;
      }

      setPixel(png, x, y, color);
    }
  }

  return png;
}

function save(size, filename) {
  const png = drawIcon(size);
  const buffer = PNG.sync.write(png);
  writeFileSync(path.join(outDir, filename), buffer);
  console.log(`wrote ${filename} (${size}x${size})`);
}

save(192, "icon-192.png");
save(512, "icon-512.png");
save(512, "icon-maskable-512.png");
save(180, "apple-touch-icon.png");
