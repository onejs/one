// network state shapes matching expo-network. enums are string unions of
// their lowercase member names; expo's screaming values become lowercase.
export type NetworkStateType =
  | 'none'
  | 'unknown'
  | 'cellular'
  | 'wifi'
  | 'bluetooth'
  | 'ethernet'
  | 'wimax'
  | 'vpn'
  | 'other'

export interface NetworkState {
  type: NetworkStateType
  isConnected: boolean
  isInternetReachable: boolean
}

export interface NetworkStateSubscription {
  remove(): void
}
