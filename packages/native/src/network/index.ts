import { useEffect, useState } from 'react'
import {
  NetworkStateType,
  type NetworkState,
  type NetworkStateSubscription,
} from './types'

export { NetworkStateType }
export type { NetworkState, NetworkStateSubscription }

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms.
// navigator.connection types are unreliable across browsers, so a live
// connection reports unknown, matching expo-network on web.
function currentState(): NetworkState {
  const isConnected =
    typeof navigator === 'undefined' ? false : navigator.onLine !== false
  return {
    type: isConnected ? NetworkStateType.UNKNOWN : NetworkStateType.NONE,
    isConnected,
    isInternetReachable: isConnected,
  }
}

export async function getNetworkStateAsync(): Promise<NetworkState> {
  return currentState()
}

export function addNetworkStateListener(
  listener: (state: NetworkState) => void
): NetworkStateSubscription {
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

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(currentState)
  useEffect(() => {
    setState(currentState())
    return addNetworkStateListener(setState).remove
  }, [])
  return state
}
