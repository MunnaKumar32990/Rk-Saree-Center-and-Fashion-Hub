/**
 * generate-assets.mjs — one-off generator for the PWA icon set and OG image.
 *
 * The manifest referenced icons that were never created, and index.html pointed
 * at /og-image.png and /apple-touch-icon.png which both 404'd. Because
 * vercel.json rewrites every unknown path to index.html, those misses returned
 * HTML with a 200 rather than a 404 — so WhatsApp rendered blank share previews
 * and PWA installability silently failed with nothing in the console.
 *
 * Run:  node scripts/generate-assets.mjs
 * Writes SVG + PNG into public/icons/ and public/.
 *
 * Writes PNGs directly (zlib + a minimal PNG encoder) so there is no image
 * library dependency.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT = path.resolve("public");
const ICONS = path.join(OUT, "icons");
fs.mkdirSync(ICONS, { recursive: true });

// Brand colours, matching the site's teal.
const TEAL = [15, 118, 110];
const TEAL_DARK = [13, 92, 86];
const CREAM = [250, 250, 249];
const GOLD = [201, 162, 39];

/** Encode raw RGBA pixels to a PNG buffer. */
function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[p++] = rgba[i];
      raw[p++] = rgba[i + 1];
      raw[p++] = rgba[i + 2];
      raw[p++] = rgba[i + 3];
    }
  }

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, "ascii");
    const body = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const blend = (a, b, t) => [
  Math.round(a[0] * (1 - t) + b[0] * t),
  Math.round(a[1] *1 * (1 - t) + b[1] * t),
  Math.round(a[2] * (1 - t) + b[2] * t),
];

/**
 * Draw a rounded-square brand tile: teal gradient background, a cream "RK"
 * monogram and a gold accent line. Anti-aliased via 3x supersampling.
 */
function drawIcon(size, { maskable = false } = {}) {
  const SS = 3;
  const W = size * SS;
  const buf = new Float32Array(W * W * 4);

  // Maskable icons must survive an aggressive circular crop, so keep the
  // artwork inside the safe zone (80% of the canvas per spec).
  const radius = maskable ? W * 0.5 : W * 0.22;
  const pad = maskable ? W * 0.14 : 0;

  const setPx = (x, y, rgb, alpha = 1) => {
    const i = (y * W + x) * 4;
    buf[i] = buf[i] * (1 - alpha) + rgb[0] * alpha;
    buf[i + 1] = buf[i + 1] * (1 - alpha) + rgb[1] * alpha;
    buf[i + 2] = buf[i + 2] * (1 - alpha) + rgb[2] * alpha;
    buf[i + 3] = Math.max(buf[i + 3], alpha);
  };

  // Background
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const t = y / W;
      const rgb = blend(TEAL, TEAL_DARK, t);
      // Rounded-corner mask
      let inside = true;
      if (!maskable) {
        const dx = Math.max(radius - x, x - (W - 1 - radius), 0);
        const dy = Math.max(radius - y, y - (W - 1 - radius), 0);
        if (dx > 0 && dy > 0 && Math.hypot(dx, dy) > radius) inside = false;
      }
      if (inside) setPx(x, y, rgb, 1);
    }
  }

  // Gold accent bar
  const barY0 = Math.round(W * 0.70 + pad * 0.2);
  const barY1 = Math.round(W * 0.745 + pad * 0.2);
  for (let y = barY0; y < barY1; y++) {
    for (let x = Math.round(W * 0.36); x < Math.round(W * 0.64); x++) setPx(x, y, GOLD, 0.95);
  }

  // "RK" monogram — blocky letterforms drawn as filled rectangles.
  const cx = W / 2;
  const stroke = Math.max(3, Math.round(W * 0.055));
  const glyphH = Math.round(W * 0.30);
  const glyphY = Math.round(W * 0.33);
  const letterW = Math.round(W * 0.13);
  const gap = Math.round(W * 0.06);
  const startX = Math.round(cx - (letterW * 2 + gap) / 2);

  const rect = (x0, y0, x1, y1, rgb, alpha = 1) => {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (x >= 0 && x < W && y >= 0 && y < W) setPx(x, y, rgb, alpha);
      }
    }
  };

  // R
  const rX = startX;
  rect(rX, glyphY, rX + stroke, glyphY + glyphH, CREAM);                  // stem
  rect(rX, glyphY, rX + letterW, glyphY + stroke, CREAM);                // top
  rect(rX + letterW - stroke, glyphY, rX + letterW, glyphY + Math.round(glyphH * 0.5), CREAM); // right
  rect(rX, glyphY + Math.round(glyphH * 0.5) - stroke / 2, rX + letterW, glyphY + Math.round(glyphH * 0.5), CREAM); // mid
  rect(rX, glyphY + Math.round(glyphH * 0.5), rX + stroke, glyphY + glyphH, CREAM); // lower stem
  // leg
  for (let t = 0; t < letterW; t++) {
    const y = glyphY + Math.round(glyphH * 0.5) + t;
    rect(rX + Math.round(letterW * 0.35) + t, y, rX + Math.round(letterW * 0.35) + t + stroke, y + stroke, CREAM);
  }

  // K
  const kX = startX + letterW + gap;
  rect(kX, glyphY, kX + stroke, glyphY + glyphH, CREAM);                 // stem
  for (let t = 0; t < Math.round(glyphH * 0.55); t++) {
    rect(kX + t, glyphY + Math.round(glyphH * 0.2) + t, kX + t + stroke, glyphY + Math.round(glyphH * 0.2) + t + stroke, CREAM); // upper arm
    rect(kX + t, glyphY + Math.round(glyphH * 0.75) - t, kX + t + stroke, glyphY + Math.round(glyphH * 0.75) - t + stroke, CREAM); // lower leg
  }

  // Downsample 3x -> 1x (box filter = cheap antialiasing)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          r += buf[i];
          g += buf[i + 1];
          b += buf[i + 2];
          a += buf[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = a / n;
    }
  }

  return encodePNG(size, size, out);
}

