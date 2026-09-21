// network state shapes matching expo-network.
export const NetworkStateType = {
  NONE: 'NONE',
  UNKNOWN: 'UNKNOWN',
  CELLULAR: 'CELLULAR',
  WIFI: 'WIFI',
  BLUETOOTH: 'BLUETOOTH',
  ETHERNET: 'ETHERNET',
  WIMAX: 'WIMAX',
  VPN: 'VPN',
  OTHER: 'OTHER',
} as const

export type NetworkStateType =
  (typeof NetworkStateType)[keyof typeof NetworkStateType]

export interface NetworkState {
  type: NetworkStateType
  isConnected: boolean
  isInternetReachable: boolean
}

export interface NetworkStateSubscription {
  remove(): void
}
