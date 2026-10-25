import { One as NativeOne, type OneLinuxAPI, type OneLinux } from './one-shared'
import { Switch } from './platform/linux/Switch.linux'
import { Button } from './platform/linux/Button.linux'
import { SegmentedControl } from './platform/linux/SegmentedControl.linux'
import { Slider } from './platform/linux/Slider.linux'
import { DropDown } from './platform/linux/DropDown.linux'
import { ProgressBar } from './platform/linux/ProgressBar.linux'

const linux: Readonly<OneLinux> = Object.freeze({
  Switch,
  Button,
  SegmentedControl,
  Slider,
  DropDown,
  ProgressBar,
})

// own properties over a prototype, so the shared getters stay lazy and the
// result type is checked against the members it adds
function inherit<Base extends object, Own extends object>(
  base: Base,
  own: Own
): Omit<Base, keyof Own> & Own {
  return Object.freeze(Object.setPrototypeOf(own, base))
}

// shadows the shared One object. the shared module stays the ios, android and
// web build, and this entry is loaded only when the platform is linux.
export const One: OneLinuxAPI = inherit(NativeOne, { platform: 'linux' as const, linux })
