import { TurboModuleRegistry } from 'react-native'

import type { Spec as SyncStateSpec } from './specs/OneNativeSyncStateNativeModule'
import type { SyncStateInstaller } from './syncInstaller'

// Metro resolves this module for iOS and Android only; the base module stays
// web-safe. the spec import is type-only, so the codegen input never bundles.
//
// the installer stages the worklets UI holder global first (the reanimated
// pattern): Android reads it to reach the UI runtime for the JSI install, and
// iOS ignores it. initialize worklets when installing the first sync state.
export function getSyncStateInstaller(): SyncStateInstaller | null {
  const module = TurboModuleRegistry.get<SyncStateSpec>('OneNativeSyncState')
  if (!module) return null
  return {
    install: () => {
      const { getUIRuntimeHolder } =
        require('react-native-worklets') as typeof import('react-native-worklets')
      const globals = globalThis as Record<string, unknown>
      globals.__UI_WORKLET_RUNTIME_HOLDER = getUIRuntimeHolder()
      try {
        return module.install()
      } finally {
        delete globals.__UI_WORKLET_RUNTIME_HOLDER
      }
    },
  }
}
