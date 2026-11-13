import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = resolve(root, 'backend');
const frontendDir = resolve(root, 'frontend');

if (!existsSync(resolve(backendDir, '.env'))) {
  console.error('Chưa có backend/.env. Trước tiên hãy chạy "npm run setup:local".');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const processes = [
  ['Backend', backendDir],
  ['Frontend', frontendDir],
].map(([name, cwd]) => {
  const child = spawn(npm, ['run', 'dev'], {
    cwd,
    stdio: 'inherit',
    shell: isWindows,
  });

  child.on('error', (error) => {
    console.error(`${name} không khởi động được: ${error.message}`);
    shutdown(1);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${name} đã dừng với mã lỗi ${code}.`);
      shutdown(code);
    }
  });

  return child;
});

let stopping = false;

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  for (const child of processes) {
    if (child.exitCode === null) {
      child.kill();
    }
  }

  process.exitCode = exitCode;
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

console.log('Frontend: http://localhost:5173');
console.log('Backend:  http://localhost:5000/api/health');
