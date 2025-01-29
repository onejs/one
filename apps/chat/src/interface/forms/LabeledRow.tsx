import { createElement, isValidElement } from 'react'
import { Label, Paragraph, View, XStack, YStack, type XStackProps } from 'tamagui'

export const LabeledRow = ({
  htmlFor,
  label,
  description,
  icon,
  children,
  ...rest
}: XStackProps & { icon?: any; htmlFor: string; label: string; description?: string }) => {
  return (
    <YStack py="$2">
      <View flexDirection="column" width="100%" gap="$1" $xs={{ flexDirection: 'row' }} {...rest}>
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

        <XStack items="center">{children}</XStack>
      </View>

      {!!description && <Paragraph opacity={0.5}>{description}</Paragraph>}
    </YStack>
  )
}
