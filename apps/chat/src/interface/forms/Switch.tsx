import { Switch as TamaguiSwitch, type SwitchProps } from 'tamagui'

export const Switch = (props: SwitchProps) => {
  return (
    <TamaguiSwitch size="$4" p={0} {...props}>
      <TamaguiSwitch.Thumb animation="quicker" />
    </TamaguiSwitch>
  )
}
