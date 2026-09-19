import { TurboModuleRegistry } from 'react-native'

import type { Spec as SyncStateSpec } from './specs/OneNativeSyncStateNativeModule'
import type { SyncStateInstaller } from './syncInstaller'

// Metro resolves this module for iOS and Android only; the base module stays
// web-safe. the spec import is type-only, so the codegen input never bundles.
export function getSyncStateInstaller(): SyncStateInstaller | null {
  return TurboModuleRegistry.get<SyncStateSpec>('OneNativeSyncState')
}
