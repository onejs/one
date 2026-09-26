import { Platform } from 'react-native'
import { updatesBoot } from './updates-boot'

// entry-chunk boot behavior for the updates suite (wired as the app's native
// setupFile). the publish variants act before anything mounts: a throw here
// is a pre-render fatal the launcher rolls back, and the delay holds the
// splash with launching recorded. routes evaluate lazily after the shell
// mounts, which records success first and swallows the throw in a boundary.
// the crashing variant pings the suite server first, with a top-level await
// so the entry stays suspended: the hit lands while nothing has mounted,
// which proves the bundle executed (js logs are stripped in release and the
// reaper deletes the failed update, so no other channel survives).
if (updatesBoot.throws) {
  const host = Platform.OS === 'android' ? 'http://10.0.2.2:8471' : 'http://127.0.0.1:8471'
  await fetch(`${host}/throws-booted`)
  throw new Error('updates-suite-boom')
}
if (updatesBoot.delayMs > 0) {
  const bootStart = Date.now()
  while (Date.now() - bootStart < updatesBoot.delayMs) {}
}
