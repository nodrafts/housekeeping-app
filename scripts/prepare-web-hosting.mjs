import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outputDir = 'dist-web';
const publicPath = process.argv[2] ?? '/';
const normalizedPath = publicPath.endsWith('/') ? publicPath : `${publicPath}/`;
const indexPath = join(outputDir, 'index.html');

if (!existsSync(indexPath)) {
  throw new Error(`Missing ${indexPath}. Run the web export first.`);
}

const html = readFileSync(indexPath, 'utf8')
  .replaceAll('"/_expo/', `"${normalizedPath}_expo/`)
  .replaceAll("'/_expo/", `'${normalizedPath}_expo/`);

writeFileSync(indexPath, html);
copyFileSync(indexPath, join(outputDir, '404.html'));
writeFileSync(join(outputDir, '.nojekyll'), '');
