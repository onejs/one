import { H4, Paragraph, YStack } from 'tamagui'
import { Button } from '~/interface/buttons/Button'
import type { ReactNode } from 'react'

type EmptyStateAction =
  | {
      ctaLabel: string
      onCtaPress: () => void
    }
  | {
      ctaLabel?: never
      onCtaPress?: never
    }

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description?: string
} & EmptyStateAction

// canonical empty-state pattern: an icon/illustration, a one-line message,
// and a primary CTA that starts the create flow. use this instead of a bare
// "no items yet" paragraph — it's the difference between a screen that
// reads "broken" and one that reads "ready for you to fill in".
//
// keep the icon visually distinctive: a 40pt lucide icon in color-11, an inline
// react-native-svg illustration, or a brand glyph. solid color rectangles
// or default avatars miss the point.
export function EmptyState({ icon, title, description, ctaLabel, onCtaPress }: EmptyStateProps) {
  // grow (flexGrow: basis auto) fills a sized parent but hugs content in an
  // auto-height section — flex={1} (basis 0) collapsed to 0 there and the
  // icon overflowed onto surrounding content
  return (
    <YStack grow={1} gap={13} items="center" justify="center" px="8" py={46}>
      <YStack items="center" justify="center" width={88} height={88} rounded="8" bg="color-3">
        {icon}
      </YStack>
      <H4 text="center" color="color">
        {title}
      </H4>
      {description ? (
        <Paragraph text="center" color="color-10" maxW={320}>
          {description}
        </Paragraph>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <Button mt="2" accent onPress={onCtaPress}>
          {ctaLabel}
        </Button>
      ) : null}
    </YStack>
  )
}
