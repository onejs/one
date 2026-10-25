import type { ControlledControlProps, ControlChange, NumericControlChange } from '../controlTypes'
import { useRef } from 'react'
import { useControlled } from '../controlled'
import NativeSlider from './OneLinuxSliderNativeComponent'

export type SliderProps = ControlledControlProps & {
  value: number
  minimumValue?: number
  maximumValue?: number
  /** keyboard increment, in the slider's value units. */
  step?: number
  onValueChange?: (event: ControlChange<{ value: number }>) => void
  onSlidingStart?: (event: ControlChange<{ value: number }>) => void
  onSlidingComplete?: (event: ControlChange<{ value: number }>) => void
}

export function Slider({
  value,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  revision = 0,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
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
  const slidingRevision = useRef<number | null>(null)
  const controlled = useControlled((event: NumericControlChange) => {
    onValueChange?.({ value: event.value, revision: event.revision })
  }, revision)
  return (
    <NativeSlider
      {...props}
      value={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      style={style}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
      onSlidingStart={({ nativeEvent }) => {
        if (nativeEvent.revision !== revision) return
        slidingRevision.current = nativeEvent.revision
        onSlidingStart?.(nativeEvent)
      }}
      onSlidingComplete={({ nativeEvent }) => {
        if (nativeEvent.revision !== slidingRevision.current) return
        slidingRevision.current = null
        onSlidingComplete?.(nativeEvent)
      }}
    />
  )
}
