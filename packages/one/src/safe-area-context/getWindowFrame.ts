import type { Rect } from './SafeArea-types'

export function getWindowFrame(): Rect {
  return {
    x: 0,
    y: 0,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }
}
