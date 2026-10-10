// fails when run evidence (captures, logs, receipts) is tracked in any evidence/ or proofs/ directory
import { execFileSync } from 'node:child_process'

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((path) => /(^|\/)(evidence|proofs)\//.test(path))

if (tracked.length) {
  console.error(
    `evidence/ and proofs/ directories must not be committed (${tracked.length} tracked):\n${tracked.slice(0, 20).join('\n')}`
  )
  process.exit(1)
}
