import { ScrollView, YStack } from 'tamagui'
import { useLoader } from 'vxs'
import { feedData } from '~/features/feed/data'
import { FeedCard } from '~/features/feed/FeedCard'
import { Image } from '~/features/ui/Image'
import { PageContainer } from '~/features/ui/PageContainer'

export function loader() {
  return {
    posts: feedData,
  }
}

export default function ProfilePage() {
  const { posts } = useLoader(loader)

  return (
    <PageContainer>
      <ScrollView>
        <YStack pos="relative" w="100%" h={250} ov="hidden">
          <Image
            pos="absolute"
            t={0}
            r={0}
            b={0}
            l={0}
            src="https://placecats.com/millie/500/300"
          />
          <Image
            pos="absolute"
            b="$4"
            l="$4"
            w={100}
            h={100}
            br={100}
            src="https://placecats.com/500/300"
            bw={1}
            bc="$color1"
            shadowColor="rgba(0,0,0,0.5)"
            shadowRadius={10}
            shadowOffset={{
              width: 0,
              height: 0,
            }}
          />
        </YStack>

        {posts.map((post) => {
          return <FeedCard key={post.id} {...post} />
        })}
      </ScrollView>
    </PageContainer>
  )
}
