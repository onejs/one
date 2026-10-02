import { Paragraph, Spacer, XStack, YStack } from 'tamagui'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { OneBall } from '../brand/Logo'
import { Link } from './Link'

export const Footer = () => {
  return (
    <XStack
      group="card"
      container="card"
      py="10"
      flexDirection="sm:column"
      justifyContent="space-between sm:center"
      alignItems="center"
    >
      <XStack
        alignItems="center"
        gap="4"
        flexDirection="sm:column"
        justifyContent="sm:center"
      >
        <Link href="/">
          <YStack x="sm:3px" cursor="pointer">
            <OneBall />
          </YStack>
        </Link>

        <XStack alignItems="center">
          <SocialLinksRow />
        </XStack>

        <Link href="/blog">
          <Paragraph cur="pointer">Blog</Paragraph>
        </Link>
      </XStack>

      <Paragraph mt="sm:8" opacity={0.5}>
        Copyright 2024 Tamagui, LLC
      </Paragraph>
    </XStack>
  )
}
