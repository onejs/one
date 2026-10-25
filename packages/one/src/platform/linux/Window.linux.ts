import { TurboModuleRegistry, type TurboModule } from 'react-native'

interface Spec extends TurboModule {
  open(): void
}

// each window starts an independent instance of the application's root module.
export const Window = {
  open(): void {
    TurboModuleRegistry.getEnforcing<Spec>('OneLinuxWindow').open()
  },
}
