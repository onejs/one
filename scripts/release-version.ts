import { gt, inc, major, valid } from 'semver'
import blockedVersions from './blocked-versions.json'

type ReleaseMode = 'patch' | 'minor' | 'major'

// stay above old npm versions so a caret range cannot select a legacy package.
export function skipBlockedVersions(
  version: string,
  mode: ReleaseMode = 'patch'
): string {
  if (!valid(version)) throw new Error(`Invalid release version: ${version}`)
  let highestBlocked: string | undefined
  for (const blocked of blockedVersions.one) {
    if (major(blocked) !== major(version)) continue
    if (!highestBlocked || gt(blocked, highestBlocked)) highestBlocked = blocked
  }
  if (!highestBlocked || gt(version, highestBlocked)) return version
  // a major bump already chose its major; clear collisions within that line.
  return inc(highestBlocked, mode === 'patch' ? 'patch' : 'minor')!
}

export function resolveStableVersion(
  currentVersion: string,
  options: { mode: ReleaseMode; skipVersion?: boolean }
): string {
  if (options.skipVersion) return currentVersion
  const next = inc(currentVersion, options.mode)
  if (!next) throw new Error(`Invalid release version: ${currentVersion}`)
  return skipBlockedVersions(next, options.mode)
}

export function resolveCanaryVersion(
  currentVersion: string,
  options: {
    rePublish: boolean
    baseVersion?: string
    now?: () => number
  }
): string {
  if (options.rePublish) {
    return currentVersion
  }

  const timestamp = (options.now ?? Date.now)()
  if (options.baseVersion) return `${options.baseVersion}-0.canary.${timestamp}`
  return `${currentVersion.replace(/(-\d+)+$/, '')}-${timestamp}`
}

export function resolveBetaVersion(args: string[]): string | null {
  const beta = args.includes('--beta')
  const versionIndexes = args.flatMap((arg, index) =>
    arg === '--version' ? [index] : []
  )

  if (!beta && versionIndexes.length) {
    throw new Error('--version is only supported with --beta')
  }
  if (!beta) return null
  if (args.includes('--canary') || args.includes('--rc')) {
    throw new Error('--beta cannot be combined with --canary or --rc')
  }
  if (versionIndexes.length !== 1) {
    throw new Error('--beta requires exactly one --version argument')
  }

  const version = args[versionIndexes[0] + 1]
  if (!version || !/^2\.0\.0-beta\.[1-9]\d*\.[1-9]\d*$/.test(version)) {
    throw new Error('Beta versions must match 2.0.0-beta.<run>.<attempt>')
  }
  return version
}

export function resolvePublishTag(
  version: string,
  options: { canary: boolean }
): 'beta' | 'canary' | 'latest' | 'rc' {
  if (options.canary) return 'canary'
  if (version.includes('-beta.')) return 'beta'
  if (version.includes('-rc.')) return 'rc'
  return 'latest'
}
