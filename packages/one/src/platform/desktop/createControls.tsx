import type { ComponentType, ReactElement } from 'react'
import type { ControlledEvent } from '../controlled'
import { useControlled } from '../controlled'
import type { ControlledControlProps, ControlChange } from '../controlTypes'

export type DesktopButtonProps = ControlledControlProps & {
  title: string
  systemImage?: string
  bordered?: boolean
  onPress?: () => void
}

export function createButton<Props, NativeProps extends object>(
  NativeButton: ComponentType<NativeProps>,
  useNativeProps: (props: Props) => NativeProps,
) {
  return function Button(props: Props) {
    return <NativeButton {...useNativeProps(props)} />
  }
}

type Binding<Event extends ControlledEvent> = ReturnType<typeof useControlled<Event>>
export type DesktopToggleProps = ControlledControlProps & {
  label: string
  isOn: boolean
  onIsOnChange?: (event: ControlChange<{ isOn: boolean }>) => void
}

export function createToggle<Event extends ControlledEvent>(
  render: (props: Omit<DesktopToggleProps, 'onIsOnChange'>, binding: Binding<Event>) => ReactElement,
  isOn: (event: Event) => boolean,
) {
  return function Toggle({ revision = 0, onIsOnChange, ...props }: DesktopToggleProps) {
    const binding = useControlled((event: Event) => {
      onIsOnChange?.({ isOn: isOn(event), revision: event.revision })
    }, revision)
    return render(props, binding)
  }
}

export type DesktopSegmentedControlProps = ControlledControlProps & {
  labels: readonly string[]
  selectedIndex: number
  controlRole?: 'automatic' | 'tabs' | 'valueSelection'
  onChange?: (event: ControlChange<{ selectedIndex: number }>) => void
}

export function createSegmentedControl<Event extends ControlledEvent>(
  render: (props: Omit<DesktopSegmentedControlProps, 'onChange'>, binding: Binding<Event>) => ReactElement,
  selectedIndex: (event: Event) => number,
) {
  return function SegmentedControl({ revision = 0, controlRole = 'automatic', onChange, ...props }: DesktopSegmentedControlProps) {
    if (!Number.isInteger(props.selectedIndex) || props.selectedIndex < -1 || props.selectedIndex >= props.labels.length) {
      throw new Error('SegmentedControl selectedIndex must be -1 or an index in labels')
    }
    if (controlRole !== 'automatic' && controlRole !== 'tabs' && controlRole !== 'valueSelection') {
      throw new TypeError('SegmentedControl controlRole must be automatic, tabs or valueSelection')
    }
    const binding = useControlled((event: Event) => {
      onChange?.({ selectedIndex: selectedIndex(event), revision: event.revision })
    }, revision)
    return render({ ...props, controlRole }, binding)
  }
}
