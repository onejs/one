import { NativeEventEmitter, TurboModuleRegistry, type TurboModule } from 'react-native'
import { useEffect, useState } from 'react'
import { normalizeState } from './state'
import {
  NetworkStateType,
  type NetworkState,
  type NetworkStateSubscription,
} from './types'

export { NetworkStateType }
export type { NetworkState, NetworkStateSubscription }

// connection state matching expo-network: one-shot read plus a change
// listener. the native module is resolved once and lazily; native owns the
// monitor and the subscription refcount.
interface NetworkSpec extends TurboModule {
  getNetworkState(): Promise<NetworkState>
  startMonitoring(): void
  stopMonitoring(): void
  addListener(eventName: string): void
  removeListeners(count: number): void
}

const networkStateChangedEvent = 'OneNativeNetworkStateChanged'

let nativeModule: NetworkSpec | null | undefined
let emitter: NativeEventEmitter | null = null

function native(): NetworkSpec {
  if (nativeModule === undefined) {
    nativeModule = TurboModuleRegistry.get<NetworkSpec>('OneNativeNetwork')
  }
  if (!nativeModule) {
    throw new Error('OneNativeNetwork requires a native build with @vxrn/native installed')
  }
  return nativeModule
}

function events(): NativeEventEmitter {
  if (!emitter) emitter = new NativeEventEmitter(native())
  return emitter
}

export async function getNetworkStateAsync(): Promise<NetworkState> {
  return normalizeState(await native().getNetworkState())
}

export function addNetworkStateListener(
  listener: (state: NetworkState) => void
): NetworkStateSubscription {
  native().startMonitoring()
  const subscription = events().addListener(networkStateChangedEvent, (state) => {
    listener(normalizeState(state))
  })
  return {
    remove: () => {
      subscription.remove()
      native().stopMonitoring()
    },
  }
}

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    type: NetworkStateType.UNKNOWN,
    isConnected: false,
    isInternetReachable: false,
  })
  useEffect(() => {
    let active = true
    getNetworkStateAsync()
      .then((next) => {
        if (active) setState(next)
      })
      .catch(() => {})
    const subscription = addNetworkStateListener((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return state
}
