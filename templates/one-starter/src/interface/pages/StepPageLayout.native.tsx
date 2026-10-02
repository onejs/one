import { router } from 'one'
import { H5, Spacer, XStack, YStack } from 'tamagui'
import { GradientBackground } from '../backgrounds/GradientBackground'
import { Button } from '../buttons/Button'
import { CaretLeftIcon } from '../icons/phosphor/CaretLeftIcon'
import { H1, H4 } from '../text/Headings'
import type { StepPageProps } from './StepPageLayout'
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
    <GradientBackground>
      <YStack flex={1} p="4">
        <YStack gap="4">
          {!hideBackButton && (
            <XStack justify="space-between" items="center">
              <Button
                circular
                onPress={() => router.back()}
                icon={<CaretLeftIcon size={22} color="color" />}
                disabled={disableBackButton}
              />
              {headerTitle && (
                <H5 fontFamily="heading" color="color">
                  {headerTitle}
                </H5>
              )}
              {buttonRight ? buttonRight : <Spacer w={42} />}
            </XStack>
          )}

          <YStack gap="4" mt="2">
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

        <YStack pt="4" gap="4" flex={1}>
          {children}
        </YStack>

        {bottom && <YStack pt="4">{bottom}</YStack>}
      </YStack>
    </GradientBackground>
  )
}
