import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

function createIconSvg(size) {
  const rx = Math.round(size * 0.21);
  const fontSize1 = Math.round(size * 0.29);
  const fontSize2 = Math.round(size * 0.21);
  const y1 = Math.round(size * 0.46);
  const y2 = Math.round(size * 0.69);
  const cx = size / 2;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#007AFF"/>
  <text x="${cx}" y="${y1}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize1}" font-weight="bold" fill="white">KAL</text>
  <text x="${cx}" y="${y2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize2}" font-weight="bold" fill="white" opacity="0.9">AI</text>
</svg>`);
}

async function generate() {
  for (const size of [192, 512]) {
    const svg = createIconSvg(size);
    const png = await sharp(svg).png().toBuffer();
    const path = join(publicDir, `icon-${size}.png`);
    writeFileSync(path, png);
    console.log(`Created ${path} (${png.length} bytes)`);
  }

  // Also create apple-touch-icon (180x180)
  const svg180 = createIconSvg(180);
  const png180 = await sharp(svg180).png().toBuffer();
  const path180 = join(publicDir, "apple-touch-icon.png");
  writeFileSync(path180, png180);
  console.log(`Created ${path180} (${png180.length} bytes)`);
}

generate().catch(console.error);
