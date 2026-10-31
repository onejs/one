import type { ControlledControlProps, NumericControlChange } from '../controlTypes'
import { useControlled } from '../controlled'
import NativeStepper from './OneLinuxStepperNativeComponent'

export type StepperProps = ControlledControlProps & {
  value: number
  label?: string
  in?: readonly [number, number]
  /** increment, in the stepper's value units. */
  step?: number
  onValueChange: (value: number) => void
}

export function Stepper({
  value,
  label = '',
  in: [minimumValue, maximumValue] = [0, 100],
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
  const controlled = useControlled((event: NumericControlChange) => {
    onValueChange(event.value)
  }, revision)
  return (
    <NativeStepper
      {...props}
      value={value}
      title={label}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      style={style}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
