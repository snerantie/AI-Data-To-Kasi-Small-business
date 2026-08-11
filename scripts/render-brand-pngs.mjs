/**
 * Render KasiKash brand SVGs to PNGs (LinkedIn / OG assets).
 *
 * Run:  node scripts/render-brand-pngs.mjs
 *
 * Outputs everything under public/og/ so the assets are:
 *   - versioned in git
 *   - live at https://kasikash.com/og/<filename>.png
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const outDir = resolve(repoRoot, 'public/og');
mkdirSync(outDir, { recursive: true });

/** Render an SVG to PNG at the given pixel width (height derived from viewBox). */
function render(svgPath, outName, width) {
  const svg = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    background: 'rgba(0,0,0,0)',
    fitTo: { mode: 'width', value: width },
    font: {
      // Fall back to bundled fonts — resvg-js ships DejaVu-family fallbacks.
      loadSystemFonts: true,
    },
  });
  const pngBuf = resvg.render().asPng();
  const outPath = resolve(outDir, outName);
  writeFileSync(outPath, pngBuf);
  console.log(`  wrote ${outPath} (${pngBuf.length.toLocaleString()} bytes)`);
}

console.log('Rendering KasiKash logo PNGs…');
render(resolve(repoRoot, 'public/icon.svg'), 'kasikash-logo-400.png',  400);
render(resolve(repoRoot, 'public/icon.svg'), 'kasikash-logo-1024.png', 1024);

console.log('Rendering LinkedIn Company Page banner (1128x191)…');
render(
  resolve(repoRoot, 'public/og/linkedin-banner-1128x191.svg'),
  'linkedin-banner-1128x191.png',
  1128,
);

console.log('Rendering LinkedIn Personal Profile banner (1584x396)…');
render(
  resolve(repoRoot, 'public/og/linkedin-personal-1584x396.svg'),
  'linkedin-personal-1584x396.png',
  1584,
);

console.log('Done.');
