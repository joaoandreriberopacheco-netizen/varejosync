/**
 * Pack + push num só passo.
 *
 * Uso:
 *   npm run mirror:sync -- ../a29-erp
 *   A29_ERP_PATH=../a29-erp npm run mirror:sync
 */
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const extraArgs = process.argv.slice(2);

function run(script, args = []) {
  const res = spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run('mirror-pack.mjs');
run('mirror-push-a29.mjs', extraArgs);
