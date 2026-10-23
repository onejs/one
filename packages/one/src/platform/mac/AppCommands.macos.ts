// native menu bar and key equivalent commands. the config shape matches
// react-native-gpui's AppCommands, so one command table serves both hosts.
import { DeviceEventEmitter, TurboModuleRegistry, type EventSubscription, type TurboModule } from 'react-native'
import type { SFSymbolName } from '../generated/sfSymbolNames'

export type AppCommandBinding = {
  id: string
  /** a gpui keystroke such as cmd-shift-[, ctrl-tab or up. */
  key: string
  /** a gpui key context; the mac host sets only Input, while a text input has focus. */
  context?: string | null
}

export type AppCommandMenuItem =
  | { kind: 'action'; id: string; label: string }
  | { kind: 'separator' }
  | { kind: 'submenu'; label: string; items: AppCommandMenuItem[] }

export type AppCommandMenu = {
  label: string
  items: AppCommandMenuItem[]
}

export type AppCommandConfig = {
  bindings: AppCommandBinding[]
  /** the first menu joins the application menu; others join a menu with the same title. */
  menus: AppCommandMenu[]
  /** native window toolbar; omitting it leaves the shell's toolbar in place. */
  toolbar?: AppCommandToolbarItem[]
}

export type AppCommandToolbarItem =
  | { kind: 'flexibleSpace' }
  | { kind: 'action'; id: string; label: string; systemImage: SFSymbolName; badge?: number }

export type AppCommandListener = (id: string) => void

interface Spec extends TurboModule {
  configure(config: Object): void
  setListening(listening: boolean): void
}

const listeners = new Set<{ listener: AppCommandListener }>()
let subscription: EventSubscription | null = null

function native() {
  return TurboModuleRegistry.getEnforcing<Spec>('OneMacAppCommands')
}

export const AppCommands = {
  /** replaces the menus and keys of the previous call; throws for an invalid config. */
  configure(config: AppCommandConfig): void {
    native().configure(config)
  },

  /** commands reach listeners only while one is registered; returns the remover. */
  addListener(listener: AppCommandListener): () => void {
    if (typeof listener !== 'function') {
      throw new TypeError('AppCommands.addListener expects a function')
    }
    const entry = { listener }
    listeners.add(entry)
    if (!subscription) {
      subscription = DeviceEventEmitter.addListener('oneMacAppCommand', (id: string) => {
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

export type OneMacAppCommands = typeof AppCommands
