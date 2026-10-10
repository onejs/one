import { parseArgs } from 'node:util'

const args = process.argv.slice(2)
const result = Bun.spawnSync(['one', 'prebuild', ...args], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})
if (result.exitCode !== 0) process.exit(result.exitCode)

const { values } = parseArgs({
  args,
  options: { platform: { type: 'string' } },
  strict: false,
})
if (values.platform !== 'android') {
  await import('./prepare-ios-audio-interruption')
  await import('./prepare-ios-background-tasks')
}
