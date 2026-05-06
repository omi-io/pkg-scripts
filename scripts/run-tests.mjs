import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { globSync } from 'glob';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pattern = 'test/**/*.test.mjs';
const files = globSync(pattern, { cwd: root }).map((relative) =>
  join(root, relative)
);

if (files.length === 0) {
  console.error(`No files matched ${pattern}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: root,
  stdio: 'inherit'
});

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
