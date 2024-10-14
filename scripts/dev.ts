import { execSync } from 'node:child_process'

const prefix = process.argv[2] // 'example' or 'test'
const workspace = process.argv[3] // The workspace name (e.g., 'basic', 'fullstack')

if (!prefix || !workspace) {
  console.error('Usage: yarn dev:example <prefix> <workspace>')
  console.error('Example: yarn dev:example example basic')
  process.exit(1)
}

try {
  const command = `yarn workspace ${prefix}-${workspace} dev`
  console.info(`Running: ${command}`)
  execSync(command, { stdio: 'inherit' })
} catch (error) {
  console.error(`Failed to start workspace ${prefix}-${workspace}:`, error)
  process.exit(1)
}
