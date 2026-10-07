import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const indexPath = 'dist-web/index.html';

if (!existsSync(indexPath)) {
  throw new Error(`Missing ${indexPath}. Run the web export first.`);
}

const html = readFileSync(indexPath, 'utf8');
const installMetadata = [
  '    <meta name="theme-color" content="#4a154b" />',
  '    <meta name="mobile-web-app-capable" content="yes" />',
  '    <meta name="apple-mobile-web-app-capable" content="yes" />',
  '    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '    <meta name="apple-mobile-web-app-title" content="Housekeeping" />',
  '    <link rel="manifest" href="./manifest.webmanifest" />',
  '    <link rel="icon" type="image/png" href="./app-icon.png" />',
  '    <link rel="apple-touch-icon" href="./app-icon.png" />',
].join('\n');

if (!html.includes('rel="apple-touch-icon"')) {
  writeFileSync(indexPath, html.replace('</head>', `\n${installMetadata}\n  </head>`));
}
