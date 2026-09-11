import type * as Controls from './generated/controlTypes'
import type { MenuProps, TabProps, TabsProps, SheetProps } from './types'

function Tabs(_props: TabsProps): never {
  throw new Error('Swift.Tabs requires an iOS native build with one-native installed')
}
function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab requires an iOS native build with one-native installed')
}
function Menu(_props: MenuProps): never {
  throw new Error('Swift.Menu requires an iOS native build with one-native installed')
}

function Picker(_props: Controls.PickerProps): never {
  throw new Error('Swift.Picker requires an iOS native build with one-native installed')
}
function DatePicker(_props: Controls.DatePickerProps): never {
  throw new Error(
    'Swift.DatePicker requires an iOS native build with one-native installed'
  )
}
function ColorPicker(_props: Controls.ColorPickerProps): never {
  throw new Error(
    'Swift.ColorPicker requires an iOS native build with one-native installed'
  )
}
function Toggle(_props: Controls.ToggleProps): never {
  throw new Error('Swift.Toggle requires an iOS native build with one-native installed')
}
function Slider(_props: Controls.SliderProps): never {
  throw new Error('Swift.Slider requires an iOS native build with one-native installed')
}
function Stepper(_props: Controls.StepperProps): never {
  throw new Error('Swift.Stepper requires an iOS native build with one-native installed')
}
function Sheet(_props: SheetProps): never {
  throw new Error('Swift.Sheet requires an iOS native build with one-native installed')
}
export const Swift = {
  Tabs,
  Tab,
  Menu,
  Sheet,
  Picker,
  DatePicker,
  ColorPicker,
  Toggle,
  Slider,
  Stepper,
}
export type * from './types'
