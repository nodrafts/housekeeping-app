import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const indexPath = 'dist-web/index.html';

if (!existsSync(indexPath)) {
  throw new Error(`Missing ${indexPath}. Run the web export first.`);
}

const html = readFileSync(indexPath, 'utf8');
const pwaLinks = [
  '<link rel="manifest" href="/manifest.json">',
  '<link rel="icon" href="/icon-192.png">',
].join('\n');

if (!html.includes('rel="manifest"')) {
  writeFileSync(indexPath, html.replace('</head>', `${pwaLinks}\n</head>`));
}
