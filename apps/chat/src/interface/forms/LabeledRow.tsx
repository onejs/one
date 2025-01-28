import { createElement, isValidElement } from 'react'
import { Label, Paragraph, XStack, YStack, type XStackProps } from 'tamagui'

export const LabeledRow = ({
  htmlFor,
  label,
  description,
  icon,
  children,
  ...rest
}: XStackProps & { icon?: any; htmlFor: string; label: string; description?: string }) => {
  return (
    <YStack py="$2" borderWidth={1} borderColor="$color3">
      <XStack width="100%" gap="$1" $sm={{ flexDirection: 'column' }} {...rest}>
        <Label
          display="flex"
          gap="$4"
          px="$3"
          my={-3}
          pressStyle={{ opacity: 0.6 }}
          flex={100}
          size="$5"
          fontWeight="600"
          htmlFor={htmlFor}
        >
          {icon
            ? isValidElement(icon)
              ? icon
              : createElement(icon, { size: 18, opacity: 0.5 })
            : null}

          {label}
        </Label>

        <XStack flex={1} />

        <XStack minW={300} items="center">
          {children}
        </XStack>
      </XStack>

      {!!description && <Paragraph opacity={0.5}>{description}</Paragraph>}
    </YStack>
  )
}
