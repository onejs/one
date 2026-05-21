import { posix } from 'node:path'

// idempotent. returns forward-slash output. accepts backslash input from legacy path.join-shaped callers.
export function toServerOutputPath(input: string, outDir: string): string {
  const normalized = input.replace(/\\/g, '/')
  const prefix = `${outDir}/server/`
  if (normalized === `${outDir}/server` || normalized.startsWith(prefix)) {
    return normalized
  }
  return posix.join(outDir, 'server', normalized)
}
