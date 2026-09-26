import { updatesBoot } from './updates-boot'

// entry-chunk boot behavior for the updates suite (wired as the app's native
// setupFile). the publish variants act before anything mounts: a throw here
// is a pre-render fatal the launcher rolls back, and the delay holds the
// splash with launching recorded. routes evaluate lazily after the shell
// mounts, which records success first and swallows the throw in a boundary.
if (updatesBoot.throws) {
  throw new Error('updates-suite-boom')
}
if (updatesBoot.delayMs > 0) {
  const bootStart = Date.now()
  while (Date.now() - bootStart < updatesBoot.delayMs) {}
}
