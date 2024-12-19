import { Label, XStack, type XStackProps } from 'tamagui'

export const LabeledRow = ({
  htmlFor,
  label,
  children,
  ...rest
}: XStackProps & { htmlFor: string; label: string }) => {
  return (
    <XStack w="100%" gap="$4" py="$2" {...rest}>
      <Label w={130} jc="flex-end" htmlFor={htmlFor}>
        {label}
      </Label>

      <XStack ai="center">{children}</XStack>
    </XStack>
  )
}
