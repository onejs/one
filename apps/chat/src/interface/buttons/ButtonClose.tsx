import { X } from '@tamagui/lucide-icons'
import { Button, type ButtonProps } from 'tamagui'

export const ButtonClose = (props: ButtonProps) => {
  return <Button size="$3" elevation={2} circular icon={X} scaleIcon={1.3} {...props} />
}
