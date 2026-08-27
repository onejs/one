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
