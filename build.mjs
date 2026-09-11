/* ==========================================================================
   Pin Lock — inline every stylesheet and script into one portable file.

     node build.mjs              -> dist/pin-lock.html  (standalone page)
     node build.mjs --fragment   -> dist/pin-lock.fragment.html

   The fragment drops the document skeleton and the favicon link, for hosts
   that supply their own <head>.
   ========================================================================== */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const fragment = process.argv.includes('--fragment');

const read = (rel) => readFile(join(root, rel), 'utf8');

let html = await read('index.html');

/* Stylesheets, in the order the page lists them. */
for (const [tag, href] of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]) {
  const css = await read(href);
  html = html.replace(tag, `<style>\n/* ${href} */\n${css.trim()}\n</style>`);
}

/* Scripts, likewise — they depend on load order. */
for (const [tag, src] of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
  const js = await read(src);
  html = html.replace(tag, `<script>\n/* ${src} */\n${js.trim()}\n</script>`);
}

/* Images the stylesheets point at, so the built file makes no requests.
   Paths are relative to the stylesheet, which lives one level down. */
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml'
};

for (const [tag, href] of [...html.matchAll(/url\("(?!data:)([^"]+)"\)/g)]) {
  const rel = href.replace(/^\.\.\//, '');
  const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase();
  const mime = MIME[ext];
  if (!mime) continue;
  const data = await readFile(join(root, rel));
  html = html.replaceAll(tag, `url("data:${mime};base64,${data.toString('base64')}")`);
}

if (fragment) {
  html = html
    .replace(/^[\s\S]*?<title>/, '<title>')
    /* The icon is one line holding an inline SVG, so match to the line end
       rather than to the next ">" — there are plenty of those inside it. */
    .replace(/^<link rel="icon".*\n?/m, '')
    .replace(/<\/head>\s*<body>/, '')
    .replace(/<\/body>\s*<\/html>\s*$/, '')
    .trim();
}

const out = join(root, 'dist', fragment ? 'pin-lock.fragment.html' : 'pin-lock.html');
await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(out, html + '\n');

console.log(`${out}  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
