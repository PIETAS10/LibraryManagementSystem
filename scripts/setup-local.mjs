import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = resolve(root, 'backend');
const frontendDir = resolve(root, 'frontend');
const envPath = resolve(backendDir, '.env');
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: isWindows,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
};

const prompt = createInterface({ input: stdin, output: stdout });

try {
  let databaseUrl;
  let adminPassword;

  if (existsSync(envPath)) {
    console.log('Đã có backend/.env; giữ nguyên cấu hình hiện tại.');
  } else {
    databaseUrl = (
      await prompt.question(
        'DATABASE_URL [postgresql://postgres:postgres@localhost:5432/library_db?schema=public]: ',
      )
    ).trim();
    databaseUrl ||=
      'postgresql://postgres:postgres@localhost:5432/library_db?schema=public';

    adminPassword =
      (
        await prompt.question(
          'Mật khẩu Admin demo [Admin@123456]: ',
        )
      ).trim() || 'Admin@123456';

    if (adminPassword.length < 12) {
      throw new Error('Mật khẩu Admin phải có ít nhất 12 ký tự.');
    }

    const env = [
      'PORT=5000',
      'NODE_ENV=development',
      'CLIENT_URL=http://localhost:5173',
      `DATABASE_URL="${databaseUrl}"`,
      `JWT_ACCESS_SECRET="${randomBytes(48).toString('base64url')}"`,
      'JWT_ACCESS_EXPIRES_IN=15m',
      `JWT_REFRESH_SECRET="${randomBytes(48).toString('base64url')}"`,
      'JWT_REFRESH_EXPIRES_IN=7d',
      'REFRESH_TOKEN_COOKIE_MAX_AGE=604800000',
      'ADMIN_EMAIL=admin@library.com',
      `ADMIN_PASSWORD="${adminPassword}"`,
      'ADMIN_NAME=Administrator',
      '',
    ].join('\n');

    writeFileSync(envPath, env, { flag: 'wx' });
    console.log('Đã tạo backend/.env với JWT secrets riêng cho máy này.');
  }

  run(npm, ['ci'], backendDir);
  run(npm, ['ci'], frontendDir);
  run(npm, ['run', 'prisma:generate'], backendDir);
  run(npm, ['exec', 'prisma', '--', 'migrate', 'deploy'], backendDir);
  run(
    npm,
    ['exec', 'prisma', '--', 'db', 'execute', '--file', 'prisma/custom_constraints.sql'],
    backendDir,
  );

  if (databaseUrl) {
    run(npm, ['run', 'prisma:seed'], backendDir);
  } else {
    console.log(
      'Bỏ qua seed vì cấu hình đã tồn tại. Nếu cần dữ liệu mẫu: npm --prefix backend run prisma:seed',
    );
  }

  console.log('\nThiết lập hoàn tất. Chạy "npm run dev" để mở ứng dụng.');
  console.log('Frontend: http://localhost:5173');
  console.log('Backend:  http://localhost:5000/api/health');
  if (adminPassword) {
    console.log(`Tài khoản Admin: admin@library.com / ${adminPassword}`);
  } else {
    console.log('Tài khoản Admin: admin@library.com (dùng mật khẩu đã cấu hình)');
  }
} catch (error) {
  console.error(`\nThiết lập thất bại: ${error.message}`);
  process.exitCode = 1;
} finally {
  prompt.close();
}
