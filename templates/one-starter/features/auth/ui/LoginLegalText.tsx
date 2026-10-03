import { SizableText, YStack } from 'tamagui'

export function LoginLegalText() {
  return (
    <YStack items="center" gap={7}>
      <SizableText size="2" text="center" color="color-11" px={7}>
        By continuing, you agree to our Terms, Privacy & EULA
      </SizableText>
    </YStack>
  )
}
