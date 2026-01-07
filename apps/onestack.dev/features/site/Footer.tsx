import { Paragraph, Spacer, XStack, YStack } from 'tamagui'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { OneBall } from '../brand/Logo'
import { Link } from './Link'

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
        gap="$4"
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

        <XStack ai="center">
          <SocialLinksRow />
        </XStack>

        <Link href="/blog">
          <Paragraph cur="pointer">Blog</Paragraph>
        </Link>
      </XStack>

      <Paragraph $sm={{ mt: '$8' }} o={0.5}>
        Copyright 2024 Tamagui, LLC
      </Paragraph>
    </XStack>
  )
}
