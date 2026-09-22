import type { TurboModule } from 'react-native'

// legacy module spec. resolved with one lazy cached
// TurboModuleRegistry.get in fonts/index.native.ts, never getEnforcing:
// with no native build the module is null and load rejects cleanly.
export interface Spec extends TurboModule {
  load(name: string, uri: string): Promise<void>
  isLoaded(name: string): boolean
}
