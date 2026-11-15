import type { ReactElement } from 'react'
import { createToggle, type DesktopToggleProps } from '../desktop/createControls'
import NativeToggle, { type ChangeEvent } from './OneMacToggleNativeComponent'

export type ToggleProps = Omit<DesktopToggleProps, 'disabled'>

export const Toggle: (props: ToggleProps) => ReactElement = createToggle<ChangeEvent>(
  (props, binding) => <NativeToggle {...props} revision={binding.revision}
    acknowledgedEvent={binding.acknowledgedEvent}
    onIsOnChange={({ nativeEvent }) => binding.onNativeChange(nativeEvent)} />,
  (event) => event.isOn,
)
