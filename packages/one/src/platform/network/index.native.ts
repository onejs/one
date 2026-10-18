import { useEffect, useState } from 'react'
import { networkNative as native } from './backend'
import { rethrowNativeError } from '../nativeError'
import type { NetworkState, NetworkStateSubscription } from './types'
import { assertStateListener } from './validate'

export type { NetworkState, NetworkStateSubscription, NetworkStateType } from './types'

function getState(): Promise<NetworkState> {
  return native().getState().catch(rethrowNativeError)
}

function addStateListener(
  listener: (state: NetworkState) => void
): NetworkStateSubscription {
  assertStateListener(listener)
  const remove = native().addStateListener(listener)
  return { remove: () => remove() }
}

function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    type: 'unknown',
    isConnected: false,
    isInternetReachable: false,
  })
  useEffect(() => {
    let active = true
    let sawEvent = false
    getState()
      .then((next) => {
        if (active && !sawEvent) setState(next)
      })
      .catch(() => {})
    const subscription = addStateListener((next) => {
      sawEvent = true
      if (active) setState(next)
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return state
}

export const Network = Object.freeze({ getState, addStateListener })
export { useNetworkState }
