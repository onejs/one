import { TurboModuleRegistry } from 'react-native'

import type { Spec as SyncStateSpec } from './specs/OneNativeSyncStateNativeModule'
import type { SyncStateInstaller } from './syncInstaller'

// Metro resolves this module for iOS and Android only; the base module stays
// web-safe. the spec import is type-only, so the codegen input never bundles.
//
// the installer stages the worklets UI holder global first (the reanimated
// pattern): Android reads it to reach the UI runtime for the JSI install, and
// iOS ignores it. loading worklets here guarantees its own install ran first.
// worklets is an optional peer; without it Android's install reports that it
// needs the UI runtime.
let worklets: typeof import('react-native-worklets') | undefined
try {
  worklets = require('react-native-worklets')
} catch {}

export function getSyncStateInstaller(): SyncStateInstaller | null {
  const module = TurboModuleRegistry.get<SyncStateSpec>('OneNativeSyncState')
  if (!module) return null
  return {
    install: () => {
      const globals = globalThis as Record<string, unknown>
      if (worklets) globals.__UI_WORKLET_RUNTIME_HOLDER = worklets.getUIRuntimeHolder()
      try {
        return module.install()
      } finally {
        delete globals.__UI_WORKLET_RUNTIME_HOLDER
      }
    },
  }
}
