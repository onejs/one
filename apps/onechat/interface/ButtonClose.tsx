import { X } from '@tamagui/lucide-icons'
import { Button, type ButtonProps } from 'tamagui'

export const ButtonClose = (props: ButtonProps) => {
  return <Button circular icon={X} {...props} />
}
