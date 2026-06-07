// Generate favicon + PWA icons from the brand logo.
// Run: node scripts/gen-icons.mjs
import sharp from "sharp";

const SRC = "public/marketing/brand/logo-profile.png"; // navy "L" monogram, square

const targets = [
  { out: "public/icons/icon-192.png", size: 192 },
  { out: "public/icons/icon-512.png", size: 512 },
  { out: "public/icons/icon-maskable-512.png", size: 512 }, // full-bleed navy bg = mask-safe
  { out: "app/icon.png", size: 512 }, // App Router favicon
];

for (const t of targets) {
  await sharp(SRC).resize(t.size, t.size, { fit: "cover" }).png().toFile(t.out);
  console.log("wrote", t.out, `(${t.size}x${t.size})`);
}
console.log("done");
