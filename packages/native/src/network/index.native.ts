import { useEffect, useState } from 'react'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneNetwork } from '../specs/OneNetwork.nitro'
import type { NetworkState, NetworkStateSubscription } from './types'
import { assertStateListener } from './validate'

export type { NetworkState, NetworkStateSubscription, NetworkStateType } from './types'

// connection state matching expo-network: a one-shot read plus a change
// listener, backed by the OneNetwork nitro hybrid object (created on first
// use and cached). the first listener starts the native monitor, so the
// first event can never race the subscription.
let hybrid: OneNetwork | undefined

function native(): OneNetwork {
  hybrid ??= NitroModules.createHybridObject<OneNetwork>('OneNetwork')
  return hybrid
}

function getState(): Promise<NetworkState> {
  return native().getState()
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
    getState()
      .then((next) => {
        if (active) setState(next)
      })
      .catch(() => {})
    const subscription = addStateListener((next) => {
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
