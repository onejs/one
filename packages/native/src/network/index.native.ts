import { NativeEventEmitter, TurboModuleRegistry, type TurboModule } from 'react-native'
import { useEffect, useState } from 'react'
import { normalizeState } from './state'
import type { NetworkState, NetworkStateSubscription } from './types'
import { assertStateListener } from './validate'

export type { NetworkState, NetworkStateSubscription, NetworkStateType } from './types'

// connection state matching expo-network: a one-shot read plus a change
// listener. the native module is resolved once and lazily; native owns the
// monitor and the subscription refcount.
interface NetworkSpec extends TurboModule {
  getState(): Promise<NetworkState>
  startMonitoring(): void
  stopMonitoring(): void
  addListener(eventName: string): void
  removeListeners(count: number): void
}

const networkStateChangedEvent = 'oneNativeNetworkStateChanged'

let nativeModule: NetworkSpec | null | undefined
let emitter: NativeEventEmitter | null = null

function native(): NetworkSpec | null {
  if (nativeModule === undefined) {
    nativeModule = TurboModuleRegistry.get<NetworkSpec>('OneNativeNetwork')
  }
  return nativeModule
}

function needNative(): Promise<never> {
  return Promise.reject(
    new Error('Network needs a native build that includes @vxrn/native')
  )
}

function events(): NativeEventEmitter | null {
  const resolved = native()
  if (!resolved) return null
  if (!emitter) emitter = new NativeEventEmitter(resolved)
  return emitter
}

function getState(): Promise<NetworkState> {
  const resolved = native()
  if (!resolved) return needNative()
  return resolved.getState().then(normalizeState)
}

function addStateListener(
  listener: (state: NetworkState) => void
): NetworkStateSubscription {
  assertStateListener(listener)
  const resolved = native()
  const observed = events()
  if (!resolved || !observed) return { remove: () => {} }
  resolved.startMonitoring()
  const subscription = observed.addListener(networkStateChangedEvent, (state) => {
    listener(normalizeState(state))
  })
  return {
    remove: () => {
      subscription.remove()
      resolved.stopMonitoring()
    },
  }
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
