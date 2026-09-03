import { execSync } from 'node:child_process'

export async function setup() {
  if (process.env.SKIP_BUILD) return

  execSync('bun run build:web', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      // vitest sets NODE_ENV=test which breaks static page generation
      NODE_ENV: 'production',
    },
  })
}
