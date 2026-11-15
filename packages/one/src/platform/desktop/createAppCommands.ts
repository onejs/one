import { DeviceEventEmitter, TurboModuleRegistry, type EventSubscription, type TurboModule } from 'react-native'
import type { AppCommandConfig, AppCommandListener } from './appCommandTypes'

interface Spec extends TurboModule {
  configure(config: Object): void
  setListening(listening: boolean): void
}

export function createAppCommands<Config extends AppCommandConfig = AppCommandConfig>(moduleName: string, eventName: string) {
  const listeners = new Set<{ listener: AppCommandListener }>()
  let subscription: EventSubscription | null = null
  const native = () => TurboModuleRegistry.getEnforcing<Spec>(moduleName)

  return {
    configure(config: Config): void {
      native().configure(config)
    },
    addListener(listener: AppCommandListener): () => void {
      if (typeof listener !== 'function') {
        throw new TypeError('AppCommands.addListener expects a function')
      }
      const entry = { listener }
      listeners.add(entry)
      if (!subscription) {
        subscription = DeviceEventEmitter.addListener(eventName, (id: string) => {
          for (const current of [...listeners]) {
            if (listeners.has(current)) current.listener(id)
          }
        })
        native().setListening(true)
      }
      return () => {
        if (!listeners.delete(entry) || listeners.size > 0) return
        subscription?.remove()
        subscription = null
        native().setListening(false)
      }
    },
  }
}
