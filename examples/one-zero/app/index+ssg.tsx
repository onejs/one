import { useQuery } from 'one/zero'
import { Button, H1, XStack, YStack } from 'tamagui'
import { Logo } from '~/features/brand/Logo'
import { FeedCard, feedCardQuery } from '~/features/feed/FeedCard'
import { Link } from '~/features/routing/Link'
import { ToggleThemeButton } from '~/features/theme/ToggleThemeButton'
import { NativeScrollView } from '~/features/ui/NativeScrollView'
import { zero } from '~/features/zero/client'

const topPostsQuery = zero.query.posts.limit(5).sub((q) => feedCardQuery(q.parent.id))

export function HomePage() {
  const topPosts = useQuery(topPostsQuery)

  return (
    <NativeScrollView>
      <YStack maw={800} als="center" py="$10" gap="$6" px="$4" f={1} w="100%">
        <XStack ai="center" jc="space-between">
          <Logo />

          <XStack ai="center" gap="$6">
            <ToggleThemeButton />
            <Link asChild href="/feed">
              <Button>Login</Button>
            </Link>
          </XStack>
        </XStack>

        <H1 fow="400">Top Posts</H1>

        <YStack>
          {topPosts.map((post) => {
            return <FeedCard disableLink key={post.id} id={post.id} />
          })}
        </YStack>
      </YStack>
    </NativeScrollView>
  )
}
