export function resolveCanaryVersion(
  currentVersion: string,
  options: {
    rePublish: boolean
    now?: () => number
  }
): string {
  if (options.rePublish) {
    return currentVersion
  }

  return `${currentVersion.replace(/(-\d+)+$/, '')}-${(options.now ?? Date.now)()}`
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
