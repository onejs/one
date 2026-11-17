import { native, Updates } from './index.native'

// a downloaded update counts as good only once the root layout commits; until
// then native keeps the launch armed, so a root render error rolls it back.
let proven = false

export function markLaunchSuccessful() {
  if (proven || !Updates.isEnabled) return
  proven = true
  // an update on a binary from before this method, shipped without a new
  // runtimeVersion, would otherwise throw on every launch after the binary
  // already counted it as proven
  native().markLaunchSuccessful?.()
}

export function launchCanRollBack() {
  return Updates.isEnabled && !Updates.isEmbeddedLaunch && !proven
}
