import { VisuallyHidden, XStack, YStack } from 'tamagui'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { PrettyText } from './typography'

export const Community = () => {
  return (
    <YStack group containerType="normal" gap="8" marginVertical="4">
      <VisuallyHidden>
        <PrettyText
          fontFamily="mono"
          fontSize="7"
          lineHeight="7"
          color="color"
          textAlign="center"
        >
          Community
        </PrettyText>
      </VisuallyHidden>

      <XStack
        gap="8"
        flexDirection="xs:column"
        alignItems="xs:center"
        justifyContent="xs:center"
        alignSelf="center"
      >
        <SocialLinksRow large />
      </XStack>
    </YStack>
  )
}
