import { posix } from 'node:path'

// Idempotent. Returns forward-slash output. Accepts backslash input (legacy path.join-shaped callers).
export function toServerOutputPath(input: string, outDir: string): string {
  const normalized = input.replace(/\\/g, '/')
  const prefix = `${outDir}/server/`
  if (normalized === `${outDir}/server` || normalized.startsWith(prefix)) {
    return normalized
  }
  return posix.join(outDir, 'server', normalized)
}
