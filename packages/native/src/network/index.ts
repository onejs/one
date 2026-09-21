import { useEffect, useState } from 'react'
import type { NetworkState, NetworkStateSubscription } from './types'
import { assertStateListener } from './validate'

export type { NetworkState, NetworkStateSubscription, NetworkStateType } from './types'

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms.
// navigator.connection types are unreliable across browsers, so a live
// connection reports unknown, matching expo-network on web.
function currentState(): NetworkState {
  const isConnected =
    typeof navigator === 'undefined' ? false : navigator.onLine !== false
  return {
    type: isConnected ? 'unknown' : 'none',
    isConnected,
    isInternetReachable: isConnected,
  }
}

async function getState(): Promise<NetworkState> {
  return currentState()
}

function addStateListener(
  listener: (state: NetworkState) => void
): NetworkStateSubscription {
  assertStateListener(listener)
  if (typeof window === 'undefined') return { remove: () => {} }
  const onChange = () => listener(currentState())
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return {
    remove: () => {
      window.removeEventListener('online', onChange)
      window.removeEventListener('offline', onChange)
    },
  }
}

function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(currentState)
  useEffect(() => {
    setState(currentState())
    return addStateListener(setState).remove
  }, [])
  return state
}

export const Network = Object.freeze({ getState, addStateListener })
export { useNetworkState }
