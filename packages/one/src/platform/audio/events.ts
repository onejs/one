import type { AudioStatus } from './types'

// status fan-out shared by the native and web players. expo emits status
// updates from native on an interval; here each player reads its own status
// on the same interval and emits to its listeners.

export type StatusReader = () => AudioStatus

export function createPlayerEvents(read: StatusReader, updateIntervalMs: number) {
  const listeners = new Set<(status: AudioStatus) => void>()
  let timer: ReturnType<typeof setInterval> | null = null

  function emit(): void {
    const status = read()
    listeners.forEach((listener) => listener(status))
  }

  function stop(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    add(event: string, listener: (status: AudioStatus) => void): { remove: () => void } {
      if (event !== 'playbackStatusUpdate') {
        throw new Error("AudioPlayer.addListener: expected 'playbackStatusUpdate'")
      }
      if (typeof listener !== 'function') {
        throw new Error('AudioPlayer.addListener: expected a listener function')
      }
      listeners.add(listener)
      if (timer === null) timer = setInterval(emit, updateIntervalMs)
      queueMicrotask(() => {
        if (listeners.has(listener)) listener(read())
      })
      return {
        remove: () => {
          listeners.delete(listener)
          if (listeners.size === 0) stop()
        },
      }
    },
    removeAll(): void {
      listeners.clear()
      stop()
    },
  }
}
