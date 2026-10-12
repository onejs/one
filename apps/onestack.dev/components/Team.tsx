import { YStack } from 'tamagui'
import { Link } from '~/features/site/Link'
import { PrettyText } from './typography'

export const Team = () => {
  return (
    <YStack group containerType="normal" gap="8" marginVertical="4">
      <PrettyText maxWidth={500} alignSelf="center" textAlign="sm:center">
        We built One out of our experience building cross-platform apps with{' '}
        <Link href="https://tamagui.dev">Tamagui</Link>{' '}
        <Link href="https://tamagui.dev/takeout">Takeout</Link>, and at{' '}
        <Link href="https://app.uniswap.org">Uniswap</Link>.
      </PrettyText>
    </YStack>
  )
}
