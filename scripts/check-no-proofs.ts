// fails when a proof capture, log or receipt is tracked under tests/native-features/proofs
import { execFileSync } from 'node:child_process'

const tracked = execFileSync('git', ['ls-files', 'tests/native-features/proofs'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)

if (tracked.length) {
  console.error(
    `tests/native-features/proofs must not be committed (${tracked.length} tracked):\n${tracked.slice(0, 20).join('\n')}`
  )
  process.exit(1)
}
