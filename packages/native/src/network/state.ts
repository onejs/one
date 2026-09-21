import { NetworkStateType, type NetworkState } from './types'

// native payloads cross the bridge untyped; anything unexpected falls back
// to unknown rather than crashing a subscriber.
export function normalizeState(value: unknown): NetworkState {
  const fallback: NetworkState = {
    type: NetworkStateType.UNKNOWN,
    isConnected: false,
    isInternetReachable: false,
  }
  if (!value || typeof value !== 'object') return fallback
  const { type, isConnected, isInternetReachable } = value as Record<string, unknown>
  const known =
    typeof type === 'string' &&
    (Object.values(NetworkStateType) as string[]).includes(type)
  return {
    type: known ? (type as NetworkStateType) : NetworkStateType.UNKNOWN,
    isConnected: isConnected === true,
    isInternetReachable: isInternetReachable === true,
  }
}