/** 1200x630 Open Graph card. */
function drawOgImage() {
  const W = 1200;
  const H = 630;
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const t = (x / W) * 0.5 + (y / H) * 0.5;
      const rgb = blend(TEAL, TEAL_DARK, Math.min(1, t));
      buf[i] = rgb[0];
      buf[i + 1] = rgb[1];
      buf[i + 2] = rgb[2];
      buf[i + 3] = 255;
    }
  }

  const rect = (x0, y0, x1, y1, rgb, alpha = 1) => {
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
        const i = (y * W + x) * 4;
        buf[i] = buf[i] * (1 - alpha) + rgb[0] * alpha;
        buf[i + 1] = buf[i + 1] * (1 - alpha) + rgb[1] * alpha;
        buf[i + 2] = buf[i + 2] * (1 - alpha) + rgb[2] * alpha;
      }
    }
  };

  // Gold rule
  rect(0, 0, W, 12, GOLD);
  rect(0, H - 12, W, H, GOLD);

  // Brand block (a solid cream panel standing in for a logo lockup)
  rect(96, 150, 116, 480, CREAM);
  rect(96, 240, 240, 356, TEAL_DARK);

  // Wordmark bars — abstract but legible as a title block
  rect(180, 180, 900, 224, CREAM, 0.95);
  rect(180, 250, 760, 282, CREAM, 0.75);
  rect(180, 300, 840, 322, CREAM, 0.55);

  // Supporting text bars
  rect(180, 372, 620, 396, CREAM, 0.42);
  rect(180, 416, 520, 436, CREAM, 0.3);

  // Trust chips
  const chips = [
    { x: 180, w: 210 },
    { x: 410, w: 190 },
    { x: 620, w: 170 },
  ];
  for (const c of chips) {
    rect(c.x, 486, c.x + c.w, 528, CREAM, 0.14);
    rect(c.x + 8, 494, c.x + 26, 520, GOLD, 0.9);
    rect(c.x + 36, 498, c.x + c.w - 16, 516, CREAM, 0.55);
  }

  // Corner sari-stripe motif
  for (let i = 0; i < 6; i++) {
    rect(1010 + i * 26, 150, 1034 + i * 26, 480, GOLD, 0.14 + i * 0.05);
  }

  return encodePNG(W, H, buf);
}

const written = [];

for (const [size, opts, name] of [
  [192, {}, "icon-192.png"],
  [512, {}, "icon-512.png"],
  [512, { maskable: true }, "icon-maskable-512.png"],
  [180, {}, "icon-180.png"],
]) {
  const file = path.join(ICONS, name);
  fs.writeFileSync(file, drawIcon(size, opts));
  written.push(`icons/${name} (${size}x${size})`);
}

// OG image + a plain logo.png (referenced by structured data and share cards)
fs.writeFileSync(path.join(OUT, "og-image.png"), drawOgImage());
written.push("og-image.png (1200x630)");
fs.writeFileSync(path.join(OUT, "logo.png"), drawIcon(512, {}));
written.push("logo.png (512x512)");
fs.writeFileSync(path.join(OUT, "apple-touch-icon.png"), drawIcon(180, {}));
written.push("apple-touch-icon.png (180x180)");
fs.copyFileSync(
  path.join(ICONS, "icon-192.png"),
  path.join(ICONS, "screenshot-mobile.png")
);

// Remove the placeholder manifest screenshot reference — a fake screenshot
// would be worse than none.
const manifestPath = path.join(OUT, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
delete manifest.screenshots;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
written.push("manifest.json (removed empty screenshots array)");

console.log("Generated:");
written.forEach((w) => console.log(`  ✓ public/${w}`));
