import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const distIndex = path.join(root, 'dist', 'index.html');

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  const useShell = opts.shell ?? process.platform === 'win32';
  const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: useShell, ...opts });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)));
});

const runNoShell = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)));
});

const startServer = () => runNoShell(process.execPath, [path.join(root, 'server', 'index.js')]);

const npmBin = process.platform === 'win32'
  ? path.resolve(root, 'node_modules', '.bin', 'npm.cmd')
  : 'npm';

const npmExistsLocally = fs.existsSync(npmBin);

try {
  if (fs.existsSync(distIndex)) {
    console.log('📦 dist/ topildi, server ishga tushirilmoqda...');
    await startServer();
  } else {
    console.log('🔨 dist/ topilmadi — avval npm run build ishlatilmoqda...');
    const buildCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const buildArgs = ['run', 'build'];
    if (npmExistsLocally) {
      await runNoShell(npmBin, buildArgs);
    } else {
      await run(buildCmd, buildArgs);
    }
    console.log('✅ Build tugadi, server ishga tushirilmoqda...');
    await startServer();
  }
} catch (err) {
  console.error('❌ Start failed:', err.message || err);
  process.exit(1);
}
