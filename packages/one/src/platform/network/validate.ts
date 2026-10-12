import type { NetworkState } from './types'

// shared argument checks: identical checks and messages on web and native.
export function assertStateListener(
  listener: unknown
): asserts listener is (state: NetworkState) => void {
  if (typeof listener !== 'function') {
    throw new Error('Network.addStateListener: listener must be a function')
  }
}
