import { One as NativeOne, type OneLinuxAPI, type OneLinux } from './one-shared'
import { AppCommands } from './platform/linux/AppCommands.linux'
import { Window } from './platform/linux/Window.linux'
import { Switch } from './platform/linux/Switch.linux'
import { Button } from './platform/linux/Button.linux'
import { SegmentedControl } from './platform/linux/SegmentedControl.linux'
import { Slider } from './platform/linux/Slider.linux'
import { DropDown } from './platform/linux/DropDown.linux'
import { ProgressBar } from './platform/linux/ProgressBar.linux'

import { Toggle } from './platform/linux/Toggle.linux'
import { Stepper } from './platform/linux/Stepper.linux'
import { TextField } from './platform/linux/TextField.linux'
import { SecureField } from './platform/linux/SecureField.linux'

const linux: Readonly<OneLinux> = Object.freeze({
  AppCommands,
  Window,
  Switch,
  Button,
  SegmentedControl,
  Slider,
  DropDown,
  ProgressBar,
  Toggle,
  Stepper,
  TextField,
  SecureField,
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
