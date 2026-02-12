// runs test:dev, test:prod, and test:dev-non-cli
// dev and prod run in parallel since they use separate servers on random ports
// non-cli runs after since it's a variant of dev mode

import { resolve } from 'node:path'

const cwd = resolve(import.meta.dir, '..')

const dev = Bun.spawn(['bun', 'run', 'test:dev'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  cwd,
})

const prod = Bun.spawn(['bun', 'run', 'test:prod'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  cwd,
})

const [devExit, prodExit] = await Promise.all([dev.exited, prod.exited])

if (devExit !== 0 || prodExit !== 0) {
  console.error(`parallel tests failed: dev=${devExit}, prod=${prodExit}`)
  process.exit(1)
}

// run non-cli mode after dev+prod pass
const nonCli = Bun.spawn(['bun', 'run', 'test:dev-non-cli'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  cwd,
})

const nonCliExit = await nonCli.exited
if (nonCliExit !== 0) {
  process.exit(1)
}
