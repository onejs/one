import { Platform } from 'react-native'

/**
 * Current platform. On web this resolves to the `.web` sibling, which is a
 * plain constant, so nothing in the web graph imports react-native for it.
 */
export const PLATFORM = Platform.OS
