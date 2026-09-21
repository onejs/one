import type { NetworkState, NetworkStateType } from './types'

const knownTypes: readonly string[] = [
  'none',
  'unknown',
  'cellular',
  'wifi',
  'bluetooth',
  'ethernet',
  'wimax',
  'vpn',
  'other',
]

// native payloads cross the bridge untyped; anything unexpected falls back
// to unknown rather than crashing a subscriber.
export function normalizeState(value: unknown): NetworkState {
  const fallback: NetworkState = {
    type: 'unknown',
    isConnected: false,
    isInternetReachable: false,
  }
  if (!value || typeof value !== 'object') return fallback
  const { type, isConnected, isInternetReachable } = value as Record<string, unknown>
  return {
    type:
      typeof type === 'string' && knownTypes.includes(type)
        ? (type as NetworkStateType)
        : 'unknown',
    isConnected: isConnected === true,
    isInternetReachable: isInternetReachable === true,
  }
}
