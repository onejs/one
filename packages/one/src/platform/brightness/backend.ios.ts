import { NotificationCenter } from 'one/ios/Foundation'
import { UIScreen } from 'one/ios/UIKit'
import type { SDKHandle } from 'one/ios-runtime'
import type { BrightnessEvent, BrightnessMode, BrightnessPermissionResponse } from './types'

const listeners = new Map<number, (event: BrightnessEvent) => void>()
let nextId = 0
let observer: SDKHandle | undefined
let lastBrightness: number | undefined
let pending = Promise.resolve()

// observer setup, reads and writes share an order so an immediate set after
// addListener cannot overtake the asynchronous main-actor setup.
function ordered<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation)
  pending = result.then(() => {}, () => {})
  return result
}

function changed() {
  return ordered(async () => {
    const brightness = await (await UIScreen.main).brightness
    if (brightness === lastBrightness) return
    lastBrightness = brightness
    for (const listener of [...listeners.values()]) listener({ brightness })
  })
}

function addListener(listener: (event: BrightnessEvent) => void): () => void {
  const id = nextId++
  listeners.set(id, listener)
  void ordered(async () => {
    if (observer || !listeners.size) return
    lastBrightness = await (await UIScreen.main).brightness
    const name = await UIScreen.brightnessDidChangeNotification
    if (!listeners.size) return
    observer = NotificationCenter.default.addObserver(name, null, null, () => { void changed() })
  })
  return () => {
    listeners.delete(id)
    void ordered(async () => {
      if (listeners.size || !observer) return
      NotificationCenter.default.removeObserver(observer)
      observer = undefined
      lastBrightness = undefined
    })
  }
}

const granted = (): BrightnessPermissionResponse => ({
  status: 'granted', granted: true, canAskAgain: false,
})

const backend = {
  get() {
    return ordered(async () => (await UIScreen.main).brightness)
  },
  set(value: number) {
    return ordered(async () => (await UIScreen.main).setBrightness(value))
  },
  getSystem() {
    return backend.get()
  },
  async setSystem(_value: number): Promise<void> {},
  async getSystemMode(): Promise<BrightnessMode> { return 'unknown' },
  async setSystemMode(_mode: BrightnessMode): Promise<void> {},
  async isUsingSystem() { return true },
  async restoreSystem(): Promise<void> {},
  async getPermissions() { return granted() },
  async requestPermissions() { return granted() },
  isAvailable() { return true },
  addListener,
}

export function brightnessNative() {
  return backend
}
