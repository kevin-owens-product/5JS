import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { guides } from '../connectors/content/index.js';
import { renderDirectory, renderGuide } from '../connectors/render.js';

const root = fileURLToPath(new URL('../connectors/', import.meta.url));
await mkdir(root, { recursive: true });
await writeFile(join(root, 'index.html'), renderDirectory());
for (const guide of guides) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.slug)) throw new Error(`Invalid connector slug: ${guide.slug}`);
  const directory = join(root, guide.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), renderGuide(guide));
}
console.log(`Prepared the connector directory and ${guides.length} static connector guides.`);
