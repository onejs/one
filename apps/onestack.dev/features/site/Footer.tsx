import { Paragraph, Spacer, XStack, YStack } from 'tamagui'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { OneBall } from '../brand/Logo'
import { Link } from 'one'

export const Footer = () => {
  return (
    <XStack
      group="card"
      py="$10"
      ai="center"
      jc="space-between"
      $sm={{
        fd: 'column',
        jc: 'center',
      }}
    >
      <XStack
        ai="center"
        gap="$5"
        $sm={{
          fd: 'column',
          jc: 'center',
        }}
      >
        <Link href="/">
          <YStack $sm={{ x: 3 }} cursor="pointer">
            <OneBall />
          </YStack>
        </Link>

        <XStack gap="$4" ai="center">
          <SocialLinksRow />
          <Link href="/blog">
            <Paragraph cur="pointer" o={0.5} hoverStyle={{ o: 1 }}>
              Blog
            </Paragraph>
          </Link>
        </XStack>
      </XStack>

      <Paragraph $sm={{ mt: '$8' }} o={0.5}>
        Copyright 2024 Tamagui, LLC
      </Paragraph>
    </XStack>
  )
}
