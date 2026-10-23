import { One as NativeOne, type OneMacAPI, type OneMacOS } from './one-shared'
import { AppCommands } from './platform/mac/AppCommands.macos'
import { Button } from './platform/mac/Button.macos'
import { SegmentedControl } from './platform/mac/SegmentedControl.macos'
import { Toggle } from './platform/mac/Toggle.macos'

const macOS: Readonly<OneMacOS> = Object.freeze({ Toggle, Button, SegmentedControl, AppCommands })

// own properties over a prototype, so the shared getters stay lazy and the
// result type is checked against the members it adds
function inherit<Base extends object, Own extends object>(base: Base, own: Own): Omit<Base, keyof Own> & Own {
  return Object.freeze(Object.setPrototypeOf(own, base))
}

// shadows the shared One object. the shared module stays the ios, android and
// web build, and this entry is loaded only when the platform is macos.
export const One: OneMacAPI = inherit(NativeOne, { platform: 'macos' as const, macOS })
