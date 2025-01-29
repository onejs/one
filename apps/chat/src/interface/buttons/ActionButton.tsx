import { Button, type ButtonProps, Theme } from 'tamagui'

export const ActionButton = (props: ButtonProps) => {
  return (
    <Theme name="accent">
      <Button {...props} />
    </Theme>
  )
}
