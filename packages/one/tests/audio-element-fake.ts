import { vi } from 'vitest'

// a scriptable html audio element shared by the audio player tests. it
// answers the media protocol used by the web player; assertions target
// one's element wiring, never browser media.
export class FakeAudioElement {
  src = ''
  crossOrigin: string | null = null
  preload = ''
  currentTime = 0
  duration = Number.NaN
  paused = true
  ended = false
  readyState = 0
  seeking = false
  loop = false
  muted = false
  volume = 1
  playbackRate = 1
  preservesPitch = true
  error: { message: string } | null = null
  loadCalls = 0
  private listeners = new Map<string, Set<() => void>>()

  addEventListener(type: string, listener: () => void, options?: { once?: boolean }) {
    const set = this.listeners.get(type) ?? new Set<() => void>()
    if (options?.once) {
      const once = () => {
        set.delete(once)
        listener()
      }
      set.add(once)
    } else {
      set.add(listener)
    }
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener)
  }

  removeAttribute(name: string) {
    if (name === 'src') this.src = ''
  }

  load() {
    this.loadCalls++
  }

  play() {
    this.paused = false
    return Promise.resolve()
  }

  pause() {
    this.paused = true
  }

  fire(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener()
  }
}

export function stubAudioElement() {
  const created: FakeAudioElement[] = []
  vi.stubGlobal(
    'Audio',
    class {
      constructor() {
        const element = new FakeAudioElement()
        created.push(element)
        return element
      }
    }
  )
  return created
}
