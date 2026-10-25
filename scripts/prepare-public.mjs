import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Keep license notices beside the bundled demo. Read both sources before
// writing, and preserve all other public assets (including the example ZIP).
const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['LICENSE', 'THIRD_PARTY_NOTICES.md'];
const contents = await Promise.all(names.map(name => readFile(join(root, name))));
const threeLicense = await readFile(join(root, 'node_modules/three/LICENSE'), 'utf8');
if (!contents[1].toString('utf8').includes(threeLicense.trim())) {
  throw new Error('THIRD_PARTY_NOTICES.md must contain the installed Three.js license. Review it after dependency updates.');
}
const destination = join(root, 'public');
await mkdir(destination, { recursive: true });
await Promise.all(names.map((name, i) => writeFile(join(destination, name), contents[i])));
console.log('Prepared public/LICENSE and public/THIRD_PARTY_NOTICES.md.');
