import type { HybridObject } from 'react-native-nitro-modules'
import type { NetworkState } from '../network/types'

// connection state behind One.Network, matching expo-network: a one-shot
// read plus a change listener. the first listener starts the platform
// monitor and the last removal stops it, so the first event can never race
// the subscription. addStateListener returns its remover.
export interface OneNetwork extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getState(): Promise<NetworkState>
  addStateListener(listener: (state: NetworkState) => void): () => void
}
