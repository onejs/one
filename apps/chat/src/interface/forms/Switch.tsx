import { Switch as TamaguiSwitch, type SwitchProps } from 'tamagui'

export const Switch = (props: SwitchProps) => {
  return (
    <TamaguiSwitch
      pressStyle={{
        bg: '$color1',
      }}
      size="$4"
      p={0}
      {...props}
    >
      <TamaguiSwitch.Thumb animation="quickest" />
    </TamaguiSwitch>
  )
}
