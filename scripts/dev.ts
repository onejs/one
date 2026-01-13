import { execSync } from 'node:child_process'

// Capture the arguments
const [prefix, workspace, ...flags] = process.argv.slice(2) // Extract additional flags

if (!prefix || !workspace) {
  console.error('Usage: bun run dev:example <prefix> <workspace> [--flags]')
  console.error('Example: bun run dev:example example basic --watch')
  process.exit(1)
}

try {
  // Join the flags for passing to the bun command
  const flagsString = flags.join(' ')
  const command = `bun run --filter ${prefix}-${workspace} dev ${flagsString}`

  console.info(`Running: ${command}`)
  execSync(command, { stdio: 'inherit' })
} catch (error) {
  console.error(`Failed to start workspace ${prefix}-${workspace}:`, error)
  process.exit(1)
}
