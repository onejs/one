import { VisuallyHidden, XStack, YStack } from 'tamagui'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { PrettyText } from './typography'

export const Community = () => {
  return (
    <YStack group containerType="normal" gap="$8" my="$4">
      <VisuallyHidden>
        <PrettyText fontFamily="$mono" fontSize="$7" lineHeight="$7" color="$color" ta="center">
          Community
        </PrettyText>
      </VisuallyHidden>

      <XStack gap="$8" als="center" $xs={{ fd: 'column', ai: 'center', jc: 'center' }}>
        <SocialLinksRow large />
      </XStack>
    </YStack>
  )
}
