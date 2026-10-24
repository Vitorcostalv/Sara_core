import { spawnSync } from 'node:child_process';

// Build shared declarations before consumers, including on a clean Git checkout.
for (const workspace of ['@sara/shared-types', '@sara/backend', '@sara/frontend']) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build', '-w', workspace], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_BASE_URL: '/api/v1',
      VITE_API_TIMEOUT_MS: '65000',
    },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
