import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeSlider, { type ChangeEvent } from './OneLinuxSliderNativeComponent'

export type SliderProps = Omit<ViewProps, 'children'> & {
  value: number
  minimumValue?: number
  maximumValue?: number
  /** keyboard increment, in the slider's value units. */
  step?: number
  disabled?: boolean
  revision?: number
  onValueChange?: (event: { value: number; revision: number }) => void
}

export function Slider({
  value,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  revision = 0,
  onValueChange,
  style,
  ...props
}: SliderProps) {
  if (
    ![value, minimumValue, maximumValue, step].every(Number.isFinite) ||
    maximumValue <= minimumValue ||
    step <= 0 ||
    value < minimumValue ||
    value > maximumValue
  ) {
    throw new Error(
      'Slider needs a finite value in its range, increasing bounds and a positive step'
    )
  }
  const controlled = useControlled((event: ChangeEvent) => {
    onValueChange?.({ value: event.value, revision: event.revision })
  }, revision)
  return (
    <NativeSlider
      {...props}
      value={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      style={[{ width: 240, height: 34 }, style]}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
