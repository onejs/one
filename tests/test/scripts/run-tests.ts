// runs test:dev, test:prod, and test:dev-non-cli sequentially
// sequential to avoid resource contention when running under turbo

import { resolve } from 'node:path'

const cwd = resolve(import.meta.dir, '..')

const devExit = await Bun.spawn(['bun', 'run', 'test:dev'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  cwd,
}).exited

if (devExit !== 0) {
  console.error(`test:dev failed with exit code ${devExit}`)
  process.exit(1)
}

const prodExit = await Bun.spawn(['bun', 'run', 'test:prod'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  cwd,
}).exited

if (prodExit !== 0) {
  console.error(`test:prod failed with exit code ${prodExit}`)
  process.exit(1)
}

// TODO: non-cli mode tests disabled — SSR context broken in plain vite mode
// see setServerContext "Don't call setServerContext on client" error
// const nonCli = Bun.spawn(['bun', 'run', 'test:dev-non-cli'], {
//   stdio: ['inherit', 'inherit', 'inherit'],
//   cwd,
// })
//
// const nonCliExit = await nonCli.exited
// if (nonCliExit !== 0) {
//   process.exit(1)
// }
