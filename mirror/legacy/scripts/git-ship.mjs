/**
 * Commit (git add -A) + push. Usage:
 *   npm run git:ship -- "mensagem do commit"
 */
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const msg = process.argv.slice(2).join(' ').trim();
if (!msg) {
  console.error('Uso: npm run git:ship -- "mensagem do commit"');
  process.exit(1);
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: root, shell: true });
}

run('git add -A');

const porcelain = execSync('git status --porcelain', { encoding: 'utf8', cwd: root }).trim();
if (!porcelain) {
  console.log('Nada a commitar (working tree limpo).');
  process.exit(0);
}

try {
  run(`git commit -m ${JSON.stringify(msg)}`);
} catch {
  console.error('Falha no commit.');
  process.exit(1);
}

const branch = execSync('git rev-parse --abbrev-ref HEAD', {
  encoding: 'utf8',
  cwd: root,
}).trim();

try {
  run(`git pull --rebase origin ${branch}`);
} catch {
  console.error(`git pull --rebase falhou (resolve conflitos e volta a correr npm run git:ship -- "...").`);
  process.exit(1);
}

run(`git push origin ${branch}`);
