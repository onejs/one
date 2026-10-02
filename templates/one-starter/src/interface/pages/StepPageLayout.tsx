import { router } from 'one'
import { Circle, H5, isWeb, Spacer, XStack, YStack } from 'tamagui'
import { HeaderBackButton } from '../buttons/HeaderBackButton'
import { H1, H4 } from '../text/Headings'
import type { IconComponent } from '../icons/types'
import type { ReactNode } from 'react'
export type StepPageProps = {
  title: string
  description?: string
  descriptionSecondLine?: string
  headerTitle?: string
  Icon?: IconComponent
  IconGroup?: ReactNode
  children: ReactNode
  bottom?: ReactNode
  buttonRight?: ReactNode
  disableBackButton?: boolean
  hideBackButton?: boolean
  disableScroll?: boolean
  linearGradientFooter?: boolean
  disableKeyboardAvoidingView?: boolean
  keyboardOffset?: number
}
export const StepPageLayout = ({
  title,
  description,
  descriptionSecondLine,
  headerTitle,
  Icon,
  IconGroup,
  children,
  bottom,
  buttonRight,
  disableBackButton = false,
  hideBackButton = false,
}: StepPageProps) => {
  return (
    <YStack flex={1} p="4" maxW={500} mx="auto" w="100%">
      <YStack gap="5">
        {!hideBackButton && !isWeb && (
          <XStack justify="space-between" items="center">
            <HeaderBackButton disabled={disableBackButton} />
            {headerTitle && <H5>{headerTitle}</H5>}
            {buttonRight ? buttonRight : <Spacer w={24} />}
          </XStack>
        )}

        <YStack gap="5">
          {Icon && (
            <Circle
              size={52}
              bg="color-2"
              shadowColor="color"
              shadowOpacity={0.1}
              shadowRadius={12}
              borderWidth={0.5}
              borderColor="color-3"
              items="center"
              justify="center"
            >
              <Icon size={28} color="color-11" />
            </Circle>
          )}

          {IconGroup && IconGroup}

          <YStack gap="2">
            <H1 size="8">{title}</H1>
            {description && <H4 color="color-10">{description}</H4>}
            {descriptionSecondLine && (
              <H4 color="color-11" fontWeight="600">
                {descriptionSecondLine}
              </H4>
            )}
          </YStack>
        </YStack>
      </YStack>

      <YStack pt="5" gap="4">
        {children}
      </YStack>

      {bottom && <YStack pt="4">{bottom}</YStack>}
    </YStack>
  )
}
