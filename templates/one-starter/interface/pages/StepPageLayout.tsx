import {
  KeyboardAvoidingFrame,
  KeyboardStickyFrame,
} from '~/interface/ui/keyboard/KeyboardLayoutFrame'
import { router, useSafeAreaInsets } from 'one'
import { Circle, H5, isWeb, Spacer, XStack, YStack, SizableText } from 'tamagui'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'
import { PageScrollView } from '~/interface/layout/PageScrollView'
import type { Icon } from '~/interface/ui/icons/types'
import type { ReactNode } from 'react'

export type StepPageProps = {
  title: string
  description?: string
  descriptionSecondLine?: string
  headerTitle?: string
  Icon?: Icon
  children: ReactNode
  bottom?: ReactNode
  buttonRight?: ReactNode
  disableBackButton?: boolean
  hideBackButton?: boolean
  disableScroll?: boolean
  disableKeyboardAvoidingView?: boolean
  keyboardOffset?: number
}

function PageHeading({
  title,
  subTitle,
  subTitle2,
}: {
  title: string
  subTitle?: string
  subTitle2?: string
}) {
  return (
    <YStack gap={7} items="center">
      <SizableText size="7" color="color" fontWeight="700">
        {title}
      </SizableText>
      <YStack gap="px" items="center">
        {!!subTitle && (
          <SizableText size="4" color="color-10" text="center">
            {subTitle}
          </SizableText>
        )}
        {!!subTitle2 && (
          <SizableText size="4" color="color" text="center">
            {subTitle2}
          </SizableText>
        )}
      </YStack>
    </YStack>
  )
}

export function StepPageLayout({
  title,
  description,
  descriptionSecondLine,
  headerTitle,
  Icon,
  children,
  bottom,
  buttonRight,
  disableBackButton = false,
  hideBackButton = false,
  disableScroll = false,
  disableKeyboardAvoidingView = false,
  keyboardOffset = 0,
}: StepPageProps) {
  const { bottom: bottomInset } = useSafeAreaInsets()

  const pageContent = (
    <>
      {isWeb ? (
        <YStack flex={1} p="6" items="center" justify="center" minH="100vh">
          <YStack width="100%" maxW={400} gap={18}>
            <StepHeader
              title={title}
              description={description}
              descriptionSecondLine={descriptionSecondLine}
              Icon={Icon}
            />
            {children}
            {bottom}
          </YStack>
        </YStack>
      ) : (
        <YStack flex={1} bg="color-2">
          <PageScrollView
            scrollEnabled={!disableScroll}
            contentPaddingBottom={50}
            contentPaddingTop={!hideBackButton ? 12 : 0}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <YStack minW="100%" flex={1} rounded="6">
              <YStack width="100%" maxW={600} self="center" px={18}>
                {!hideBackButton && (
                  <XStack justify="space-between" items="center" mb={18}>
                    <Button
                      size="md"
                      circular
                      rounded="10"
                      bg="background"
                      borderWidth={1}
                      borderColor="color-3"
                      boxShadow="0 5px 14px shadow-4"
                      onPress={() => router.back()}
                      icon={<Icons.Back size={20} color="color" />}
                      disabled={disableBackButton}
                      aria-label="Back"
                      testID="step-back-button"
                    />
                    {headerTitle && (
                      <H5 fontFamily="heading" color="color">
                        {headerTitle}
                      </H5>
                    )}
                    {buttonRight ? buttonRight : <Spacer width={44} />}
                  </XStack>
                )}
                <StepHeader
                  title={title}
                  description={description}
                  descriptionSecondLine={descriptionSecondLine}
                  Icon={Icon}
                />
                <YStack pt={18} gap={18}>
                  {children}
                </YStack>
              </YStack>
            </YStack>
          </PageScrollView>
        </YStack>
      )}

      {!isWeb && bottom && (
        <YStack position="absolute" b={0} l={0} r={0} z={999} pointerEvents="box-none">
          <KeyboardStickyFrame bottomInset={bottomInset}>
            <YStack px={18} pb={bottomInset + 10} pointerEvents="box-none">
              {bottom}
            </YStack>
          </KeyboardStickyFrame>
        </YStack>
      )}
    </>
  )

  return (
    <KeyboardAvoidingFrame
      enabled={!disableKeyboardAvoidingView && !bottom}
      keyboardVerticalOffset={keyboardOffset !== 0 ? keyboardOffset : bottomInset > 30 ? -24 : 0}
    >
      {pageContent}
    </KeyboardAvoidingFrame>
  )
}

function StepHeader({
  title,
  description,
  descriptionSecondLine,
  Icon,
}: Pick<StepPageProps, 'title' | 'description' | 'descriptionSecondLine' | 'Icon'>) {
  return (
    <YStack gap={18} mt={7} items="center">
      {Icon && (
        <Circle
          size={52}
          bg="color-2"
          boxShadow="0 0 12px shadow-3"
          borderWidth={0.5}
          borderColor="color-3"
          items="center"
          justify="center"
        >
          <Icon size={28} color="color-11" />
        </Circle>
      )}
      <PageHeading title={title} subTitle={description} subTitle2={descriptionSecondLine} />
    </YStack>
  )
}
