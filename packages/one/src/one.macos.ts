import { One as NativeOne } from './one'
import { Toggle } from './platform/mac/Toggle.macos'

const macOS = Object.freeze({ Toggle })

// shadows the shared One object. the shared module stays the ios, android and
// web build, and this entry is loaded only when the platform is macos.
export const One = Object.create(NativeOne, {
  platform: {
    enumerable: true,
    get() {
      return 'macos' as const
    },
  },
  macOS: {
    enumerable: true,
    value: macOS,
  },
})
