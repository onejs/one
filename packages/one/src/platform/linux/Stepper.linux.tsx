import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeStepper, { type ChangeEvent } from './OneLinuxStepperNativeComponent'

export type StepperProps = Omit<ViewProps, 'children'> & {
  value: number
  minimumValue?: number
  maximumValue?: number
  /** increment, in the stepper's value units. */
  step?: number
  disabled?: boolean
  revision?: number
  onValueChange?: (event: { value: number; revision: number }) => void
}

export function Stepper({
  value,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  revision = 0,
  onValueChange,
  style,
  ...props
}: StepperProps) {
  if (
    ![value, minimumValue, maximumValue, step].every(Number.isFinite) ||
    maximumValue <= minimumValue ||
    step <= 0 ||
    value < minimumValue ||
    value > maximumValue
  ) {
    throw new Error(
      'Stepper needs a finite value in its range, increasing bounds and a positive step'
    )
  }
  const controlled = useControlled((event: ChangeEvent) => {
    onValueChange?.({ value: event.value, revision: event.revision })
  }, revision)
  return (
    <NativeStepper
      {...props}
      value={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      style={[{ width: 150, height: 34 }, style]}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
