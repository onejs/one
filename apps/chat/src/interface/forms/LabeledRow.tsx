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
    <YStack py="$2" bbw={1} bc="$color3">
      <XStack w="100%" gap="$1" $sm={{ fd: 'column' }} {...rest}>
        <Label
          display="flex"
          gap="$4"
          px="$3"
          my={-3}
          pressStyle={{ o: 0.6 }}
          f={100}
          size="$5"
          fow="600"
          htmlFor={htmlFor}
        >
          {icon
            ? isValidElement(icon)
              ? icon
              : createElement(icon, { size: 18, opacity: 0.5 })
            : null}

          {label}
        </Label>

        <XStack f={1} />

        <XStack ai="center">{children}</XStack>
      </XStack>

      {!!description && <Paragraph theme="alt1">{description}</Paragraph>}
    </YStack>
  )
}
